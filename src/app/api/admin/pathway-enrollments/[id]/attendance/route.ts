/**
 * PATCH /api/admin/pathway-enrollments/[id]/attendance
 *
 * Records enrollment-level attendance for a trainee in a pathway/cohort.
 * Admins mark who actually showed up; the graduate showcase can then gate
 * on `attended` so only attendees get to submit (the register -> attend ->
 * showcase chain).
 *
 *   body: { attended?: boolean, sessionsAttended?: number, note?: string }
 *
 * Admin-gated. Writes an AuditLog row for traceability.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireRole("admin").catch(() => null);
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const reviewerId = (session.user as { id?: string }).id!;
  const { id } = await params;

  const body = (await req.json().catch(() => ({}))) as {
    attended?: unknown;
    sessionsAttended?: unknown;
    note?: unknown;
  };

  const existing = await prisma.pathwayEnrollment.findUnique({
    where: { id },
    select: { id: true, userId: true, pathwayId: true },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const data: {
    attended?: boolean;
    sessionsAttended?: number;
    attendanceNote?: string | null;
    attendanceRecordedAt?: Date;
    attendanceRecordedById?: string | null;
  } = {};
  let touched = false;
  if (typeof body.attended === "boolean") {
    data.attended = body.attended;
    touched = true;
  }
  if (typeof body.sessionsAttended === "number" && Number.isFinite(body.sessionsAttended)) {
    data.sessionsAttended = Math.max(0, Math.min(9999, Math.trunc(body.sessionsAttended)));
    touched = true;
  }
  if (typeof body.note === "string") {
    data.attendanceNote = body.note.trim() ? body.note.trim().slice(0, 500) : null;
    touched = true;
  }
  if (!touched) {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  }
  data.attendanceRecordedAt = new Date();
  data.attendanceRecordedById = reviewerId;

  const updated = await prisma.pathwayEnrollment.update({
    where: { id },
    data,
    select: {
      id: true,
      attended: true,
      sessionsAttended: true,
      attendanceNote: true,
      attendanceRecordedAt: true,
    },
  });

  await prisma.auditLog.create({
    data: {
      actorId: reviewerId,
      action: "pathway_enrollment.attendance",
      targetType: "pathway_enrollment",
      targetId: id,
      detail: JSON.stringify({
        pathwayId: existing.pathwayId,
        userId: existing.userId,
        attended: data.attended,
        sessionsAttended: data.sessionsAttended,
      }),
      ip: req.headers.get("x-forwarded-for") ?? undefined,
    },
  });

  return NextResponse.json({ ok: true, attendance: updated });
}
