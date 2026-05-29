import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveReportAccess } from "@/lib/employer/reporting/access";
import { requireCompanyRole, CompanyAccessError } from "@/lib/employer/company";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Toggle the company's DEI reporting gate. Owner only — turning this on
 *  starts collecting voluntary self-ID at apply time and surfaces the
 *  (suppressed, aggregate-only) diversity report. */
export async function POST(req: NextRequest) {
  const access = await resolveReportAccess();
  if (!access.ok) return NextResponse.json({ error: access.reason }, { status: access.reason === "unauth" ? 401 : 403 });
  try {
    await requireCompanyRole(access.companyId, access.userId, "owner");
  } catch (e) {
    if (e instanceof CompanyAccessError) return NextResponse.json({ error: e.message }, { status: 403 });
    throw e;
  }

  const body = (await req.json().catch(() => ({}))) as { enabled?: boolean };
  await prisma.company.update({
    where: { id: access.companyId },
    data: { deiReportingEnabled: Boolean(body.enabled) },
  });
  return NextResponse.json({ ok: true, enabled: Boolean(body.enabled) });
}
