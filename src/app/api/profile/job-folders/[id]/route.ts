/**
 * Per-folder reads + mutations (self-only).
 *
 *   GET    /api/profile/job-folders/[id]    → full folder
 *   PATCH  /api/profile/job-folders/[id]    → update any subset of fields
 *   DELETE /api/profile/job-folders/[id]    → soft-archive by default,
 *                                             ?force=true → hard delete
 */
import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logFolderEvent } from "@/lib/job-folders/events";

export const runtime = "nodejs";

const STATUS_LABEL: Record<string, string> = {
  drafting: "Drafting",
  submitted: "Submitted",
  interviewing: "Interviewing",
  offer: "Offer",
  rejected: "Rejected",
  closed: "Closed",
};

interface RouteCtx { params: Promise<{ id: string }> }

async function getMyUserId(): Promise<string | null> {
  const session = await requireSession().catch(() => null);
  if (!session) return null;
  return (session.user as { id?: string }).id ?? null;
}

async function loadOwned(userId: string, id: string) {
  const f = await prisma.jobFolder.findUnique({
    where: { id },
    select: { id: true, userId: true, status: true, deadline: true, appliedAt: true },
  });
  if (!f || f.userId !== userId) return null;
  return f;
}

function isIsoDateString(s: unknown): s is string {
  return typeof s === "string" && !Number.isNaN(new Date(s).getTime());
}

export async function GET(_req: NextRequest, ctx: RouteCtx) {
  const userId = await getMyUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;

  const folder = await prisma.jobFolder.findUnique({
    where: { id },
    include: {
      resume: { select: { id: true, name: true, version: true } },
    },
  });
  if (!folder || folder.userId !== userId) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  // Resolve linked posting in a separate query (relation isn't
  // declared on JobFolder.posting to keep the schema light).
  const posting = folder.postingId
    ? await prisma.internshipPosting.findUnique({
        where: { id: folder.postingId },
        select: { id: true, title: true, companyName: true, positionDetails: true, keySkills: true },
      })
    : null;

  return NextResponse.json({
    ok: true,
    folder: {
      ...folder,
      createdAt: folder.createdAt.toISOString(),
      updatedAt: folder.updatedAt.toISOString(),
      posting,
    },
  });
}

export async function PATCH(req: NextRequest, ctx: RouteCtx) {
  const userId = await getMyUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;

  const owned = await loadOwned(userId, id);
  if (!owned) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const data: Record<string, unknown> = {};
  // Whitelist every field — never trust the client to set anything
  // outside this set.
  if (typeof body.title === "string") {
    const t = body.title.trim().slice(0, 160);
    if (!t) return NextResponse.json({ error: "Title can't be empty." }, { status: 400 });
    data.title = t;
  }
  if (typeof body.jdSnippet === "string") data.jdSnippet = body.jdSnippet.slice(0, 20_000);
  if (typeof body.coverLetter === "string") data.coverLetter = body.coverLetter.slice(0, 30_000);
  if (typeof body.interviewPrep === "string") data.interviewPrep = body.interviewPrep.slice(0, 30_000);
  if (typeof body.notes === "string") data.notes = body.notes.slice(0, 30_000);
  if (typeof body.status === "string") {
    const s = body.status;
    if (!["drafting", "submitted", "interviewing", "offer", "rejected", "closed"].includes(s)) {
      return NextResponse.json({ error: "Bad status." }, { status: 400 });
    }
    data.status = s;
  }
  if (typeof body.isArchived === "boolean") data.isArchived = body.isArchived;

  // Application tracker fields. Allow nulls (clearing).
  if (typeof body.applicationUrl === "string" || body.applicationUrl === null) {
    data.applicationUrl =
      typeof body.applicationUrl === "string"
        ? body.applicationUrl.trim().slice(0, 500) || null
        : null;
  }
  if (typeof body.recruiterName === "string" || body.recruiterName === null) {
    data.recruiterName =
      typeof body.recruiterName === "string"
        ? body.recruiterName.trim().slice(0, 160) || null
        : null;
  }
  if (typeof body.recruiterEmail === "string" || body.recruiterEmail === null) {
    data.recruiterEmail =
      typeof body.recruiterEmail === "string"
        ? body.recruiterEmail.trim().slice(0, 200) || null
        : null;
  }
  if (typeof body.referredBy === "string" || body.referredBy === null) {
    data.referredBy =
      typeof body.referredBy === "string"
        ? body.referredBy.trim().slice(0, 160) || null
        : null;
  }
  if (isIsoDateString(body.appliedAt) || body.appliedAt === null) {
    data.appliedAt = body.appliedAt === null ? null : new Date(body.appliedAt as string);
  }
  if (isIsoDateString(body.deadline) || body.deadline === null) {
    data.deadline = body.deadline === null ? null : new Date(body.deadline as string);
  }
  if (typeof body.resumeId === "string" || body.resumeId === null) {
    if (body.resumeId === null) {
      data.resumeId = null;
    } else {
      const r = await prisma.resume.findUnique({
        where: { id: body.resumeId as string },
        select: { userId: true },
      });
      if (!r || r.userId !== userId) {
        return NextResponse.json({ error: "Resume not found." }, { status: 404 });
      }
      data.resumeId = body.resumeId;
    }
  }
  if (typeof body.postingId === "string" || body.postingId === null) {
    data.postingId = body.postingId;
  }
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  }

  const updated = await prisma.jobFolder.update({
    where: { id },
    data,
  });

  // Auto-log lifecycle events. Only log the meaningful ones — auto-
  // saving body text fires PATCHes constantly and would flood the
  // timeline.
  if (typeof data.status === "string" && data.status !== owned.status) {
    await logFolderEvent({
      folderId: id,
      kind: "status_changed",
      body: `Status changed: ${STATUS_LABEL[owned.status] ?? owned.status} → ${STATUS_LABEL[data.status] ?? data.status}`,
      payload: { from: owned.status, to: data.status },
    });
  }
  if (data.appliedAt !== undefined && data.appliedAt !== null && !owned.appliedAt) {
    await logFolderEvent({
      folderId: id,
      kind: "applied",
      body: `Marked applied on ${(data.appliedAt as Date).toLocaleDateString()}`,
    });
  }
  if (data.deadline !== undefined) {
    if (data.deadline && !owned.deadline) {
      await logFolderEvent({
        folderId: id,
        kind: "deadline_set",
        body: `Deadline set: ${(data.deadline as Date).toLocaleDateString()}`,
      });
    } else if (!data.deadline && owned.deadline) {
      await logFolderEvent({
        folderId: id,
        kind: "deadline_cleared",
        body: "Deadline cleared",
      });
    }
  }

  return NextResponse.json({ ok: true, folder: updated });
}

export async function DELETE(req: NextRequest, ctx: RouteCtx) {
  const userId = await getMyUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;

  const owned = await loadOwned(userId, id);
  if (!owned) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const force = req.nextUrl.searchParams.get("force") === "true";
  if (force) {
    await prisma.jobFolder.delete({ where: { id } });
    return NextResponse.json({ ok: true, hardDeleted: true });
  }
  await prisma.jobFolder.update({ where: { id }, data: { isArchived: true } });
  return NextResponse.json({ ok: true, hardDeleted: false });
}
