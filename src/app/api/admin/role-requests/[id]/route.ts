import { NextRequest, NextResponse } from "next/server";
import { requireRole, ROLE_RANK } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireRole("admin").catch(() => null);
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const reviewerId = (session.user as { id?: string }).id!;
  const reviewerRealRole = (session.user as { realRole?: string }).realRole
    ?? (session.user as { role?: string }).role;
  const { id } = await params;
  const body = await req.json();
  const decision = body.decision as "approve" | "reject";
  const note = (body.note as string | undefined)?.trim() ?? null;

  if (decision !== "approve" && decision !== "reject") {
    return NextResponse.json({ error: "Invalid decision" }, { status: 400 });
  }

  const existing = await prisma.roleChangeRequest.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (existing.status !== "pending") {
    return NextResponse.json(
      { error: `Request already ${existing.status}.` },
      { status: 409 }
    );
  }

  // Only superadmins can approve a request elevating to admin or above.
  if (decision === "approve") {
    const targetRank = ROLE_RANK[existing.toRole] ?? 0;
    const reviewerRank = ROLE_RANK[reviewerRealRole ?? "admin"] ?? ROLE_RANK.admin;
    if (targetRank >= ROLE_RANK.admin && reviewerRank < ROLE_RANK.superadmin) {
      return NextResponse.json(
        { error: "Only a superadmin can approve admin-tier role changes." },
        { status: 403 }
      );
    }
  }

  if (decision === "reject") {
    const updated = await prisma.roleChangeRequest.update({
      where: { id },
      data: { status: "rejected", reviewerId, reviewerNote: note, reviewedAt: new Date() },
    });
    await prisma.auditLog.create({
      data: {
        actorId: reviewerId,
        action: "role_request.reject",
        targetType: "role_request",
        targetId: id,
        detail: JSON.stringify({ userId: existing.userId, fromRole: existing.fromRole, toRole: existing.toRole, note }),
        ip: req.headers.get("x-forwarded-for") ?? undefined,
      },
    });
    return NextResponse.json(updated);
  }

  // Approve: bump the user's role + finalize the request
  const result = await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: existing.userId }, data: { role: existing.toRole } });
    return tx.roleChangeRequest.update({
      where: { id },
      data: { status: "approved", reviewerId, reviewerNote: note, reviewedAt: new Date() },
    });
  });
  await prisma.auditLog.create({
    data: {
      actorId: reviewerId,
      action: "role_request.approve",
      targetType: "role_request",
      targetId: id,
      detail: JSON.stringify({ userId: existing.userId, fromRole: existing.fromRole, toRole: existing.toRole, note }),
      ip: req.headers.get("x-forwarded-for") ?? undefined,
    },
  });
  return NextResponse.json(result);
}
