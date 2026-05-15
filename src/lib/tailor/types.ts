/**
 * Resume-tailoring session — types.
 *
 * Lives inside PrepSession.state under the key "tailor" so it travels
 * with the existing prep session (one row per user × posting) instead
 * of adding a new schema table. The shape is versioned (v: 1) so a
 * future format bump doesn't silently corrupt old rows — the loader
 * falls back to a fresh empty state when the version doesn't match.
 */

export type Importance = "required" | "nice-to-have";
export type Classification = "met" | "partial" | "missing";
export type Verdict = "yes" | "maybe" | "no";

/** One extracted requirement from the JD — the unit the loop operates on. */
export interface Requirement {
  /** Stable id within this session; the LLM doesn't have to round-trip
   *  the full text, just the id. We allocate sequentially: r1, r2, ... */
  id: string;
  /** One-sentence requirement, plain English. */
  text: string;
  importance: Importance;
}

/** One AI assessment of one requirement, in one round. */
export interface Assessment {
  requirementId: string;
  classification: Classification;
  /** Single-paragraph reasoning the user actually reads. */
  reasoning: string;
  /** What the AI saw in the user's current materials (resume / pitch /
   *  user-provided round responses). Empty when nothing matched. */
  evidence: string;
  /** Targeted question to surface evidence the user hasn't volunteered
   *  yet — only set when classification is missing/partial. */
  question: string | null;
}

/** One full round: assessments for every requirement + the HM verdict
 *  that closed the round. Each round may layer new user input on top. */
export interface Round {
  num: number;
  assessments: Assessment[];
  /** What the user typed in response to each gap question this round.
   *  Keyed by requirementId. */
  responses: Record<string, string>;
  /** The hiring-manager verdict that closed this round — only set
   *  after the user finishes answering and we re-assess. */
  verdict: {
    decision: Verdict;
    reasoning: string;
    /** Per-requirement weaknesses still flagged. Subset of the
     *  requirementIds — these are what the next round focuses on. */
    remainingWeaknesses: string[];
  } | null;
  createdAt: string;
}

/** Tailor-session blob persisted at PrepSession.state.tailor. */
export interface TailorState {
  v: 1;
  /** JD requirements, parsed once and reused across rounds. */
  requirements: Requirement[];
  rounds: Round[];
  /** When the user clicks "I'm ready", we lock the state into a
   *  read-only summary so the dashboard surface can render the
   *  tailored bullets without re-running every prompt. */
  finalised: boolean;
}

export const EMPTY_TAILOR_STATE: TailorState = {
  v: 1,
  requirements: [],
  rounds: [],
  finalised: false,
};

/** Defensive loader — if the persisted blob is missing, malformed, or
 *  carries a different version, hand back a fresh empty state instead
 *  of letting the page crash. */
export function loadTailorState(raw: unknown): TailorState {
  if (!raw || typeof raw !== "object") return { ...EMPTY_TAILOR_STATE };
  const obj = raw as Record<string, unknown>;
  if (obj.v !== 1) return { ...EMPTY_TAILOR_STATE };
  return {
    v: 1,
    requirements: Array.isArray(obj.requirements) ? (obj.requirements as Requirement[]) : [],
    rounds: Array.isArray(obj.rounds) ? (obj.rounds as Round[]) : [],
    finalised: !!obj.finalised,
  };
}
