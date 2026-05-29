import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveReportAccess } from "@/lib/employer/reporting/access";
import { requireCompanyRole, CompanyAccessError } from "@/lib/employer/company";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function gate(id: string) {
  const access = await resolveReportAccess();
  if (!access.ok) return { error: NextResponse.json({ error: access.reason }, { status: access.reason === "unauth" ? 401 : 403 }) };
  try {
    await requireCompanyRole(access.companyId, access.userId, "manager");
  } catch (e) {
    if (e instanceof CompanyAccessError) return { error: NextResponse.json({ error: e.message }, { status: 403 }) };
    throw e;
  }
  const target = await prisma.hiringTarget.findUnique({ where: { id }, select: { id: true, companyId: true } });
  if (!target || target.companyId !== access.companyId) {
    return { error: NextResponse.json({ error: "Not found." }, { status: 404 }) };
  }
  return { ok: true as const };
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const g = await gate(id);
  if (!g.ok) return g.error;

  const body = (await req.json().catch(() => ({}))) as { targetValue?: number | string; comparator?: string; note?: string };
  const data: { targetValue?: number; comparator?: string; note?: string | null } = {};
  if (body.targetValue !== undefined) {
    const v = Number(body.targetValue);
    if (!Number.isFinite(v) || v < 0) return NextResponse.json({ error: "Invalid target value." }, { status: 400 });
    data.targetValue = v;
  }
  if (body.comparator === "gte" || body.comparator === "lte") data.comparator = body.comparator;
  if (body.note !== undefined) data.note = typeof body.note === "string" ? body.note.trim().slice(0, 200) || null : null;

  await prisma.hiringTarget.update({ where: { id }, data });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const g = await gate(id);
  if (!g.ok) return g.error;
  await prisma.hiringTarget.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
