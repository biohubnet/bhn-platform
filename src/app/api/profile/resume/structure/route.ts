/**
 * Self-only structured-resume endpoints.
 *
 *   GET   /api/profile/resume/structure       → my structured resume (creates an empty one on first call)
 *   PATCH /api/profile/resume/structure       → save edits + snapshot a revision
 *
 * Edits are owner-only. Mentors / admins / employers comment via
 * /api/resume/[userId]/comments — they never write to the tree
 * directly.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { emptyResumeContent, type ResumeContent } from "@/lib/resume/types";
import { recordRevision } from "@/lib/resume/revisions";

export const runtime = "nodejs";

async function getMyUserId() {
  const session = await requireSession().catch(() => null);
  if (!session) return null;
  return (session.user as { id?: string }).id ?? null;
}

export async function GET() {
  const userId = await getMyUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let resume = await prisma.resume.findUnique({ where: { userId } });
  if (!resume) {
    resume = await prisma.resume.create({
      data: {
        userId,
        content: emptyResumeContent() as unknown as object,
      },
    });
  }
  return NextResponse.json({ ok: true, resume });
}

export async function PATCH(req: NextRequest) {
  const userId = await getMyUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as {
    content?: ResumeContent;
    note?: string;
  };
  if (!body.content || typeof body.content !== "object") {
    return NextResponse.json({ error: "content is required" }, { status: 400 });
  }
  const note = typeof body.note === "string" ? body.note.trim().slice(0, 200) : null;

  // Save + snapshot a revision in one transaction.
  const updated = await prisma.$transaction(async (tx) => {
    const r = await tx.resume.upsert({
      where: { userId },
      create: {
        userId,
        content: body.content as unknown as object,
        version: 1,
        lastEditedAt: new Date(),
      },
      update: {
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
