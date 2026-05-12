/**
 * Admin: review a form submission.
 *
 *   POST /api/admin/forms/[slug]/submissions/[sid]/review
 *     body: { action: "approve" | "skip" | "reject", note?: string }
 *
 * Used for the talent-application form to gate submissions before
 * they appear in the talent pool / searchable directory.
 *
 *   approve  — standard review pass; reviewStatus = "approved"
 *   skip     — admin override; reviewStatus = "approved_skip_review"
 *              (same talent-pool effect as approve, flagged in audit
 *              so a separate report can surface which submissions
 *              bypassed the queue)
 *   reject   — reviewStatus = "rejected"; reviewerNote shown to
 *              applicant on their submission view
 *
 * Defence: action is required + validated; only admin can call;
 * reviewer identity stamped from session, not body.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const VALID_ACTIONS = ["approve", "skip", "reject"] as const;
type Action = (typeof VALID_ACTIONS)[number];
function isAction(s: unknown): s is Action {
  return typeof s === "string" && (VALID_ACTIONS as readonly string[]).includes(s);
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ slug: string; sid: string }> },
) {
  const session = await requireRole("admin").catch(() => null);
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const reviewerId = (session.user as { id?: string }).id;

  const { slug, sid } = await ctx.params;
  const form = await prisma.eventForm.findUnique({ where: { slug }, select: { id: true } });
  if (!form) return NextResponse.json({ error: "Form not found" }, { status: 404 });

  const submission = await prisma.eventFormSubmission.findUnique({
    where: { id: sid },
    select: { id: true, formId: true },
  });
  if (!submission || submission.formId !== form.id) {
    return NextResponse.json({ error: "Submission not found for this form" }, { status: 404 });
  }

  const body = (await req.json().catch(() => ({}))) as { action?: unknown; note?: unknown };
  if (!isAction(body.action)) {
    return NextResponse.json(
      { error: `action must be one of: ${VALID_ACTIONS.join(", ")}` },
      { status: 400 },
    );
  }
  const note = typeof body.note === "string" ? body.note.trim().slice(0, 2000) || null : null;

  const newStatus =
    body.action === "approve" ? "approved"
    : body.action === "skip" ? "approved_skip_review"
    : "rejected";

  const updated = await prisma.eventFormSubmission.update({
    where: { id: sid },
    data: {
      reviewStatus: newStatus,
      reviewedBy: reviewerId ?? null,
      reviewedAt: new Date(),
      reviewerNote: note,
    },
    select: { id: true, reviewStatus: true, reviewedAt: true, reviewerNote: true },
  });

  // Audit trail — admin "skip approval" is the operationally
  // interesting case; we log every review action for symmetry so a
  // future report can show the full review history without
  // bolting on a separate audit query.
  try {
    await prisma.auditLog.create({
      data: {
        actorId: reviewerId ?? "system",
        action: `form_submission_${body.action}`,
        targetType: "event_form_submission",
        targetId: sid,
        detail: JSON.stringify({ slug, action: body.action, hadNote: !!note }),
      },
    });
  } catch (e) {
    // Audit log failure shouldn't block the review action — it's a
    // secondary record. Surface to ops via console.
    console.error("audit-log failure on form review:", (e as Error).message);
  }

  return NextResponse.json({ ok: true, submission: updated });
}
