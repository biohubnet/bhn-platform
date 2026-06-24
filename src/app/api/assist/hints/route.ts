/**
 * GET /api/assist/hints
 *
 * Returns the user's currently-pending hint, if any. The chip dock
 * polls this on every page navigation (and on a low-frequency
 * interval while idle) to decide what — if anything — to show.
 *
 * Response:
 *   { hint: AssistHintPayload | null }
 *
 * Selection logic:
 *   • Highest confidence wins.
 *   • Pending only — once a hint is shown / dismissed / clicked it
 *     drops out of this query.
 *   • Expired hints are skipped (TTL ~30 min).
 *   • Honours per-user prefs: suppressed users get null.
 */
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAssistPrefs } from "@/lib/assist/preferences";
import { ASSIST_DISABLED } from "@/lib/assist/flags";
import type { AssistHintPayload } from "@/lib/assist/types";

export const runtime = "nodejs";

export async function GET() {
  if (ASSIST_DISABLED) return NextResponse.json({ hint: null });

  const session = await getSession();
  const userId = (session?.user as { id?: string })?.id;
  if (!session || !userId) {
    return NextResponse.json({ hint: null });
  }

  const prefs = await getAssistPrefs(userId);
  if (!prefs.consented || prefs.hintsDisabled) {
    return NextResponse.json({ hint: null });
  }
  if (prefs.suppressUntil && prefs.suppressUntil.getTime() > Date.now()) {
    return NextResponse.json({ hint: null });
  }

  const row = await prisma.assistHint.findFirst({
    where: {
      userId,
      status: "pending",
      expiresAt: { gt: new Date() },
      confidence: { gte: prefs.confidenceThreshold },
    },
    orderBy: [{ confidence: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      helpKey: true,
      title: true,
      body: true,
      ctaLabel: true,
      ctaHref: true,
      surface: true,
    },
  }).catch(() => null);

  if (!row) return NextResponse.json({ hint: null });

  const hint: AssistHintPayload = {
    id: row.id,
    helpKey: row.helpKey,
    title: row.title,
    body: row.body,
    ctaLabel: row.ctaLabel,
    ctaHref: row.ctaHref,
    surface: row.surface,
    scopedSurface: row.surface,
  };
  return NextResponse.json({ hint });
}
