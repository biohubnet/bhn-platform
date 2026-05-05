import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: moduleId } = await params;
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as { id?: string }).id!;
  const { status } = await req.json();

  const progress = await prisma.moduleProgress.upsert({
    where: { userId_moduleId: { userId, moduleId } },
    update: {
      status,
      completedAt: status === "completed" ? new Date() : undefined,
    },
    create: {
      userId,
      moduleId,
      status,
      completedAt: status === "completed" ? new Date() : null,
    },
  });

  return NextResponse.json(progress);
}
