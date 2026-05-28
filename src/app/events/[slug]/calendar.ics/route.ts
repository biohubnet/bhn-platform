/**
 * Public .ics download for any published event.
 *
 *   GET /events/[slug]/calendar.ics
 *     → text/calendar; charset=utf-8
 *
 * Powers the "Apple Calendar / iCal" option in the AddToCalendar
 * dropdown and the Phase-2 registration-confirmation email's
 * inline attachment fallback. No registrant-specific data — that's
 * what the email attachment is for. UID is event-derived so re-
 * downloads of the same event update the existing calendar entry
 * rather than duplicating.
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildIcs } from "@/lib/events/ics";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ slug: string }> },
) {
  const { slug } = await ctx.params;
  const event = await prisma.bhnEvent.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      title: true,
      tagline: true,
      description: true,
      startDate: true,
      endDate: true,
      mainVenueName: true,
      mainVenueAddress: true,
      status: true,
    },
  });
  if (!event || event.status !== "published") {
    return new NextResponse("Event not found", { status: 404 });
  }

  // Compose the location string. Online events use the platform
  // name; in-person events use venue + address.
  const isOnline = event.mainVenueName === "Online";
  const location = isOnline
    ? event.mainVenueName ?? "Online"
    : [event.mainVenueName, event.mainVenueAddress].filter(Boolean).join(", ") || null;

  // Build a public URL so the calendar entry has a click-through.
  const proto = process.env.VERCEL_URL ? "https" : "http";
  const host  = process.env.VERCEL_URL ?? process.env.HOST ?? "localhost:3000";
  const url   = `${proto}://${host}/events/${event.slug}`;

  const ics = buildIcs({
    uid: `event-${event.id}@biohubnet.ca`,
    title: event.title,
    description: event.tagline ?? event.description ?? null,
    location,
    start: event.startDate,
    end: event.endDate,
    url,
    organizerEmail: process.env.SMTP_FROM_EMAIL ?? "info@biohubnet.ca",
    organizerName: "BioHubNet",
  });

  return new NextResponse(ics, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${event.slug}.ics"`,
      "Cache-Control": "public, max-age=300, s-maxage=300",
    },
  });
}
