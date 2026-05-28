/**
 * Real-time-ish admin feed for the registrations page.
 *
 *   GET /api/admin/events/[slug]/live?since=<iso>
 *     → {
 *         counts: { total, confirmed, pending, waitlist, checkedIn },
 *         newRegistrations: [...],
 *         newCheckIns:      [...],
 *         now: <iso>,
 *       }
 *
 * The admin page polls this endpoint every few seconds. Passing the
 * last-seen timestamp via `?since=` returns only what's changed
 * since — registrations created OR checked-in OR cancelled in that
 * window. Counts are always returned fresh.
 *
 * Polling at 5s feels real-time to humans without burning database
 * capacity at event scale. For a 200-attendee event with admins
 * watching the page, that's ~720 small queries per hour — trivial.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ slug: string }> },
) {
  const session = await requireRole("admin").catch(() => null);
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { slug } = await ctx.params;
  const event = await prisma.bhnEvent.findUnique({
    where: { slug },
    select: { id: true },
  });
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

  const url = new URL(req.url);
  const sinceParam = url.searchParams.get("since");
  // Default to "everything in the last 60 s" when no since cursor is
  // provided — that's the first poll right after page mount, useful
  // for "what happened in the last minute" framing.
  const since = sinceParam
    ? new Date(sinceParam)
    : new Date(Date.now() - 60_000);

  // Run all queries in parallel — they hit the same table but
  // different filter sets.
  const [
    totalActive,
    confirmedCount,
    pendingCount,
    waitlistCount,
    checkedInCount,
    newRegistrations,
    newCheckIns,
  ] = await Promise.all([
    prisma.registration.count({
      where: { eventId: event.id, registrationStatus: { not: "cancelled" } },
    }),
    prisma.registration.count({
      where: { eventId: event.id, registrationStatus: "confirmed" },
    }),
    prisma.registration.count({
      where: { eventId: event.id, registrationStatus: "pending" },
    }),
    prisma.registration.count({
      where: { eventId: event.id, registrationStatus: "waitlist" },
    }),
    prisma.registration.count({
      where: {
        eventId: event.id,
        checkedInAt: { not: null },
        registrationStatus: { not: "cancelled" },
      },
    }),
    prisma.registration.findMany({
      where: { eventId: event.id, createdAt: { gt: since } },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        registrationStatus: true,
        waitlistPosition: true,
        attendeeType: true,
        createdAt: true,
        guestName: true,
        guestEmail: true,
        user: { select: { name: true, email: true } },
      },
    }),
    prisma.registration.findMany({
      where: { eventId: event.id, checkedInAt: { gt: since } },
      orderBy: { checkedInAt: "desc" },
      take: 20,
      select: {
        id: true,
        checkedInAt: true,
        guestName: true,
        guestEmail: true,
        user: { select: { name: true, email: true } },
      },
    }),
  ]);

  return NextResponse.json({
    now: new Date().toISOString(),
    counts: {
      total: totalActive,
      confirmed: confirmedCount,
      pending: pendingCount,
      waitlist: waitlistCount,
      checkedIn: checkedInCount,
    },
    newRegistrations: newRegistrations.map((r) => ({
      id: r.id,
      registrationStatus: r.registrationStatus,
      waitlistPosition: r.waitlistPosition,
      attendeeType: r.attendeeType,
      createdAt: r.createdAt.toISOString(),
      displayName: r.user?.name ?? r.guestName ?? null,
      email: r.user?.email ?? r.guestEmail ?? null,
    })),
    newCheckIns: newCheckIns.map((r) => ({
      id: r.id,
      checkedInAt: r.checkedInAt?.toISOString() ?? null,
      displayName: r.user?.name ?? r.guestName ?? null,
    })),
  });
}
