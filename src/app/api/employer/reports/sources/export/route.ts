import { NextRequest, NextResponse } from "next/server";
import { resolveReportAccess } from "@/lib/employer/reporting/access";
import { resolvePeriod } from "@/lib/employer/reporting/period";
import { csvRow, csvResponse } from "@/lib/employer/reporting/csv";
import { sourceReport } from "@/lib/employer/reporting/sources";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const access = await resolveReportAccess();
  if (!access.ok) return NextResponse.json({ error: access.reason }, { status: access.reason === "unauth" ? 401 : 403 });

  const sp = Object.fromEntries(req.nextUrl.searchParams.entries());
  const range = resolvePeriod(sp);
  const r = await sourceReport(access.companyId, range);

  const pct = (n: number | null) => (n == null ? "" : Math.round(n));
  const lines = [
    csvRow(["Report", "Source effectiveness"]),
    csvRow(["Period", range.label]),
    csvRow(["Total applications", r.total]),
    csvRow([]),
    csvRow(["Source", "Applications", "% of total", "Reached interview", "Interview rate %", "Hires", "Hire rate %"]),
    ...r.rows.map((s) => csvRow([s.label, s.applications, pct(s.pctOfTotal), s.reachedInterview, pct(s.interviewRate), s.hires, pct(s.hireRate)])),
  ];
  return csvResponse(`sources-${range.key}`, lines);
}
