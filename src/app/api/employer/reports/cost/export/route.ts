import { NextRequest, NextResponse } from "next/server";
import { resolveReportAccess } from "@/lib/employer/reporting/access";
import { resolvePeriod } from "@/lib/employer/reporting/period";
import { csvRow, csvResponse } from "@/lib/employer/reporting/csv";
import { costReport } from "@/lib/employer/reporting/cost";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const access = await resolveReportAccess();
  if (!access.ok) return NextResponse.json({ error: access.reason }, { status: access.reason === "unauth" ? 401 : 403 });

  const sp = Object.fromEntries(req.nextUrl.searchParams.entries());
  const range = resolvePeriod(sp);
  const r = await costReport(access.companyId, range);

  const lines = [
    csvRow(["Report", "Cost per hire"]),
    csvRow(["Period", range.label]),
    csvRow(["Currency", r.currency]),
    csvRow(["Total spend", Math.round(r.totalSpend)]),
    csvRow(["Hires", r.hires]),
    csvRow(["Cost per hire", r.costPerHire.value == null ? "" : Math.round(r.costPerHire.value)]),
    csvRow([]),
    csvRow(["Cost type", "Amount"]),
    ...r.byType.map((t) => csvRow([t.costType, Math.round(t.amount)])),
    csvRow([]),
    csvRow(["Posting", "Amount"]),
    ...r.byPosting.map((p) => csvRow([p.title, Math.round(p.amount)])),
  ];
  return csvResponse(`cost-per-hire-${range.key}`, lines);
}
