/**
 * POST /api/admin/dashboard-promos — add a card to the dashboard's
 * "What's on" band. Admin only. Body: PromoInput (lib/dashboard-promos).
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardRole } from "@/lib/api/guard";
import { PromoInput, toPromoData } from "@/lib/dashboard-promos";

export async function POST(req: NextRequest) {
  const session = await guardRole("admin");
  if (session instanceof NextResponse) return session;

  const parsed = PromoInput.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return NextResponse.json({ error: issue?.message ?? "Invalid fields.", field: issue?.path[0] ?? null }, { status: 400 });
  }

  const actorId = (session.user as { id?: string }).id ?? null;
  const promo = await prisma.dashboardPromo.create({ data: { ...toPromoData(parsed.data), createdById: actorId } });
  if (actorId) {
    await prisma.auditLog.create({
      data: {
        actorId,
        action: "dashboard_promo.create",
        targetType: "dashboard_promo",
        targetId: promo.id,
        detail: JSON.stringify({ kind: promo.kind, title: promo.title, status: promo.status }),
        ip: req.headers.get("x-forwarded-for") ?? undefined,
      },
    }).catch(() => undefined);
  }
  return NextResponse.json({ ok: true, id: promo.id }, { status: 201 });
}
