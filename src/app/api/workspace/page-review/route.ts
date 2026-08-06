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

export const dynamic = "force-dynamic";

const CreateSchema = z.object({
  url: z.string().trim().url("Give a full URL, including https://").max(500),
  title: z.string().trim().min(2).max(160),
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

  const review = await prisma.pageReview.create({
    data: {
      url: parsed.data.url,
      title: parsed.data.title,
      // 128-bit URL-safe token — same shape as the EQUIP report share links.
      shareToken: randomBytes(16).toString("base64url"),
      createdById: (session.user as { id?: string }).id ?? null,
    },
    select: { id: true },
  });
  return NextResponse.json({ ok: true, id: review.id });
}
