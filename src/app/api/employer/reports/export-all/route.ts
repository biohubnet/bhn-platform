/**
 * Combined CSV across all reports for the selected period — one file
 * with section headers. DEI is included only if enabled, and always
 * passes through the same small-count suppression.
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveReportAccess } from "@/lib/employer/reporting/access";
import { resolvePeriod } from "@/lib/employer/reporting/period";
import { csvRow, csvResponse } from "@/lib/employer/reporting/csv";
import { funnelReport } from "@/lib/employer/reporting/funnel";
import { timeToFillReport } from "@/lib/employer/reporting/timeToFill";
import { offerReport } from "@/lib/employer/reporting/offers";
import { requisitionReport } from "@/lib/employer/reporting/requisitions";
import { costReport } from "@/lib/employer/reporting/cost";
import { sourceReport } from "@/lib/employer/reporting/sources";
import { productivityReport } from "@/lib/employer/reporting/productivity";
import { qualityReport } from "@/lib/employer/reporting/quality";
import { diversityReport } from "@/lib/employer/reporting/diversity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const access = await resolveReportAccess();
  if (!access.ok) return NextResponse.json({ error: access.reason }, { status: access.reason === "unauth" ? 401 : 403 });

  const sp = Object.fromEntries(req.nextUrl.searchParams.entries());
  const range = resolvePeriod(sp);
  const { companyId } = access;

  const company = await prisma.company.findUnique({ where: { id: companyId }, select: { deiReportingEnabled: true } });
  const [funnel, ttf, offers, reqs, cost, sources, prod, quality, dei] = await Promise.all([
    funnelReport(companyId, range),
    timeToFillReport(companyId, range),
    offerReport(companyId, range),
    requisitionReport(companyId, range),
    costReport(companyId, range),
    sourceReport(companyId, range),
    productivityReport(companyId, range),
    qualityReport(companyId, range),
    diversityReport(companyId, range, !!company?.deiReportingEnabled),
  ]);

  const pct = (n: number | null) => (n == null ? "" : Math.round(n));
  const round = (n: number | null) => (n == null ? "" : Math.round(n * 10) / 10);
  const L: string[] = [];

  L.push(csvRow(["BioHubNet — Talent report (all sections)"]));
  L.push(csvRow(["Period", range.label]));

  L.push(csvRow([]), csvRow(["== FUNNEL =="]), csvRow(["Stage", "Currently in", "Reached", "Reached %"]));
  funnel.rows.forEach((r) => L.push(csvRow([r.label, r.current, r.reached, pct(r.reachedPct)])));

  L.push(csvRow([]), csvRow(["== TIME TO FILL =="]));
  L.push(csvRow(["Time to fill (median days)", round(ttf.timeToFill.value)]));
  L.push(csvRow(["Time to hire (median days)", round(ttf.timeToHire.value)]));

  L.push(csvRow([]), csvRow(["== OFFERS =="]));
  L.push(csvRow(["Acceptance %", pct(offers.acceptanceRate.value)]));
  L.push(csvRow(["Sent / accepted / declined", `${offers.sent} / ${offers.accepted} / ${offers.declined}`]));

  L.push(csvRow([]), csvRow(["== REQUISITIONS =="]));
  L.push(csvRow(["Active / closed / draft / expired", `${reqs.active} / ${reqs.closed} / ${reqs.draft} / ${reqs.expired}`]));
  L.push(csvRow(["Stale", reqs.staleCount]));

  L.push(csvRow([]), csvRow(["== COST =="]));
  L.push(csvRow(["Cost per hire", cost.costPerHire.value == null ? "" : Math.round(cost.costPerHire.value)]));
  L.push(csvRow(["Total spend", Math.round(cost.totalSpend)]));

  L.push(csvRow([]), csvRow(["== SOURCES =="]), csvRow(["Source", "Applications", "Hires", "Hire rate %"]));
  sources.rows.forEach((s) => L.push(csvRow([s.label, s.applications, s.hires, pct(s.hireRate)])));

  L.push(csvRow([]), csvRow(["== PRODUCTIVITY =="]), csvRow(["Member", "Actions", "Interviews", "Scorecards", "Hires"]));
  prod.rows.forEach((m) => L.push(csvRow([m.name, m.actions, m.interviews, m.scorecards, m.hires])));

  L.push(csvRow([]), csvRow(["== QUALITY =="]));
  L.push(csvRow(["Avg scorecard %", pct(quality.avgScore.value)]));
  L.push(csvRow(["Avg score (hired) %", pct(quality.avgScoreHired.value)]));

  if (dei.enabled) {
    const v = (n: number | null) => (n == null ? "" : n);
    L.push(csvRow([]), csvRow(["== DIVERSITY (suppressed) =="]), csvRow(["Coverage %", dei.coverage == null ? "" : Math.round(dei.coverage * 100)]));
    for (const d of dei.dimensions) {
      if (!d.covered) continue;
      L.push(csvRow([d.label, "Applicants", "Reached interview", "Hired"]));
      d.rows.forEach((r) => L.push(csvRow([r.category, v(r.applicants), v(r.reachedInterview), v(r.hired)])));
    }
  }

  return csvResponse(`talent-report-all-${range.key}`, L);
}
