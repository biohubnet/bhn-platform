/**
 * Diversity / DEI pipeline — voluntary, self-reported representation by
 * stage. STRICTLY aggregate-only and privacy-protected:
 *   • Gated: returns nothing unless the company enabled DEI reporting.
 *   • Consent: only rows where the applicant consented are counted.
 *   • k-anonymity: any cell below K (default 5) is suppressed (null),
 *     plus complementary-cell suppression so a hidden value can't be
 *     back-derived from the total.
 *   • Coverage gate: a dimension is hidden unless ≥ COVERAGE_MIN of
 *     applicants answered it (avoids misleading stats from low response).
 * Never returns or exposes any individual-level data.
 */
import { prisma } from "@/lib/prisma";
import type { DateRange } from "./types";
import { bandOf, BAND_ORDER } from "./bands";

export const K_ANON = 5;
export const COVERAGE_MIN = 0.5;
const INTERVIEW_IDX = BAND_ORDER.indexOf("interview");

const DIMENSIONS = [
  { key: "gender", label: "Gender" },
  { key: "raceEthnicity", label: "Race / ethnicity" },
  { key: "disabilityStatus", label: "Disability status" },
  { key: "veteranStatus", label: "Veteran status" },
  { key: "indigenousStatus", label: "Indigenous self-ID" },
] as const;

export interface DeiCategoryRow {
  category: string;
  applicants: number | null;
  reachedInterview: number | null;
  hired: number | null;
}
export interface DeiDimension {
  key: string;
  label: string;
  covered: boolean;
  rows: DeiCategoryRow[];
}
export interface DeiReport {
  enabled: boolean;
  totalApplicants: number;
  consented: number;
  coverage: number | null;
  coverageMin: number;
  kAnon: number;
  dimensions: DeiDimension[];
}

export async function diversityReport(companyId: string, range: DateRange, enabled: boolean): Promise<DeiReport> {
  const base = { enabled, totalApplicants: 0, consented: 0, coverage: null as number | null, coverageMin: COVERAGE_MIN, kAnon: K_ANON, dimensions: [] as DeiDimension[] };
  if (!enabled) return base;

  const [totalApplicants, rows] = await Promise.all([
    prisma.applicationStatus.count({ where: { posting: { companyId }, createdAt: { gte: range.start, lt: range.end } } }).catch(() => 0),
    prisma.applicationDemographics
      .findMany({
        where: { consent: true, applicationStatus: { posting: { companyId }, createdAt: { gte: range.start, lt: range.end } } },
        select: {
          gender: true, raceEthnicity: true, disabilityStatus: true, veteranStatus: true, indigenousStatus: true,
          applicationStatus: { select: { status: true } },
        },
      })
      .catch(() => [] as Array<Record<string, unknown> & { applicationStatus: { status: string } }>),
  ]);

  const consented = rows.length;
  const coverage = totalApplicants ? consented / totalApplicants : null;
  const covered = coverage != null && coverage >= COVERAGE_MIN && consented > 0;

  const dimensions: DeiDimension[] = DIMENSIONS.map((d) => {
    const agg = new Map<string, { applicants: number; reachedInterview: number; hired: number }>();
    if (covered) {
      for (const r of rows) {
        const cat = (r as Record<string, unknown>)[d.key] as string | null;
        if (!cat) continue;
        const e = agg.get(cat) ?? { applicants: 0, reachedInterview: 0, hired: 0 };
        e.applicants++;
        const b = bandOf(r.applicationStatus.status);
        if (b && b !== "rejected" && BAND_ORDER.indexOf(b) >= INTERVIEW_IDX) e.reachedInterview++;
        if (r.applicationStatus.status === "hired") e.hired++;
        agg.set(cat, e);
      }
    }
    const rawRows = [...agg.entries()].map(([category, e]) => ({ category, ...e })).sort((a, b) => b.applicants - a.applicants);
    return { key: d.key, label: d.label, covered, rows: kAnonymize(rawRows) };
  });

  return { enabled: true, totalApplicants, consented, coverage, coverageMin: COVERAGE_MIN, kAnon: K_ANON, dimensions };
}

const suppress = (n: number): number | null => (n < K_ANON ? null : n);

function kAnonymize(rows: { category: string; applicants: number; reachedInterview: number; hired: number }[]): DeiCategoryRow[] {
  const out: DeiCategoryRow[] = rows.map((r) => ({
    category: r.category,
    applicants: suppress(r.applicants),
    reachedInterview: suppress(r.reachedInterview),
    hired: suppress(r.hired),
  }));
  // Complementary suppression: if exactly one applicants-cell is hidden,
  // the smallest visible one is hidden too so it can't be inferred.
  if (out.filter((r) => r.applicants === null).length === 1) {
    let minIdx = -1;
    let minVal = Infinity;
    out.forEach((r, i) => {
      if (r.applicants !== null && r.applicants < minVal) {
        minVal = r.applicants;
        minIdx = i;
      }
    });
    if (minIdx >= 0) out[minIdx].applicants = null;
  }
  return out;
}
