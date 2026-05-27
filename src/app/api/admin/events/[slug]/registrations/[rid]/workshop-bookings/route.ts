/**
 * Admin: book a workshop for an attendee on their behalf.
 *
 *   POST /api/admin/events/[slug]/registrations/[rid]/workshop-bookings
 *     body: { workshopId: string }
 *
 * Same booking rules as the user-facing flow — must have a confirmed
 * Registration, must be under the 2-workshop cap, full slots become
 * waitlist bookings — but performed by an admin. Useful when an
 * attendee emails saying "please switch me to workshop X".
 */
import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { bookWorkshop } from "@/lib/events/bookings";

export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ slug: string; rid: string }> },
) {
  const session = await requireRole("admin").catch(() => null);
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

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
    return NextResponse.json({ error: "Registration not found for this event" }, { status: 404 });
  }
  // Guest registrations (no User row) can't book workshops — the
  // WorkshopBooking model requires a userId. The events team would
  // need to ask the guest to create an account if they want to add
  // a workshop after registering as a guest.
  if (!registration.userId) {
    return NextResponse.json(
      { error: "This is a guest registration — workshop bookings require a platform account." },
      { status: 409 },
    );
  }

  const body = (await req.json().catch(() => ({}))) as { workshopId?: string };
  if (typeof body.workshopId !== "string" || !body.workshopId) {
    return NextResponse.json({ error: "workshopId required" }, { status: 400 });
  }

  // Pre-flight — workshop must belong to this event.
  const workshop = await prisma.workshop.findUnique({
    where: { id: body.workshopId },
    select: { eventId: true },
  });
  if (!workshop || workshop.eventId !== event.id) {
    return NextResponse.json(
      { error: "Workshop not found in this event" },
      { status: 404 },
    );
  }

  const r = await bookWorkshop(prisma, registration.userId, body.workshopId);
  if (!r.ok) {
    return NextResponse.json({ error: r.error, code: r.code }, { status: 400 });
  }
  return NextResponse.json({
    ok: true,
    bookingId: r.bookingId,
    status: r.status,
    waitlistPosition: r.waitlistPosition,
  });
}
