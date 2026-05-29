/**
 * Source effectiveness — where applicants come from and how well each
 * channel converts. Reads ApplicationStatus.source (captured at apply
 * time; null → "Unknown"). Windowed on createdAt.
 */
import { prisma } from "@/lib/prisma";
import type { DateRange } from "./types";
import { rate } from "./format";
import { bandOf, BAND_ORDER } from "./bands";

const INTERVIEW_IDX = BAND_ORDER.indexOf("interview");

export const SOURCE_LABELS: Record<string, string> = {
  bhn_board: "BHN job board",
  referral: "Referral",
  employer_site: "Employer site",
  direct_email: "Direct email",
  talent_pool: "Talent pool",
  import: "Import",
  unknown: "Unknown",
};
export const sourceLabel = (s: string | null) => (s ? SOURCE_LABELS[s] ?? s : "Unknown");

export interface SourceRow {
  source: string;
  label: string;
  applications: number;
  pctOfTotal: number | null;
  reachedInterview: number;
  interviewRate: number | null;
  hires: number;
  hireRate: number | null;
}

export interface SourceReport {
  total: number;
  rows: SourceRow[];
  bestSource: string | null;
  minVolumeForRanking: number;
}

const MIN_VOL = 5; // don't crown a 1-app source as "best"

export async function sourceReport(companyId: string, range: DateRange): Promise<SourceReport> {
  const apps = await prisma.applicationStatus
    .findMany({
      where: { posting: { companyId }, createdAt: { gte: range.start, lt: range.end } },
      select: { source: true, status: true },
    })
    .catch(() => [] as { source: string | null; status: string }[]);

  const total = apps.length;
  const agg = new Map<string, { applications: number; reachedInterview: number; hires: number }>();
  for (const a of apps) {
    const key = a.source ?? "unknown";
    const e = agg.get(key) ?? { applications: 0, reachedInterview: 0, hires: 0 };
    e.applications++;
    const b = bandOf(a.status);
    if (b && b !== "rejected" && BAND_ORDER.indexOf(b) >= INTERVIEW_IDX) e.reachedInterview++;
    if (a.status === "hired") e.hires++;
    agg.set(key, e);
  }

  const rows: SourceRow[] = [...agg.entries()]
    .map(([source, e]) => ({
      source,
      label: sourceLabel(source),
      applications: e.applications,
      pctOfTotal: rate(e.applications, total),
      reachedInterview: e.reachedInterview,
      interviewRate: rate(e.reachedInterview, e.applications),
      hires: e.hires,
      hireRate: rate(e.hires, e.applications),
    }))
    .sort((a, b) => b.applications - a.applications);

  let bestSource: string | null = null;
  let bestRate = -1;
  for (const r of rows) {
    if (r.applications >= MIN_VOL && (r.hireRate ?? 0) > bestRate) {
      bestRate = r.hireRate ?? 0;
      bestSource = r.label;
    }
  }

  return { total, rows, bestSource, minVolumeForRanking: MIN_VOL };
}
