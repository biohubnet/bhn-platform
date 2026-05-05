import { NextRequest, NextResponse } from "next/server";
import { requireSession, requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as { id?: string }).id!;
  const userRole = (session.user as { role?: string }).role;
  const { searchParams } = new URL(req.url);
  const targetUserId = searchParams.get("userId");

  const filterUserId =
    userRole === "admin" && targetUserId ? targetUserId : userId;

  const certs = await prisma.certificate.findMany({
    where: { userId: filterUserId },
    include: {
      course: { select: { id: true, title: true, category: true } },
      user: { select: { id: true, name: true, email: true } },
    },
    orderBy: { issueDate: "desc" },
  });

  return NextResponse.json(certs);
}

export async function POST(req: NextRequest) {
  const session = await requireRole("admin").catch(() => null);
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { userId, courseId, metadata } = await req.json();

  const cert = await prisma.certificate.upsert({
    where: { userId_courseId: { userId, courseId } },
    update: { issueDate: new Date(), metadata: metadata ? JSON.stringify(metadata) : null },
    create: {
      userId,
      courseId,
      metadata: metadata ? JSON.stringify(metadata) : null,
    },
  });

  return NextResponse.json(cert, { status: 201 });
}
