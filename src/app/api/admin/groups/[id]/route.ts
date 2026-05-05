import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireRole("admin");
  const { id } = await params;

  const group = await prisma.group.findUnique({
    where: { id },
    include: {
      members: {
        include: { user: { select: { id: true, name: true, email: true, role: true } } },
        orderBy: { addedAt: "desc" },
      },
      courses: {
        include: { course: { select: { id: true, title: true, status: true } } },
        orderBy: { addedAt: "desc" },
      },
    },
  });

  if (!group) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(group);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireRole("admin");
  const actorId = (session.user as { id?: string }).id!;
  const { id } = await params;

  await prisma.group.delete({ where: { id } });

  await prisma.auditLog.create({
    data: { actorId, action: "group.delete", targetType: "group", targetId: id },
  });

  return NextResponse.json({ ok: true });
}
