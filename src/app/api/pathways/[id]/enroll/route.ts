import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { checkPathwayCompletion } from "@/lib/pathway-completion";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: pathwayId } = await params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  const userId = (session.user as { id?: string }).id!;

  const pathway = await prisma.pathway.findUnique({
    where: { id: pathwayId },
    include: { courses: true },
  });
  if (!pathway) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (pathway.status !== "published") return NextResponse.json({ error: "Not published" }, { status: 400 });

  // Auto-enroll in every course in the pathway (skip if already enrolled).
  await prisma.$transaction(async (tx) => {
    await tx.pathwayEnrollment.upsert({
      where: { userId_pathwayId: { userId, pathwayId } },
      create: { userId, pathwayId },
      update: {},
    });

    for (const pc of pathway.courses) {
      await tx.enrollment.upsert({
        where: { userId_courseId: { userId, courseId: pc.courseId } },
        create: { userId, courseId: pc.courseId },
        update: {},
      });
    }
  });

  // If user already completed all prerequisite courses earlier, this issues the pathway cert immediately.
  await checkPathwayCompletion(userId, pathwayId);

  return NextResponse.json({ ok: true }, { status: 201 });
}
