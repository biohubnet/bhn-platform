/**
 * Self-only collection endpoints for the user's job folders.
 *
 *   GET  /api/profile/job-folders      → list mine
 *   POST /api/profile/job-folders      → create
 *     body: {
 *       title?: string;
 *       jdSnippet?: string;
 *       postingId?: string;
 *       resumeId?: string;
 *     }
 *
 * A job folder bundles JD + tailored resume + cover letter +
 * interview prep into one application-shaped workspace. Per-user.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logFolderEvent } from "@/lib/job-folders/events";

export const runtime = "nodejs";

async function getMyUserId(): Promise<string | null> {
  const session = await requireSession().catch(() => null);
  if (!session) return null;
  return (session.user as { id?: string }).id ?? null;
}

export async function GET() {
  const userId = await getMyUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const folders = await prisma.jobFolder.findMany({
    where: { userId },
    orderBy: [{ isArchived: "asc" }, { updatedAt: "desc" }],
    select: {
      id: true,
      title: true,
      jdSnippet: true,
      status: true,
      isArchived: true,
      postingId: true,
      resumeId: true,
      coverLetter: true,
      interviewPrep: true,
      updatedAt: true,
      createdAt: true,
      resume: { select: { id: true, name: true } },
    },
  });

  // Resolve linked postings in one query.
  const postingIds = Array.from(
    new Set(folders.map((f) => f.postingId).filter((id): id is string => !!id)),
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
    folders: folders.map((f) => ({
      ...f,
      updatedAt: f.updatedAt.toISOString(),
      createdAt: f.createdAt.toISOString(),
      // Cover letter / interview prep payload sizes can be large;
      // for the list we only return a short preview so the index
      // page stays light. The detail page fetches the full thing.
      coverLetterPreview: f.coverLetter ? f.coverLetter.slice(0, 200) : "",
      interviewPrepPreview: f.interviewPrep ? f.interviewPrep.slice(0, 200) : "",
      hasCoverLetter: f.coverLetter.trim().length > 0,
      hasInterviewPrep: f.interviewPrep.trim().length > 0,
      // Trim the actual long-form fields from the response.
      coverLetter: undefined,
      interviewPrep: undefined,
      posting: f.postingId ? (postingById.get(f.postingId) ?? null) : null,
    })),
  });
}

export async function POST(req: NextRequest) {
  const userId = await getMyUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as {
    title?: unknown;
    jdSnippet?: unknown;
    postingId?: unknown;
    resumeId?: unknown;
  };
  const title = typeof body.title === "string" && body.title.trim()
    ? body.title.trim().slice(0, 160)
    : "New job folder";
  const jdSnippet = typeof body.jdSnippet === "string"
    ? body.jdSnippet.slice(0, 20_000)
    : "";
  const postingId = typeof body.postingId === "string" ? body.postingId : null;
  const resumeId = typeof body.resumeId === "string" ? body.resumeId : null;

  // Validate the referenced resume belongs to the caller (when set).
  if (resumeId) {
    const r = await prisma.resume.findUnique({
      where: { id: resumeId },
      select: { userId: true },
    });
    if (!r || r.userId !== userId) {
      return NextResponse.json({ error: "Resume not found." }, { status: 404 });
    }
  }
  // Posting reference can be any platform posting — read-anyone.

  const created = await prisma.jobFolder.create({
    data: { userId, title, jdSnippet, postingId, resumeId },
    select: { id: true, title: true, status: true, createdAt: true },
  });

  // First lifecycle event — anchors the timeline.
  await logFolderEvent({
    folderId: created.id,
    kind: "created",
    body: `Folder created${jdSnippet ? " with starter JD" : ""}`,
  });

  return NextResponse.json({ ok: true, folder: created });
}
