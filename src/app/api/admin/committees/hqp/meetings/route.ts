/**
 * Admin endpoints for HQP committee meetings.
 *   GET  list
 *   POST create  (also seeds attendance rows for every active member)
 */
import { NextResponse } from "next/server";
import { guardRole } from "@/lib/api/guard";

import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
  const _guard = await guardRole("admin");
  if (_guard instanceof NextResponse) return _guard;
  const meetings = await prisma.hqpMeeting.findMany({
    orderBy: { scheduledAt: "desc" },
    include: {
      _count: { select: { attendance: true, actionItems: true } },
      createdBy: { select: { id: true, name: true } },
    },
  });
  return NextResponse.json({ meetings });
}

export async function POST(req: Request) {
  const session = await guardRole("admin");
  if (session instanceof NextResponse) return session;
  const actorId = (session.user as { id?: string }).id ?? "";
  const body = await req.json().catch(() => ({} as Record<string, unknown>));

  const title = typeof body.title === "string" ? body.title.slice(0, 200) : "";
  const scheduledAt = body.scheduledAt ? new Date(body.scheduledAt as string) : null;
  const durationMin = typeof body.durationMin === "number" ? Math.min(480, Math.max(15, body.durationMin)) : 60;
  const agenda = typeof body.agenda === "string" ? body.agenda.slice(0, 4000) : null;
  const meetingUrl = typeof body.meetingUrl === "string" ? body.meetingUrl.slice(0, 500) : null;

  if (!title) return NextResponse.json({ error: "Title is required" }, { status: 400 });
  if (!scheduledAt || isNaN(scheduledAt.getTime())) {
    return NextResponse.json({ error: "Invalid scheduledAt" }, { status: 400 });
  }

  // Seed attendance for every active HQP member.
  const activeMembers = await prisma.committeeMembership.findMany({
    where: { committee: "hqp", active: true },
    select: { userId: true },
  });

  const meeting = await prisma.hqpMeeting.create({
    data: {
      title, scheduledAt, durationMin, agenda, meetingUrl,
      status: "scheduled",
      createdById: actorId,
      attendance: {
        create: activeMembers.map((m) => ({ userId: m.userId, status: "invited" })),
      },
    },
  });

  await prisma.auditLog.create({
    data: {
      actorId,
      action: "hqp_meeting.create",
      targetType: "hqp_meeting",
      targetId: meeting.id,
      detail: JSON.stringify({ title, scheduledAt, attendeesSeeded: activeMembers.length }),
      ip: req.headers.get("x-forwarded-for") ?? undefined,
    },
  }).catch(() => undefined);

  return NextResponse.json({ ok: true, meeting });
}
