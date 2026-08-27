/**
 * POST /api/scorm/grant  { courseId }
 *
 * Establishes entitlement to a course's package assets ONCE per launch,
 * and hands back a short-lived signed cookie scoped to that course's
 * asset path. Every subsequent asset request is then authorised by
 * signature alone — see lib/scorm/grant.ts for why that matters.
 *
 * This is a Route Handler specifically because a Server Component
 * cannot set cookies in Next.js; the player page does the same
 * entitlement check for its own redirect, but only a handler can mint
 * the cookie the asset route reads.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireSession, isStaff as checkIsStaff } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canAccessCourseContent } from "@/lib/courses/enrollment-status";
import {
  issueGrant,
  grantCookieName,
  grantCookiePath,
  GRANT_TTL_SECONDS,
} from "@/lib/scorm/grant";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as { id?: string }).id!;
  const role = (session.user as { role?: string }).role ?? "learner";
  const isStaff = checkIsStaff(role);

  const { courseId } = (await req.json()) as { courseId?: string };
  if (typeof courseId !== "string" || courseId.length === 0) {
    return NextResponse.json({ error: "courseId required" }, { status: 400 });
  }

  // The one database check per launch. Staff bypass, as they do on the
  // player page itself — they preview courses they are not enrolled in.
  if (!isStaff) {
    const enrollment = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId } },
      select: { status: true },
    });
    if (!canAccessCourseContent(enrollment?.status)) {
      return NextResponse.json(
        { error: "Your enrolment in this course is not active.", code: "enrollment_not_active" },
        { status: 403 },
      );
    }
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set({
    name: grantCookieName(courseId),
    value: issueGrant(userId, courseId, Date.now()),
    path: grantCookiePath(courseId),
    maxAge: GRANT_TTL_SECONDS,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  return res;
}
