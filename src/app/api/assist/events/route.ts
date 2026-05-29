/**
 * POST /api/assist/events
 *
 * Batched ingestion of behaviour-assist events from the client.
 *
 * Body shape:
 *   {
 *     events: AssistEventInput[]   // 1..N events to persist
 *   }
 *
 * Response:
 *   {
 *     ok: true,
 *     ingested: number,
 *     stuck?: { score, topSignal }  // included when the
 *                                   // pre-filter trips, so the
 *                                   // client can poll hints
 *   }
 *
 * The endpoint runs the cheap rule-based stuck-state scorer
 * synchronously and — if the pre-filter trips — queues a hint
 * directly. The expensive AI inference path runs separately (see
 * /api/assist/infer) so this endpoint stays fast.
 *
 * Gating: only writes if the user has consented. Unconsented users
 * are accepted (no 4xx) so the client SDK doesn't need to know the
 * consent state — we just silently drop the events. This is the
 * "fail safe rather than break the page" posture for telemetry.
 */
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { getAssistPrefs, shouldShowHint } from "@/lib/assist/preferences";
import {
  loadRecentBehaviour,
  scoreStuck,
  pickRuleCard,
  emptyStateCard,
} from "@/lib/assist/rules";
import { inferStuckHint, aiBudgetState } from "@/lib/assist/infer";
import { AI_CONFIGURED } from "@/lib/ai";
import type { AssistEventInput } from "@/lib/assist/types";
import type { Role } from "@/lib/auth";

export const runtime = "nodejs";
// The stuck path may call the LLM inline (gated to ≤1 per 5 min/user),
// so give the function headroom beyond the default. Plain ingestion
// still returns in milliseconds.
export const maxDuration = 30;

const VALID_KINDS = new Set([
  "click", "rage_click", "dead_click", "surface.view",
  "form.focus", "form.field_complete", "form.abandon",
  "form.submit_attempt", "error.client", "dwell",
  "idle.start", "idle.end",
]);

const HINT_TTL_MS = 30 * 60 * 1000; // 30 min — beyond this the moment is gone
// Stuck-score gates. At/above QUEUE_FLOOR we consider surfacing a
// canned card; at/above AI_ESCALATE we first try a generative,
// intent-aware suggestion (the smart path) and fall back to the card.
const STUCK_QUEUE_FLOOR = 0.6;
const AI_ESCALATE = 0.75;

