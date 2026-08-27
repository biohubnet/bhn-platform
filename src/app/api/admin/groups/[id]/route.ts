import { NextRequest, NextResponse } from "next/server";
import { guardRole } from "@/lib/api/guard";

import { prisma } from "@/lib/prisma";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const _guard = await guardRole("admin");
  if (_guard instanceof NextResponse) return _guard;
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
  const session = await guardRole("admin");
  if (session instanceof NextResponse) return session;
  const actorId = (session.user as { id?: string }).id!;
  const { id } = await params;

  await prisma.group.delete({ where: { id } });

  await prisma.auditLog.create({
    data: { actorId, action: "group.delete", targetType: "group", targetId: id },
  });

  return NextResponse.json({ ok: true });
}
