/**
 * Recruiting funnel — snapshot (current-stage counts) + true-cohort
 * (furthest stage reached by the entry cohort) + the headline
 * apply→hire conversion used on the exec summary.
 */
import { prisma } from "@/lib/prisma";
import type { DateRange, MetricResult } from "./types";
import { FUNNEL_BANDS, BAND_ORDER, bandOf, type FunnelBandKey } from "./bands";
import { rate } from "./format";

export interface FunnelRow {
  key: FunnelBandKey;
  label: string;
  current: number;            // currently in this band
  reached: number;            // snapshot: at or past this band
  reachedPct: number | null;  // reached / total
}

export interface FunnelReport {
  total: number;
  rejected: number;
  rows: FunnelRow[];
  biggestDropKey: FunnelBandKey | null;
  biggestDropPct: number | null;
}

/** Snapshot funnel: candidates currently in each band, for applications
 *  created within the range. "reached" = at-or-past (the existing
 *  analytics conversion model). */
export async function funnelReport(companyId: string, range: DateRange): Promise<FunnelReport> {
  const grouped = await prisma.applicationStatus
    .groupBy({
      by: ["status"],
      where: { posting: { companyId }, createdAt: { gte: range.start, lt: range.end } },
      _count: { status: true },
    })
    .catch(() => [] as { status: string; _count: { status: number } }[]);

  const currentByBand = new Map<FunnelBandKey, number>();
  let total = 0;
  let rejected = 0;
  for (const g of grouped) {
    const n = g._count.status;
    total += n;
    const b = bandOf(g.status);
    if (b === "rejected") rejected += n;
    else if (b) currentByBand.set(b, (currentByBand.get(b) ?? 0) + n);
  }

  const rows: FunnelRow[] = FUNNEL_BANDS.map((band, i) => {
    let reached = 0;
    for (let j = i; j < BAND_ORDER.length; j++) reached += currentByBand.get(BAND_ORDER[j]) ?? 0;
    return {
      key: band.key,
      label: band.label,
      current: currentByBand.get(band.key) ?? 0,
      reached,
      reachedPct: rate(reached, total),
    };
  });

  let biggestDropKey: FunnelBandKey | null = null;
  let biggestDropPct: number | null = null;
  for (let i = 0; i < rows.length - 1; i++) {
    if (rows[i].reached > 0) {
      const drop = (1 - rows[i + 1].reached / rows[i].reached) * 100;
      if (biggestDropPct == null || drop > biggestDropPct) {
        biggestDropPct = drop;
        biggestDropKey = rows[i].key;
      }
    }
  }

  return { total, rejected, rows, biggestDropKey, biggestDropPct };
}

export interface CohortFunnelRow {
  key: FunnelBandKey;
  label: string;
  reached: number;
  reachedPct: number | null;
  passFromPrev: number | null;
}
export interface CohortFunnel {
  cohort: number;
  rows: CohortFunnelRow[];
}

/** True-cohort funnel: of applications that ENTERED in the range, what
 *  fraction ever reached each band (furthest stage reached, from the
 *  transition history + the current status). */
export async function cohortFunnel(companyId: string, range: DateRange): Promise<CohortFunnel> {
  const apps = await prisma.applicationStatus
    .findMany({
      where: { posting: { companyId }, createdAt: { gte: range.start, lt: range.end } },
      select: { status: true, statusHistory: { select: { toStage: true } } },
    })
    .catch(() => [] as { status: string; statusHistory: { toStage: string }[] }[]);

  const cohort = apps.length;
  const reachedCount = new Array(BAND_ORDER.length).fill(0);

  for (const a of apps) {
    let furthest = -1;
    const consider = (raw: string) => {
      const b = bandOf(raw);
      if (b && b !== "rejected") {
        const idx = BAND_ORDER.indexOf(b);
        if (idx > furthest) furthest = idx;
      }
    };
    consider(a.status);
    for (const e of a.statusHistory) consider(e.toStage);
    if (furthest < 0) furthest = 0; // everyone reached "applied"
    for (let i = 0; i <= furthest; i++) reachedCount[i] += 1;
  }

  const rows: CohortFunnelRow[] = FUNNEL_BANDS.map((band, i) => ({
    key: band.key,
    label: band.label,
    reached: reachedCount[i],
    reachedPct: rate(reachedCount[i], cohort),
    passFromPrev: i === 0 ? null : rate(reachedCount[i], reachedCount[i - 1]),
  }));

  return { cohort, rows };
}

/** Apply→hire conversion (%) — a headline exec-summary tile. */
export async function applyToHireRate(companyId: string, range: DateRange): Promise<MetricResult> {
  const [apps, hires] = await Promise.all([
    prisma.applicationStatus
      .count({ where: { posting: { companyId }, createdAt: { gte: range.start, lt: range.end } } })
      .catch(() => 0),
    prisma.applicationStatus
      .count({ where: { posting: { companyId }, status: "hired", stageEnteredAt: { gte: range.start, lt: range.end } } })
      .catch(() => 0),
  ]);
  const v = rate(hires, apps);
  return { value: v, formatted: v == null ? "—" : `${v.toFixed(1)}%`, n: apps, unit: "percent" };
}
