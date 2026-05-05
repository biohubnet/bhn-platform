import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  await requireRole("admin");
  const groups = await prisma.group.findMany({
    include: {
      _count: { select: { members: true, courses: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(groups);
}

export async function POST(req: NextRequest) {
  const session = await requireRole("admin");
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
