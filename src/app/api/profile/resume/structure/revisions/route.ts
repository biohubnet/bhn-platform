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
import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getActiveResume } from "@/lib/resume/active";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id?: string }).id ?? null;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Optional ?id= — list revisions for that specific resume. Without
  // it we list revisions for the most-recently-edited resume.
  const resumeId = req.nextUrl.searchParams.get("id");
  const target = await getActiveResume({ userId, resumeId });
  if (!target) {
    return NextResponse.json({ ok: true, currentVersion: 0, revisions: [] });
  }
  const resume = { id: target.id, version: target.version };

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
