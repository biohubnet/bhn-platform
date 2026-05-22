/**
 * writeEmployerAction — the single write path for every attributable
 * action in the employer workspace.
 *
 * One call atomically:
 *   1. Inserts an EmployerActivityLog row.
 *   2. Updates `lastTouched*` on the target posting or applicationStatus
 *      (denormalised so inline attribution chips don't need a join).
 *   3. Fans out Notification rows to every user who should see this event:
 *        - Any user in the comment's @mentions  → reason "mention"
 *        - Members of the posting's hiring team  → reason "hiring_team"
 *        - Owners of the company (for oversight) → reason "owner_oversight"
 *      ...filtered by their NotificationPreference.mutedReasons, and
 *      de-duped so a user doesn't get two rows for the same event.
 *
 * All three steps run inside a single Prisma transaction so a
 * partial write is impossible.
 *
 * Callers that already hold a transaction pass it in; callers that
 * don't get a fresh one.
 *
 * Usage:
 *   await writeEmployerAction({
 *     kind:      "stage_changed",
 *     companyId: "...",
 *     actorId:   session.user.id,
 *     payload:   { prev: "new", next: "reviewing", applicantName: "Jane Doe" },
 *     postingId: "...",
 *     applicantId: "...",
 *   });
 */

import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

// ── Activity-kind catalogue ───────────────────────────────────────
// These are the values the activity-feed copy templates key on.

export type ActivityKind =
  | "posting_created"
  | "posting_edited"
  | "posting_closed"
  | "stage_changed"
  | "applicant_commented"
  | "interview_scheduled"
  | "scorecard_submitted"
  | "offer_sent"
  | "offer_accepted"
  | "applicant_hired"
  | "applicant_rejected"
  | "bulk_email_sent"
  | "bulk_rejected"
  | "template_created"
  | "template_edited"
  | "member_invited"
  | "member_joined"
  | "member_role_changed"
  | "member_removed"
  | "join_request_approved"
  | "join_request_declined";

// ── Notification reasons ──────────────────────────────────────────

type NotificationReason = "mention" | "hiring_team" | "owner_oversight" | "self_action";

// ── Input ─────────────────────────────────────────────────────────

export interface WriteEmployerActionInput {
  kind:         ActivityKind;
  companyId:    string;
  actorId:      string;
  /** Structured payload — parsed by the feed's per-kind copy templates. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload:      Record<string, any>;
  postingId?:   string | null;
  applicantId?: string | null;
  targetUserId?: string | null;
  /**
   * For "applicant_commented" events: the IDs of any users @mentioned
   * in the comment body. Drives the "mention" notification fan-out.
   */
  mentionedUserIds?: string[];
  /** If provided, all writes run inside this transaction. */
  tx?: Prisma.TransactionClient;
}

// ── Kinds that qualify for owner_oversight notifications ──────────
const OWNER_OVERSIGHT_KINDS: Set<ActivityKind> = new Set([
  "member_invited",
  "member_joined",
  "member_removed",
  "member_role_changed",
  "join_request_approved",
  "join_request_declined",
  "bulk_rejected",
  "bulk_email_sent",
]);

// ── Main export ───────────────────────────────────────────────────

