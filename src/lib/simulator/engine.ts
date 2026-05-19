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

// ────────────────────────────────────────────────────────────────────
// Decision profile — analyse the player's choices to surface patterns
// ────────────────────────────────────────────────────────────────────

export type DecisionProfile = {
  /// Total decisions made.
  decisionCount: number;
  /// The stat the player most consistently increased (net positive
  /// across the quarter). Names the player's "protected" priority.
  protectedKey: string | null;
  protectedLabel: string;
  protectedNet: number;
  /// The stat the player most consistently traded away.
  sacrificedKey: string | null;
  sacrificedLabel: string;
  sacrificedNet: number;
  /// Average absolute movement per decision — proxy for how aggressive
  /// the player's choices were (cautious vs bold).
  avgIntensity: number;
  /// Decision archetype derived from choice-tag analysis.
  /// "collaborative" | "decisive" | "conservative" | "bold" | "balanced"
  archetype: DecisionArchetype;
  archetypeBlurb: string;
  /// 1–3 pattern callouts the player can reflect on.
  patternCallouts: string[];
};

export type DecisionArchetype =
  | "collaborative"
  | "decisive"
  | "conservative"
  | "bold"
  | "balanced";

/**
 * Compute a decision-profile from the attempt log + simulation payload.
 * Pure local analysis — no AI call. Cheap enough to run on every render.
 */
export function computeDecisionProfile(
  payload: SimulationPayload,
  state: AttemptState,
): DecisionProfile {
  const log = state.log;
  const decisionCount = log.length;

  // Per-stat net + absolute totals across the quarter.
  const netByStat: Record<string, number> = {};
  const absByStat: Record<string, number> = {};
  let totalIntensity = 0;
  for (const entry of log) {
    for (const [k, v] of Object.entries(entry.effects ?? {})) {
      const n = v ?? 0;
      netByStat[k] = (netByStat[k] ?? 0) + n;
      absByStat[k] = (absByStat[k] ?? 0) + Math.abs(n);
      totalIntensity += Math.abs(n);
    }
  }
  const avgIntensity = decisionCount > 0 ? totalIntensity / decisionCount : 0;

  // Identify the most-protected (highest net+) and most-sacrificed (lowest net-) stats.
  const entries = Object.entries(netByStat);
  const sortedByNet = [...entries].sort((a, b) => b[1] - a[1]);
  const protectedEntry = sortedByNet[0];
  const sacrificedEntry = sortedByNet[sortedByNet.length - 1];
  const protectedKey = protectedEntry?.[1] > 0 ? protectedEntry[0] : null;
  const sacrificedKey =
    sacrificedEntry && sacrificedEntry[1] < 0 ? sacrificedEntry[0] : null;
  const labelOf = (k: string | null) =>
    k ? payload.stats.find((s) => s.key === k)?.label ?? k : "—";

  // Tag-based archetype. Look at the verbal "tag" strings on each choice
  // — they carry intent vocabulary ("brokered", "deferred", "took the
  // stretch", "held the line"). Keyword-bucket each tag into one of the
  // four archetypes; whichever wins is the player's style.
  const buckets: Record<DecisionArchetype, number> = {
    collaborative: 0,
    decisive: 0,
    conservative: 0,
    bold: 0,
    balanced: 0,
  };
  const TAG_VOCAB: Array<[DecisionArchetype, RegExp]> = [
    [
      "collaborative",
      /broker|coalition|cross-?func|together|aligned|consensus|listen|federated|share|invited/i,
    ],
    [
      "decisive",
      /held the (line|bar)|chose|named|escalat|owned|made the call|took it back|hard call|direct/i,
    ],
    [
      "conservative",
      /defer|punt|wait|protect|caut|tactical|minimum viable|shortcut|preserve|skipped/i,
    ],
    [
      "bold",
      /took the stretch|bet|stretch|advocate|risk|bold|chose to ship|fast|over-?committed/i,
    ],
  ];
  for (const entry of log) {
    if (!entry.tag) continue;
    let matched = false;
    for (const [archetype, re] of TAG_VOCAB) {
      if (re.test(entry.tag)) {
        buckets[archetype]++;
        matched = true;
        break;
      }
    }
    if (!matched) buckets.balanced++;
  }
  const archetype = (Object.entries(buckets) as Array<
    [DecisionArchetype, number]
  >).sort((a, b) => b[1] - a[1])[0][0];

  const archetypeBlurb = {
    collaborative:
      "You consistently chose to broker, build coalition, and bring partners into decisions. Trades speed for durability.",
    decisive:
      "You held lines and owned hard calls publicly. Drives clarity, can bruise relationships if the cadence is too high.",
    conservative:
      "You protected capacity, deferred non-critical asks, and took the cheaper option when offered. Sustainable, sometimes invisible.",
    bold:
      "You said yes to stretch work and bet on big swings. High ceiling, real burnout risk if pattern holds.",
    balanced:
      "Your decisions span styles — no dominant archetype this quarter.",
  }[archetype];

  // 1–3 pattern callouts based on the numbers.
  const callouts: string[] = [];
  if (protectedKey && Math.abs(protectedEntry[1]) >= decisionCount * 2) {
    callouts.push(
      `Across ${decisionCount} decisions you net +${protectedEntry[1]} on ${labelOf(protectedKey)} — that stat is clearly your priority.`,
    );
  }
  if (sacrificedKey && Math.abs(sacrificedEntry[1]) >= decisionCount * 2) {
    callouts.push(
      `${labelOf(sacrificedKey)} dropped ${Math.abs(sacrificedEntry[1])} points across the quarter — recognise the pattern and decide if it's intentional.`,
    );
  }
  if (avgIntensity >= 18) {
    callouts.push(
      `High-intensity playstyle — average ${avgIntensity.toFixed(1)} stat-points moved per decision. Sustainable for 1–2 quarters, watch for capacity erosion.`,
    );
  } else if (avgIntensity > 0 && avgIntensity <= 10) {
    callouts.push(
      `Low-intensity playstyle — choices tended to be safer plays (avg ${avgIntensity.toFixed(1)} stat-points per decision). Consider when boldness would have moved the needle more.`,
    );
  }
  if (archetype === "conservative" && callouts.length < 3) {
    callouts.push(
      `Conservative archetype + ${labelOf(protectedKey)} as your top stat is a recognisable "head-down operator" pattern. Strong in steady-state, less so when leadership wants signal.`,
    );
  }
  if (archetype === "bold" && callouts.length < 3) {
    callouts.push(
      `Bold archetype + watching capacity erode is the classic "ambitious new director" trap. Two more quarters of this without recovery and a fall-off is statistically likely.`,
    );
  }

  return {
    decisionCount,
    protectedKey,
    protectedLabel: labelOf(protectedKey),
    protectedNet: protectedEntry?.[1] ?? 0,
    sacrificedKey,
    sacrificedLabel: labelOf(sacrificedKey),
    sacrificedNet: sacrificedEntry?.[1] ?? 0,
    avgIntensity,
    archetype,
    archetypeBlurb,
    patternCallouts: callouts.slice(0, 3),
  };
}
