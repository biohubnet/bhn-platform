/**
 * Toggle check-in for an event registration.
 *
 *   POST /api/admin/events/[slug]/registrations/[rid]/check-in
 *     body: { checkedIn: boolean }    (omitted = toggle)
 *
 * If checkedIn=true and the row is already checked-in, no-op
 * (idempotent — handy when an admin re-scans a QR on event day).
 * checkedIn=false clears checkedInAt back to null.
 *
 * Defence in depth: registration must belong to the event in `slug`.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ slug: string; rid: string }> },
) {
  const session = await requireRole("admin").catch(() => null);
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { slug, rid } = await ctx.params;
  const event = await prisma.bhnEvent.findUnique({ where: { slug }, select: { id: true } });
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

  const registration = await prisma.registration.findUnique({
    where: { id: rid },
    select: { id: true, eventId: true, checkedInAt: true },
  });
  if (!registration || registration.eventId !== event.id) {
    return NextResponse.json({ error: "Registration not found for this event" }, { status: 404 });
  }

  let target: boolean;
  try {
    const body = (await req.json().catch(() => ({}))) as { checkedIn?: unknown };
    if (typeof body.checkedIn === "boolean") {
      target = body.checkedIn;
    } else {
      // No explicit flag — toggle.
      target = registration.checkedInAt === null;
    }
  } catch {
    target = registration.checkedInAt === null;
  }

  const updated = await prisma.registration.update({
    where: { id: rid },
    data: { checkedInAt: target ? new Date() : null },
    select: { id: true, checkedInAt: true },
  });
  return NextResponse.json({ ok: true, registration: updated });
}
