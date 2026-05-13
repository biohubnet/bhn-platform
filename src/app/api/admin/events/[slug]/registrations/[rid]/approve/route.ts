/**
 * Admin: approve a pending event Registration.
 *
 *   POST /api/admin/events/[slug]/registrations/[rid]/approve
 *
 * Flips registrationStatus from `pending` → `confirmed` and stamps
 * approvedAt + approvedById. Idempotent: already-confirmed rows return
 * ok=true with alreadyConfirmed=true.
 *
 * Defence in depth: the registration must belong to the event named
 * by `slug` — stops slug-A-with-registration-B URL tampering.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { approveRegistration } from "@/lib/events/bookings";

export const runtime = "nodejs";

export async function POST(
  _req: NextRequest,
  ctx: { params: Promise<{ slug: string; rid: string }> },
) {
  const session = await requireRole("admin").catch(() => null);
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const adminUserId = (session.user as { id?: string }).id;
  if (!adminUserId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { slug, rid } = await ctx.params;
  const event = await prisma.bhnEvent.findUnique({
    where: { slug },
    select: { id: true },
  });
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

  const registration = await prisma.registration.findUnique({
    where: { id: rid },
    select: { eventId: true, userId: true },
  });
  if (!registration || registration.eventId !== event.id) {
    return NextResponse.json(
      { error: "Registration not found for this event" },
      { status: 404 },
    );
  }

  const r = await approveRegistration(prisma, event.id, registration.userId, adminUserId);
  if (!r.ok) {
    const statusByCode: Record<string, number> = {
      not_found: 404,
      cancelled: 409,
    };
    return NextResponse.json(
      { error: r.error, code: r.code },
      { status: statusByCode[r.code] ?? 400 },
    );
  }
  return NextResponse.json({ ok: true, alreadyConfirmed: r.alreadyConfirmed });
}
