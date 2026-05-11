/**
 * Theme votes — up to MAX_VOTES_PER_SENTIMENT (3) favourites and 3
 * least-favourites per user.
 *
 *   POST   /api/themes/vote     body:  { themeId, sentiment }
 *     • Idempotent: re-voting an existing (user, sentiment, theme)
 *       triple returns success without a write.
 *     • Cap-checked: if the user already has MAX_VOTES_PER_SENTIMENT
 *       votes for this sentiment, returns 409.
 *     • Conflict rule: a theme can't be both favourite AND least-
 *       favourite for the same user. Setting favourite=X silently
 *       clears any prior least-favourite=X in the same transaction
 *       (clear change-of-mind, not an error).
 *
 *   DELETE /api/themes/vote     query: ?themeId=X&sentiment=Y
 *     • Clears one specific vote. With multiple votes per
 *       sentiment, the user picks which one to remove — so themeId
 *       is now required.
 */
import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  isValidThemeId,
  isValidSentiment,
  MAX_VOTES_PER_SENTIMENT,
  VOTE_SENTIMENTS,
} from "@/lib/themes/constants";

export async function POST(req: Request) {
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id?: string }).id ?? null;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "Body must be a JSON object" }, { status: 400 });
  }
  const { themeId, sentiment } = body as Record<string, unknown>;

  if (typeof themeId !== "string" || !isValidThemeId(themeId)) {
    return NextResponse.json(
      { error: "themeId must be a valid theme identifier" },
      { status: 400 },
    );
  }
  if (typeof sentiment !== "string" || !isValidSentiment(sentiment)) {
    return NextResponse.json(
      { error: `sentiment must be one of: ${VOTE_SENTIMENTS.join(", ")}` },
      { status: 400 },
    );
  }

  // Idempotency: if the exact triple already exists, return success
  // without touching the DB. Avoids a round-trip on the "user clicked
  // the same Heart button twice" path.
  const existing = await prisma.themeVote.findUnique({
    where: { userId_sentiment_themeId: { userId, sentiment, themeId } },
    select: { id: true },
  });
  if (existing) {
    return NextResponse.json({ ok: true, themeId, sentiment, alreadyVoted: true });
  }

  // Cap check + atomic insert. There's a small race window between
  // the count and the insert (two parallel POSTs both seeing N-1 and
  // both inserting → N+1 total). Accepted: low-impact edge case;
  // worst result is one extra row past the cap. If this becomes a
  // real concern, switch to SELECT … FOR UPDATE inside a tx.
  const currentCount = await prisma.themeVote.count({
    where: { userId, sentiment },
  });
  if (currentCount >= MAX_VOTES_PER_SENTIMENT) {
    return NextResponse.json(
      {
        error: `You've already picked ${MAX_VOTES_PER_SENTIMENT} ${
          sentiment === "favorite" ? "favourite" : "least-favourite"
        } themes. Remove one first.`,
        code: "cap_reached",
        cap: MAX_VOTES_PER_SENTIMENT,
      },
      { status: 409 },
    );
  }

  // Clear any conflicting opposite-sentiment vote on the same theme
  // (you can't both love and dislike the same theme), then insert
  // the new vote. Done in a transaction so the swap is atomic.
  await prisma.$transaction([
    prisma.themeVote.deleteMany({
      where: { userId, themeId, NOT: { sentiment } },
    }),
    prisma.themeVote.create({
      data: { userId, themeId, sentiment },
    }),
  ]);

  return NextResponse.json({ ok: true, themeId, sentiment });
}

export async function DELETE(req: Request) {
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id?: string }).id ?? null;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const themeId = searchParams.get("themeId");
  const sentiment = searchParams.get("sentiment");

  if (themeId === null || !isValidThemeId(themeId)) {
    return NextResponse.json(
      { error: "themeId query param must be a valid theme identifier" },
      { status: 400 },
    );
  }
  if (sentiment === null || !isValidSentiment(sentiment)) {
    return NextResponse.json(
      { error: `sentiment query param must be one of: ${VOTE_SENTIMENTS.join(", ")}` },
      { status: 400 },
    );
  }

  // deleteMany rather than delete-by-id because we don't have the
  // row's id on hand — the (userId, sentiment, themeId) triple is
  // unique, so there's at most one row to remove. Idempotent: if
  // the row doesn't exist, deleteMany returns count=0 silently.
  await prisma.themeVote.deleteMany({
    where: { userId, sentiment, themeId },
  });

  return NextResponse.json({ ok: true });
}
