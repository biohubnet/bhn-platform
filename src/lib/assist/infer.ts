/**
 * Generative stuck-state inference for AutoPipette (the I/O layer).
 *
 * The rule engine (rules.ts) only knows *that* a user is stuck and
 * fires a canned card. This reads *what they were trying to do* and
 * writes a short, specific next-step suggestion grounded in their
 * actual actions — the "smartly assume intent, suggest the next thing"
 * behaviour, replacing the generic "Something not responding? → refresh
 * the page" card.
 *
 * The decisions — what CTA links are allowed, how the model's output is
 * sanitised — live in the pure, unit-tested stuck-logic.ts. This file
 * owns only the side effects: the per-user budget lookup and the LLM
 * call. A malformed / low-confidence / off response yields null, and
 * the caller falls back to the canned rule card.
 */
import { prisma } from "@/lib/prisma";
import { AI_CONFIGURED } from "@/lib/ai";
import { callText } from "@/lib/ai/reliability";
import { buildStuckMenu, validateStuckHint, type GeneratedHint } from "@/lib/assist/stuck-logic";
import type { Role } from "@/lib/auth";
import type { RecentBehaviour } from "@/lib/assist/types";

const DAILY_LLM_BUDGET = 20;
const MIN_GAP_MS = 5 * 60 * 1000;

export type { GeneratedHint };

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

  const { menu, allow } = buildStuckMenu({ surface: opts.surface, role: opts.role });

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

  const res = await callText(
    [
      { role: "system", content: SYSTEM },
      { role: "user", content: userPrompt },
    ],
    { feature: "assist_stuck", userId: opts.userId, maxTokens: 320, temperature: 0.2 },
  );
  if (!res.ok) return null;

  return validateStuckHint(res.text, allow);
}
