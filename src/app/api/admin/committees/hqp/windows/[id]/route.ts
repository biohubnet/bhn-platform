/**
 * Single HQP application window — close / reopen / edit.
 */
import { NextResponse } from "next/server";
import { guardRole } from "@/lib/api/guard";

import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await guardRole("admin");
  if (session instanceof NextResponse) return session;
  const actorId = (session.user as { id?: string }).id ?? "";
  const { id } = await params;
  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  const action = typeof body.action === "string" ? body.action : "";

  const existing = await prisma.hqpApplicationWindow.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const data: Record<string, unknown> = {};
  if (action === "close")  data.status = "closed";
  if (action === "reopen") data.status = "open";
  if (action === "update_meta") {
    if (typeof body.title       === "string") data.title       = body.title.slice(0, 200);
    if (typeof body.description === "string") data.description = body.description.slice(0, 1000) || null;
    if (body.opensAt) {
      const d = new Date(body.opensAt as string);
      if (!isNaN(d.getTime())) data.opensAt = d;
    }
    if (body.closesAt) {
      const d = new Date(body.closesAt as string);
      if (!isNaN(d.getTime())) data.closesAt = d;
    }
  }
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Unknown action / nothing to update" }, { status: 400 });
  }

  const updated = await prisma.hqpApplicationWindow.update({ where: { id }, data });

  await prisma.auditLog.create({
    data: {
      actorId,
      action: `hqp_window.${action}`,
      targetType: "hqp_application_window",
      targetId: id,
      detail: JSON.stringify({ before: existing.status, after: updated.status, changes: data }),
      ip: req.headers.get("x-forwarded-for") ?? undefined,
    },
  }).catch(() => undefined);

  return NextResponse.json({ ok: true, window: updated });
}
