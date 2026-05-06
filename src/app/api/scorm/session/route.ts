import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { onCourseCompleted } from "@/lib/pathway-completion";

// GET: fetch or create a SCORM session
export async function GET(req: NextRequest) {
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as { id?: string }).id!;
  const { searchParams } = new URL(req.url);
  const packageId = searchParams.get("packageId");
  if (!packageId) return NextResponse.json({ error: "packageId required" }, { status: 400 });

  const latest = await prisma.scormSession.findFirst({
    where: { userId, packageId },
    orderBy: { attemptNumber: "desc" },
  });

  return NextResponse.json(latest ?? null);
}

// POST: create new attempt
export async function POST(req: NextRequest) {
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as { id?: string }).id!;
  const { packageId } = await req.json();

  const last = await prisma.scormSession.findFirst({
    where: { userId, packageId },
    orderBy: { attemptNumber: "desc" },
  });

  const scormSession = await prisma.scormSession.create({
    data: {
      userId,
      packageId,
      attemptNumber: (last?.attemptNumber ?? 0) + 1,
      status: "not attempted",
    },
  });

  return NextResponse.json(scormSession, { status: 201 });
}

// PATCH: update SCORM data model
export async function PATCH(req: NextRequest) {
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as { id?: string }).id!;
  const body = await req.json();
  const { sessionId, ...data } = body;

  const scormSession = await prisma.scormSession.findUnique({ where: { id: sessionId } });
  if (!scormSession || scormSession.userId !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const isComplete =
    data.status === "completed" || data.status === "passed" || data.status === "failed";

  const updated = await prisma.scormSession.update({
    where: { id: sessionId },
    data: {
      ...(data.status !== undefined ? { status: data.status } : {}),
      ...(data.score !== undefined ? { score: data.score } : {}),
      ...(data.scoreMin !== undefined ? { scoreMin: data.scoreMin } : {}),
      ...(data.scoreMax !== undefined ? { scoreMax: data.scoreMax } : {}),
      ...(data.timeSpent !== undefined ? { timeSpent: data.timeSpent } : {}),
      ...(data.location !== undefined ? { location: data.location } : {}),
      ...(data.suspendData !== undefined ? { suspendData: data.suspendData } : {}),
      ...(data.interactions !== undefined ? { interactions: JSON.stringify(data.interactions) } : {}),
      ...(isComplete ? { completedAt: new Date() } : {}),
    },
  });

  // Sync enrollment progress
  const pkg = await prisma.scormPackage.findUnique({ where: { id: scormSession.packageId } });
  if (pkg) {
    const enrollmentData: Record<string, unknown> = {};
    if (data.score !== undefined) enrollmentData.score = data.score;
    if (isComplete) {
      enrollmentData.status =
        data.status === "passed" || data.status === "completed" ? "completed" : "failed";
      enrollmentData.completedAt = new Date();
    }
    if (Object.keys(enrollmentData).length > 0) {
      await prisma.enrollment.updateMany({
        where: { userId, courseId: pkg.courseId },
        data: enrollmentData,
      });
    }
    if (enrollmentData.status === "completed") {
      // Fire and forget — issues pathway certificates if all required courses are done.
      onCourseCompleted(userId, pkg.courseId).catch((e) => console.error("pathway sweep:", e));
    }
  }

  return NextResponse.json(updated);
}
