import { NextRequest, NextResponse } from "next/server";
import { guardRole } from "@/lib/api/guard";

import { prisma } from "@/lib/prisma";

export async function GET() {
  const _guard = await guardRole("admin");
  if (_guard instanceof NextResponse) return _guard;
  const groups = await prisma.group.findMany({
    include: {
      _count: { select: { members: true, courses: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(groups);
}

export async function POST(req: NextRequest) {
  const session = await guardRole("admin");
  if (session instanceof NextResponse) return session;
  const actorId = (session.user as { id?: string }).id!;
  const { name, description } = await req.json();

  const group = await prisma.group.create({ data: { name, description } });

  await prisma.auditLog.create({
    data: {
      actorId,
      action: "group.create",
      targetType: "group",
      targetId: group.id,
      detail: JSON.stringify({ name }),
    },
  });

  return NextResponse.json(group, { status: 201 });
}
