/**
 * Lightweight runtime validator for SimulationPayload. We don't use Zod
 * because BHN doesn't have it in deps and the schema is small enough to
 * hand-validate. Returns either a clean payload or a string error.
 */
import type {
  Briefing,
  Choice,
  Person,
  Scenario,
  ScenarioType,
  SimulationPayload,
  StatDef,
} from "./types";

type ValidationResult =
  | { ok: true; payload: SimulationPayload }
  | { ok: false; error: string };

const ALLOWED_SCENARIO_TYPES: ScenarioType[] = [
  "vp_1on1",
  "team",
  "cross_func",
  "escalation",
  "hiring",
  "planning",
  "personal",
];

export function validatePayload(raw: unknown): ValidationResult {
  if (!isRecord(raw)) return err("Payload is not an object");

  const out: SimulationPayload = {
    jobTitle: nonEmptyString(raw.jobTitle, "Director"),
    companyName: typeof raw.companyName === "string" ? raw.companyName : null,
    location: typeof raw.location === "string" ? raw.location : null,
    context: nonEmptyString(raw.context, ""),
    vpName: nonEmptyString(raw.vpName, "VP"),
    vpRole: nonEmptyString(raw.vpRole, "VP"),
    stats: [],
    team: [],
    partners: [],
    scenarios: [],
    reviewThresholds: {
      exceeds: numOr(80, raw.reviewThresholds, "exceeds"),
      strongMeets: numOr(70, raw.reviewThresholds, "strongMeets"),
      meets: numOr(58, raw.reviewThresholds, "meets"),
      below: numOr(45, raw.reviewThresholds, "below"),
    },
  };

  // Stats
  if (!Array.isArray(raw.stats)) return err("stats is not an array");
  for (const s of raw.stats) {
    if (!isRecord(s)) continue;
    const stat: StatDef = {
      key: nonEmptyString(s.key, ""),
      label: nonEmptyString(s.label, ""),
      short: nonEmptyString(s.short, ""),
      description: nonEmptyString(s.description, ""),
      color: nonEmptyString(s.color, "#999999"),
      initialValue: clamp(toNum(s.initialValue, 50), 0, 100),
    };
    if (stat.key) out.stats.push(stat);
  }
  if (out.stats.length === 0) return err("no valid stats");

  // People (team + partners)
  if (!Array.isArray(raw.team)) return err("team is not an array");
  if (!Array.isArray(raw.partners)) return err("partners is not an array");

  for (const p of raw.team) {
    const person = validatePerson(p, "team");
    if (person) out.team.push(person);
  }
  for (const p of raw.partners) {
    const person = validatePerson(p, "partner");
    if (person) out.partners.push(person);
  }
  if (out.team.length < 3) return err(`team has only ${out.team.length} valid people`);
  if (out.partners.length < 1)
    return err(`partners has only ${out.partners.length} valid people`);

  // Scenarios
  if (!Array.isArray(raw.scenarios)) return err("scenarios is not an array");
  const validKeys = new Set(out.stats.map((s) => s.key));
  for (const s of raw.scenarios) {
    const scenario = validateScenario(s, validKeys);
    if (scenario) out.scenarios.push(scenario);
  }
  // Floor of 5 scenarios — still ~one decision every 2.4 weeks of
  // the 12-week quarter, enough to feel like a playthrough rather
  // than a vignette. Was 8, but the prompt's smaller ask (after
  // dropping monthly/quarterly/annual rhythm fields) combined with
  // Cloudflare Llama's tendency to under-deliver on long JDs meant
  // 8+ was rejecting otherwise-usable simulations.
  if (out.scenarios.length < 5)
    return err(`only ${out.scenarios.length} valid scenarios (need 5+)`);

  // Briefing — optional, gracefully accepted when present. We don't
  // err out if the model omits it; older payloads (and degraded
  // fallback outputs) shouldn't break the playthrough.
  if (isRecord(raw.briefing)) {
    const briefing = validateBriefing(raw.briefing);
    if (briefing) out.briefing = briefing;
  }

  return { ok: true, payload: out };
}

function validateBriefing(raw: Record<string, unknown>): Briefing | null {
  const hiddenDynamics = nonEmptyString(raw.hiddenDynamics, "");
  if (!hiddenDynamics) return null;
  const failureModes = stringArray(raw.failureModes).slice(0, 6);
  const unwrittenRules = stringArray(raw.unwrittenRules).slice(0, 6);
  const interviewQuestions = stringArray(raw.interviewQuestions).slice(0, 8);
  if (
    failureModes.length === 0 &&
    unwrittenRules.length === 0 &&
    interviewQuestions.length === 0
  ) {
    // hiddenDynamics alone is too thin — treat as no briefing.
    return null;
  }
  return {
    hiddenDynamics,
    failureModes,
    unwrittenRules,
    interviewQuestions,
  };
}

