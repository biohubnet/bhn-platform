/**
 * RAG (red-amber-green) resolution for actual-vs-target.
 * Shared by every metric module + the exec-summary tiles.
 */
import type { Comparator, Rag } from "./types";

export interface RagResult {
  rag: Rag;
  /** % of goal achieved (>100 = beating it); null when no target/data. */
  pctToGoal: number | null;
}

/**
 * @param actual      computed metric value (null = no data)
 * @param target      the goal (undefined/null = no target set)
 * @param comparator  "gte" higher-is-better | "lte" lower-is-better
 * @param atRiskBand  within-this-fraction-of-goal = amber (default 10%)
 */
export function resolveRag(
  actual: number | null,
  target: number | null | undefined,
  comparator: Comparator,
  atRiskBand = 0.1,
): RagResult {
  if (target == null) return { rag: "no_target", pctToGoal: null };
  if (actual == null) return { rag: "no_data", pctToGoal: null };

  let pct: number; // 1.0 = exactly at goal
  if (comparator === "gte") {
    pct = target === 0 ? (actual >= 0 ? 1 : 0) : actual / target;
  } else {
    // lower is better — beating goal when actual < target
    pct = actual <= 0 ? 1.5 : target / actual;
  }

  let rag: Rag;
  if (pct >= 1) rag = "on_track";
  else if (pct >= 1 - atRiskBand) rag = "at_risk";
  else rag = "off_track";

  return { rag, pctToGoal: Math.round(pct * 100) };
}

/** Tailwind token classes for each RAG state (theme-aware, AA on cards). */
export const RAG_DOT: Record<Rag, string> = {
  on_track:  "bg-emerald-500",
  at_risk:   "bg-amber-500",
  off_track: "bg-rose-500",
  no_target: "bg-slate-300",
  no_data:   "bg-slate-300",
};

export const RAG_TEXT: Record<Rag, string> = {
  on_track:  "text-emerald-600",
  at_risk:   "text-amber-600",
  off_track: "text-rose-600",
  no_target: "text-muted",
  no_data:   "text-muted",
};

export const RAG_LABEL: Record<Rag, string> = {
  on_track:  "On track",
  at_risk:   "At risk",
  off_track: "Off track",
  no_target: "No target",
  no_data:   "No data",
};
