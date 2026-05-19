/**
 * Hiring-pipeline state machine.
 *
 * The single entry point for moving an `ApplicationStatus` row from
 * one stage to the next. Every transition:
 *
 *   1. Validates the source → target combination against the legal
 *      transition map. Illegal transitions return a typed error;
 *      they never silently succeed.
 *   2. Stamps `stageEnteredAt` to NOW so time-in-stage analytics
 *      can be computed from a single column.
 *   3. Writes an AuditLog row tagged with the actor + the actual
 *      from/to states.
 *   4. Fires the matching transactional email + (in v1.1) an
 *      in-app notification. Email failures don't roll back the
 *      transition — the audit row is the source of truth.
 *
 * Side-effects of a few specific transitions:
 *
 *   • `*` → `hired` — when an offer is being accepted, also
 *     auto-withdraws every OTHER pending application this user
 *     holds. The trainee is now hired somewhere; carrying open
 *     applications wastes everyone's time.
 *
 *   • `interview_scheduled` requires an Interview row to exist
 *     for this (postingId, applicantId). The caller creates it
 *     before invoking the transition.
 *
 *   • `offer` requires an Offer row to exist. Same pattern.
 *
 * The legal-transition map is deliberately *strict* — we let
 * employers move forward or backward by one stage at a time,
 * but not (e.g.) jump straight from `new` to `hired` without
 * touching the interview rows. Strict transitions = legible
 * audit trail.
 */

import type { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sendMail, mailConfigured } from "@/lib/mail";
import {
  STAGES,
  type Stage,
  LEGAL_TRANSITIONS,
  legalNextStages,
  isInterviewSkip,
  KANBAN_COLUMNS,
  STAGE_LABELS,
} from "@/lib/hiring/stages";

// Re-export the pure metadata for back-compat. Old call-sites import
// these from "@/lib/hiring/transitions"; the actual source of truth
// now lives in stages.ts (which has no nodemailer / prisma imports)
// so client components can pull just the metadata without dragging
// the server-only mail module into the browser bundle.
export { STAGES, LEGAL_TRANSITIONS, legalNextStages, isInterviewSkip, KANBAN_COLUMNS, STAGE_LABELS };
export type { Stage };

export interface TransitionInput {
  applicationStatusId: string;
  toStage: Stage;
  /** Actor user id — admin / employer / superadmin / the applicant
   *  themselves (for withdraw). Required for the audit row. */
  actorUserId: string;
  /** Optional public-facing reason (passed / withdrawn). Surfaced to
   *  the trainee in the transition email. */
  rejectionReason?: string;
  /** Optional internal-only note. Never emailed. */
  employerNote?: string;
  /** Skip email side-effect (e.g. when transitioning during a bulk
   *  operation; the caller batches notifications). */
  skipEmail?: boolean;
}

export type TransitionResult =
  | { ok: true; fromStage: Stage; toStage: Stage; status: ApplicationStatusRow }
  | { ok: false; error: string; code: TransitionErrorCode };

type TransitionErrorCode =
  | "not_found"
  | "illegal_transition"
  | "missing_interview"
  | "missing_offer";

type ApplicationStatusRow = {
  id: string;
  postingId: string;
  applicantId: string;
  status: string;
  stageEnteredAt: Date;
};

// ── Public entry point ─────────────────────────────────────────

export async function transitionApplication(
  input: TransitionInput,
): Promise<TransitionResult> {
  // Wrapped in a transaction so the status update + audit log
  // can't get out of sync. Email + auto-withdraw run AFTER commit
  // so an email-server outage doesn't roll back the state change.
  const txResult = await prisma.$transaction(async (tx) => {
    return runTransition(tx, input);
  });
  if (!txResult.ok) return txResult;

  // Post-commit side effects.
  if (!input.skipEmail) {
    void notifyTransition({
      applicationStatusId: input.applicationStatusId,
      fromStage: txResult.fromStage,
      toStage: txResult.toStage,
      rejectionReason: input.rejectionReason,
    });
  }
  if (txResult.toStage === "hired") {
    // Auto-withdraw alternative applications. Best-effort — silent
    // on failure. The hire itself has already committed.
    void autoWithdrawOthers(txResult.status.applicantId, txResult.status.id, input.actorUserId);
  }
  return txResult;
}

// ── In-transaction core ───────────────────────────────────────

