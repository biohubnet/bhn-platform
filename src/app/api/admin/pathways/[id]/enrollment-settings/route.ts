import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireRole("admin").catch(() => null);
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const actorId = (session.user as { id?: string }).id!;
  const { id } = await params;
  const body = await req.json();

  const data: Record<string, unknown> = {};
  if (body.enrollmentStatus !== undefined) {
    if (!["open", "closed", "full"].includes(body.enrollmentStatus)) {
      return NextResponse.json({ error: "Invalid enrollmentStatus" }, { status: 400 });
    }
    data.enrollmentStatus = body.enrollmentStatus;
  }
  if (body.enrollmentClosesAt !== undefined) {
    data.enrollmentClosesAt = body.enrollmentClosesAt ? new Date(body.enrollmentClosesAt) : null;
  }
  if (body.enrollmentOpensAt !== undefined) {
    data.enrollmentOpensAt = body.enrollmentOpensAt ? new Date(body.enrollmentOpensAt) : null;
  }
  if (body.capacity !== undefined) {
    const cap = body.capacity == null || body.capacity === "" ? null : Number(body.capacity);
    if (cap !== null && (!Number.isFinite(cap) || cap < 0)) {
      return NextResponse.json({ error: "Capacity must be a positive integer." }, { status: 400 });
    }
    data.capacity = cap;
  }
  if (body.allowWaitlist !== undefined) data.allowWaitlist = !!body.allowWaitlist;

  const updated = await prisma.pathway.update({ where: { id }, data });

  await prisma.auditLog.create({
    data: {
      actorId,
      action: "pathway.enrollment_settings.update",
      targetType: "pathway",
      targetId: id,
      detail: JSON.stringify(data),
      ip: req.headers.get("x-forwarded-for") ?? undefined,
    },
  });

  return NextResponse.json(updated);
}