function validatePerson(raw: unknown, group: "team" | "partner"): Person | null {
  if (!isRecord(raw)) return null;
  const id = nonEmptyString(raw.id, "");
  const name = nonEmptyString(raw.name, "");
  const role = nonEmptyString(raw.role, "");
  if (!id || !name || !role) return null;
  // Optional per-person playbook. We accept it when the payload
  // provides one; missing fields silently default so a malformed
  // playbook doesn't tank the whole person.
  let playbook: Person["playbook"];
  if (isRecord(raw.playbook)) {
    const howToWorkWith = nonEmptyString(raw.playbook.howToWorkWith, "");
    const theyHelpWith = stringArray(raw.playbook.theyHelpWith);
    const avoid = stringArray(raw.playbook.avoid);
    const quickWin = nonEmptyString(raw.playbook.quickWin, "");
    if (howToWorkWith || theyHelpWith.length || avoid.length || quickWin) {
      playbook = { howToWorkWith, theyHelpWith, avoid, quickWin };
    }
  }

  return {
    id,
    name,
    shortName: nonEmptyString(raw.shortName, name.split(/\s+/)[0]),
    role,
    shortRole: nonEmptyString(raw.shortRole, role),
    group,
    tenure: nonEmptyString(raw.tenure, ""),
    oneLiner: nonEmptyString(raw.oneLiner, ""),
    daily: stringArray(raw.daily),
    weekly: stringArray(raw.weekly),
    monthly: stringArray(raw.monthly),
    quarterly: stringArray(raw.quarterly),
    annual: stringArray(raw.annual),
    playbook,
  };
}

function validateScenario(
  raw: unknown,
  validStatKeys: Set<string>,
): Scenario | null {
  if (!isRecord(raw)) return null;
  const id = nonEmptyString(raw.id, "");
  const title = nonEmptyString(raw.title, "");
  const week = clamp(toNum(raw.week, 0), 1, 12);
  if (!id || !title || week === 0) return null;
  const type = ALLOWED_SCENARIO_TYPES.includes(raw.type as ScenarioType)
    ? (raw.type as ScenarioType)
    : "personal";
  if (!Array.isArray(raw.choices)) return null;
  const choices: Choice[] = [];
  for (const c of raw.choices) {
    if (!isRecord(c)) continue;
    const label = nonEmptyString(c.label, "");
    const outcome = nonEmptyString(c.outcome, "");
    if (!label || !outcome) continue;
    const effects: Record<string, number> = {};
    if (isRecord(c.effects)) {
      for (const [k, v] of Object.entries(c.effects)) {
        if (!validStatKeys.has(k)) continue;
        const n = Math.trunc(toNum(v, 0));
        if (n !== 0) effects[k] = clamp(n, -25, 25);
      }
    }
    choices.push({
      label,
      outcome,
      effects,
      tag: typeof c.tag === "string" && c.tag.length > 0 ? c.tag : undefined,
    });
  }
  if (choices.length < 2) return null;
  return {
    id,
    week,
    type,
    title,
    setting: nonEmptyString(raw.setting, ""),
    prompt: nonEmptyString(raw.prompt, ""),
    choices,
  };
}

// --- helpers ---

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
function nonEmptyString(v: unknown, fallback: string): string {
  return typeof v === "string" && v.trim().length > 0 ? v.trim() : fallback;
}
function stringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  const out: string[] = [];
  for (const x of v) {
    if (typeof x === "string" && x.trim().length > 0) out.push(x.trim());
  }
  return out;
}
function toNum(v: unknown, fallback: number): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return fallback;
}
function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}
function numOr(fallback: number, obj: unknown, key: string): number {
  if (!isRecord(obj)) return fallback;
  return clamp(toNum(obj[key], fallback), 0, 100);
}
function err(msg: string): ValidationResult {
  return { ok: false, error: msg };
}

/**
 * Extract the first balanced JSON object from a string. LLMs sometimes
 * wrap the response in markdown fences or add a trailing apology.
 *
 * Defensive: callers occasionally hand us non-string values when a
 * provider's API shape drifts (Cloudflare's Llama endpoint has
 * returned `response` as an object in tool-calling / structured-output
 * modes). Stringify (or null out) before any string ops so the
 * "e.trim is not a function" crash from those edge cases turns into
 * a normal "Model did not return parseable JSON" error path.
 */
export function extractJsonObject(s: unknown): string | null {
  if (typeof s !== "string") {
    // Some APIs return the JSON already parsed as an object. If we
    // see that, re-stringify so the rest of the pipeline (which
    // expects to parse a JSON string) still works.
    if (s && typeof s === "object") {
      try {
        return JSON.stringify(s);
      } catch {
        return null;
      }
    }
    return null;
  }
  const trimmed = s.trim();
  // Strip ```json ... ``` fences if present
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenceMatch ? fenceMatch[1] : trimmed;
  const start = candidate.indexOf("{");
  if (start < 0) return null;
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < candidate.length; i++) {
    const ch = candidate[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (ch === "\\") {
      escape = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return candidate.slice(start, i + 1);
    }
  }
  return null;
}
