/**
 * Admin-side single Equip application.
 *
 *   GET   /api/admin/equip/applications/[id]   → full app for review
 *   PATCH /api/admin/equip/applications/[id]   → record a decision
 *                                                 or update status
 *
 * Decision flow
 *   submitted → under_review     (reviewer claims it)
 *   under_review → approved      (with approvedAmount + note)
 *   under_review → rejected      (with note)
 *   approved → funded            (with disbursementNote)
 *
 * Every decision stamps reviewer, reviewedAt, and (for funded)
 * fundedAt. Mirrors the /api/admin/credit-applications PATCH
 * shape so this code path is familiar to anyone who's reviewed
 * credit apps before.
 */
import { NextResponse } from "next/server";
import { requireCommitteeOrAdmin } from "@/lib/committees/membership";
import { prisma } from "@/lib/prisma";
import { isTerminal, STREAM_BUDGETS, type EquipStatus, type EquipStream } from "@/lib/equip/types";
import { templateMilestones } from "@/lib/equip/milestones";

export const runtime = "nodejs";

const TARGET_STATUSES = new Set<EquipStatus>([
  "under_review", "approved", "rejected", "funded",
]);

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireCommitteeOrAdmin(["equip_review"]);
  const { id } = await params;
  const app = await prisma.equipApplication.findUnique({
    where: { id },
    include: {
      user:     { select: { id: true, name: true, email: true, organization: true, jobTitle: true } },
      reviewer: { select: { id: true, name: true, email: true } },
      messages: {
        orderBy: { createdAt: "asc" },
        include: { user: { select: { id: true, name: true } } },
      },
    },
  });
  if (!app) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Per-PDF rule: "The maximum total funding available per
  // company is $5,000 CAD" for VentureConnect (across up to 3
  // separate applications). We approximate "company" as
  // applicant (User) since most cases are one trainee = one
  // company; admins handle multi-trainee company cases manually
  // by reading the companyName field on each app.
  let fundingHistory: {
    cap: number;
    previouslyApproved: number;
    remaining: number;
    countedApplications: { id: string; status: string; amount: number; decidedAt: Date | null }[];
  } | null = null;
  if (app.stream === "venture_connect") {
    const cap = STREAM_BUDGETS.venture_connect;
    const prior = await prisma.equipApplication.findMany({
      where: {
        userId: app.userId,
        stream: "venture_connect",
        id: { not: id },
        status: { in: ["approved", "funded"] },
      },
      select: { id: true, status: true, approvedAmount: true, decidedAt: true },
    });
    const previouslyApproved = prior.reduce<number>((s, p) => s + (p.approvedAmount ?? 0), 0);
    fundingHistory = {
      cap,
      previouslyApproved,
      remaining: Math.max(0, cap - previouslyApproved),
      countedApplications: prior.map((p) => ({
        id: p.id,
        status: p.status,
        amount: p.approvedAmount ?? 0,
        decidedAt: p.decidedAt,
      })),
    };
  }

  return NextResponse.json({ application: app, fundingHistory });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireCommitteeOrAdmin(["equip_review"]);
  const reviewerId = (session?.user as { id?: string })?.id;
  if (!reviewerId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  const target = body.status as EquipStatus | undefined;
  const reviewerNote = (body.reviewerNote as string | undefined)?.slice(0, 4000);
  const approvedAmount = typeof body.approvedAmount === "number" ? body.approvedAmount : undefined;
  const disbursementNote = (body.disbursementNote as string | undefined)?.slice(0, 2000);

  if (!target || !TARGET_STATUSES.has(target)) {
    return NextResponse.json({ error: "Invalid target status" }, { status: 400 });
  }

  const app = await prisma.equipApplication.findUnique({
    where: { id },
    select: { id: true, userId: true, status: true, requestedAmount: true, stream: true, milestones: true },
  });
  if (!app) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Per-applicant cumulative VC cap enforcement.
  if (target === "approved" && app.stream === "venture_connect" && typeof approvedAmount === "number") {
    const prior = await prisma.equipApplication.aggregate({
      where: {
        userId: app.userId,
        stream: "venture_connect",
        id: { not: app.id },
        status: { in: ["approved", "funded"] },
      },
      _sum: { approvedAmount: true },
    });
    const previouslyApproved = prior._sum.approvedAmount ?? 0;
    const remaining = STREAM_BUDGETS.venture_connect - previouslyApproved;
    if (approvedAmount > remaining) {
      return NextResponse.json(
        {
          error: `Approval would exceed the per-applicant $${STREAM_BUDGETS.venture_connect.toLocaleString()} cap. Applicant has $${previouslyApproved.toLocaleString()} previously approved on VentureConnect — only $${remaining.toLocaleString()} remains.`,
        },
        { status: 400 },
      );
    }
  }

  // State-machine guard. Once terminal (approved/rejected/funded),
  // only the approved → funded leg is allowed.
  if (isTerminal(app.status as EquipStatus)) {
    const isFundingLeg = app.status === "approved" && target === "funded";
    if (!isFundingLeg) {
      return NextResponse.json({ error: "Already decided" }, { status: 409 });
    }
  }

  // Build the patch.
  const now = new Date();
  const data: Record<string, unknown> = { status: target, reviewerId };

  if (target === "under_review") {
    // Soft claim — record reviewer, no decision yet.
    data.reviewedAt = now;
  }
  if (target === "approved") {
    data.decidedAt = now;
    data.reviewedAt = now;
    if (typeof approvedAmount === "number" && approvedAmount > 0) {
      data.approvedAmount = approvedAmount;
    } else if (app.requestedAmount) {
      // Default to the requested amount when reviewer doesn't
      // override. Saves a click.
      data.approvedAmount = app.requestedAmount;
    }
    if (reviewerNote) data.reviewerNote = reviewerNote;
  }
  if (target === "rejected") {
    data.decidedAt = now;
    data.reviewedAt = now;
    data.approvedAmount = null;
    if (reviewerNote) data.reviewerNote = reviewerNote;
  }
  if (target === "funded") {
    data.fundedAt = now;
    if (disbursementNote) data.disbursementNote = disbursementNote;
    // Template the post-funding milestones if there aren't any yet.
    // (Re-funding an already-funded app is gated above, so this is
    // strictly first-time-funded territory.)
    const existing = Array.isArray(app.milestones) ? (app.milestones as unknown[]) : [];
    if (existing.length === 0) {
      data.milestones = templateMilestones(app.stream as EquipStream, now) as unknown as object;
    }
  }

  const updated = await prisma.equipApplication.update({
    where: { id },
    data,
    include: {
      user:     { select: { id: true, name: true, email: true } },
      reviewer: { select: { id: true, name: true } },
    },
  });
  return NextResponse.json({ ok: true, application: updated });
}
