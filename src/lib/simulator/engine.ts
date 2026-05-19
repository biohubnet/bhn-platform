/**
 * Pure functions that drive simulation state. No I/O — the API routes
 * load the attempt + simulation rows, call into here, persist the result.
 */
import type {
  AttemptState,
  AttemptStats,
  LogEntry,
  Scenario,
  SimulationPayload,
} from "./types";

export function initialState(payload: SimulationPayload): AttemptState {
  const stats: AttemptStats = {};
  for (const s of payload.stats) stats[s.key] = s.initialValue;
  return { week: 1, scenarioIndex: 0, stats, log: [], finished: false };
}

export function scenariosForWeek(
  payload: SimulationPayload,
  week: number,
): Scenario[] {
  return payload.scenarios.filter((s) => s.week === week);
}

export function currentScenario(
  payload: SimulationPayload,
  state: AttemptState,
): Scenario | null {
  if (state.finished) return null;
  const list = scenariosForWeek(payload, state.week);
  return list[state.scenarioIndex] ?? null;
}

const MAX_WEEK = 12;

export function applyChoice(
  payload: SimulationPayload,
  state: AttemptState,
  choiceIndex: number,
): { state: AttemptState; entry: LogEntry } | null {
  if (state.finished) return null;
  const weekScenarios = scenariosForWeek(payload, state.week);
  const scenario = weekScenarios[state.scenarioIndex];
  if (!scenario) return null;
  const choice = scenario.choices[choiceIndex];
  if (!choice) return null;

  const stats: AttemptStats = { ...state.stats };
  for (const [k, delta] of Object.entries(choice.effects)) {
    if (!(k in stats)) continue;
    stats[k] = clamp(stats[k] + delta, 0, 100);
  }

  const entry: LogEntry = {
    week: state.week,
    scenarioId: scenario.id,
    scenarioTitle: scenario.title,
    choiceLabel: choice.label,
    outcome: choice.outcome,
    effects: choice.effects,
    tag: choice.tag,
  };

  // Advance pointer
  let week = state.week;
  let idx = state.scenarioIndex + 1;
  if (idx >= weekScenarios.length) {
    week += 1;
    idx = 0;
  }
  // Skip any future weeks with no scenarios
  while (week <= MAX_WEEK && scenariosForWeek(payload, week).length === 0) {
    week += 1;
  }
  const finished = week > MAX_WEEK;

  return {
    state: {
      week,
      scenarioIndex: idx,
      stats,
      log: [...state.log, entry],
      finished,
    },
    entry,
  };
}

// ────────────────────────────────────────────────────────────────────
// End-of-quarter review
// ────────────────────────────────────────────────────────────────────

export type ReviewTier =
  | "Exceeds Expectations"
  | "Strong Meets"
  | "Meets Expectations"
  | "Below Expectations"
  | "Concerns Raised";

export type Review = {
  score: number;
  tier: ReviewTier;
  tierBlurb: string;
  perStat: Array<{ key: string; value: number; label: string; narrative: string }>;
  highlights: string[];
  lowlights: string[];
  vpClosing: string;
};

const WEIGHTS: Record<string, number> = {
  vpTrust: 0.28,
  velocity: 0.22,
  crossFunc: 0.2,
  morale: 0.2,
  capacity: 0.1,
};

export function computeReview(
  payload: SimulationPayload,
  state: AttemptState,
): Review {
  const score = Math.round(
    Object.entries(state.stats).reduce((sum, [k, v]) => {
      const w = WEIGHTS[k] ?? 0.2;
      return sum + v * w;
    }, 0),
  );

  const t = payload.reviewThresholds;
  const tier: ReviewTier =
    score >= t.exceeds
      ? "Exceeds Expectations"
      : score >= t.strongMeets
        ? "Strong Meets"
        : score >= t.meets
          ? "Meets Expectations"
          : score >= t.below
            ? "Below Expectations"
            : "Concerns Raised";

  const tierBlurb = {
    "Exceeds Expectations":
      "Promotion track. The leadership team is asking how to give you more scope.",
    "Strong Meets":
      "Solid first quarter. You're trusted with bigger calls. Stretch role conversation already started.",
    "Meets Expectations":
      "Steady. No surprises in either direction. Your manager wants a sharper point of view next quarter.",
    "Below Expectations":
      "Your manager is in your corner but flagging concerns. Two of the five stats need real movement before mid-year review.",
    "Concerns Raised":
      "HR has been looped in. The next quarter is a credibility rebuild — recoverable, with focus.",
  }[tier];

  const perStat = payload.stats.map((s) => ({
    key: s.key,
    value: state.stats[s.key] ?? 0,
    label: s.label,
    narrative: narrateStat(s.key, state.stats[s.key] ?? 0, s.label),
  }));

  const tagged = state.log.filter((l) => l.tag);
  const scored = tagged.map((l) => ({
    tag: l.tag!,
    week: l.week,
    title: l.scenarioTitle,
    net: Object.values(l.effects).reduce((a, b) => a + (b ?? 0), 0),
  }));

  const highlights = [...scored]
    .filter((s) => s.net > 0)
    .sort((a, b) => b.net - a.net)
    .slice(0, 4)
    .map((s) => `W${s.week} · ${s.title} — ${s.tag}`);

  const lowlights = [...scored]
    .filter((s) => s.net < 0)
    .sort((a, b) => a.net - b.net)
    .slice(0, 3)
    .map((s) => `W${s.week} · ${s.title} — ${s.tag}`);

  const vpClosing = buildClosing(payload, state.stats, tier);

  return { score, tier, tierBlurb, perStat, highlights, lowlights, vpClosing };
}

function narrateStat(k: string, v: number, label: string): string {
  if (v >= 80) return `${label} is exceptional. This is your differentiator.`;
  if (v >= 60) return `${label} is healthy. No active concerns.`;
  if (v >= 40) return `${label} is mixed. Patterns to address before mid-year.`;
  return `${label} is below where it needs to be. Plan needed.`;
}

function buildClosing(
  payload: SimulationPayload,
  stats: AttemptStats,
  tier: ReviewTier,
): string {
  const entries = Object.entries(stats);
  if (entries.length === 0) return "";
  const sorted = [...entries].sort((a, b) => a[1] - b[1]);
  const lowestKey = sorted[0][0];
  const highestKey = sorted[sorted.length - 1][0];
  const lowestLabel =
    payload.stats.find((s) => s.key === lowestKey)?.label ?? lowestKey;
  const highestLabel =
    payload.stats.find((s) => s.key === highestKey)?.label ?? highestKey;
  const vp = payload.vpName;

  if (tier === "Exceeds Expectations") {
    return `${vp}, closing the QBR: "Your superpower this quarter was ${highestLabel}. The next lever is ${lowestLabel}, but honestly you've earned the right to pick what's next."`;
  }
  if (tier === "Strong Meets") {
    return `${vp}: "Strong quarter. ${highestLabel} was the standout. We need to work on ${lowestLabel} — it's the gap between you and the next level."`;
  }
  if (tier === "Meets Expectations") {
    return `${vp}: "You met the bar. I expected more on ${lowestLabel} — let's design a 30-day plan. Don't lose what's working on ${highestLabel}."`;
  }
  if (tier === "Below Expectations") {
    return `${vp}, direct: "${lowestLabel} is below where it needs to be. ${highestLabel} is what's keeping this supportive instead of formal. Q2 has to look different."`;
  }
  return `${vp}, formally: "I've documented this quarter's concerns with HR. ${lowestLabel} in particular. ${highestLabel} is real, and it's why I'm betting on a turnaround."`;
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}
