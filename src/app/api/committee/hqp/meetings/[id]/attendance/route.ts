/**
 * Member RSVP / attendance for an HQP meeting.
 *   POST /api/committee/hqp/meetings/[id]/attendance
 *     status = "attending" | "declined" | "attended"
 *
 * Members update their own attendance; admins can set any
 * member's status post-hoc by passing userId.
 */
import { NextResponse } from "next/server";
import { requireCommitteeOrAdmin } from "@/lib/committees/membership";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const ALLOWED = new Set(["invited", "attending", "attended", "declined", "absent"]);

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireCommitteeOrAdmin(["hqp"]);
  const sessionUserId = (session.user as { id?: string }).id ?? "";
  const role = (session.user as { role?: string }).role ?? "";
  const isAdmin = role === "admin" || role === "superadmin";
  const { id: meetingId } = await params;
  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  const status = typeof body.status === "string" ? body.status : "";
  if (!ALLOWED.has(status)) return NextResponse.json({ error: "Invalid status" }, { status: 400 });

  // Members can only update their own row; admins can pass userId.
  const userId = isAdmin && typeof body.userId === "string" ? body.userId : sessionUserId;
  const note = typeof body.note === "string" ? body.note.slice(0, 500) : null;

  const upserted = await prisma.hqpMeetingAttendance.upsert({
    where: { meetingId_userId: { meetingId, userId } },
    update: { status, ...(note ? { note } : {}) },
    create: { meetingId, userId, status, note },
  });
  return NextResponse.json({ ok: true, attendance: upserted });
}
