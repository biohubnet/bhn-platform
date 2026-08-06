/**
 * Website review — the review collection.
 *
 *   GET  /api/workspace/page-review   → reviews, most recently touched first
 *   POST /api/workspace/page-review   → open a review on a URL (admin)
 *
 * Opening a review mints a share token so colleagues can comment from the
 * page itself without a platform account.
 */
import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { normalizeReviewUrl, pageNameFromReviewUrl } from "@/lib/page-review/access";

export const dynamic = "force-dynamic";

const CreateSchema = z.object({
  url: z.string().trim().min(1, "Enter a website address.").max(500),
});

export async function GET() {
  const session = await requireRole("instructor").catch(() => null);
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const reviews = await prisma.pageReview.findMany({
    orderBy: { updatedAt: "desc" },
    take: 50,
    select: {
      id: true, url: true, title: true, status: true, round: true,
      createdAt: true, updatedAt: true,
      _count: { select: { comments: true } },
    },
  });
  return NextResponse.json({ ok: true, reviews });
}

export async function POST(req: NextRequest) {
  const session = await requireRole("admin").catch(() => null);
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = CreateSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Check the URL and title." },
      { status: 400 },
    );
  }

  let url: string;
  try {
    url = normalizeReviewUrl(parsed.data.url);
  } catch {
    return NextResponse.json(
      { error: "Enter a valid website address." },
      { status: 400 },
    );
  }
  const activeReviews = await prisma.pageReview.findMany({
    where: { status: { not: "closed" } },
    orderBy: { updatedAt: "desc" },
    select: { id: true, url: true },
  });
  const existing = activeReviews.find((review) => normalizeReviewUrl(review.url) === url);
  if (existing) {
    await prisma.pageReview.update({
      where: { id: existing.id },
      data: { updatedAt: new Date() },
    });
    return NextResponse.json({ ok: true, id: existing.id, reused: true });
  }

  const review = await prisma.pageReview.create({
    data: {
      url,
      title: pageNameFromReviewUrl(url),
      // 128-bit URL-safe token — same shape as the EQUIP report share links.
      shareToken: randomBytes(16).toString("base64url"),
      createdById: (session.user as { id?: string }).id ?? null,
    },
    select: { id: true },
  });
  return NextResponse.json({ ok: true, id: review.id });
}
