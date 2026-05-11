/**
 * Workshop booking + breakout pick service layer.
 *
 * All state-mutating operations live here so the API routes stay
 * thin and the business rules (cap, waitlist promotion, breakout
 * mutual exclusion) live in one place.
 *
 * Conventions
 *   • All mutations run inside Prisma transactions so cap + capacity
 *     checks see a consistent snapshot. There's still a small race
 *     window without SELECT FOR UPDATE locking — accepted for Phase
 *     1 traffic volume.
 *   • Functions return discriminated-union results (ok-true with
 *     payload, ok-false with error + code) so callers can branch
 *     without try/catch. API routes map the codes to HTTP statuses.
 */
import type { Prisma, PrismaClient } from "@prisma/client";
import { MAX_WORKSHOPS_PER_USER } from "./constants";

export type BookingOk = {
  ok: true;
  status: "confirmed" | "waitlist";
  bookingId: string;
  waitlistPosition: number | null;
};
export type BookingErr = { ok: false; error: string; code: string };

/**
 * Book a workshop inside an already-open Prisma transaction. Same
 * rules as bookWorkshop, but composes with other writes the caller
 * needs to land atomically — e.g. the event registration handler
 * creates the Registration + books 1..2 workshops in a single
 * transaction so a partial failure doesn't leave the user
 * half-registered.
 *
 * Note on read-your-writes: because Prisma's interactive transactions
 * are read-your-writes consistent, the Registration this caller just
 * inserted on the same tx IS visible to the registration-gate check
 * below — no special opt-out needed.
 */
export async function bookWorkshopInTx(
  tx: Prisma.TransactionClient,
  userId: string,
  workshopId: string,
): Promise<BookingOk | BookingErr> {
  const workshop = await tx.workshop.findUnique({
    where: { id: workshopId },
    select: { id: true, eventId: true, isActive: true, capacity: true },
  });
  if (!workshop) {
    return { ok: false as const, error: "Workshop not found", code: "not_found" };
  }
  if (!workshop.isActive) {
    return { ok: false as const, error: "This workshop isn't accepting bookings.", code: "inactive" };
  }

  // Registration gate — must have a confirmed Registration for
  // this event before any workshop can be booked.
  const registration = await tx.registration.findUnique({
    where: { eventId_userId: { eventId: workshop.eventId, userId } },
    select: { registrationStatus: true },
  });
  if (!registration || registration.registrationStatus !== "confirmed") {
    return {
      ok: false as const,
      error: "Register for the event first before booking workshops.",
      code: "no_registration",
    };
  }

  // Existing booking? Idempotent: re-book on a non-cancelled row
  // returns that row's identity.
  const existing = await tx.workshopBooking.findUnique({
    where: { workshopId_userId: { workshopId, userId } },
    select: { id: true, status: true, waitlistPosition: true },
  });
  if (existing && existing.status !== "cancelled") {
    return {
      ok: true as const,
      status: existing.status as "confirmed" | "waitlist",
      bookingId: existing.id,
      waitlistPosition: existing.waitlistPosition,
    };
  }

  // Cap check — count this user's non-cancelled bookings on
  // workshops belonging to this same event. The (userId, status)
  // index keeps this cheap; we filter by eventId via a relation
  // condition.
  const activeCount = await tx.workshopBooking.count({
    where: {
      userId,
      status: { not: "cancelled" },
      workshop: { eventId: workshop.eventId },
    },
  });
  if (activeCount >= MAX_WORKSHOPS_PER_USER) {
    return {
      ok: false as const,
      error: `You can book at most ${MAX_WORKSHOPS_PER_USER} workshops across the Training Week. Cancel one first.`,
      code: "max_reached",
    };
  }

  // Capacity check — count confirmed bookings on this specific
  // workshop. If under capacity, status="confirmed". Otherwise
  // join the waitlist with the next free position.
  const confirmedCount = await tx.workshopBooking.count({
    where: { workshopId, status: "confirmed" },
  });

  let bookingStatus: "confirmed" | "waitlist";
  let waitlistPosition: number | null;
  if (confirmedCount < workshop.capacity) {
    bookingStatus = "confirmed";
    waitlistPosition = null;
  } else {
    bookingStatus = "waitlist";
    const lastWaitlist = await tx.workshopBooking.findFirst({
      where: { workshopId, status: "waitlist" },
      orderBy: { waitlistPosition: "desc" },
      select: { waitlistPosition: true },
    });
    waitlistPosition = (lastWaitlist?.waitlistPosition ?? 0) + 1;
  }

  let created;
  if (existing) {
    // Re-using a cancelled row — flip status + bump timestamps
    // rather than inserting a duplicate. Keeps history minimal.
    created = await tx.workshopBooking.update({
      where: { id: existing.id },
      data: {
        status: bookingStatus,
        waitlistPosition,
        bookedAt: new Date(),
        cancelledAt: null,
      },
      select: { id: true },
    });
  } else {
    created = await tx.workshopBooking.create({
      data: {
        workshopId,
        userId,
        status: bookingStatus,
        waitlistPosition,
      },
      select: { id: true },
    });
  }

  return {
    ok: true as const,
    status: bookingStatus,
    bookingId: created.id,
    waitlistPosition,
  };
}