async function runTransition(
  tx: Prisma.TransactionClient,
  input: TransitionInput,
): Promise<TransitionResult> {
  const row = await tx.applicationStatus.findUnique({
    where: { id: input.applicationStatusId },
    select: {
      id: true,
      postingId: true,
      applicantId: true,
      status: true,
      stageEnteredAt: true,
    },
  });
  if (!row) {
    return { ok: false as const, error: "Application not found.", code: "not_found" };
  }
  const fromStage = (STAGES as readonly string[]).includes(row.status)
    ? (row.status as Stage)
    : "new";
  const toStage = input.toStage;

  if (fromStage === toStage) {
    return {
      ok: true as const,
      fromStage,
      toStage,
      status: row,
    };
  }

  const legal = LEGAL_TRANSITIONS[fromStage] ?? [];
  if (!legal.includes(toStage)) {
    return {
      ok: false as const,
      error: `Can't go from ${fromStage} → ${toStage}. Legal next stages: ${legal.join(", ") || "(terminal)"}.`,
      code: "illegal_transition",
    };
  }

  // Stage-specific preconditions.
  if (toStage === "interview_scheduled") {
    const hasInterview = await tx.interview.findFirst({
      where: { postingId: row.postingId, applicantId: row.applicantId },
      select: { id: true },
    });
    if (!hasInterview) {
      return {
        ok: false as const,
        error: "Create an Interview row before moving to interview_scheduled.",
        code: "missing_interview",
      };
    }
  }
  if (toStage === "offer") {
    const hasOffer = await tx.offer.findUnique({
      where: { applicationStatusId: row.id },
      select: { id: true, status: true },
    });
    if (!hasOffer) {
      return {
        ok: false as const,
        error: "Create an Offer row before moving to offer stage.",
        code: "missing_offer",
      };
    }
  }

  const updateData: Prisma.ApplicationStatusUpdateInput = {
    status: toStage,
    stageEnteredAt: new Date(),
    updatedBy: { connect: { id: input.actorUserId } },
  };
  if (input.rejectionReason !== undefined) {
    updateData.rejectionReason = input.rejectionReason || null;
  }
  if (input.employerNote !== undefined) {
    updateData.employerNote = input.employerNote || null;
  }

  const updated = await tx.applicationStatus.update({
    where: { id: row.id },
    data: updateData,
    select: {
      id: true,
      postingId: true,
      applicantId: true,
      status: true,
      stageEnteredAt: true,
    },
  });

  // Tag the audit row when this transition skipped the interview
  // stages (shortlisted/interview_scheduled → offer). Lets audits
  // easily find offers that bypassed a formal interview.
  const skippedInterview = isInterviewSkip(fromStage, toStage);

  await tx.auditLog.create({
    data: {
      action: skippedInterview
        ? "application.transition.skipped_interview"
        : "application.transition",
      actorId: input.actorUserId,
      targetType: "ApplicationStatus",
      targetId: row.id,
      detail: JSON.stringify({
        postingId: row.postingId,
        applicantId: row.applicantId,
        from: fromStage,
        to: toStage,
        rejectionReason: input.rejectionReason ?? null,
        ...(skippedInterview ? { skippedInterview: true } : {}),
      }),
    },
  });

  return { ok: true as const, fromStage, toStage, status: updated };
}

// ── Notification + side-effect helpers ────────────────────────

async function notifyTransition(args: {
  applicationStatusId: string;
  fromStage: Stage;
  toStage: Stage;
  rejectionReason?: string;
}): Promise<void> {
  if (!mailConfigured()) return;
  const row = await prisma.applicationStatus.findUnique({
    where: { id: args.applicationStatusId },
    select: {
      applicant: { select: { email: true, name: true } },
      posting: { select: { id: true, title: true, companyName: true } },
    },
  });
  if (!row?.applicant?.email) return;

  const copy = buildTransitionCopy({
    toStage: args.toStage,
    name: row.applicant.name,
    postingTitle: row.posting.title,
    companyName: row.posting.companyName,
    postingId: row.posting.id,
    applicationStatusId: args.applicationStatusId,
    rejectionReason: args.rejectionReason,
  });
  if (!copy) return; // some stages have no notification (e.g. employer-side `new`)

  try {
    await sendMail({
      to: row.applicant.email,
      subject: copy.subject,
      text: copy.text,
    });
  } catch (err) {
    console.error("hiring transition email failed:", (err as Error).message);
  }
}

