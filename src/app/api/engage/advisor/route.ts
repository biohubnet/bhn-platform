/**
 * Advisor booking — 1:1 sessions offered alongside Learning Pathways.
 *
 *   POST   /api/engage/advisor   { sessionId, topic? }   book a slot
 *   DELETE /api/engage/advisor   { bookingId }           cancel your booking
 *
 * A trainee may hold at most one active booking at a time: these are
 * scarce advisor slots, and the failure mode we care about is one person
 * holding three while others see none.
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const BookSchema = z.object({
  sessionId: z.string().min(1),
  topic: z.string().trim().max(500).optional(),
});

const CancelSchema = z.object({
  bookingId: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const session = await requireSession();
  const userId = (session.user as { id?: string }).id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = BookSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const { sessionId, topic } = parsed.data;

  const slot = await prisma.advisorSession.findUnique({
    where: { id: sessionId },
    select: { id: true, status: true, startsAt: true, capacity: true },
  });
  if (!slot) return NextResponse.json({ error: "Session not found" }, { status: 404 });
  if (slot.status !== "open") {
    return NextResponse.json({ error: "That session is no longer open." }, { status: 409 });
  }
  if (slot.startsAt.getTime() <= Date.now()) {
    return NextResponse.json({ error: "That session has already started." }, { status: 409 });
  }

  const [taken, existingActive] = await Promise.all([
    prisma.advisorBooking.count({ where: { sessionId, status: "booked" } }),
    prisma.advisorBooking.findFirst({
      where: { userId, status: "booked", session: { startsAt: { gt: new Date() } } },
      select: { id: true },
    }),
  ]);

  if (taken >= slot.capacity) {
    return NextResponse.json({ error: "That session is fully booked." }, { status: 409 });
  }
  if (existingActive) {
    return NextResponse.json(
      { error: "You already have an upcoming advisor session. Cancel it first to rebook." },
      { status: 409 },
    );
  }

  // The unique index on (sessionId, userId) is what actually makes this
  // safe under concurrent requests; the count above is a friendly guard,
  // not the guarantee.
  try {
    const booking = await prisma.advisorBooking.create({
      data: { sessionId, userId, topic: topic ?? null, status: "booked" },
      select: { id: true, status: true, bookedAt: true },
    });
    return NextResponse.json(booking, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "You have already booked that session." },
      { status: 409 },
    );
  }
}

export async function DELETE(req: NextRequest) {
  const session = await requireSession();
  const userId = (session.user as { id?: string }).id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = CancelSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  // Scope the update by userId as well as id, so a guessed booking id
  // cannot cancel someone else's session.
  const result = await prisma.advisorBooking.updateMany({
    where: { id: parsed.data.bookingId, userId, status: "booked" },
    data: { status: "cancelled", cancelledAt: new Date() },
  });
  if (result.count === 0) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
