/**
 * Explicit "Snapshot now" — pin a named revision the user picks.
 *
 *   POST /api/profile/resume/structure/revisions/snapshot
 *     body: { note?: string }
 *
 * Captures the current Resume.content as a new ResumeRevision with
 * triggeredBy: "snapshot". Unlike plain auto-save (which coalesces
 * into the most recent "user" revision within a 5-minute window),
 * explicit snapshots ALWAYS create a fresh row — they're how the
 * user puts an immovable marker in their history before, say, a
 * risky restructure.
 *
 * The note is optional; sensible default is "Manual snapshot."
 * Self-only.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recordRevision } from "@/lib/resume/revisions";
import { getActiveResume } from "@/lib/resume/active";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id?: string }).id ?? null;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as { note?: unknown; resumeId?: unknown };
  const note = typeof body.note === "string" && body.note.trim()
    ? body.note.trim().slice(0, 200)
    : "Manual snapshot";
  const targetResumeId = typeof body.resumeId === "string" ? body.resumeId : null;

  const target = await getActiveResume({ userId, resumeId: targetResumeId });
  if (!target) {
    return NextResponse.json(
      { error: "No resume to snapshot yet. Edit your resume first." },
      { status: 400 },
    );
  }
  const resume = await prisma.resume.findUnique({
    where: { id: target.id },
    select: { id: true, content: true, version: true },
  });
  if (!resume) {
    return NextResponse.json(
      { error: "No resume to snapshot yet. Edit your resume first." },
      { status: 400 },
    );
  }

  const rev = await recordRevision(prisma, {
    resumeId: resume.id,
    version: resume.version,
    content: resume.content as unknown as object,
    triggeredBy: "snapshot",
    note,
  });

  return NextResponse.json({ ok: true, revisionId: rev.id, version: resume.version });
}
