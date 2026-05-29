import { NextRequest, NextResponse } from "next/server";
import { resolveReportAccess } from "@/lib/employer/reporting/access";
import { resolvePeriod } from "@/lib/employer/reporting/period";
import { csvRow, csvResponse } from "@/lib/employer/reporting/csv";
import { offerReport } from "@/lib/employer/reporting/offers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const access = await resolveReportAccess();
  if (!access.ok) return NextResponse.json({ error: access.reason }, { status: access.reason === "unauth" ? 401 : 403 });

  const sp = Object.fromEntries(req.nextUrl.searchParams.entries());
  const range = resolvePeriod(sp);
  const r = await offerReport(access.companyId, range);

  const lines = [
    csvRow(["Report", "Offer analytics"]),
    csvRow(["Period", range.label]),
    csvRow([]),
    csvRow(["Metric", "Value"]),
    csvRow(["Offer acceptance %", r.acceptanceRate.value == null ? "" : Math.round(r.acceptanceRate.value)]),
    csvRow(["Response time (median days)", r.responseTimeDays.value == null ? "" : Math.round(r.responseTimeDays.value * 10) / 10]),
    csvRow(["Sent", r.sent]),
    csvRow(["Accepted", r.accepted]),
    csvRow(["Declined", r.declined]),
    csvRow(["Expired", r.expired]),
    csvRow(["Outstanding", r.outstanding]),
    csvRow([]),
    csvRow(["Decline reason", "Count"]),
    ...r.declineReasons.map((d) => csvRow([d.reason, d.count])),
  ];
  return csvResponse(`offers-${range.key}`, lines);
}
