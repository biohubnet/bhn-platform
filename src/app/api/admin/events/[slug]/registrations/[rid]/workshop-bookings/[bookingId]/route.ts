/**
 * Admin: cancel a workshop booking on an attendee's behalf.
 *
 *   DELETE /api/admin/events/[slug]/registrations/[rid]/workshop-bookings/[bookingId]
 *
 * Cancels the WorkshopBooking and runs the standard side effects —
 * if it was confirmed, the next waitlister is promoted; if it was
 * on the waitlist, lower positions are renumbered.
 *
 * Defence in depth: every layer (event slug → registration → booking)
 * must agree on ownership before we let the delete through, so an
 * admin can't accidentally cancel a booking belonging to a different
 * event or attendee by hand-rolling URLs.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { cancelWorkshopBooking } from "@/lib/events/bookings";

export const runtime = "nodejs";

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ slug: string; rid: string; bookingId: string }> },
) {
  const session = await requireRole("admin").catch(() => null);
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { slug, rid, bookingId } = await ctx.params;
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

  const booking = await prisma.workshopBooking.findUnique({
    where: { id: bookingId },
    select: { workshopId: true, userId: true, workshop: { select: { eventId: true } } },
  });
  if (
    !booking ||
    booking.userId !== registration.userId ||
    booking.workshop.eventId !== event.id
  ) {
    return NextResponse.json(
      { error: "Booking not found for this registration" },
      { status: 404 },
    );
  }

  const r = await cancelWorkshopBooking(prisma, booking.userId, booking.workshopId);
  if (!r.ok) {
    return NextResponse.json({ error: r.error, code: r.code }, { status: 400 });
  }
  return NextResponse.json({ ok: true, promoted: r.promoted });
}