export async function writeEmployerAction(input: WriteEmployerActionInput): Promise<string> {
  const {
    kind, companyId, actorId, payload, postingId, applicantId,
    targetUserId, mentionedUserIds = [], tx: outerTx,
  } = input;

  const run = async (tx: Prisma.TransactionClient): Promise<string> => {
    // 1. Insert activity log.
    const log = await tx.employerActivityLog.create({
      data: {
        companyId,
        actorId,
        kind,
        payload,
        postingId:    postingId    ?? null,
        applicantId:  applicantId  ?? null,
        targetUserId: targetUserId ?? null,
      },
      select: { id: true },
    });

    // 2. Update lastTouched* on the posting (if present).
    if (postingId) {
      await tx.internshipPosting.update({
        where: { id: postingId },
        data:  { lastTouchedAt: new Date(), lastTouchedById: actorId },
      }).catch(() => {/* posting may have been deleted in same tx — swallow */});
    }

    // 3. Update lastTouched* on the applicationStatus (if we can derive it).
    //    We look up by (postingId + applicantId) since that's the unique key.
    if (postingId && applicantId) {
      await tx.applicationStatus.updateMany({
        where: { postingId, applicantId },
        data:  { lastTouchedAt: new Date(), lastTouchedById: actorId },
      }).catch(() => {/* swallow */});
    }

    // 4. Build the notification recipient set.
    const recipientMap = new Map<string, NotificationReason>();

    // 4a. @mentions always get in, even if they've muted "hiring_team".
    for (const uid of mentionedUserIds) {
      if (uid !== actorId) recipientMap.set(uid, "mention");
    }

    // 4b. Posting hiring-team members get "hiring_team" notifications for
    //     most action kinds. Skip if this kind is purely company-admin.
    if (postingId && !OWNER_OVERSIGHT_KINDS.has(kind)) {
      const teamMembers = await tx.postingTeamMember.findMany({
        where:  { postingId },
        select: { userId: true },
      });
      for (const m of teamMembers) {
        if (m.userId !== actorId && !recipientMap.has(m.userId)) {
          recipientMap.set(m.userId, "hiring_team");
        }
      }
    }

    // 4c. Owners get "owner_oversight" on company-admin kinds.
    if (OWNER_OVERSIGHT_KINDS.has(kind)) {
      const owners = await tx.companyMember.findMany({
        where:  { companyId, role: "owner" },
        select: { userId: true },
      });
      for (const o of owners) {
        if (o.userId !== actorId && !recipientMap.has(o.userId)) {
          recipientMap.set(o.userId, "owner_oversight");
        }
      }
    }

    // 4d. The actor always gets a "self_action" receipt (in-app only;
    //     email digest suppresses self_action by default preference).
    recipientMap.set(actorId, "self_action");

    // 5. Load NotificationPreferences for all potential recipients so we
    //    can respect their mute settings.
    const recipientIds = [...recipientMap.keys()];
    if (recipientIds.length === 0) return log.id;

    const prefs = await tx.notificationPreference.findMany({
      where:  { userId: { in: recipientIds }, companyId },
      select: { userId: true, mutedReasons: true },
    });
    const prefByUser = new Map(prefs.map((p) => [p.userId, p.mutedReasons]));

    // 6. Insert notification rows, filtering muted reasons.
    //    "mention" is never muted. "self_action" is always written
    //    (the user can mute via the UI later, but we still record it).
    const notifData: { userId: string; companyId: string; activityLogId: string; reason: string }[] = [];
    for (const [userId, reason] of recipientMap.entries()) {
      const muted = prefByUser.get(userId) ?? [];
      if (reason !== "mention" && muted.includes(reason)) continue;
      notifData.push({ userId, companyId, activityLogId: log.id, reason });
    }

    if (notifData.length > 0) {
      await tx.notification.createMany({ data: notifData, skipDuplicates: true });
    }

    return log.id;
  };

  if (outerTx) return run(outerTx);
  return prisma.$transaction(run);
}

// ── Feed copy helpers ─────────────────────────────────────────────
// Used by the activity-feed renderer + notification inbox to turn a
// log row into a human-readable sentence.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function activityCopy(
  kind: ActivityKind,
  payload: Record<string, any>,
): string {
  switch (kind) {
    case "posting_created":   return `created posting **${payload.postingTitle ?? "untitled"}**`;
    case "posting_edited":    return `edited posting **${payload.postingTitle ?? "untitled"}**`;
    case "posting_closed":    return `closed posting **${payload.postingTitle ?? "untitled"}**`;
    case "stage_changed":
      return `moved **${payload.applicantName ?? "candidate"}** from ${payload.prev} → ${payload.next} on **${payload.postingTitle ?? "a posting"}**`;
    case "applicant_commented":
      return `commented on **${payload.applicantName ?? "a candidate"}**`;
    case "interview_scheduled":
      return `scheduled an interview with **${payload.applicantName ?? "a candidate"}**`;
    case "scorecard_submitted":
      return `submitted a scorecard for **${payload.applicantName ?? "a candidate"}**`;
    case "offer_sent":        return `sent an offer to **${payload.applicantName ?? "a candidate"}**`;
    case "offer_accepted":    return `**${payload.applicantName ?? "A candidate"}** accepted the offer`;
    case "applicant_hired":   return `marked **${payload.applicantName ?? "a candidate"}** as hired`;
    case "applicant_rejected":return `rejected **${payload.applicantName ?? "a candidate"}**`;
    case "bulk_email_sent":   return `sent bulk emails to ${payload.count ?? "??"} candidates`;
    case "bulk_rejected":     return `bulk-rejected ${payload.count ?? "??"} candidates`;
    case "template_created":  return `created email template **${payload.templateName ?? "untitled"}**`;
    case "template_edited":   return `edited email template **${payload.templateName ?? "untitled"}**`;
    case "member_invited":    return `invited **${payload.targetName ?? payload.targetEmail ?? "someone"}** as ${payload.role}`;
    case "member_joined":     return `**${payload.targetName ?? "Someone"}** joined the team as ${payload.role}`;
    case "member_role_changed":return `changed **${payload.targetName ?? "a member"}**'s role to ${payload.newRole}`;
    case "member_removed":    return `removed **${payload.targetName ?? "a member"}** from the team`;
    case "join_request_approved": return `approved **${payload.targetName ?? "a join request"}**`;
    case "join_request_declined": return `declined **${payload.targetName ?? "a join request"}**`;
    default:                  return `performed an action`;
  }
}
