import { NextRequest, NextResponse } from "next/server";
import { requireRole, requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  await requireSession();
  const announcements = await prisma.announcement.findMany({
    orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
    take: 50,
  });
  return NextResponse.json(announcements);
}

export async function POST(req: NextRequest) {
  const session = await requireRole("admin");
  const authorId = (session.user as { id?: string }).id!;
  const { title, body, courseId, pinned } = await req.json();

  const announcement = await prisma.announcement.create({
    data: { title, body, courseId: courseId || null, authorId, pinned: pinned ?? false },
  });

  return NextResponse.json(announcement, { status: 201 });
}
