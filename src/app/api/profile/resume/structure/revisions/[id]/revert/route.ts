/**
 * Resume version history — revert to a prior revision.
 *
 *   POST /api/profile/resume/structure/revisions/[id]/revert
 *
 * Copies the chosen revision's content back onto Resume.content,
 * bumps Resume.version by one, and stamps a NEW ResumeRevision row
 * tagged `triggeredBy: "revert"` with a note pointing at the source
 * version. This is intentionally non-destructive — the revisions
 * you created between the source and "now" stay in the table, so
 * the user can revert the revert if they regret it.
 *
 * Self-only. The revision must belong to the caller's Resume.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { ResumeContent } from "@/lib/resume/types";

export const runtime = "nodejs";

interface RouteCtx { params: Promise<{ id: string }> }

export async function POST(_req: NextRequest, ctx: RouteCtx) {
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id?: string }).id ?? null;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;

  // Locate the source revision + verify ownership in one read.
  const source = await prisma.resumeRevision.findUnique({
    where: { id },
    select: {
      id: true,
      version: true,
      content: true,
      resume: { select: { id: true, userId: true, version: true } },
    },
  });
  if (!source || source.resume.userId !== userId) {
    return NextResponse.json({ error: "Revision not found." }, { status: 404 });
  }

  // Reverting to the version that's already current is a no-op —
  // tell the caller rather than churning a useless revision row.
  if (source.version === source.resume.version) {
    return NextResponse.json({
      ok: true,
      reverted: false,
      note: `Already at v${source.version} — nothing changed.`,
      version: source.resume.version,
    });
  }

  const content = source.content as unknown as ResumeContent;
  const nextVersion = source.resume.version + 1;

  const updated = await prisma.$transaction(async (tx) => {
    const r = await tx.resume.update({
      where: { id: source.resume.id },
      data: {
        content: content as unknown as object,
        version: nextVersion,
        lastEditedAt: new Date(),
      },
      select: { id: true, version: true },
    });
    await tx.resumeRevision.create({
      data: {
        resumeId: r.id,
        version: r.version,
        content: content as unknown as object,
        triggeredBy: "revert",
        note: `Reverted to v${source.version}`,
      },
    });
    return r;
  });

  return NextResponse.json({
    ok: true,
    reverted: true,
    fromVersion: source.version,
    version: updated.version,
  });
}
