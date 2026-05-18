/**
 * POST /api/courses/[id]/favorite — toggle a user's heart on a
 * catalog card. If a CourseFavorite row exists for (userId,
 * courseId), delete it (un-favorite); otherwise create one
 * (favorite). Returns { favorited: boolean } reflecting the NEW
 * state after the toggle.
 *
 * Idempotent at the record level — the unique (userId, courseId)
 * constraint means double-clicks resolve to one row max either
 * way. Returns 401 for unauthenticated requests; the catalog
 * page is auth-gated anyway, so this is just defence in depth.
 */
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  const userId = session?.user
    ? (session.user as { id?: string }).id
    : null;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: courseId } = await params;
  if (!courseId) {
    return NextResponse.json({ error: "Missing course id" }, { status: 400 });
  }

  try {
    // Look up first so we know which branch to take. Two round-
    // trips is fine here — favorites get tapped at most a couple
    // of times per session per user.
    const existing = await prisma.courseFavorite.findUnique({
      where: { userId_courseId: { userId, courseId } },
      select: { id: true },
    });
    if (existing) {
      await prisma.courseFavorite.delete({
        where: { userId_courseId: { userId, courseId } },
      });
      return NextResponse.json({ favorited: false });
    }
    await prisma.courseFavorite.create({
      data: { userId, courseId },
    });
    return NextResponse.json({ favorited: true });
  } catch (err) {
    console.error("[courses/favorite] toggle failed", err);
    return NextResponse.json(
      { error: "Toggle failed" },
      { status: 500 },
    );
  }
}
