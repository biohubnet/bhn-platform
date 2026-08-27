import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params;
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as { id?: string }).id!;
  const { progress } = await req.json();

  // Status on the where-clause: a withdrawn or unapproved enrolment
  // should not accrue progress. updateMany simply matches nothing.
  const updated = await prisma.enrollment.updateMany({
    where: {
      userId,
      courseId,
      status: { in: ["active", "completed", "passed", "complete", "failed", "fail"] },
    },
    data: { progress },
  });
  if (updated.count === 0) {
    return NextResponse.json(
      { error: "Your enrolment in this course is not active.", code: "enrollment_not_active" },
      { status: 403 },
    );
  }

  return NextResponse.json({ ok: true });
}
