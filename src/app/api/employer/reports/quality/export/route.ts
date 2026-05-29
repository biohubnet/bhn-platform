import { NextRequest, NextResponse } from "next/server";
import { resolveReportAccess } from "@/lib/employer/reporting/access";
import { resolvePeriod } from "@/lib/employer/reporting/period";
import { csvRow, csvResponse } from "@/lib/employer/reporting/csv";
import { qualityReport } from "@/lib/employer/reporting/quality";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const access = await resolveReportAccess();
  if (!access.ok) return NextResponse.json({ error: access.reason }, { status: access.reason === "unauth" ? 401 : 403 });

  const sp = Object.fromEntries(req.nextUrl.searchParams.entries());
  const range = resolvePeriod(sp);
  const r = await qualityReport(access.companyId, range);

  const lines = [
    csvRow(["Report", "Quality of hire"]),
    csvRow(["Period", range.label]),
    csvRow([]),
    csvRow(["Metric", "Value", "n"]),
    csvRow(["Avg scorecard score %", r.avgScore.value == null ? "" : Math.round(r.avgScore.value), r.avgScore.n ?? 0]),
    csvRow(["Avg score (hired) %", r.avgScoreHired.value == null ? "" : Math.round(r.avgScoreHired.value), r.avgScoreHired.n ?? 0]),
    csvRow(["Scorecard completion %", r.completionRate.value == null ? "" : Math.round(r.completionRate.value), r.completionRate.n ?? 0]),
    csvRow(["Submitted scorecards", r.submitted, ""]),
    csvRow([]),
    csvRow(["Recommendation", "Count"]),
    ...r.recommendations.map((rec) => csvRow([rec.label, rec.count])),
  ];
  return csvResponse(`quality-${range.key}`, lines);
}
