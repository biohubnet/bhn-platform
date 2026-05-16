/**
 * Single HQP feedback round — admin actions.
 *
 *   PATCH action=close | reopen | update_meta
 */
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireRole("admin");
  const actorId = (session.user as { id?: string }).id ?? "";
  const { id } = await params;
  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  const action = typeof body.action === "string" ? body.action : "";

  const existing = await prisma.hqpFeedbackRound.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const data: Record<string, unknown> = {};
  if (action === "close")  data.status = "closed";
  if (action === "reopen") data.status = "open";
  if (action === "update_meta") {
    if (typeof body.title === "string")       data.title = body.title.slice(0, 200);
    if (typeof body.description === "string") data.description = body.description.slice(0, 2000) || null;
  }
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Unknown action / nothing to update" }, { status: 400 });
  }

  const updated = await prisma.hqpFeedbackRound.update({ where: { id }, data });

  await prisma.auditLog.create({
    data: {
      actorId,
      action: `hqp_round.${action}`,
      targetType: "hqp_feedback_round",
      targetId: id,
      detail: JSON.stringify({ changes: data }),
      ip: req.headers.get("x-forwarded-for") ?? undefined,
    },
  }).catch(() => undefined);

  return NextResponse.json({ ok: true, round: updated });
}
