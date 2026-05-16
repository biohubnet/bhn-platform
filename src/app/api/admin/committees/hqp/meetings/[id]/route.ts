/**
 * Single HQP meeting (admin).
 *   PATCH update title/agenda/notes/status/meetingUrl
 *   DELETE cancel (sets status=cancelled)
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

  const existing = await prisma.hqpMeeting.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const data: Record<string, unknown> = {};
  if (typeof body.title       === "string") data.title  = body.title.slice(0, 200);
  if (typeof body.agenda      === "string") data.agenda = body.agenda.slice(0, 4000) || null;
  if (typeof body.notes       === "string") data.notes  = body.notes.slice(0, 12000) || null;
  if (typeof body.meetingUrl  === "string") data.meetingUrl = body.meetingUrl.slice(0, 500) || null;
  if (typeof body.status      === "string" && ["scheduled", "held", "cancelled"].includes(body.status)) {
    data.status = body.status;
  }
  if (body.scheduledAt) {
    const d = new Date(body.scheduledAt as string);
    if (!isNaN(d.getTime())) data.scheduledAt = d;
  }
  if (typeof body.durationMin === "number") {
    data.durationMin = Math.min(480, Math.max(15, body.durationMin));
  }
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const updated = await prisma.hqpMeeting.update({ where: { id }, data });
  await prisma.auditLog.create({
    data: {
      actorId,
      action: "hqp_meeting.update",
      targetType: "hqp_meeting",
      targetId: id,
      detail: JSON.stringify({ changes: Object.keys(data) }),
      ip: req.headers.get("x-forwarded-for") ?? undefined,
    },
  }).catch(() => undefined);
  return NextResponse.json({ ok: true, meeting: updated });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireRole("admin");
  const actorId = (session.user as { id?: string }).id ?? "";
  const { id } = await params;
  const updated = await prisma.hqpMeeting.update({ where: { id }, data: { status: "cancelled" } });
  await prisma.auditLog.create({
    data: {
      actorId,
      action: "hqp_meeting.cancel",
      targetType: "hqp_meeting",
      targetId: id,
      ip: req.headers.get("x-forwarded-for") ?? undefined,
    },
  }).catch(() => undefined);
  return NextResponse.json({ ok: true, meeting: updated });
}
