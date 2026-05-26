/**
 * POST /api/profile/job-folders/[id]/duplicate
 *
 * Clones a folder for the user — JD, resume link, application
 * tracker fields, recruiter info, notes — but BLANKS the cover
 * letter and interview prep (those are the parts the user actually
 * tailors for each new application). The sim-request link, applied-at
 * timestamp, and lifecycle events are NOT carried over since they're
 * tied to a specific application attempt.
 *
 * Use case: applying to a similar role at a different company. Same
 * JD type, same talking points needed, different tailoring. Saves the
 * re-paste-everything tax.
 */
import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logFolderEvent } from "@/lib/job-folders/events";

export const runtime = "nodejs";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireSession().catch(() => null);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = (session.user as { id?: string }).id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const src = await prisma.jobFolder.findUnique({
    where: { id },
    select: {
      id: true,
      userId: true,
      title: true,
      jdSnippet: true,
      resumeId: true,
      postingId: true,
      notes: true,
      applicationUrl: true,
      deadline: true,
      recruiterName: true,
      recruiterEmail: true,
      referredBy: true,
    },
  });
  if (!src || src.userId !== userId) {
    return NextResponse.json({ error: "Folder not found." }, { status: 404 });
  }

  const copy = await prisma.jobFolder.create({
    data: {
      userId,
      title: `${src.title} (copy)`,
      jdSnippet: src.jdSnippet,
      resumeId: src.resumeId,
      postingId: src.postingId,
      notes: src.notes,
      // App tracker — keep the JD-shaped fields (deadline, URL,
      // recruiter contact, referral). Drop the timestamps tied to
      // the source application.
      applicationUrl: src.applicationUrl,
      deadline: src.deadline,
      recruiterName: src.recruiterName,
      recruiterEmail: src.recruiterEmail,
      referredBy: src.referredBy,
      // Explicitly blank the tailored parts.
      coverLetter: "",
      interviewPrep: "",
      // Reset application status — this is a new attempt.
      status: "drafting",
    },
    select: { id: true, title: true },
  });

  await logFolderEvent({
    folderId: copy.id,
    kind: "duplicated",
    body: `Duplicated from "${src.title}"`,
    payload: { sourceFolderId: src.id, sourceTitle: src.title },
  });

  return NextResponse.json({ ok: true, folder: copy });
}