interface CopyArgs {
  toStage: Stage;
  name: string | null;
  postingTitle: string;
  companyName: string;
  postingId: string;
  applicationStatusId: string;
  rejectionReason?: string;
}

function buildTransitionCopy(a: CopyArgs): { subject: string; text: string } | null {
  const firstName = a.name?.split(/\s+/)[0] ?? "there";
  const greeting = `Hi ${firstName},`;
  const link = `https://bhn-training-platform.vercel.app/profile/applications`;
  const role = `${a.postingTitle} at ${a.companyName}`;
  switch (a.toStage) {
    case "reviewing":
      return {
        subject: `Your application for ${role} is being reviewed`,
        text:
          `${greeting}\n\n` +
          `${a.companyName} has started reviewing your application for ${a.postingTitle}.\n\n` +
          `You'll hear from us again when there's a decision — usually within a week.\n\n` +
          `Check your application status any time: ${link}\n\n— BioHubNet`,
      };
    case "shortlisted":
      return {
        subject: `You've been shortlisted for ${role}`,
        text:
          `${greeting}\n\n` +
          `Good news — ${a.companyName} has shortlisted you for ${a.postingTitle}.\n\n` +
          `Next step is usually a screening or interview invite; watch your inbox for the next message.\n\n` +
          `View details: ${link}\n\n— BioHubNet`,
      };
    case "interview_scheduled":
      return {
        subject: `Interview details — ${role}`,
        text:
          `${greeting}\n\n` +
          `${a.companyName} has proposed interview times for ${a.postingTitle}.\n\n` +
          `Open your application to pick a slot: ${link}\n\n— BioHubNet`,
      };
    case "interviewed":
      return {
        subject: `Thanks for interviewing for ${role}`,
        text:
          `${greeting}\n\n` +
          `Thanks for interviewing for ${a.postingTitle}. ${a.companyName} is deliberating; you'll hear back when there's a decision.\n\n` +
          `— BioHubNet`,
      };
    case "offer":
      return {
        subject: `Offer received — ${role}`,
        text:
          `${greeting}\n\n` +
          `${a.companyName} has issued you an offer for ${a.postingTitle}!\n\n` +
          `Review the terms + accept or decline: ${link}\n\n— BioHubNet`,
      };
    case "hired":
      return {
        subject: `Congratulations on accepting — ${role}`,
        text:
          `${greeting}\n\n` +
          `Your acceptance is on file. ${a.companyName} will be in touch with onboarding details.\n\n` +
          `Best of luck in the new role.\n\n— BioHubNet`,
      };
    case "passed":
      return {
        subject: `Update on your application — ${role}`,
        text:
          `${greeting}\n\n` +
          `Thanks for applying to ${a.postingTitle} at ${a.companyName}. ` +
          `${a.companyName} has decided to move forward with other candidates this time.\n\n` +
          (a.rejectionReason
            ? `Their note: ${a.rejectionReason}\n\n`
            : "") +
          `We know that's not the news you were hoping for. Other open postings: https://bhn-training-platform.vercel.app/internships\n\n— BioHubNet`,
      };
    case "withdrawn":
      return {
        subject: `Application withdrawn — ${role}`,
        text:
          `${greeting}\n\n` +
          `Your application for ${a.postingTitle} at ${a.companyName} has been withdrawn. ` +
          `If this wasn't you, reach out to support@biohubnet.ca.\n\n— BioHubNet`,
      };
    default:
      return null;
  }
}

/**
 * On hire, withdraw every other open application this trainee holds.
 * The hired-into-one role means they're done; carrying live pipelines
 * elsewhere wastes employer time + leaves them dangling.
 *
 * Withdrawals here fire their own transition + email so other
 * employers know.
 */
async function autoWithdrawOthers(
  applicantId: string,
  excludeApplicationStatusId: string,
  actorUserId: string,
): Promise<void> {
  const others = await prisma.applicationStatus.findMany({
    where: {
      applicantId,
      id: { not: excludeApplicationStatusId },
      status: { in: ["new", "reviewing", "shortlisted", "interview_scheduled", "interviewed", "offer"] },
    },
    select: { id: true },
  });
  for (const o of others) {
    await transitionApplication({
      applicationStatusId: o.id,
      toStage: "withdrawn",
      actorUserId,
      rejectionReason: "Auto-withdrawn — applicant accepted an offer elsewhere.",
    });
  }
}

// Re-export PrismaClient type for callers that need it.
export type { PrismaClient };
