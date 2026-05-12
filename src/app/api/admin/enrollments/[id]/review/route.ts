/**
 * Admin: approve or reject a pending course-enrollment request.
 *
 *   POST /api/admin/enrollments/[id]/review
 *     body: { action: "approve" | "reject", note?: string }
 *
 * Approval flow
 *   • status="pending" + approve → status="active". If the course has
 *     creditCost > 0, the credit deduction runs HERE (deferred from
 *     the user-facing enrol so rejected requests cost the trainee
 *     nothing). If they don't have enough credits we 402 the admin
 *     and leave the request pending so the admin can either grant
 *     credits or reject.
 *   • status="pending" + reject  → status="withdrawn". No credit
 *     movement. The reviewer note can surface back to the trainee
 *     in a follow-up UI (not built here yet — kept on the row for
 *     future surfacing).
 *
 * Idempotent — approving an already-active row is a no-op.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const VALID_ACTIONS = ["approve", "reject"] as const;
type Action = (typeof VALID_ACTIONS)[number];
function isAction(s: unknown): s is Action {
  return typeof s === "string" && (VALID_ACTIONS as readonly string[]).includes(s);
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await requireRole("admin").catch(() => null);
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const reviewerId = (session.user as { id?: string }).id ?? null;

  const { id } = await ctx.params;
  const enrollment = await prisma.enrollment.findUnique({
    where: { id },
    include: {
      course: { select: { id: true, title: true, creditCost: true } },
      user: { select: { id: true, name: true, email: true, credits: true } },
    },
  });
  if (!enrollment) return NextResponse.json({ error: "Enrollment not found" }, { status: 404 });

  if (enrollment.status !== "pending") {
    // Idempotent surface — return current state instead of 4xx
    // when the row was already actioned by another admin.
    return NextResponse.json({ ok: true, alreadyDecided: true, status: enrollment.status });
  }

  const body = (await req.json().catch(() => ({}))) as { action?: unknown };
  if (!isAction(body.action)) {
    return NextResponse.json(
      { error: `action must be one of: ${VALID_ACTIONS.join(", ")}` },
      { status: 400 },
    );
  }

  if (body.action === "reject") {
    const updated = await prisma.enrollment.update({
      where: { id },
      data: { status: "withdrawn" },
    });
    await prisma.auditLog.create({
      data: {
        actorId: reviewerId ?? "system",
        action: "enrollment.reject",
        targetType: "enrollment",
        targetId: id,
        detail: JSON.stringify({ courseId: enrollment.courseId, userId: enrollment.userId }),
      },
    }).catch(() => undefined);
    return NextResponse.json({ ok: true, enrollment: updated });
  }

  // Approve: deduct credits if needed (deferred from the user-facing
  // enrol), then flip status to active.
  const cost = enrollment.course.creditCost;
  if (cost > 0 && enrollment.user.credits < cost) {
    return NextResponse.json(
      {
        error: `Approving would require ${cost} credits but ${enrollment.user.email} only has ${enrollment.user.credits}. Grant credits first, or reject the request.`,
        code: "insufficient_credits",
      },
      { status: 402 },
    );
  }

  await prisma.$transaction(async (tx) => {
    if (cost > 0) {
      const newBalance = enrollment.user.credits - cost;
      await tx.user.update({
        where: { id: enrollment.userId },
        data: { credits: newBalance },
      });
      await tx.creditTransaction.create({
        data: {
          userId: enrollment.userId,
          amount: -cost,
          type: "debit",
          reason: "enrollment",
          courseId: enrollment.courseId,
          balanceAfter: newBalance,
        },
      });
    }
    await tx.enrollment.update({
      where: { id },
      data: { status: "active" },
    });
  });

  await prisma.auditLog.create({
    data: {
      actorId: reviewerId ?? "system",
      action: "enrollment.approve",
      targetType: "enrollment",
      targetId: id,
      detail: JSON.stringify({ courseId: enrollment.courseId, userId: enrollment.userId, creditsDebited: cost }),
    },
  }).catch(() => undefined);

  return NextResponse.json({ ok: true });
}
