import { NextRequest, NextResponse } from "next/server";
import { resolveReportAccess } from "@/lib/employer/reporting/access";
import { resolvePeriod } from "@/lib/employer/reporting/period";
import { csvRow, csvResponse } from "@/lib/employer/reporting/csv";
import { funnelReport, cohortFunnel } from "@/lib/employer/reporting/funnel";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const access = await resolveReportAccess();
  if (!access.ok) return NextResponse.json({ error: access.reason }, { status: access.reason === "unauth" ? 401 : 403 });

  const sp = Object.fromEntries(req.nextUrl.searchParams.entries());
  const range = resolvePeriod(sp);
  const [snap, cohort] = await Promise.all([funnelReport(access.companyId, range), cohortFunnel(access.companyId, range)]);

  const lines = [
    csvRow(["Report", "Recruiting funnel & conversion"]),
    csvRow(["Period", range.label]),
    csvRow(["Total applications", snap.total]),
    csvRow(["Cohort entered", cohort.cohort]),
    csvRow([]),
    csvRow(["Stage", "Currently in", "Reached (snapshot)", "Reached %", "Cohort reached", "Cohort %", "Pass from prev %"]),
    ...snap.rows.map((r, i) =>
      csvRow([
        r.label,
        r.current,
        r.reached,
        r.reachedPct == null ? "" : Math.round(r.reachedPct),
        cohort.rows[i]?.reached ?? "",
        cohort.rows[i]?.reachedPct == null ? "" : Math.round(cohort.rows[i]!.reachedPct!),
        cohort.rows[i]?.passFromPrev == null ? "" : Math.round(cohort.rows[i]!.passFromPrev!),
      ]),
    ),
  ];
  return csvResponse(`funnel-${range.key}`, lines);
}
