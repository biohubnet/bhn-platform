/**
 * GET /api/adaptive/mastery?courseId=...
 *
 * Returns per-topic mastery for the calling trainee in the specified
 * course. Drives the MasteryHeatmap component on the course detail
 * page + the dashboard mastery strip.
 *
 * Auth: any signed-in user; the response is scoped to that user.
 * Course ID required; 400 otherwise. We don't gate on enrollment —
 * if the trainee has any attempts on the course's assessments, they
 * see their data, full stop. (A stricter gate is fine to add later
 * if leadership decides un-enrolled trainees shouldn't see the
 * heatmap; today there's no signal that matters.)
 */
import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { computeCourseMastery } from "@/lib/adaptive/mastery";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const userId = (session.user as { id?: string }).id!;

  const courseId = req.nextUrl.searchParams.get("courseId")?.trim();
  if (!courseId) {
    return NextResponse.json({ error: "courseId is required" }, { status: 400 });
  }

  const mastery = await computeCourseMastery({ userId, courseId });
  return NextResponse.json({ courseId, topics: mastery });
}
