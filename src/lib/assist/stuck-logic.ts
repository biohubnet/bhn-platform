/**
 * Pure decision + validation logic for AutoPipette stuck-state hints.
 *
 * Deliberately I/O-free (no prisma, no AI, no env) so it can be unit-
 * tested deterministically and reasoned about in isolation. The
 * side-effecting pieces — the LLM call, the DB writes, the budget
 * lookups — live in infer.ts and the events route; they delegate the
 * *decisions* to the functions here.
 *
 * Three responsibilities:
 *   • buildStuckMenu   — the safe CTA destination menu + allow-list.
 *   • validateStuckHint — parse + sanitise the model's JSON output.
 *   • resolveStuckQueue — choose which hint (if any) to queue:
 *        empty-state card → AI suggestion → canned card → nothing.
 */
import { availableHelpCards, type HelpCard } from "@/lib/assist/help-cards";
import type { Role } from "@/lib/auth";

/** Always-safe destinations the model may point a CTA at, on top of
 *  whatever the (surface, role) help-card menu contributes. */
export const SAFE_ROUTES = ["/dashboard", "/profile", "/courses", "/feedback"];

export interface GeneratedHint {
  intent: string;
  title: string;
  body: string;
  ctaLabel: string | null;
  ctaHref: string | null;
  confidence: number;
}

/** The fully-resolved hint the events route will persist. */
export interface QueuedPlan {
  key: string;
  title: string;
  body: string;
  ctaLabel: string | null;
  ctaHref: string | null;
  triggeredBy: string;
  confidence: number;
  /** Stuck-state hints suppress recently dismissed/ignored repeats so
   *  a brushed-off nudge doesn't return; pre-stuck cards don't. */
  stuckKind: boolean;
}

/**
 * Build the destination menu shown to the model plus the allow-list
 * used to vet whatever ctaHref it returns. Only internal absolute
 * paths ever enter the allow-list — that's the boundary that stops a
 * hallucinated or hostile link from reaching the UI.
 */
export function buildStuckMenu(opts: { surface: string | null; role: Role }): {
  menu: { label: string; href: string }[];
  allow: Set<string>;
} {
  const menu: { label: string; href: string }[] = [];
  const allow = new Set<string>();
  const addRoute = (label: string, href: string) => {
    if (!href.startsWith("/")) return; // internal absolute paths only
    allow.add(href);
    if (!menu.some((m) => m.href === href)) menu.push({ label: label.slice(0, 40), href });
  };
  for (const c of availableHelpCards({ surface: opts.surface, role: opts.role })) {
    if (c.ctaHref) addRoute(c.ctaLabel ?? c.title, c.ctaHref);
  }
  for (const r of SAFE_ROUTES) addRoute(r, r);
  // The current surface is a safe place to send the user back to, but
  // we don't advertise it in the menu (it's where they already are).
  if (opts.surface && opts.surface.startsWith("/")) allow.add(opts.surface);
  return { menu, allow };
}

/**
 * Parse + sanitise the model's JSON response into a GeneratedHint, or
 * null when it's unusable. Treats the model output as fully untrusted:
 *   • strips stray code fences, then JSON.parses;
 *   • requires stuck === true and confidence ≥ 0.5;
 *   • clamps confidence to [0,1] and title/body to length;
 *   • drops the CTA unless ctaHref is an allow-listed internal route.
 */
