/**
 * Workshop booking endpoints.
 *
 *   POST   /api/events/[slug]/workshops/[workshopId]/book
 *     Books or joins the waitlist. Cap-checked (≤ MAX_WORKSHOPS_PER_USER
 *     across the whole event), capacity-checked, idempotent.
 *
 *   DELETE /api/events/[slug]/workshops/[workshopId]/book
 *     Cancels. Promotes first waitlister if the cancelled booking
 *     was confirmed; renumbers waitlist positions otherwise.
 *
 * Defence-in-depth: workshopId must belong to the event identified
 * by `slug`. Stops slug-A-with-workshop-B path tampering.
 */
import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { bookWorkshop, cancelWorkshopBooking } from "@/lib/events/bookings";

export const runtime = "nodejs";

const ERROR_STATUS: Record<string, number> = {
  not_found: 404,
  inactive: 409,
  no_registration: 403,
  max_reached: 409,
};

async function gate(slug: string, workshopId: string) {
  const event = await prisma.bhnEvent.findUnique({
    where: { slug },
    select: { id: true, status: true },
  });
  if (!event || event.status !== "published") {
    return { ok: false as const, status: 404, error: "Event not found" };
  }
  const workshop = await prisma.workshop.findUnique({
    where: { id: workshopId },
    select: { eventId: true },
  });
  if (!workshop) {
    return { ok: false as const, status: 404, error: "Workshop not found" };
  }
  if (workshop.eventId !== event.id) {
    return { ok: false as const, status: 404, error: "Workshop not found for this event" };
  }
  return { ok: true as const };
}

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ slug: string; workshopId: string }> },
) {
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id?: string }).id ?? null;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { slug, workshopId } = await ctx.params;
  const g = await gate(slug, workshopId);
  if (!g.ok) return NextResponse.json({ error: g.error }, { status: g.status });

  const result = await bookWorkshop(prisma, userId, workshopId);
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, code: result.code },
      { status: ERROR_STATUS[result.code] ?? 400 },
    );
  }
  return NextResponse.json(result);
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ slug: string; workshopId: string }> },
) {
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id?: string }).id ?? null;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { slug, workshopId } = await ctx.params;
  const g = await gate(slug, workshopId);
  if (!g.ok) return NextResponse.json({ error: g.error }, { status: g.status });

  const result = await cancelWorkshopBooking(prisma, userId, workshopId);
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, code: result.code },
      { status: ERROR_STATUS[result.code] ?? 400 },
    );
  }
  return NextResponse.json(result);
}
