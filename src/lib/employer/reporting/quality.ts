/**
 * Quality-of-hire — scorecard score averages (normalised by each
 * criterion's scale), recommendation mix, hired-vs-all comparison, and
 * scorecard completion rate. From ScorecardSubmission + InterviewScorecard.
 */
import { prisma } from "@/lib/prisma";
import type { DateRange, MetricResult } from "./types";
import { rate, fmtPercent } from "./format";

const REC_ORDER = ["strong_yes", "yes", "no_decision", "no", "strong_no"] as const;
const REC_LABELS: Record<string, string> = {
  strong_yes: "Strong yes",
  yes: "Yes",
  no_decision: "No decision",
  no: "No",
  strong_no: "Strong no",
};

export interface QualityReport {
  avgScore: MetricResult;      // 0–100 across submitted scorecards
  avgScoreHired: MetricResult; // hired candidates only
  recommendations: { key: string; label: string; count: number }[];
  submitted: number;
  completionRate: MetricResult; // submitted / interviews
}

export async function qualityReport(companyId: string, range: DateRange): Promise<QualityReport> {
  const [subs, interviews] = await Promise.all([
    prisma.scorecardSubmission
      .findMany({
        where: { applicationStatus: { posting: { companyId } }, status: "submitted", submittedAt: { gte: range.start, lt: range.end } },
        select: {
          scores: true,
          recommendation: true,
          scorecard: { select: { criteria: true } },
          applicationStatus: { select: { status: true } },
        },
      })
      .catch(() => [] as { scores: unknown; recommendation: string | null; scorecard: { criteria: unknown }; applicationStatus: { status: string } }[]),
    prisma.interview
      .count({ where: { posting: { companyId }, createdAt: { gte: range.start, lt: range.end } } })
      .catch(() => 0),
  ]);

  const normAll: number[] = [];
  const normHired: number[] = [];
  const recCounts = new Map<string, number>();

  for (const s of subs) {
    const norm = normalizeScore(s.scores, s.scorecard.criteria);
    if (norm != null) {
      normAll.push(norm);
      if (s.applicationStatus.status === "hired") normHired.push(norm);
    }
    if (s.recommendation) recCounts.set(s.recommendation, (recCounts.get(s.recommendation) ?? 0) + 1);
  }

  const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
  const avgAll = avg(normAll);
  const avgH = avg(normHired);
  const compl = rate(subs.length, interviews);

  return {
    avgScore: { value: avgAll, formatted: avgAll == null ? "—" : fmtPercent(avgAll, 0), n: normAll.length, unit: "percent" },
    avgScoreHired: { value: avgH, formatted: avgH == null ? "—" : fmtPercent(avgH, 0), n: normHired.length, unit: "percent" },
    recommendations: REC_ORDER.map((k) => ({ key: k, label: REC_LABELS[k], count: recCounts.get(k) ?? 0 })),
    submitted: subs.length,
    completionRate: { value: compl, formatted: compl == null ? "—" : fmtPercent(compl, 0), n: interviews, unit: "percent" },
  };
}

/** Average of (score / criterion scale) × 100 across a submission. */
function normalizeScore(scores: unknown, criteria: unknown): number | null {
  if (!scores || typeof scores !== "object") return null;
  const crit = Array.isArray(criteria) ? (criteria as { id: string; scale?: number }[]) : [];
  const scaleById = new Map(crit.map((c) => [c.id, c.scale ?? 5]));
  let sum = 0;
  let count = 0;
  for (const [cid, val] of Object.entries(scores as Record<string, { score?: number }>)) {
    const sc = val?.score;
    if (typeof sc === "number") {
      const scale = scaleById.get(cid) ?? 5;
      sum += (sc / scale) * 100;
      count++;
    }
  }
  return count ? sum / count : null;
}
