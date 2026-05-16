/**
 * POST /api/assist/hints/feedback
 *
 * Records how the user reacted to a hint. Drives:
 *   • Status transitions on the hint row (pending → shown →
 *     {clicked, dismissed, ignored}).
 *   • Per-user confidence-threshold calibration (see below).
 *   • Per-help-card helpful-rate aggregates on /admin/assist.
 *
 * Body:
 *   {
 *     hintId: string,
 *     kind: "shown" | "clicked" | "dismissed" | "ignored" | "rated",
 *     rating?: 1..5    // only when kind = "rated"
 *   }
 *
 * Per-user calibration policy
 *   • Each clicked hint  → threshold drops by 0.02 (more receptive)
 *   • Each dismissed hint → threshold rises by 0.03 (more cautious)
 *   • Each ignored hint   → threshold rises by 0.01
 *   • Each rated 1–2      → threshold rises by 0.05
 *   • Each rated 4–5      → threshold drops by 0.05
 *   • Clamped to [0.5, 0.95]. Resetting prefs in /profile sets it
 *     back to 0.75.
 *
 * Mute on dismiss
 *   Dismissing a hint suppresses further hints for 10 minutes —
 *   "I just said no, give me a moment".
 */
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAssistPrefs, updateAssistPrefs } from "@/lib/assist/preferences";
import type { HintFeedbackKind } from "@/lib/assist/types";

export const runtime = "nodejs";

const VALID_KINDS = new Set<HintFeedbackKind>([
  "shown", "clicked", "dismissed", "ignored", "rated",
]);

const SOFT_MUTE_MS = 10 * 60 * 1000;

function clamp(n: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, n));
}

export async function POST(req: Request) {
  const session = await getSession();
  const userId = (session?.user as { id?: string })?.id;
  if (!session || !userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as {
    hintId?: unknown;
    kind?: unknown;
    rating?: unknown;
  } | null;
  if (!body || typeof body.hintId !== "string" || typeof body.kind !== "string") {
    return NextResponse.json({ error: "hintId + kind required" }, { status: 400 });
  }
  if (!VALID_KINDS.has(body.kind as HintFeedbackKind)) {
    return NextResponse.json({ error: "Invalid kind" }, { status: 400 });
  }
  const kind = body.kind as HintFeedbackKind;
  const rating = typeof body.rating === "number" && body.rating >= 1 && body.rating <= 5
    ? Math.round(body.rating)
    : null;

  // Verify the hint belongs to this user — defence in depth.
  const hint = await prisma.assistHint.findUnique({
    where: { id: body.hintId },
    select: { id: true, userId: true, status: true },
  });
  if (!hint || hint.userId !== userId) {
    return NextResponse.json({ error: "Hint not found" }, { status: 404 });
  }

  // Record the feedback row.
  await prisma.assistHintFeedback.create({
    data: {
      userId,
      hintId: hint.id,
      kind,
      rating,
    },
  });

  // Transition the hint's own status if this is a terminal feedback.
  if (kind === "shown" && hint.status === "pending") {
    await prisma.assistHint.update({
      where: { id: hint.id },
      data: { status: "shown", shownAt: new Date() },
    });
  } else if (kind === "clicked" || kind === "dismissed" || kind === "ignored") {
    await prisma.assistHint.update({
      where: { id: hint.id },
      data: { status: kind, resolvedAt: new Date() },
    });
  }

  // Calibrate the per-user threshold. Pull current prefs so we
  // adjust off the latest baseline, not a stale read.
  const prefs = await getAssistPrefs(userId);
  let delta = 0;
  if (kind === "clicked") delta = -0.02;
  else if (kind === "dismissed") delta = +0.03;
  else if (kind === "ignored") delta = +0.01;
  else if (kind === "rated" && rating !== null) {
    if (rating <= 2) delta = +0.05;
    else if (rating >= 4) delta = -0.05;
  }
  const nextThreshold = clamp(prefs.confidenceThreshold + delta, 0.5, 0.95);

  // Soft mute on dismiss.
  const nextSuppressUntil =
    kind === "dismissed" ? new Date(Date.now() + SOFT_MUTE_MS) : prefs.suppressUntil;

  if (delta !== 0 || kind === "dismissed") {
    await updateAssistPrefs(userId, {
      confidenceThreshold: nextThreshold,
      suppressUntil: nextSuppressUntil,
    });
  }

  return NextResponse.json({
    ok: true,
    threshold: nextThreshold,
    suppressUntil: nextSuppressUntil?.toISOString() ?? null,
  });
}
