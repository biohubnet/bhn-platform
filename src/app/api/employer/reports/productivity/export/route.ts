import { NextRequest, NextResponse } from "next/server";
import { resolveReportAccess } from "@/lib/employer/reporting/access";
import { resolvePeriod } from "@/lib/employer/reporting/period";
import { csvRow, csvResponse } from "@/lib/employer/reporting/csv";
import { productivityReport } from "@/lib/employer/reporting/productivity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const access = await resolveReportAccess();
  if (!access.ok) return NextResponse.json({ error: access.reason }, { status: access.reason === "unauth" ? 401 : 403 });

  const sp = Object.fromEntries(req.nextUrl.searchParams.entries());
  const range = resolvePeriod(sp);
  const r = await productivityReport(access.companyId, range);

  const lines = [
    csvRow(["Report", "Recruiter & team productivity"]),
    csvRow(["Period", range.label]),
    csvRow([]),
    csvRow(["Member", "Role", "Title", "Actions", "Interviews", "Scorecards", "Hires"]),
    ...r.rows.map((m) => csvRow([m.name, m.role ?? "", m.title ?? "", m.actions, m.interviews, m.scorecards, m.hires])),
  ];
  return csvResponse(`productivity-${range.key}`, lines);
}
