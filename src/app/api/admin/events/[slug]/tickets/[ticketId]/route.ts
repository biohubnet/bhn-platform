/**
 * Single ticket type — PATCH + DELETE.
 *
 * Editing priceCents on a ticket type after a Stripe Price has been
 * cached (`stripePriceId`) needs care: Stripe Prices are immutable.
 * We don't auto-rotate them on price edit; instead the PATCH clears
 * `stripePriceId` so the NEXT checkout creates a fresh Price at the
 * new amount. Existing in-flight Checkout sessions referencing the
 * old Price will still settle at the old amount — that's the correct
 * behaviour (you can't bait-and-switch a buyer mid-purchase).
 */
import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

interface PatchBody {
  name?: string;
  description?: string | null;
  priceCents?: number;
  currency?: string;
  capacity?: number | null;
  isActive?: boolean;
  displayOrder?: number;
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ slug: string; ticketId: string }> },
) {
  const session = await requireRole("admin").catch(() => null);
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { slug, ticketId } = await ctx.params;
  const event = await prisma.bhnEvent.findUnique({ where: { slug }, select: { id: true } });
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });
  const ticket = await prisma.ticketType.findUnique({
    where: { id: ticketId },
    select: { eventId: true, priceCents: true, stripePriceId: true },
  });
  if (!ticket || ticket.eventId !== event.id) {
    return NextResponse.json({ error: "Ticket not found for this event" }, { status: 404 });
  }
  const body = (await req.json().catch(() => ({}))) as PatchBody;
  const data: Record<string, unknown> = {};
  if (body.name !== undefined) data.name = body.name.trim();
  if (body.description !== undefined) data.description = body.description?.trim() || null;
  if (body.priceCents !== undefined) {
    data.priceCents = Math.max(0, Math.floor(body.priceCents));
    // Invalidate cached Stripe Price ID when the amount changes.
    if (data.priceCents !== ticket.priceCents) data.stripePriceId = null;
  }
  if (body.currency !== undefined) data.currency = body.currency.trim().toUpperCase();
  if (body.capacity !== undefined) {
    data.capacity =
      typeof body.capacity === "number" && body.capacity > 0 ? Math.floor(body.capacity) : null;
  }
  if (body.isActive !== undefined) data.isActive = body.isActive;
  if (body.displayOrder !== undefined) data.displayOrder = body.displayOrder;

  const updated = await prisma.ticketType.update({ where: { id: ticketId }, data });
  return NextResponse.json({ ok: true, ticket: updated });
}

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ slug: string; ticketId: string }> },
) {
  const session = await requireRole("admin").catch(() => null);
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { slug, ticketId } = await ctx.params;
  const event = await prisma.bhnEvent.findUnique({ where: { slug }, select: { id: true } });
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });
  const ticket = await prisma.ticketType.findUnique({
    where: { id: ticketId },
    select: { eventId: true },
  });
  if (!ticket || ticket.eventId !== event.id) {
    return NextResponse.json({ error: "Ticket not found for this event" }, { status: 404 });
  }
  await prisma.ticketType.delete({ where: { id: ticketId } });
  return NextResponse.json({ ok: true });
}
