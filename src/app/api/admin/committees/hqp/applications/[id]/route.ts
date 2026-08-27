/**
 * Single HQP application — admin decision endpoint.
 *
 *   PATCH /api/admin/committees/hqp/applications/[id]
 *     action=approve | reject
 *     reviewerNote (optional)
 *
 * Approval is transactional: flip the application status AND
 * create / re-activate a CommitteeMembership(slug = "hqp") for
 * the user in the same transaction. The CommitteeMembership row
 * is the single source of truth for "who's on the committee right
 * now" — the application row is the audit trail of how they got
 * there.
 */
import { NextResponse } from "next/server";
import { guardRole } from "@/lib/api/guard";

import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await guardRole("admin");
  if (session instanceof NextResponse) return session;
  const reviewerId = (session.user as { id?: string }).id ?? "";
  const { id } = await params;
  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  const action = typeof body.action === "string" ? body.action : "";
  const reviewerNote = typeof body.reviewerNote === "string" ? body.reviewerNote.slice(0, 4000) : null;

  const existing = await prisma.hqpMemberApplication.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (existing.status !== "submitted") {
    return NextResponse.json({ error: `Already ${existing.status}` }, { status: 409 });
  }

  if (action !== "approve" && action !== "reject") {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const now = new Date();

  if (action === "reject") {
    const updated = await prisma.hqpMemberApplication.update({
      where: { id },
      data: { status: "rejected", decidedAt: now, decidedById: reviewerId, reviewerNote },
    });
    await prisma.auditLog.create({
      data: {
        actorId: reviewerId,
        action: "hqp_application.reject",
        targetType: "hqp_application",
        targetId: id,
        detail: JSON.stringify({ userId: existing.userId, windowId: existing.windowId, note: reviewerNote }),
        ip: req.headers.get("x-forwarded-for") ?? undefined,
      },
    }).catch(() => undefined);
    return NextResponse.json({ ok: true, application: updated });
  }

  // Approve — transactional flip + membership grant.
  const [updated] = await prisma.$transaction([
    prisma.hqpMemberApplication.update({
      where: { id },
      data: { status: "approved", decidedAt: now, decidedById: reviewerId, reviewerNote },
    }),
    prisma.committeeMembership.upsert({
      where: { userId_committee: { userId: existing.userId, committee: "hqp" } },
      create: {
        userId: existing.userId,
        committee: "hqp",
        active: true,
        note: reviewerNote ?? `Approved via HQP open call (${existing.windowId.slice(0, 8)}…)`,
      },
      update: {
        active: true,
        leftAt: null,
        note: reviewerNote ?? undefined,
      },
    }),
  ]);

  await prisma.auditLog.create({
    data: {
      actorId: reviewerId,
      action: "hqp_application.approve",
      targetType: "hqp_application",
      targetId: id,
      detail: JSON.stringify({ userId: existing.userId, windowId: existing.windowId, note: reviewerNote }),
      ip: req.headers.get("x-forwarded-for") ?? undefined,
    },
  }).catch(() => undefined);

  return NextResponse.json({ ok: true, application: updated });
}
