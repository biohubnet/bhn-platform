/**
 * Fit check (rule 14) — roll the gap analysis up into an honest
 * Strong / Partial / Gap scorecard for the human. Names the residual
 * gaps and surfaces unsupported-claim flags. The human reviews and
 * submits; the system NEVER auto-submits.
 */
import type { GapReport, FitScorecard } from "./schemas";

export function buildScorecard(gap: GapReport): FitScorecard {
  const musts = gap.items.filter((i) => i.kind === "must");
  const haves = musts.filter((i) => i.status === "have").length;
  const partials = musts.filter((i) => i.status === "partial").length;
  const gaps = musts.filter((i) => i.status === "gap").length;
  const total = musts.length;

  let overall: FitScorecard["overall"] = "strong";
  if (gaps > 0 || total === 0) overall = gaps > Math.max(1, Math.floor(total / 3)) ? "gap" : "partial";
  else if (partials > 0) overall = "partial";

  const residuals = musts
    .filter((i) => i.status !== "have")
    .map((i) => `${i.requirement}${i.closeWith ? ` — close with: ${i.closeWith}` : ""}`);

  return {
    overall,
    haves, partials, gaps, total,
    reachCall: gap.reachCall,
    reachRationale: gap.reachRationale,
    residuals,
    flags: gap.unsupportedClaims,
  };
}
