/**
 * Website review — public capture endpoint.
 *
 *   POST    /api/public/page-review/[token]   { body, anchor* , authorName }
 *   OPTIONS /api/public/page-review/[token]   CORS preflight
 *
 * Called by the review bookmarklet running on biohubnet.ca, so it is
 * cross-origin and cannot rely on the session cookie. Possession of the
 * review's shareToken is the credential — exactly like the EQUIP report
 * share links, except this one grants *append* rather than read.
 *
 * Deliberately narrow: a token can add a comment or a reply, and nothing
 * else. No edit, no delete, no export, no reading the existing thread —
 * so a leaked bookmarklet can add noise, never remove or exfiltrate work.
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  PAGE_REVIEW_COMMENT_LIMIT,
  PAGE_REVIEW_RATE_MAX,
  PAGE_REVIEW_RATE_WINDOW_MS,
} from "@/lib/page-review/limits";

export const dynamic = "force-dynamic";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
};

const oneLine = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) =>
      value
        .replace(/[\u0000-\u001f\u007f]+/g, " ")
        .replace(/\s+/g, " ")
        .trim(),
    );

const Schema = z.object({
  body: z.string().trim().min(2, "Say a little more.").max(4000),
  authorName: oneLine(80).optional(),
  parentId: z.string().min(1).optional().nullable(),
  anchorQuote: oneLine(600).optional().nullable(),
  anchorKey: oneLine(300).optional().nullable(),
  anchorPath: oneLine(600).optional().nullable(),
  anchorBlock: oneLine(200).optional().nullable(),
});

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;

  const review = await prisma.pageReview.findUnique({
    where: { shareToken: token },
    select: { id: true, round: true, status: true },
  });
  if (!review) {
    return NextResponse.json({ error: "This review link is no longer active." }, { status: 404, headers: CORS });
  }
  if (review.status === "closed") {
    return NextResponse.json({ error: "This review is closed." }, { status: 409, headers: CORS });
  }

  const parsed = Schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Check the comment." },
      { status: 400, headers: CORS },
    );
  }
  const d = parsed.data;

  const [recentCount, totalCount] = await prisma.$transaction([
    prisma.pageComment.count({
      where: {
        reviewId: review.id,
        createdAt: { gte: new Date(Date.now() - PAGE_REVIEW_RATE_WINDOW_MS) },
      },
    }),
    prisma.pageComment.count({ where: { reviewId: review.id } }),
  ]);
  if (recentCount >= PAGE_REVIEW_RATE_MAX) {
    return NextResponse.json(
      { error: "This review is receiving comments too quickly. Try again in a minute." },
      { status: 429, headers: { ...CORS, "Retry-After": "60" } },
    );
  }
  if (totalCount >= PAGE_REVIEW_COMMENT_LIMIT) {
    return NextResponse.json(
      { error: "This review has reached its comment limit. Ask an admin to open a new review." },
      { status: 409, headers: CORS },
    );
  }

  // A reply inherits its parent's anchor — a thread is about one element.
  let anchors = {
    anchorQuote: d.anchorQuote ?? null,
    anchorKey: d.anchorKey ?? null,
    anchorPath: d.anchorPath ?? null,
    anchorBlock: d.anchorBlock ?? null,
  };
  if (d.parentId) {
    const parent = await prisma.pageComment.findFirst({
      where: { id: d.parentId, reviewId: review.id },
      select: { anchorQuote: true, anchorKey: true, anchorPath: true, anchorBlock: true },
    });
    if (!parent) {
      return NextResponse.json({ error: "That thread is gone." }, { status: 404, headers: CORS });
    }
    anchors = parent;
  }

  await prisma.pageComment.create({
    data: {
      reviewId: review.id,
      parentId: d.parentId ?? null,
      round: review.round,
      ...anchors,
      authorName: d.authorName || "Someone",
      authorKind: "anon",
      body: d.body,
    },
  });
  await prisma.pageReview.update({ where: { id: review.id }, data: { updatedAt: new Date() } });

  return NextResponse.json({ ok: true }, { headers: CORS });
}
