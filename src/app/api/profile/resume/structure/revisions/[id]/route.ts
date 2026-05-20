/**
 * Resume version history — single revision payload.
 *
 *   GET /api/profile/resume/structure/revisions/[id]
 *
 * Returns the full content tree of one revision so the client can
 * render it in the version-history preview modal. Cross-user lookups
 * are blocked: the revision must belong to the caller's Resume row,
 * otherwise 404.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

interface RouteCtx { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, ctx: RouteCtx) {
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id?: string }).id ?? null;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;

  const revision = await prisma.resumeRevision.findUnique({
    where: { id },
    select: {
      id: true,
      version: true,
      content: true,
      triggeredBy: true,
      note: true,
      createdAt: true,
      resume: { select: { userId: true } },
    },
  });

  // Cross-user lookup → 404 not 403 (don't leak existence of foreign
  // revisions; same pattern used elsewhere in the codebase).
  if (!revision || revision.resume.userId !== userId) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    revision: {
      id: revision.id,
      version: revision.version,
      triggeredBy: revision.triggeredBy,
      note: revision.note,
      content: revision.content,
      createdAt: revision.createdAt.toISOString(),
    },
  });
}
