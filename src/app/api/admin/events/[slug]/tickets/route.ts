/**
 * Event ticket types — admin list + create.
 *
 *   GET  /api/admin/events/[slug]/tickets
 *   POST /api/admin/events/[slug]/tickets
 *     body: { name, description?, priceCents, currency?, capacity?,
 *             isActive?, displayOrder? }
 */
import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ slug: string }> },
) {
  const session = await requireRole("admin").catch(() => null);
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { slug } = await ctx.params;
  const event = await prisma.bhnEvent.findUnique({ where: { slug }, select: { id: true } });
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });
  const tickets = await prisma.ticketType.findMany({
    where: { eventId: event.id },
    orderBy: { displayOrder: "asc" },
  });
  return NextResponse.json({ tickets });
}

interface CreateBody {
  name?: string;
  description?: string;
  priceCents?: number;
  currency?: string;
  capacity?: number | null;
  isActive?: boolean;
  displayOrder?: number;
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ slug: string }> },
) {
  const session = await requireRole("admin").catch(() => null);
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { slug } = await ctx.params;
  const event = await prisma.bhnEvent.findUnique({ where: { slug }, select: { id: true } });
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

  const body = (await req.json().catch(() => ({}))) as CreateBody;
  const name = body.name?.trim();
  if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 });
  const priceCents = typeof body.priceCents === "number" ? Math.max(0, Math.floor(body.priceCents)) : 0;
  const currency = (body.currency ?? "CAD").trim().toUpperCase();
  const capacity =
    typeof body.capacity === "number" && body.capacity > 0 ? Math.floor(body.capacity) : null;

  let displayOrder = body.displayOrder;
  if (typeof displayOrder !== "number") {
    const last = await prisma.ticketType.findFirst({
      where: { eventId: event.id },
      orderBy: { displayOrder: "desc" },
      select: { displayOrder: true },
    });
    displayOrder = (last?.displayOrder ?? 0) + 1;
  }

  const ticket = await prisma.ticketType.create({
    data: {
      eventId: event.id,
      name,
      description: body.description?.trim() || null,
      priceCents,
      currency,
      capacity,
      isActive: body.isActive ?? true,
      displayOrder,
    },
  });
  return NextResponse.json({ ok: true, ticket }, { status: 201 });
}
