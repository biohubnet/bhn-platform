/**
 * Resume version history — metadata list.
 *
 *   GET /api/profile/resume/structure/revisions
 *
 * Returns the calling user's ResumeRevision snapshots in reverse-
 * version order. NO content payload — that's per-revision via
 * /revisions/[id]. Keeps the list response small even for resumes
 * with hundreds of revisions (every auto-save creates one).
 *
 * Self-only. Mentors / admins don't see revisions from this endpoint;
 * if we ever surface a "what changed since I last commented?" view
 * on the mentor side it'll be a separate endpoint with its own
 * permission check.
 */
import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id?: string }).id ?? null;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const resume = await prisma.resume.findUnique({
    where: { userId },
    select: { id: true, version: true },
  });
  if (!resume) {
    return NextResponse.json({ ok: true, currentVersion: 0, revisions: [] });
  }

  const revisions = await prisma.resumeRevision.findMany({
    where: { resumeId: resume.id },
    select: {
      id: true,
      version: true,
      triggeredBy: true,
      note: true,
      createdAt: true,
    },
    orderBy: { version: "desc" },
    // Cap defensive — even an obsessive editor won't hit this for
    // months. Older revisions are still in the table; we just don't
    // load them all into the UI at once.
    take: 200,
  });
  return NextResponse.json({
    ok: true,
    currentVersion: resume.version,
    revisions: revisions.map((r) => ({
      id: r.id,
      version: r.version,
      triggeredBy: r.triggeredBy,
      note: r.note,
      createdAt: r.createdAt.toISOString(),
    })),
  });
}
