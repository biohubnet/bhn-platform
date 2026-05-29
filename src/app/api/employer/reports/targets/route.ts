import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveReportAccess } from "@/lib/employer/reporting/access";
import { requireCompanyRole, CompanyAccessError } from "@/lib/employer/company";
import { TARGET_METRIC_KEYS, defaultComparator } from "@/lib/employer/reporting/targets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PERIODS = ["quarter", "year", "month", "rolling_90"];

/** Create or update a company-wide hiring target (OKR). Manager+ only. */
export async function POST(req: NextRequest) {
  const access = await resolveReportAccess();
  if (!access.ok) return NextResponse.json({ error: access.reason }, { status: access.reason === "unauth" ? 401 : 403 });
  try {
    await requireCompanyRole(access.companyId, access.userId, "manager");
  } catch (e) {
    if (e instanceof CompanyAccessError) return NextResponse.json({ error: e.message }, { status: 403 });
    throw e;
  }

  const body = (await req.json().catch(() => ({}))) as {
    metricKey?: string; targetValue?: number | string; comparator?: string; period?: string; note?: string;
  };

  const metricKey = body.metricKey;
  if (!metricKey || !TARGET_METRIC_KEYS.includes(metricKey)) {
    return NextResponse.json({ error: "Unknown metric." }, { status: 400 });
  }
  const targetValue = Number(body.targetValue);
  if (!Number.isFinite(targetValue) || targetValue < 0) {
    return NextResponse.json({ error: "Target value must be a non-negative number." }, { status: 400 });
  }
  const comparator = body.comparator === "lte" || body.comparator === "gte" ? body.comparator : defaultComparator(metricKey);
  const period = body.period && PERIODS.includes(body.period) ? body.period : "quarter";
  const note = typeof body.note === "string" ? body.note.trim().slice(0, 200) || null : null;

  // Manual upsert: the @@unique includes postingId, and Postgres treats
  // NULL as distinct, so we can't use a Prisma unique-where for the
  // company-wide (postingId = null) row.
  const existing = await prisma.hiringTarget.findFirst({
    where: { companyId: access.companyId, metricKey, period, postingId: null },
    select: { id: true },
  });
  const row = existing
    ? await prisma.hiringTarget.update({ where: { id: existing.id }, data: { targetValue, comparator, note } })
    : await prisma.hiringTarget.create({
        data: { companyId: access.companyId, metricKey, period, targetValue, comparator, note, createdById: access.userId },
      });

  return NextResponse.json({ ok: true, id: row.id });
}
