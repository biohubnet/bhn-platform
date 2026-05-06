import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { trackServer } from "@/lib/analytics";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireRole("admin").catch(() => null);
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const app = await prisma.creditApplication.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true, email: true, role: true, credits: true, createdAt: true } },
      reviewer: { select: { id: true, name: true, email: true } },
    },
  });
  if (!app) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(app);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireRole("admin").catch(() => null);
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const reviewerId = (session.user as { id?: string }).id!;
  const { id } = await params;
  const body = await req.json();

  const decision = body.decision as "approve" | "reject" | "reopen";
  const note = (body.note as string | undefined)?.trim() ?? null;
  const approvedAmount = body.approvedAmount != null ? Number(body.approvedAmount) : 4800;

  if (decision !== "approve" && decision !== "reject" && decision !== "reopen") {
    return NextResponse.json({ error: "Invalid decision" }, { status: 400 });
  }

  const existing = await prisma.creditApplication.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // State machine:
  //   pending → approve | reject  (normal review)
  //   rejected → approve (reverse-and-grant) | reopen (set back to pending)
  //   approved → no further action
  if (existing.status === "approved") {
    return NextResponse.json(
      { error: "Application is already approved. Credits cannot be granted twice." },
      { status: 409 }
    );
  }
  if (existing.status === "rejected" && decision === "reject") {
    return NextResponse.json({ error: "Application is already rejected." }, { status: 409 });
  }

  // Reopen: clear reviewer fields and set back to pending
  if (decision === "reopen") {
    if (existing.status !== "rejected") {
      return NextResponse.json({ error: "Only rejected applications can be reopened." }, { status: 409 });
    }
    const reopened = await prisma.creditApplication.update({
      where: { id },
      data: {
        status: "pending",
        reviewerId: null,
        reviewerNote: null,
        reviewedAt: null,
      },
    });
    await prisma.auditLog.create({
      data: {
        actorId: reviewerId,
        action: "credit_application.reopen",
        targetType: "credit_application",
        targetId: id,
        detail: JSON.stringify({ userId: existing.userId, previousStatus: "rejected" }),
        ip: req.headers.get("x-forwarded-for") ?? undefined,
      },
    });
    trackServer({
      userId: reviewerId,
      role: "admin",
      name: "credit_app_reopened",
      props: { applicationId: id, applicantId: existing.userId },
    });
    return NextResponse.json(reopened);
  }

  if (decision === "reject") {
    const updated = await prisma.creditApplication.update({
      where: { id },
      data: {
        status: "rejected",
        reviewerId,
        reviewerNote: note,
        reviewedAt: new Date(),
      },
    });
    await prisma.auditLog.create({
      data: {
        actorId: reviewerId,
        action: "credit_application.reject",
        targetType: "credit_application",
        targetId: id,
        detail: JSON.stringify({ userId: existing.userId, note }),
        ip: req.headers.get("x-forwarded-for") ?? undefined,
      },
    });
    trackServer({
      userId: reviewerId,
      role: "admin",
      name: "credit_app_rejected",
      props: { applicationId: id, applicantId: existing.userId },
    });
    return NextResponse.json(updated);
  }

  // Approve — atomic: increment user credits, log credit transaction, update app.
  if (!Number.isFinite(approvedAmount) || approvedAmount <= 0) {
    return NextResponse.json({ error: "Approved amount must be positive." }, { status: 400 });
  }

  const result = await prisma.$transaction(async (tx) => {
    const u = await tx.user.update({
      where: { id: existing.userId },
      data: { credits: { increment: approvedAmount } },
      select: { credits: true },
    });
    await tx.creditTransaction.create({
      data: {
        userId: existing.userId,
        amount: approvedAmount,
        type: "credit",
        reason: "application_approved",
        balanceAfter: u.credits,
      },
    });
    return tx.creditApplication.update({
      where: { id },
      data: {
        status: "approved",
        approvedAmount,
        reviewerId,
        reviewerNote: note,
        reviewedAt: new Date(),
      },
    });
  });

  await prisma.auditLog.create({
    data: {
      actorId: reviewerId,
      action: "credit_application.approve",
      targetType: "credit_application",
      targetId: id,
      detail: JSON.stringify({ userId: existing.userId, approvedAmount, note }),
      ip: req.headers.get("x-forwarded-for") ?? undefined,
    },
  });
  trackServer({
    userId: reviewerId,
    role: "admin",
    name: "credit_app_approved",
    props: { applicationId: id, applicantId: existing.userId, approvedAmount },
  });

  return NextResponse.json(result);
}
