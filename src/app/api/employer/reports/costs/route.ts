import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveReportAccess } from "@/lib/employer/reporting/access";
import { requireCompanyRole, CompanyAccessError } from "@/lib/employer/company";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COST_TYPES = ["advertising", "agency_fee", "referral_bonus", "tooling", "events", "relocation", "other"];

/** Add a recruiting cost line. Manager+ only. */
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
    costType?: string; amount?: number | string; currency?: string; incurredAt?: string; note?: string; postingId?: string;
  };

  const costType = body.costType && COST_TYPES.includes(body.costType) ? body.costType : null;
  if (!costType) return NextResponse.json({ error: "Unknown cost type." }, { status: 400 });
  const amount = Number(body.amount);
  if (!Number.isFinite(amount) || amount <= 0) return NextResponse.json({ error: "Amount must be a positive number." }, { status: 400 });
  const incurredAt = body.incurredAt ? new Date(body.incurredAt) : new Date();
  if (Number.isNaN(incurredAt.getTime())) return NextResponse.json({ error: "Invalid date." }, { status: 400 });
  const currency = typeof body.currency === "string" && body.currency.length === 3 ? body.currency.toUpperCase() : "CAD";
  const note = typeof body.note === "string" ? body.note.trim().slice(0, 200) || null : null;

  // If a postingId is given, ensure it belongs to this company.
  let postingId: string | null = null;
  if (typeof body.postingId === "string" && body.postingId) {
    const p = await prisma.internshipPosting.findUnique({ where: { id: body.postingId }, select: { companyId: true } });
    if (p?.companyId === access.companyId) postingId = body.postingId;
  }

  const row = await prisma.recruitingCost.create({
    data: { companyId: access.companyId, postingId, costType, amount, currency, incurredAt, note, createdById: access.userId },
    select: { id: true },
  });
  return NextResponse.json({ ok: true, id: row.id });
}
