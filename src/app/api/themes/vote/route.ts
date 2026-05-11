/**
 * Theme votes — set / clear a user's favourite or least-favourite.
 *
 *   POST   /api/themes/vote     body: { themeId, sentiment }
 *   DELETE /api/themes/vote     query: ?sentiment=favorite | least_favorite
 *
 * Rules
 *   • One favourite + one least-favourite per user. Setting a new
 *     vote of the same sentiment replaces the old row (upsert keyed
 *     on (userId, sentiment)).
 *   • A user can't simultaneously favourite AND least-favourite the
 *     same theme. If they set favourite=X and previously had
 *     least-favourite=X, the conflicting row is deleted silently —
 *     it's a clear change-of-mind, not an error.
 *   • Theme IDs validated against VALID_THEME_IDS (server-safe list
 *     in src/lib/themes/constants.ts).
 */
import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  isValidThemeId,
  isValidSentiment,
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
    return NextResponse.json({ error: "themeId must be a valid theme identifier" }, { status: 400 });
  }
  if (typeof sentiment !== "string" || !isValidSentiment(sentiment)) {
    return NextResponse.json(
      { error: `sentiment must be one of: ${VOTE_SENTIMENTS.join(", ")}` },
      { status: 400 },
    );
  }

  // If the user is voting the OPPOSITE sentiment on this exact theme
  // (e.g. they've now favourited a theme they previously disliked),
  // clear the conflicting row first. Done in a transaction with the
  // upsert so the swap is atomic.
  await prisma.$transaction([
    prisma.themeVote.deleteMany({
      where: { userId, themeId, NOT: { sentiment } },
    }),
    prisma.themeVote.upsert({
      where: { userId_sentiment: { userId, sentiment } },
      create: { userId, themeId, sentiment },
      update: { themeId },
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
  const sentiment = searchParams.get("sentiment");
  if (sentiment === null || !isValidSentiment(sentiment)) {
    return NextResponse.json(
      { error: `sentiment query param must be one of: ${VOTE_SENTIMENTS.join(", ")}` },
      { status: 400 },
    );
  }

  await prisma.themeVote.deleteMany({ where: { userId, sentiment } });
  return NextResponse.json({ ok: true });
}