export async function POST(req: Request) {
  const session = await getSession();
  const userId = (session?.user as { id?: string })?.id;
  const role = (session?.user as { role?: string })?.role ?? "trainee";
  if (!session || !userId) {
    // Unauthenticated — accept-and-drop so noisy redirects on the
    // client SDK don't pile up in error logs.
    return NextResponse.json({ ok: true, ingested: 0 });
  }

  const prefs = await getAssistPrefs(userId);
  if (!prefs.consented) {
    return NextResponse.json({ ok: true, ingested: 0, consented: false });
  }

  const body = (await req.json().catch(() => null)) as { events?: unknown } | null;
  if (!body || !Array.isArray(body.events)) {
    return NextResponse.json({ error: "events[] required" }, { status: 400 });
  }

  // Validate + filter events. Reject malformed kinds rather than
  // throwing — the client SDK ships a known set, but we keep a
  // defensive parse for future changes.
  const valid: AssistEventInput[] = [];
  for (const raw of body.events) {
    if (!raw || typeof raw !== "object") continue;
    const e = raw as Record<string, unknown>;
    if (typeof e.kind !== "string" || !VALID_KINDS.has(e.kind)) continue;
    if (typeof e.sessionId !== "string" || e.sessionId.length === 0) continue;
    valid.push({
      sessionId: e.sessionId,
      kind: e.kind as AssistEventInput["kind"],
      surface: typeof e.surface === "string" ? e.surface.slice(0, 200) : undefined,
      target: typeof e.target === "string" ? e.target.slice(0, 200) : undefined,
      payload: (e.payload && typeof e.payload === "object") ? (e.payload as Record<string, unknown>) : undefined,
      clientTs: typeof e.clientTs === "number" ? e.clientTs : undefined,
    });
  }

  if (valid.length === 0) {
    return NextResponse.json({ ok: true, ingested: 0 });
  }

  // Bulk-insert. createMany is cheap for our payload sizes. Payload
  // needs the Prisma.InputJsonValue cast — TS won't accept a bare
  // Record<string, unknown> for a Json column.
  await prisma.assistEvent.createMany({
    data: valid.map((e) => ({
      userId,
      sessionId: e.sessionId,
      kind: e.kind,
      surface: e.surface ?? null,
      target: e.target ?? null,
      payload: (e.payload as Prisma.InputJsonValue | undefined) ?? Prisma.JsonNull,
    })),
  });

  // Run the cheap stuck-state pre-filter on the freshly-extended
  // recent window. We do this inline (not via cron) so the chip
  // dock can pick up the hint on the very next /hints poll.
  let stuck: { score: number; topSignal: string } | undefined;
  try {
    const behaviour = await loadRecentBehaviour(userId);
    const score = scoreStuck(behaviour);
    const lastSurface = valid[valid.length - 1].surface ?? behaviour.surface ?? null;

    // Skip all hint work when the user has muted hints — no point
    // spending an LLM call we'd only throw away at the show gate.
    const hintsLive =
      !prefs.hintsDisabled &&
      !(prefs.suppressUntil && prefs.suppressUntil.getTime() > Date.now());

    // Resolve the single hint to queue, in priority order:
    //   1. empty-state pre-stuck card (cross-table, rule-based)
    //   2. AI-generated, intent-aware suggestion — the smart path,
    //      when the user is clearly stuck, AI is configured, and we're
    //      within the per-user LLM budget
    //   3. the canned rule card, as a graceful fallback
    let queued: {
      key: string;
      title: string;
      body: string;
      ctaLabel: string | null;
      ctaHref: string | null;
      triggeredBy: string;
      confidence: number;
      /** Stuck-state hints suppress recently dismissed/ignored repeats
       *  so a brushed-off nudge doesn't immediately return; pre-stuck
       *  cards only de-dupe against still-active ones. */
      stuckKind: boolean;
    } | null = null;

    if (hintsLive) {
      const emptyHint = await emptyStateCard({ userId, role, surface: lastSurface });
      if (emptyHint) {
        queued = {
          key: emptyHint.key,
          title: emptyHint.title,
          body: emptyHint.body,
          ctaLabel: emptyHint.ctaLabel ?? null,
          ctaHref: emptyHint.ctaHref ?? null,
          triggeredBy: "rule:empty-state",
          confidence: 0.8,
          stuckKind: false,
        };
      } else if (score.score >= STUCK_QUEUE_FLOOR) {
        // When AI is configured and the user is clearly stuck, the
        // generative path OWNS this stuck state: it either queues a
        // smart suggestion, or — if rate-limited / budget-spent —
        // stays quiet so the recent AI hint isn't doubled by a canned
        // one under a different key. The canned card only fires when
        // AI is off, or it ran and had nothing useful to add.
        const aiEligible = AI_CONFIGURED.chat && score.score >= AI_ESCALATE;
        let aiOwns = false;
        if (aiEligible) {
          aiOwns = true;
          if ((await aiBudgetState(userId)).ok) {
            const gen = await inferStuckHint({
              userId,
              role: role as Role,
              surface: lastSurface,
              events: behaviour.events,
              topSignal: score.topSignal,
            });
            if (gen) {
              queued = {
                key: `ai.stuck.${score.topSignal}`,
                title: gen.title,
                body: gen.body,
                ctaLabel: gen.ctaLabel,
                ctaHref: gen.ctaHref,
                triggeredBy: "ai:stuck",
                // Rule scorer already flagged stuck; show at the
                // stronger of the two confidences.
                confidence: Math.max(gen.confidence, score.score),
                stuckKind: true,
              };
            } else {
              // AI ran but had nothing useful — let the card fall back.
              aiOwns = false;
            }
          }
        }
        if (!queued && !aiOwns) {
          const rc = pickRuleCard(score, lastSurface);
          if (rc) {
            queued = {
              key: rc.key,
              title: rc.title,
              body: rc.body,
              ctaLabel: rc.ctaLabel ?? null,
              ctaHref: rc.ctaHref ?? null,
              triggeredBy: `rule:${score.topSignal}`,
              confidence: score.score,
              stuckKind: true,
            };
          }
        }
      }
    }

    if (queued) {
      const statuses = queued.stuckKind
        ? ["pending", "shown", "dismissed", "ignored"]
        : ["pending", "shown"];
      const recentSameKey = await prisma.assistHint.findFirst({
        where: {
          userId,
          helpKey: queued.key,
          status: { in: statuses },
          createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) },
        },
        select: { id: true },
      });
      const allow = shouldShowHint({ prefs, confidence: queued.confidence });
      if (!recentSameKey && allow) {
        await prisma.assistHint.create({
          data: {
            userId,
            helpKey: queued.key,
            title: queued.title,
            body: queued.body,
            ctaLabel: queued.ctaLabel,
            ctaHref: queued.ctaHref,
            surface: lastSurface,
            triggeredBy: queued.triggeredBy,
            confidence: queued.confidence,
            expiresAt: new Date(Date.now() + HINT_TTL_MS),
          },
        });
      }
    }

    if (score.score >= STUCK_QUEUE_FLOOR) {
      stuck = { score: score.score, topSignal: score.topSignal };
    }
  } catch {
    // Pre-filter errors never propagate to the client — telemetry
    // ingestion must not fail because the rule engine choked.
  }

  return NextResponse.json({ ok: true, ingested: valid.length, ...(stuck ? { stuck } : {}) });
}