export function validateStuckHint(raw: string, allow: Set<string>): GeneratedHint | null {
  const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
  let p: Record<string, unknown>;
  try {
    p = JSON.parse(cleaned) as Record<string, unknown>;
  } catch {
    return null;
  }
  if (!p || typeof p !== "object") return null;
  if (p.stuck !== true) return null;

  const confidence = typeof p.confidence === "number" && Number.isFinite(p.confidence)
    ? Math.max(0, Math.min(1, p.confidence))
    : 0;
  if (confidence < 0.5) return null;

  const title = typeof p.title === "string" ? p.title.trim().slice(0, 64) : "";
  const body = typeof p.body === "string" ? p.body.trim().slice(0, 240) : "";
  if (!title || !body) return null;

  // The CTA link is untrusted — honour it only if it's an allow-listed
  // internal route. Otherwise keep the advice, drop the link.
  let ctaHref: string | null = null;
  let ctaLabel: string | null = null;
  const proposed = typeof p.ctaHref === "string" ? p.ctaHref.trim() : "";
  if (proposed && allow.has(proposed)) {
    ctaHref = proposed;
    const label = typeof p.ctaLabel === "string" ? p.ctaLabel.trim().slice(0, 28) : "";
    ctaLabel = label || "Open";
  }

  return {
    intent: typeof p.intent === "string" ? p.intent.slice(0, 200) : "",
    title,
    body,
    ctaLabel,
    ctaHref,
    confidence,
  };
}

/**
 * Decide which hint to queue, given the already-resolved inputs. Pure
 * mirror of the events-route ladder:
 *   1. nothing if hints are muted;
 *   2. empty-state pre-stuck card (cross-table signal) wins;
 *   3. below the queue floor → nothing;
 *   4. when AI-eligible, the generative path OWNS the stuck state — it
 *      queues a smart hint, or (rate-limited / budget-spent, i.e.
 *      !budgetOk) stays silent so a recent AI hint isn't doubled by a
 *      canned one. The canned card only fires when AI is off, below the
 *      escalation bar, or ran (budgetOk) and produced nothing.
 */
export function resolveStuckQueue(input: {
  hintsLive: boolean;
  emptyHint: HelpCard | null;
  score: { score: number; topSignal: string };
  aiConfigured: boolean;
  queueFloor: number;
  escalate: number;
  /** Result of the per-user LLM budget check. Only meaningful when
   *  the AI path was eligible. */
  budgetOk: boolean;
  /** The model's validated output, or null if AI wasn't called / had
   *  nothing useful. */
  gen: GeneratedHint | null;
  ruleCard: HelpCard | null;
}): QueuedPlan | null {
  if (!input.hintsLive) return null;

  if (input.emptyHint) {
    const e = input.emptyHint;
    return {
      key: e.key,
      title: e.title,
      body: e.body,
      ctaLabel: e.ctaLabel ?? null,
      ctaHref: e.ctaHref ?? null,
      triggeredBy: "rule:empty-state",
      confidence: 0.8,
      stuckKind: false,
    };
  }

  if (input.score.score < input.queueFloor) return null;

  const aiEligible = input.aiConfigured && input.score.score >= input.escalate;
  let aiOwns = false;
  if (aiEligible) {
    aiOwns = true;
    if (input.budgetOk) {
      if (input.gen) {
        return {
          key: `ai.stuck.${input.score.topSignal}`,
          title: input.gen.title,
          body: input.gen.body,
          ctaLabel: input.gen.ctaLabel,
          ctaHref: input.gen.ctaHref,
          triggeredBy: "ai:stuck",
          confidence: Math.max(input.gen.confidence, input.score.score),
          stuckKind: true,
        };
      }
      aiOwns = false; // AI ran but produced nothing → allow card fallback
    }
  }

  if (!aiOwns && input.ruleCard) {
    const rc = input.ruleCard;
    return {
      key: rc.key,
      title: rc.title,
      body: rc.body,
      ctaLabel: rc.ctaLabel ?? null,
      ctaHref: rc.ctaHref ?? null,
      triggeredBy: `rule:${input.score.topSignal}`,
      confidence: input.score.score,
      stuckKind: true,
    };
  }

  return null;
}

/** De-dupe status filter: stuck hints also block on recently
 *  dismissed/ignored copies; pre-stuck cards only on active ones. */
export function dedupeStatusesFor(stuckKind: boolean): string[] {
  return stuckKind
    ? ["pending", "shown", "dismissed", "ignored"]
    : ["pending", "shown"];
}
