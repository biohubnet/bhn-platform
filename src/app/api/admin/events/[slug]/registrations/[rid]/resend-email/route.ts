/**
 * Admin: re-send the registration confirmation email to an attendee.
 *
 *   POST /api/admin/events/[slug]/registrations/[rid]/resend-email
 *
 * Use case: attendee can't find the original confirmation, lost
 * their QR token, or admin wants to nudge them with updated event
 * info ahead of the day.
 *
 * The body is regenerated from the current Registration + Event +
 * WorkshopBooking state, so resends always reflect the latest data
 * (e.g. if the admin booked extra workshops on their behalf, those
 * will appear in the email).
 *
 * Returns 503 (not 500) when SMTP isn't configured, so the admin
 * UI can distinguish "this won't work in this environment" from
 * "something broke".
 */
import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendMail, mailConfigured } from "@/lib/mail";

export const runtime = "nodejs";

export async function POST(
  _req: NextRequest,
  ctx: { params: Promise<{ slug: string; rid: string }> },
) {
  const session = await requireRole("admin").catch(() => null);
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (!mailConfigured()) {
    return NextResponse.json(
      { error: "Email is not configured in this environment (SMTP_HOST missing)." },
      { status: 503 },
    );
  }

  const { slug, rid } = await ctx.params;
  const event = await prisma.bhnEvent.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      title: true,
      startDate: true,
      endDate: true,
      timezone: true,
      mainVenueName: true,
      mainVenueAddress: true,
    },
  });
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

  const registration = await prisma.registration.findUnique({
    where: { id: rid },
    include: {
      user: { select: { email: true, name: true } },
    },
  });
  if (!registration || registration.eventId !== event.id) {
    return NextResponse.json({ error: "Registration not found for this event" }, { status: 404 });
  }
  // Resolve recipient email + display name — user-path uses the
  // session-backed User row, guest-path uses the guest* fields
  // captured at registration time.
  const recipientEmail = registration.user?.email ?? registration.guestEmail ?? null;
  const recipientName  = registration.user?.name  ?? registration.guestName  ?? null;
  if (!recipientEmail) {
    return NextResponse.json({ error: "Attendee has no email on file." }, { status: 400 });
  }

  // Re-fetch workshop bookings so the resent email reflects current
  // bookings. Skip for guest registrations — they can't have any.
  const bookings = registration.userId
    ? await prisma.workshopBooking.findMany({
        where: {
          userId: registration.userId,
          status: { not: "cancelled" },
          workshop: { eventId: event.id },
        },
        include: { workshop: { select: { title: true } } },
        orderBy: { bookedAt: "asc" },
      })
    : [];

  const eventDates = formatEventDates(event.startDate, event.endDate, event.timezone);
  const greeting = recipientName ? `Hi ${recipientName.split(/\s+/)[0]},` : "Hi,";

  const workshopLines = bookings.map((b) => {
    const title = b.workshop.title;
    return b.status === "confirmed"
      ? `  ✓ ${title} — confirmed`
      : `  • ${title} — waitlisted${b.waitlistPosition ? ` (position ${b.waitlistPosition})` : ""}`;
  });
  const workshopBlock = workshopLines.length
    ? `Your workshop picks:\n${workshopLines.join("\n")}\n\n`
    : "";

  const text =
    `${greeting}\n\n` +
    `Re-sending your confirmation for ${event.title}.\n\n` +
    `When: ${eventDates}\n` +
    `Where: ${event.mainVenueName ?? "TBA"}` +
    (event.mainVenueAddress ? ` · ${event.mainVenueAddress}` : "") +
    `\n\n` +
    workshopBlock +
    `Your check-in code: ${registration.qrToken}\n` +
    `(We'll scan this at the door — bring this email or open the page below on your phone.)\n\n` +
    (registration.userId ? `Find everything at: /events/${event.slug}/me\n\n` : "") +
    `Questions? Reply to this email or contact the BHN team at info@biohubnet.ca.\n\n` +
    `— BioHubNet`;

  try {
    await sendMail({
      to: recipientEmail,
      subject: `Your registration for ${event.title}`,
      text,
    });
    return NextResponse.json({ ok: true, sentTo: recipientEmail });
  } catch (err) {
    console.error("Admin resend-email failed:", (err as Error).message);
    return NextResponse.json(
      { error: "Email send failed. Check SMTP logs." },
      { status: 502 },
    );
  }
}

function formatEventDates(start: Date, end: Date, timeZone: string): string {
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-CA", { month: "short", day: "numeric", timeZone });
  const startStr = fmt(start);
  const endStr = fmt(end);
  const year = end.toLocaleDateString("en-CA", { year: "numeric", timeZone });
  if (startStr === endStr) return `${startStr}, ${year}`;
  return `${startStr}–${endStr.replace(/^[A-Za-z]+\s+/, "")}, ${year}`;
}
