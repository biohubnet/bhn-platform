/**
 * Time-to-fill (req open → hire), time-to-hire (apply → hire), and
 * per-stage cycle time + bottleneck detection.
 *
 * Hire date = ApplicationStatus.stageEnteredAt while status='hired'
 * (single-column proxy; transitions out of 'hired' are illegal so it's
 * stable). Cycle time uses the typed transition history chains.
 */
import { prisma } from "@/lib/prisma";
import type { DateRange, MetricResult } from "./types";
import { median, percentile, daysBetween, fmtDays } from "./format";
import { loadStageEvents } from "./history";
import { bandOf, FUNNEL_BANDS, type FunnelBandKey } from "./bands";

export interface CycleBand {
  key: FunnelBandKey;
  label: string;
  medianDays: number | null;
  n: number;
}

export interface TimeToFillReport {
  timeToFill: MetricResult; // median days req open → hire
  timeToHire: MetricResult; // median days apply → hire
  p25: number | null;
  p75: number | null;
  cycleByBand: CycleBand[];
  bottleneckKey: FunnelBandKey | null;
}

export async function timeToFillReport(companyId: string, range: DateRange): Promise<TimeToFillReport> {
  const hires = await prisma.applicationStatus
    .findMany({
      where: { posting: { companyId }, status: "hired", stageEnteredAt: { gte: range.start, lt: range.end } },
      select: { createdAt: true, stageEnteredAt: true, posting: { select: { createdAt: true } } },
    })
    .catch(() => []);

  const ttf = hires.map((h) => daysBetween(h.posting.createdAt, h.stageEnteredAt));
  const tth = hires.map((h) => daysBetween(h.createdAt, h.stageEnteredAt));

  const ttfMed = median(ttf);
  const tthMed = median(tth);

  const cycleByBand = await cycleTimeByBand(companyId);
  let bottleneckKey: FunnelBandKey | null = null;
  let worst = -1;
  for (const c of cycleByBand) {
    if (c.medianDays != null && c.medianDays > worst) {
      worst = c.medianDays;
      bottleneckKey = c.key;
    }
  }

  return {
    timeToFill: { value: ttfMed, formatted: fmtDays(ttfMed), n: ttf.length, unit: "days" },
    timeToHire: { value: tthMed, formatted: fmtDays(tthMed), n: tth.length, unit: "days" },
    p25: percentile(ttf, 25),
    p75: percentile(ttf, 75),
    cycleByBand,
    bottleneckKey,
  };
}

/** Median dwell per band, from consecutive transition events. Legacy
 *  applications with a single synthetic history row contribute no
 *  intervals (documented degradation). */
async function cycleTimeByBand(companyId: string): Promise<CycleBand[]> {
  const events = await loadStageEvents(companyId);
  const byApp = new Map<string, { toStage: string; changedAt: Date }[]>();
  for (const e of events) {
    const arr = byApp.get(e.applicationStatusId) ?? [];
    arr.push({ toStage: e.toStage, changedAt: e.changedAt });
    byApp.set(e.applicationStatusId, arr);
  }

  const dwellByBand = new Map<FunnelBandKey, number[]>();
  for (const arr of byApp.values()) {
    arr.sort((a, b) => a.changedAt.getTime() - b.changedAt.getTime());
    for (let i = 0; i < arr.length - 1; i++) {
      const b = bandOf(arr[i].toStage);
      if (b && b !== "rejected") {
        const list = dwellByBand.get(b) ?? [];
        list.push(daysBetween(arr[i].changedAt, arr[i + 1].changedAt));
        dwellByBand.set(b, list);
      }
    }
  }

  return FUNNEL_BANDS.map((band) => {
    const list = dwellByBand.get(band.key) ?? [];
    return { key: band.key, label: band.label, medianDays: median(list), n: list.length };
  });
}
