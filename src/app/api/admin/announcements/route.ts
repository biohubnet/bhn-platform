import { NextRequest, NextResponse } from "next/server";
import { guardRole, guardSession } from "@/lib/api/guard";

import { prisma } from "@/lib/prisma";

export async function GET() {
  const _guard = await guardSession();
  if (_guard instanceof NextResponse) return _guard;
  const announcements = await prisma.announcement.findMany({
    orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
    take: 50,
  });
  return NextResponse.json(announcements);
}

export async function POST(req: NextRequest) {
  const session = await guardRole("admin");
  if (session instanceof NextResponse) return session;
  const authorId = (session.user as { id?: string }).id!;
  const { title, body, courseId, pinned } = await req.json();

  const announcement = await prisma.announcement.create({
    data: { title, body, courseId: courseId || null, authorId, pinned: pinned ?? false },
  });

  return NextResponse.json(announcement, { status: 201 });
}
