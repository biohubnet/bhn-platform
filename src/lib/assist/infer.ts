/**
 * Generative stuck-state inference for AutoPipette.
 *
 * The rule engine (rules.ts) only knows *that* a user is stuck and
 * fires a canned card. This module reads *what they were trying to do*
 * and writes a short, specific next-step suggestion grounded in their
 * actual actions — the "smartly assume intent, suggest the next thing"
 * behaviour. It's the upgrade path from the generic
 * "Something not responding? → refresh the page" card.
 *
 * Safety posture
 *   • The model writes the title/body prose (advisory text in a
 *     dismissible chip — low blast radius), but the CTA link is NOT
 *     trusted: ctaHref must match a route from the curated menu /
 *     safe-route allow-list, or the CTA is dropped. The model can
 *     never plant an arbitrary link.
 *   • Length-clamped, JSON-validated, confidence-gated. A malformed
 *     or low-confidence response yields null → the caller falls back
 *     to the canned rule card.
 *   • Per-user budget (20 AI hints/day, 1 per 5 min) is enforced by
 *     `aiBudgetState`, shared with the admin infer route's posture.
 */
import { prisma } from "@/lib/prisma";
import { chat, AI_CONFIGURED } from "@/lib/ai";
import { availableHelpCards } from "@/lib/assist/help-cards";
import type { Role } from "@/lib/auth";
import type { RecentBehaviour } from "@/lib/assist/types";

const DAILY_LLM_BUDGET = 20;
const MIN_GAP_MS = 5 * 60 * 1000;

/** Always-safe destinations the model may point a CTA at, on top of
 *  whatever the (surface, role) help-card menu contributes. */
const SAFE_ROUTES = ["/dashboard", "/profile", "/courses", "/feedback"];

export interface GeneratedHint {
  intent: string;
  title: string;
  body: string;
  ctaLabel: string | null;
  ctaHref: string | null;
  confidence: number;
}

function startOfUtcDay(): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

/** Shared LLM-budget gate: caps AutoPipette AI hints at 20/user/day
 *  and one every 5 minutes. Counts hints whose triggeredBy starts
 *  with "ai:". */
export async function aiBudgetState(userId: string): Promise<{ ok: boolean; reason?: string }> {
  const today = await prisma.assistHint.count({
    where: { userId, triggeredBy: { startsWith: "ai:" }, createdAt: { gte: startOfUtcDay() } },
  });
  if (today >= DAILY_LLM_BUDGET) return { ok: false, reason: "daily_budget_spent" };
  const last = await prisma.assistHint.findFirst({
    where: { userId, triggeredBy: { startsWith: "ai:" } },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });
  if (last && Date.now() - last.createdAt.getTime() < MIN_GAP_MS) {
    return { ok: false, reason: "rate_limited" };
  }
  return { ok: true };
}

const SYSTEM = `You are AutoPipette, the assistive layer on the BHN biomanufacturing training platform. A user looks STUCK. Read their recent actions — especially the element they clicked over and over — infer what they're trying to accomplish, then write ONE short, specific suggestion for their next step. Ground it in what they actually did. Do NOT say "refresh the page" or "contact support" unless genuinely nothing else fits.

You receive: their role, current surface (route), the top stuck signal, recent actions (newest first), an optional weekly summary, and a MENU of known destinations [{label, href}].

Output ONLY this JSON object, nothing else:
{"stuck":true|false,"intent":"…","title":"…","body":"…","ctaLabel":"…","ctaHref":"…","confidence":0.0-1.0}

Constraints:
- title ≤ 48 chars — name what they're trying to do, e.g. "Trying to apply to that role?"
- body ≤ 180 chars — the concrete next step, specific to their actions. Reference a menu destination when one fits.
- ctaHref MUST be copied verbatim from a menu href, or "" if none fits. NEVER invent a path.
- ctaLabel ≤ 24 chars, or "" when there's no ctaHref.
- confidence — how sure you are this helps. Be honest; below 0.5 means unsure.
- If you can't read their intent, return stuck:false with empty strings.
- No markdown, no commentary, no fields beyond the schema.`;

/**
 * Ask the model to interpret a stuck user and propose a next step.
 * Returns null when AI is unconfigured, the response is unusable, or
 * confidence is too low — caller should fall back to a canned card.
 */
export async function inferStuckHint(opts: {
  userId: string;
  role: Role;
  surface: string | null;
  events: RecentBehaviour["events"];
  topSignal: string;
  weeklySummary?: string | null;
}): Promise<GeneratedHint | null> {
  if (!AI_CONFIGURED.chat) return null;

  // Build the destination menu + CTA allow-list from the cards that
  // are valid for this (surface, role) plus the always-safe routes.
  const menu: { label: string; href: string }[] = [];
  const allow = new Set<string>();
  const addRoute = (label: string, href: string) => {
    if (!href.startsWith("/")) return;
    allow.add(href);
    if (!menu.some((m) => m.href === href)) menu.push({ label: label.slice(0, 40), href });
  };
  for (const c of availableHelpCards({ surface: opts.surface, role: opts.role })) {
    if (c.ctaHref) addRoute(c.ctaLabel ?? c.title, c.ctaHref);
  }
  for (const r of SAFE_ROUTES) addRoute(r, r);
  if (opts.surface && opts.surface.startsWith("/")) allow.add(opts.surface);

  // Recent events arrive oldest-first; show the model newest-first.
  const recent = [...opts.events].slice(-20).reverse();
  const actionLines = recent.map(
    (e) => `  - ${e.kind}${e.surface ? ` @ ${e.surface}` : ""}${e.target ? ` (${e.target})` : ""}`,
  );

  const userPrompt = [
    `Role: ${opts.role}`,
    `Surface: ${opts.surface ?? "(unknown)"}`,
    `Top stuck signal: ${opts.topSignal}`,
    "",
    "Recent actions (newest first):",
    ...(actionLines.length > 0 ? actionLines : ["  (no detailed actions on file)"]),
    "",
    opts.weeklySummary ? `Weekly summary: ${opts.weeklySummary}` : "Weekly summary: (none on file)",
    "",
    'Destination menu (ctaHref MUST be one of these hrefs, or ""):',
    JSON.stringify(menu, null, 2),
  ].join("\n");

  const res = await chat(
    [
      { role: "system", content: SYSTEM },
      { role: "user", content: userPrompt },
    ],
    { feature: "assist_stuck", userId: opts.userId, maxTokens: 320, temperature: 0.2 },
  );
  if (!res.ok) return null;

  // Strip stray code fences, then parse + validate defensively.
  const raw = res.text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
  let p: Record<string, unknown>;
  try {
    p = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }

  if (p.stuck !== true) return null;
  const confidence = typeof p.confidence === "number" ? Math.max(0, Math.min(1, p.confidence)) : 0;
  if (confidence < 0.5) return null;

  const title = typeof p.title === "string" ? p.title.trim().slice(0, 64) : "";
  const body = typeof p.body === "string" ? p.body.trim().slice(0, 240) : "";
  if (!title || !body) return null;

  // The CTA link is untrusted — only honour it if it's an allow-listed
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
