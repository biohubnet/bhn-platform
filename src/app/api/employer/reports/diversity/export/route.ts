import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveReportAccess } from "@/lib/employer/reporting/access";
import { resolvePeriod } from "@/lib/employer/reporting/period";
import { csvRow, csvResponse } from "@/lib/employer/reporting/csv";
import { diversityReport } from "@/lib/employer/reporting/diversity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const access = await resolveReportAccess();
  if (!access.ok) return NextResponse.json({ error: access.reason }, { status: access.reason === "unauth" ? 401 : 403 });

  const company = await prisma.company.findUnique({ where: { id: access.companyId }, select: { deiReportingEnabled: true } });
  if (!company?.deiReportingEnabled) return NextResponse.json({ error: "DEI reporting is disabled." }, { status: 403 });

  const sp = Object.fromEntries(req.nextUrl.searchParams.entries());
  const range = resolvePeriod(sp);
  const r = await diversityReport(access.companyId, range, true);

  // Suppressed cells export as blank — never emit small counts to CSV.
  const v = (n: number | null) => (n == null ? "" : n);
  const lines = [
    csvRow(["Report", "Diversity / DEI pipeline (aggregate, suppressed)"]),
    csvRow(["Period", range.label]),
    csvRow(["Consented", r.consented]),
    csvRow(["Total applicants", r.totalApplicants]),
    csvRow(["Coverage %", r.coverage == null ? "" : Math.round(r.coverage * 100)]),
    csvRow(["Suppression K", r.kAnon]),
  ];
  for (const d of r.dimensions) {
    lines.push(csvRow([]));
    lines.push(csvRow([d.label, d.covered ? "" : "(hidden — low coverage)"]));
    if (d.covered) {
      lines.push(csvRow(["Group", "Applicants", "Reached interview", "Hired"]));
      for (const row of d.rows) lines.push(csvRow([row.category, v(row.applicants), v(row.reachedInterview), v(row.hired)]));
    }
  }
  return csvResponse(`diversity-${range.key}`, lines);
}
