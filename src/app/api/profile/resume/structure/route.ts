/**
 * Self-only structured-resume endpoints.
 *
 *   GET   /api/profile/resume/structure?id=…   → that specific resume (or default to most-recently-edited)
 *   PATCH /api/profile/resume/structure         → body: { content, resumeId?, note? } — save + snapshot
 *
 * Edits are owner-only. Mentors / admins / employers comment via
 * /api/resume/[userId]/comments — they never write to the tree
 * directly.
 *
 * Multi-resume aware: users now own one base resume + zero-or-more
 * tailored copies (see 20260706 migration). Endpoints accept an
 * optional resumeId; without one they target the most-recently-
 * edited non-archived resume.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { type ResumeContent } from "@/lib/resume/types";
import { recordRevision } from "@/lib/resume/revisions";
import { getActiveResume, getOrCreateActiveResume } from "@/lib/resume/active";

export const runtime = "nodejs";

async function getMyUserId() {
  const session = await requireSession().catch(() => null);
  if (!session) return null;
  return (session.user as { id?: string }).id ?? null;
}

export async function GET(req: NextRequest) {
  const userId = await getMyUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const resumeId = req.nextUrl.searchParams.get("id");
  const basic = await getOrCreateActiveResume({ userId, resumeId });

  // Fetch the full record now we know the id — keeps the helper's
  // selector narrow while still returning content here.
  const resume = await prisma.resume.findUnique({ where: { id: basic.id } });
  return NextResponse.json({ ok: true, resume });
}

export async function PATCH(req: NextRequest) {
  const userId = await getMyUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as {
    content?: ResumeContent;
    resumeId?: string;
    note?: string;
  };
  if (!body.content || typeof body.content !== "object") {
    return NextResponse.json({ error: "content is required" }, { status: 400 });
  }
  const note = typeof body.note === "string" ? body.note.trim().slice(0, 200) : null;

  // Resolve which resume to patch. PATCH never auto-creates — the
  // editor only ever PATCHes a resume that GET already loaded.
  const target = await getActiveResume({ userId, resumeId: body.resumeId ?? null });
  if (!target) {
    return NextResponse.json({ error: "Resume not found." }, { status: 404 });
  }

  // Save + snapshot a revision in one transaction.
  const updated = await prisma.$transaction(async (tx) => {
    const r = await tx.resume.update({
      where: { id: target.id },
      data: {
        content: body.content as unknown as object,
        version: { increment: 1 },
        lastEditedAt: new Date(),
      },
    });
    // Auto-save → coalesce into the most recent "user" revision when
    // one's within the last 5 minutes. Without this every keystroke
    // burst created 20+ revisions per session and the history drawer
    // became unusable. See src/lib/resume/revisions.ts for details.
    await recordRevision(tx, {
      resumeId: r.id,
      version: r.version,
      content: body.content as unknown as object,
      triggeredBy: "user",
      note,
    });
    return r;
  });

  return NextResponse.json({ ok: true, resume: updated });
}
