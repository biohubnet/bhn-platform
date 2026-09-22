/**
 * PATCH  /api/admin/dashboard-promos/[id] — replace a card's fields (the
 *        editor always sends the whole card). Body: PromoInput.
 * DELETE /api/admin/dashboard-promos/[id] — remove it.
 * Admin only.
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardRole } from "@/lib/api/guard";
import { PromoInput, toPromoData } from "@/lib/dashboard-promos";

type Ctx = { params: Promise<{ id: string }> };

function audit(actorId: string | undefined, action: string, id: string, req: NextRequest, detail: object) {
  if (!actorId) return Promise.resolve();
  return prisma.auditLog.create({
    data: {
      actorId,
      action,
      targetType: "dashboard_promo",
      targetId: id,
      detail: JSON.stringify(detail),
      ip: req.headers.get("x-forwarded-for") ?? undefined,
    },
  }).then(() => undefined, () => undefined);
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const session = await guardRole("admin");
  if (session instanceof NextResponse) return session;
  const { id } = await params;

  const parsed = PromoInput.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return NextResponse.json({ error: issue?.message ?? "Invalid fields.", field: issue?.path[0] ?? null }, { status: 400 });
  }

  const { count } = await prisma.dashboardPromo.updateMany({ where: { id }, data: toPromoData(parsed.data) });
  if (count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await audit((session.user as { id?: string }).id, "dashboard_promo.update", id, req, {
    kind: parsed.data.kind, title: parsed.data.title, status: parsed.data.status,
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  const session = await guardRole("admin");
  if (session instanceof NextResponse) return session;
  const { id } = await params;

  const existing = await prisma.dashboardPromo.findUnique({ where: { id }, select: { kind: true, title: true } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.dashboardPromo.deleteMany({ where: { id } });

  await audit((session.user as { id?: string }).id, "dashboard_promo.delete", id, req, existing);
  return NextResponse.json({ ok: true });
}
