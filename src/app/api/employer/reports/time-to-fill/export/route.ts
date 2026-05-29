import { NextRequest, NextResponse } from "next/server";
import { resolveReportAccess } from "@/lib/employer/reporting/access";
import { resolvePeriod } from "@/lib/employer/reporting/period";
import { csvRow, csvResponse } from "@/lib/employer/reporting/csv";
import { timeToFillReport } from "@/lib/employer/reporting/timeToFill";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const access = await resolveReportAccess();
  if (!access.ok) return NextResponse.json({ error: access.reason }, { status: access.reason === "unauth" ? 401 : 403 });

  const sp = Object.fromEntries(req.nextUrl.searchParams.entries());
  const range = resolvePeriod(sp);
  const r = await timeToFillReport(access.companyId, range);

  const round = (n: number | null) => (n == null ? "" : Math.round(n * 10) / 10);
  const lines = [
    csvRow(["Report", "Time to fill & cycle time"]),
    csvRow(["Period", range.label]),
    csvRow([]),
    csvRow(["Metric", "Days", "n"]),
    csvRow(["Time to fill (median)", round(r.timeToFill.value), r.timeToFill.n ?? 0]),
    csvRow(["Time to hire (median)", round(r.timeToHire.value), r.timeToHire.n ?? 0]),
    csvRow(["Time to fill p25", round(r.p25), ""]),
    csvRow(["Time to fill p75", round(r.p75), ""]),
    csvRow([]),
    csvRow(["Stage", "Median days in stage", "n"]),
    ...r.cycleByBand.map((c) => csvRow([c.label, round(c.medianDays), c.n])),
  ];
  return csvResponse(`time-to-fill-${range.key}`, lines);
}
