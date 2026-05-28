/**
 * Event hosts — list + add.
 *
 *   GET  /api/admin/events/[slug]/hosts
 *     → { hosts: EventHost[] } in displayOrder, with attached user
 *
 *   POST /api/admin/events/[slug]/hosts
 *     body: { userEmail, role?, displayOrder? }
 *     Looks up the user by email; 404s if missing. Per-host
 *     DELETE lives in [hostId]/route.ts.
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
  const event = await prisma.bhnEvent.findUnique({
    where: { slug },
    select: { id: true },
  });
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });
  const hosts = await prisma.eventHost.findMany({
    where: { eventId: event.id },
    orderBy: { displayOrder: "asc" },
    include: { user: { select: { id: true, name: true, email: true } } },
  });
  return NextResponse.json({ hosts });
}

interface CreateBody {
  userEmail?: string;
  role?: string;
  displayOrder?: number;
}

export async function POST(
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

  const body = (await req.json().catch(() => ({}))) as CreateBody;
  const userEmail = body.userEmail?.trim().toLowerCase();
  if (!userEmail) {
    return NextResponse.json({ error: "userEmail is required" }, { status: 400 });
  }
  const user = await prisma.user.findUnique({
    where: { email: userEmail },
    select: { id: true, name: true, email: true },
  });
  if (!user) {
    return NextResponse.json(
      { error: `No platform user found with email ${userEmail}.` },
      { status: 404 },
    );
  }
  // Idempotency — if already a host, surface the existing row.
  const existing = await prisma.eventHost.findUnique({
    where: { eventId_userId: { eventId: event.id, userId: user.id } },
  });
  if (existing) {
    return NextResponse.json({ ok: true, host: { ...existing, user }, alreadyHost: true });
  }
  let displayOrder = body.displayOrder;
  if (typeof displayOrder !== "number") {
    const last = await prisma.eventHost.findFirst({
      where: { eventId: event.id },
      orderBy: { displayOrder: "desc" },
      select: { displayOrder: true },
    });
    displayOrder = (last?.displayOrder ?? 0) + 1;
  }
  const host = await prisma.eventHost.create({
    data: {
      eventId: event.id,
      userId: user.id,
      role: body.role?.trim() || "host",
      displayOrder,
    },
  });
  return NextResponse.json({ ok: true, host: { ...host, user } }, { status: 201 });
}
