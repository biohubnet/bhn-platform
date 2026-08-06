/**
 * Website review — one review.
 *
 *   POST /api/workspace/page-review/[id]  { action, ... }
 *
 *     addComment    (instructor+) — new thread, or a reply via parentId
 *     editComment   (author, or admin)
 *     deleteComment (author, or admin) — cascades to its replies
 *     setStatus     (instructor+) — open | resolved | wontfix
 *     export        (admin)       — build the brief and bump the round
 *
 * Editing preserves an audit trail via editCount/editedAt rather than a
 * separate history table: reviewers care that a comment changed and when,
 * not what every intermediate wording was.
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildBrief } from "@/lib/page-review/brief";
import { PAGE_REVIEW_COMMENT_LIMIT } from "@/lib/page-review/limits";

export const dynamic = "force-dynamic";

const AddSchema = z.object({
  action: z.literal("addComment"),
  body: z.string().trim().min(2, "Say a little more.").max(4000),
  parentId: z.string().min(1).optional().nullable(),
  anchorQuote: z.string().trim().max(600).optional().nullable(),
  anchorKey: z.string().trim().max(300).optional().nullable(),
  anchorPath: z.string().trim().max(600).optional().nullable(),
  anchorBlock: z.string().trim().max(200).optional().nullable(),
});
const EditSchema = z.object({
  action: z.literal("editComment"),
  commentId: z.string().min(1),
  body: z.string().trim().min(2).max(4000),
});
const DeleteSchema = z.object({ action: z.literal("deleteComment"), commentId: z.string().min(1) });
const StatusSchema = z.object({
  action: z.literal("setStatus"),
  commentId: z.string().min(1),
  status: z.union([z.literal("open"), z.literal("resolved"), z.literal("wontfix")]),
});

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const action = typeof body?.action === "string" ? body.action : "";

  const session = await requireRole("instructor").catch(() => null);
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const meId = (session.user as { id?: string }).id ?? null;
  const meName = (session.user as { name?: string }).name ?? "Someone";
  const role = (session.user as { role?: string }).role ?? "";
  const isAdmin = role === "admin" || role === "superadmin";

  const review = await prisma.pageReview.findUnique({
    where: { id },
    select: { id: true, url: true, title: true, round: true },
  });
  if (!review) return NextResponse.json({ error: "No such review." }, { status: 404 });

  // ── add ──────────────────────────────────────────────────────
  if (action === "addComment") {
    const p = AddSchema.safeParse(body);
    if (!p.success) {
      return NextResponse.json({ error: p.error.issues[0]?.message ?? "Check the comment." }, { status: 400 });
    }
    const commentCount = await prisma.pageComment.count({ where: { reviewId: id } });
    if (commentCount >= PAGE_REVIEW_COMMENT_LIMIT) {
      return NextResponse.json(
        { error: "This review has reached its comment limit. Open a new review to continue." },
        { status: 409 },
      );
    }
    // A reply inherits its parent's anchor — the thread is about one element.
    let anchors = {
      anchorQuote: p.data.anchorQuote ?? null,
      anchorKey: p.data.anchorKey ?? null,
      anchorPath: p.data.anchorPath ?? null,
      anchorBlock: p.data.anchorBlock ?? null,
    };
    if (p.data.parentId) {
      const parent = await prisma.pageComment.findFirst({
        where: { id: p.data.parentId, reviewId: id },
        select: { anchorQuote: true, anchorKey: true, anchorPath: true, anchorBlock: true },
      });
      if (!parent) return NextResponse.json({ error: "That thread is gone." }, { status: 404 });
      anchors = parent;
    }
    await prisma.pageComment.create({
      data: {
        reviewId: id,
        parentId: p.data.parentId ?? null,
        round: review.round,
        ...anchors,
        authorUserId: meId,
        authorName: meName,
        authorKind: "user",
        body: p.data.body,
      },
    });
    await touch(id);
    return NextResponse.json({ ok: true, ...(await load(id)) });
  }

  // ── edit ─────────────────────────────────────────────────────
  if (action === "editComment") {
    const p = EditSchema.safeParse(body);
    if (!p.success) return NextResponse.json({ error: "Check the comment." }, { status: 400 });
    const c = await prisma.pageComment.findFirst({
      where: { id: p.data.commentId, reviewId: id },
      select: { id: true, authorUserId: true },
    });
    if (!c) return NextResponse.json({ error: "No such comment." }, { status: 404 });
    if (!isAdmin && c.authorUserId !== meId) {
      return NextResponse.json({ error: "You can only edit your own comments." }, { status: 403 });
    }
    await prisma.pageComment.update({
      where: { id: c.id },
      data: { body: p.data.body, editCount: { increment: 1 }, editedAt: new Date() },
    });
    await touch(id);
    return NextResponse.json({ ok: true, ...(await load(id)) });
  }

  // ── delete ───────────────────────────────────────────────────
  if (action === "deleteComment") {
    const p = DeleteSchema.safeParse(body);
    if (!p.success) return NextResponse.json({ error: "Bad request." }, { status: 400 });
    const c = await prisma.pageComment.findFirst({
      where: { id: p.data.commentId, reviewId: id },
      select: { id: true, authorUserId: true },
    });
    if (!c) return NextResponse.json({ error: "No such comment." }, { status: 404 });
    if (!isAdmin && c.authorUserId !== meId) {
      return NextResponse.json({ error: "You can only delete your own comments." }, { status: 403 });
    }
    // Replies have no FK to their parent (parentId is a plain column), so
    // remove them explicitly or they'd be stranded as orphan threads.
    await prisma.$transaction([
      prisma.pageComment.deleteMany({ where: { reviewId: id, parentId: c.id } }),
      prisma.pageComment.delete({ where: { id: c.id } }),
    ]);
    await touch(id);
    return NextResponse.json({ ok: true, ...(await load(id)) });
  }

  // ── resolve / wontfix ────────────────────────────────────────
  if (action === "setStatus") {
    const p = StatusSchema.safeParse(body);
    if (!p.success) return NextResponse.json({ error: "Bad request." }, { status: 400 });
    const c = await prisma.pageComment.findFirst({
      where: { id: p.data.commentId, reviewId: id },
      select: { id: true },
    });
    if (!c) return NextResponse.json({ error: "No such comment." }, { status: 404 });
    await prisma.pageComment.update({ where: { id: c.id }, data: { status: p.data.status } });
    await touch(id);
    return NextResponse.json({ ok: true, ...(await load(id)) });
  }

  // ── export the brief ─────────────────────────────────────────
  if (action === "export") {
    if (!isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const comments = await prisma.pageComment.findMany({
      where: { reviewId: id },
      orderBy: { createdAt: "asc" },
      take: PAGE_REVIEW_COMMENT_LIMIT,
    });
    const brief = buildBrief({
      url: review.url, title: review.title, round: review.round, comments,
    });
    // Bump the round so later comments are attributed to the next pass.
    await prisma.pageReview.update({
      where: { id },
      data: { round: { increment: 1 }, status: "exported" },
    });
    return NextResponse.json({ ok: true, brief, ...(await load(id)) });
  }

  return NextResponse.json({ error: "Unknown action." }, { status: 400 });
}

function touch(id: string) {
  return prisma.pageReview.update({ where: { id }, data: { updatedAt: new Date() } });
}

async function load(id: string) {
  const review = await prisma.pageReview.findUnique({
    where: { id },
    include: {
      comments: {
        orderBy: { createdAt: "asc" },
        take: PAGE_REVIEW_COMMENT_LIMIT,
      },
    },
  });
  return { review };
}
