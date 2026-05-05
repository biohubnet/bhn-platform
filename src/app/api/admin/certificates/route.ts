import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  await requireRole("admin");
  const certs = await prisma.certificate.findMany({
    include: {
      user: { select: { id: true, name: true, email: true } },
      course: { select: { id: true, title: true } },
    },
    orderBy: { issueDate: "desc" },
    take: 500,
  });
  return NextResponse.json(certs);
}

export async function POST(req: NextRequest) {
  const session = await requireRole("admin");
  const actorId = (session.user as { id?: string }).id!;
  const { userId, courseId, expiryDate } = await req.json();

  const cert = await prisma.certificate.upsert({
    where: { userId_courseId: { userId, courseId } },
    update: { revokedAt: null, revokedBy: null, ...(expiryDate && { expiryDate: new Date(expiryDate) }) },
    create: {
      userId,
      courseId,
      ...(expiryDate && { expiryDate: new Date(expiryDate) }),
    },
    include: {
      user: { select: { name: true, email: true } },
      course: { select: { title: true } },
    },
  });

  await prisma.auditLog.create({
    data: {
      actorId,
      action: "certificate.issue",
      targetType: "certificate",
      targetId: cert.id,
      detail: JSON.stringify({ userId, courseId }),
    },
  });

  return NextResponse.json(cert, { status: 201 });
}
