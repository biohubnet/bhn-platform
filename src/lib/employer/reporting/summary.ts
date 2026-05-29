/**
 * Executive summary — composes the headline KPI tiles (with OKR/RAG +
 * sparklines) from the other metric modules. One leadership one-pager.
 */
import { prisma } from "@/lib/prisma";
import type { DateRange, MetricResult, SeriesPoint } from "./types";
import { loadTargets, applyTarget } from "./targets";
import { funnelReport, applyToHireRate } from "./funnel";
import { timeToFillReport } from "./timeToFill";
import { offerReport } from "./offers";
import { costReport } from "./cost";
import { bucketRange } from "./period";
import { fmtCount } from "./format";

export interface SummaryTile {
  key: string;
  label: string;
  result: MetricResult;
  href: string;
}

export interface ExecSummary {
  range: DateRange;
  tiles: SummaryTile[];
}

export async function execSummary(companyId: string, range: DateRange): Promise<ExecSummary> {
  const [targets, funnel, ttf, offers, cost, a2h, openReqs, appsSeries, hiresSeries] = await Promise.all([
    loadTargets(companyId),
    funnelReport(companyId, range),
    timeToFillReport(companyId, range),
    offerReport(companyId, range),
    costReport(companyId, range),
    applyToHireRate(companyId, range),
    prisma.internshipPosting.count({ where: { companyId, status: "active" } }).catch(() => 0),
    countSeries(companyId, range, "applications"),
    countSeries(companyId, range, "hires"),
  ]);

  // Hires windowed on stageEnteredAt (the hire event), from time-to-fill's sample.
  const hiresInRange = ttf.timeToFill.n ?? 0;

  const applications: MetricResult = {
    value: funnel.total, formatted: fmtCount(funnel.total), n: funnel.total, unit: "count", series: appsSeries,
  };
  const hires: MetricResult = {
    value: hiresInRange, formatted: fmtCount(hiresInRange), n: hiresInRange, unit: "count", series: hiresSeries,
  };
  const open: MetricResult = { value: openReqs, formatted: fmtCount(openReqs), unit: "count" };

  const tiles: SummaryTile[] = [
    { key: "open_reqs",          label: "Open requisitions", result: open,                                                  href: "/employer/reports/requisitions" },
    { key: "applications",       label: "Applications",      result: applyTarget(applications, "applications", targets),     href: "/employer/reports/funnel" },
    { key: "hires",              label: "Hires",             result: applyTarget(hires, "hires", targets),                   href: "/employer/reports/funnel" },
    { key: "time_to_fill_days",  label: "Time to fill",      result: applyTarget(ttf.timeToFill, "time_to_fill_days", targets), href: "/employer/reports/time-to-fill" },
    { key: "offer_accept_rate",  label: "Offer acceptance",  result: applyTarget(offers.acceptanceRate, "offer_accept_rate", targets), href: "/employer/reports/offers" },
    { key: "apply_to_hire_rate", label: "Apply→hire",        result: applyTarget(a2h, "apply_to_hire_rate", targets),        href: "/employer/reports/funnel" },
    { key: "cost_per_hire",      label: "Cost per hire",     result: applyTarget(cost.costPerHire, "cost_per_hire", targets), href: "/employer/reports/cost" },
  ];

  return { range, tiles };
}

/** Bucketed counts for a sparkline (applications by createdAt, hires by
 *  hire event). Cheap: one query, bucketed in memory. */
async function countSeries(companyId: string, range: DateRange, kind: "applications" | "hires"): Promise<SeriesPoint[]> {
  const buckets = bucketRange(range, 10);
  let times: number[] = [];
  if (kind === "applications") {
    const rows = await prisma.applicationStatus
      .findMany({ where: { posting: { companyId }, createdAt: { gte: range.start, lt: range.end } }, select: { createdAt: true } })
      .catch(() => [] as { createdAt: Date }[]);
    times = rows.map((r) => r.createdAt.getTime());
  } else {
    const rows = await prisma.applicationStatus
      .findMany({ where: { posting: { companyId }, status: "hired", stageEnteredAt: { gte: range.start, lt: range.end } }, select: { stageEnteredAt: true } })
      .catch(() => [] as { stageEnteredAt: Date }[]);
    times = rows.map((r) => r.stageEnteredAt.getTime());
  }
  return buckets.map((b) => ({
    t: b.label,
    v: times.filter((t) => t >= b.start.getTime() && t < b.end.getTime()).length,
  }));
}
