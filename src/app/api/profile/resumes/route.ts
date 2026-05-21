/**
 * Self-only collection endpoints for the user's set of resumes.
 *
 *   GET  /api/profile/resumes               → list mine (lightweight metadata)
 *   POST /api/profile/resumes               → create a new resume
 *     body: {
 *       name?: string;                       // defaults to "New resume"
 *       sourceResumeId?: string;             // duplicate from this id (otherwise blank)
 *     }
 *
 * Multi-resume support: every user can own one base resume + zero-or-
 * more tailored / variant copies. See the 20260706 migration for the
 * schema change that dropped the unique constraint on userId.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { emptyResumeContent } from "@/lib/resume/types";

export const runtime = "nodejs";

async function getMyUserId(): Promise<string | null> {
  const session = await requireSession().catch(() => null);
  if (!session) return null;
  return (session.user as { id?: string }).id ?? null;
}

export async function GET() {
  const userId = await getMyUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Include the derivation chain + posting linkage so the index page
  // can show "Tailored from Main resume → STEMCELL · Process Engineer".
  const resumes = await prisma.resume.findMany({
    where: { userId },
    orderBy: [{ isArchived: "asc" }, { lastEditedAt: "desc" }],
    select: {
      id: true,
      name: true,
      isArchived: true,
      lastEditedAt: true,
      version: true,
      parsedAt: true,
      derivedFromId: true,
      derivedForPostingId: true,
      derivedFrom: { select: { id: true, name: true } },
      _count: { select: { comments: true, revisions: true } },
    },
  });

  // Resolve derived-from posting titles in a single secondary query —
  // each derived resume references at most one posting and we can
  // look them all up in a single `in:` clause.
  const postingIds = Array.from(
    new Set(
      resumes
        .map((r) => r.derivedForPostingId)
        .filter((id): id is string => !!id),
    ),
  );
  const postings = postingIds.length
    ? await prisma.internshipPosting.findMany({
        where: { id: { in: postingIds } },
        select: { id: true, title: true, companyName: true },
      })
    : [];
  const postingById = new Map(postings.map((p) => [p.id, p]));

  return NextResponse.json({
    ok: true,
    resumes: resumes.map((r) => ({
      id: r.id,
      name: r.name,
      isArchived: r.isArchived,
      lastEditedAt: r.lastEditedAt.toISOString(),
      version: r.version,
      hasParsed: !!r.parsedAt,
      derivedFrom: r.derivedFrom,
      derivedForPosting: r.derivedForPostingId
        ? (postingById.get(r.derivedForPostingId) ?? null)
        : null,
      commentCount: r._count.comments,
      revisionCount: r._count.revisions,
    })),
  });
}

export async function POST(req: NextRequest) {
  const userId = await getMyUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as {
    name?: unknown;
    sourceResumeId?: unknown;
  };
  const name = typeof body.name === "string" && body.name.trim()
    ? body.name.trim().slice(0, 120)
    : "New resume";
  const sourceResumeId = typeof body.sourceResumeId === "string"
    ? body.sourceResumeId
    : null;

  // When duplicating from an existing resume, load its content +
  // ownership in one go. Cross-user duplication is rejected (the
  // source must belong to the caller).
  let content: unknown = emptyResumeContent();
  let derivedFromId: string | null = null;
  if (sourceResumeId) {
    const src = await prisma.resume.findUnique({
      where: { id: sourceResumeId },
      select: { userId: true, content: true },
    });
    if (!src || src.userId !== userId) {
      return NextResponse.json({ error: "Source resume not found." }, { status: 404 });
    }
    content = src.content;
    derivedFromId = sourceResumeId;
  }

  const created = await prisma.resume.create({
    data: {
      userId,
      name,
      content: content as unknown as object,
      derivedFromId,
    },
    select: { id: true, name: true, lastEditedAt: true, version: true },
  });

  return NextResponse.json({ ok: true, resume: created });
}