/**
 * Book a workshop for a user. Returns:
 *   • { status: "confirmed" }  — seat was available
 *   • { status: "waitlist", waitlistPosition: N }  — full; queued
 *
 * Refuses if the user:
 *   • doesn't have a confirmed Registration for the workshop's event
 *   • has already booked another workshop in this event up to the
 *     MAX_WORKSHOPS_PER_USER cap (cancelled bookings don't count)
 *   • already has a non-cancelled booking on this specific workshop
 *     (idempotent re-book — returns the existing row)
 *
 * Use this from API routes that book a single workshop. For
 * compound operations (e.g. register + book within one transaction),
 * call bookWorkshopInTx directly with your own tx.
 */
export async function bookWorkshop(
  prisma: PrismaClient,
  userId: string,
  workshopId: string,
): Promise<BookingOk | BookingErr> {
  return prisma.$transaction((tx) => bookWorkshopInTx(tx, userId, workshopId));
}

/**
 * Cancel a workshop booking. Side effects:
 *   • If the cancelled booking was CONFIRMED, the first waitlister
 *     (lowest waitlistPosition) is promoted to confirmed.
 *   • If the cancelled booking was on the WAITLIST, every waitlist
 *     row with a higher position is renumbered down by 1.
 *
 * Idempotent — cancelling an already-cancelled row returns ok=true.
 */
export async function cancelWorkshopBooking(
  prisma: PrismaClient,
  userId: string,
  workshopId: string,
): Promise<{ ok: true; promoted: boolean } | BookingErr> {
  return prisma.$transaction(async (tx) => {
    const booking = await tx.workshopBooking.findUnique({
      where: { workshopId_userId: { workshopId, userId } },
      select: { id: true, status: true, waitlistPosition: true },
    });
    if (!booking) {
      return { ok: false as const, error: "No booking to cancel.", code: "not_found" };
    }
    if (booking.status === "cancelled") {
      return { ok: true as const, promoted: false };
    }

    await tx.workshopBooking.update({
      where: { id: booking.id },
      data: {
        status: "cancelled",
        waitlistPosition: null,
        cancelledAt: new Date(),
      },
    });

    let promoted = false;
    if (booking.status === "confirmed") {
      // Promote the next waitlister.
      const next = await tx.workshopBooking.findFirst({
        where: { workshopId, status: "waitlist" },
        orderBy: { waitlistPosition: "asc" },
        select: { id: true, waitlistPosition: true },
      });
      if (next) {
        await tx.workshopBooking.update({
          where: { id: next.id },
          data: { status: "confirmed", waitlistPosition: null },
        });
        // Renumber remaining waitlisters down by 1.
        await tx.workshopBooking.updateMany({
          where: {
            workshopId,
            status: "waitlist",
            waitlistPosition: { gt: next.waitlistPosition ?? 0 },
          },
          data: { waitlistPosition: { decrement: 1 } },
        });
        promoted = true;
      }
    } else if (booking.status === "waitlist" && booking.waitlistPosition !== null) {
      // Renumber waitlisters after this one.
      await tx.workshopBooking.updateMany({
        where: {
          workshopId,
          status: "waitlist",
          waitlistPosition: { gt: booking.waitlistPosition },
        },
        data: { waitlistPosition: { decrement: 1 } },
      });
    }

    return { ok: true as const, promoted };
  });
}

/**
 * Pick (or switch to) a specific SymposiumSession breakout. Enforces
 * the "pick at most one per breakoutGroupId" rule at the service
 * layer (the schema doesn't constrain this).
 *
 * If sessionId is in a breakoutGroupId, any other PersonalAgendaEntry
 * by this user for sessions in the same group is removed atomically.
 * If the session has no breakoutGroupId, this just adds it as a
 * personal-schedule entry.
 *
 * Idempotent: picking what's already picked is a no-op.
 */
export async function pickBreakout(
  prisma: PrismaClient,
  userId: string,
  symposiumSessionId: string,
): Promise<{ ok: true } | BookingErr> {
  return prisma.$transaction(async (tx) => {
    const session = await tx.symposiumSession.findUnique({
      where: { id: symposiumSessionId },
      select: { id: true, eventId: true, breakoutGroupId: true },
    });
    if (!session) {
      return { ok: false as const, error: "Session not found", code: "not_found" };
    }

    // Registration gate.
    const registration = await tx.registration.findUnique({
      where: { eventId_userId: { eventId: session.eventId, userId } },
      select: { registrationStatus: true, includesSymposiumDay: true },
    });
    if (!registration || registration.registrationStatus !== "confirmed") {
      return {
        ok: false as const,
        error: "Register for the event first.",
        code: "no_registration",
      };
    }
    if (!registration.includesSymposiumDay) {
      return {
        ok: false as const,
        error: "Your registration doesn't include the symposium day.",
        code: "not_attending",
      };
    }

    // Remove any other pick in the same breakoutGroupId — pick-one
    // semantics. Skipped when this session isn't in a group (then
    // it's just a "save to my schedule" add).
    if (session.breakoutGroupId) {
      await tx.personalAgendaEntry.deleteMany({
        where: {
          userId,
          session: {
            eventId: session.eventId,
            breakoutGroupId: session.breakoutGroupId,
            id: { not: symposiumSessionId },
          },
        },
      });
    }

    await tx.personalAgendaEntry.upsert({
      where: { userId_symposiumSessionId: { userId, symposiumSessionId } },
      create: { userId, symposiumSessionId },
      update: {},
    });

    return { ok: true as const };
  });
}

/** Remove a personal-agenda entry. Idempotent. */
export async function unpickBreakout(
  prisma: PrismaClient,
  userId: string,
  symposiumSessionId: string,
): Promise<{ ok: true }> {
  await prisma.personalAgendaEntry.deleteMany({
    where: { userId, symposiumSessionId },
  });
  return { ok: true as const };
}
