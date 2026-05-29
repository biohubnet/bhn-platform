import { NextRequest, NextResponse } from "next/server";
import { resolveReportAccess } from "@/lib/employer/reporting/access";
import { resolvePeriod } from "@/lib/employer/reporting/period";
import { csvRow, csvResponse } from "@/lib/employer/reporting/csv";
import { requisitionReport } from "@/lib/employer/reporting/requisitions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const access = await resolveReportAccess();
  if (!access.ok) return NextResponse.json({ error: access.reason }, { status: access.reason === "unauth" ? 401 : 403 });

  const sp = Object.fromEntries(req.nextUrl.searchParams.entries());
  const range = resolvePeriod(sp);
  const r = await requisitionReport(access.companyId, range);

  const lines = [
    csvRow(["Report", "Requisition status & aging"]),
    csvRow(["Period", range.label]),
    csvRow(["Active", r.active]),
    csvRow(["Closed", r.closed]),
    csvRow(["Draft", r.draft]),
    csvRow(["Expired", r.expired]),
    csvRow(["Stale (>30d, no hire)", r.staleCount]),
    csvRow([]),
    csvRow(["Posting", "Status", "Days open", "Applicants", "Hired", "Age bucket", "Stale"]),
    ...r.rows.map((p) =>
      csvRow([p.title, p.status, Math.round(p.daysOpen), p.applicants, p.hired, p.ageBucket, p.stale ? "yes" : ""]),
    ),
  ];
  return csvResponse(`requisitions-${range.key}`, lines);
}
