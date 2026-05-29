import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveReportAccess } from "@/lib/employer/reporting/access";
import { requireCompanyRole, CompanyAccessError } from "@/lib/employer/company";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const access = await resolveReportAccess();
  if (!access.ok) return NextResponse.json({ error: access.reason }, { status: access.reason === "unauth" ? 401 : 403 });
  try {
    await requireCompanyRole(access.companyId, access.userId, "manager");
  } catch (e) {
    if (e instanceof CompanyAccessError) return NextResponse.json({ error: e.message }, { status: 403 });
    throw e;
  }

  const cost = await prisma.recruitingCost.findUnique({ where: { id }, select: { companyId: true } });
  if (!cost || cost.companyId !== access.companyId) return NextResponse.json({ error: "Not found." }, { status: 404 });

  await prisma.recruitingCost.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
