/**
 * Workshop booking + breakout pick service layer.
 *
 * All state-mutating operations live here so the API routes stay
 * thin and the business rules (cap, waitlist promotion, breakout
 * mutual exclusion, admin approval) live in one place.
 *
 * Booking lifecycle
 * ─────────────────
 *
 *   pending ──admin approve──▶ confirmed (seat held)
 *      │                ╲
 *      │                 ╲─▶ waitlist (full; next in queue)
 *      │
 *      ╰──admin reject──▶ cancelled
 *
 *   confirmed ──cancel──▶ cancelled        (promotes next waitlister)
 *   waitlist  ──cancel──▶ cancelled        (renumbers tail of queue)
 *
 * The `pending` state is what the symposium tour/workshop policy
 * needs — registrants are told their spot is held only after admin
 * review, so capacity isn't decremented until approval. Workshops
 * that opt out via `requiresApproval=false` skip the pending state
 * and land directly in confirmed/waitlist (the legacy behaviour).
 *
 * Symposium-day Registration is independent of workshop bookings:
 *   • A workshop booking does NOT require an event Registration —
 *     people can come for a tour without attending the symposium.
 *   • A symposium Registration does NOT auto-book workshops —
 *     people can attend the symposium without booking a tour.
 *   • The UI cross-prompts in both directions after each success.
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

export type BookingStatus = "pending" | "confirmed" | "waitlist";

export type BookingOk = {
  ok: true;
  status: BookingStatus;
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
 * No longer requires a confirmed Registration for the parent event —
 * workshop attendees can come for the tour without attending the
 * symposium day. The UI cross-prompts after a successful booking to
 * encourage adding a Registration when it makes sense.
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
    select: {
      id: true,
      eventId: true,
      isActive: true,
      capacity: true,
      waitlistCapacity: true,
      requiresApproval: true,
    },
  });
  if (!workshop) {
    return { ok: false as const, error: "Workshop not found", code: "not_found" };
  }
  if (!workshop.isActive) {
    return { ok: false as const, error: "This workshop isn't accepting bookings.", code: "inactive" };
  }

  // Idempotent re-book on a non-cancelled row returns that row's
  // identity. Pending rows show through as `pending` so the UI can
  // keep showing "awaiting admin review" rather than recreating the
  // booking. Capacity / waitlist limits still apply to fresh writes.
  const existing = await tx.workshopBooking.findUnique({
    where: { workshopId_userId: { workshopId, userId } },
    select: { id: true, status: true, waitlistPosition: true },
  });
  if (existing && existing.status !== "cancelled") {
    return {
      ok: true as const,
      status: existing.status as BookingStatus,
      bookingId: existing.id,
      waitlistPosition: existing.waitlistPosition,
    };
  }

  // Per-user cap on non-cancelled bookings across the whole event.
  // Pending rows count too — the user has committed to picking these,
  // they just need admin sign-off. (Otherwise someone could "park"
  // pending picks on every workshop and effectively skip the cap.)
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

  // Decide the landing state. When the workshop is approval-gated, we
  // park the booking in `pending` — no seat decrement, no waitlist
  // slot taken. Admin moves it forward via approveWorkshopBooking.
  let bookingStatus: BookingStatus;
  let waitlistPosition: number | null = null;

  if (workshop.requiresApproval) {
    bookingStatus = "pending";
  } else {
    const [confirmedCount, waitlistCount] = await Promise.all([
      tx.workshopBooking.count({ where: { workshopId, status: "confirmed" } }),
      tx.workshopBooking.count({ where: { workshopId, status: "waitlist" } }),
    ]);

    if (confirmedCount < workshop.capacity) {
      bookingStatus = "confirmed";
    } else if (waitlistCount < workshop.waitlistCapacity) {
      bookingStatus = "waitlist";
      const lastWaitlist = await tx.workshopBooking.findFirst({
        where: { workshopId, status: "waitlist" },
        orderBy: { waitlistPosition: "desc" },
        select: { waitlistPosition: true },
      });
      waitlistPosition = (lastWaitlist?.waitlistPosition ?? 0) + 1;
    } else {
      return {
        ok: false as const,
        error:
          "This workshop is fully booked and the waitlist is also full. " +
          "Please pick a different workshop or contact the BHN events team.",
        code: "waitlist_full",
      };
    }
  }

  let created;
  if (existing) {
    // Re-using a cancelled row — flip status + bump timestamps
    // rather than inserting a duplicate. Keeps history minimal.
    // approvedAt clears when re-entering pending; admin must re-approve.
    created = await tx.workshopBooking.update({
      where: { id: existing.id },
      data: {
        status: bookingStatus,
        waitlistPosition,
        bookedAt: new Date(),
        cancelledAt: null,
        approvedAt: bookingStatus === "pending" ? null : new Date(),
        approvedById: null,
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
        // approvedAt stays null when the row lands as pending; when
        // requiresApproval=false we stamp the create-time so the
        // admin queue doesn't surface auto-confirmed bookings.
        approvedAt: bookingStatus === "pending" ? null : new Date(),
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
 *   • { status: "pending" }    — admin needs to approve before the
 *                                spot is held. The default for
 *                                approval-gated workshops.
 *   • { status: "confirmed" }  — seat was available + no approval needed
 *   • { status: "waitlist", waitlistPosition: N }  — full; queued
 *
 * Refuses if the user:
 *   • has already booked another workshop in this event up to the
 *     MAX_WORKSHOPS_PER_USER cap (cancelled bookings don't count;
 *     pending bookings DO count)
 *   • already has a non-cancelled booking on this specific workshop
 *     (idempotent re-book — returns the existing row, including its
 *      current status)
 *   • the workshop AND its waitlist are both full
 *     (`waitlist_full` — only reachable on workshops with
 *      requiresApproval=false; approval-gated workshops can grow
 *      the pending queue without bound)
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
 * Approve a pending WorkshopBooking. Decides at approval time whether
 * there's room — promotes to `confirmed` if there's a seat, otherwise
 * to `waitlist` (assigning the next position). Returns `waitlist_full`
 * when both confirmed seats and waitlist slots are exhausted; the
 * admin then chooses to reject the booking or wait for cancellations.
 *
 * Idempotent on already-approved rows: returns ok with the current
 * status without re-stamping approvedAt.
 */
export async function approveWorkshopBookingInTx(
  tx: Prisma.TransactionClient,
  bookingId: string,
  adminUserId: string,
): Promise<BookingOk | BookingErr> {
  const booking = await tx.workshopBooking.findUnique({
    where: { id: bookingId },
    select: {
      id: true,
      status: true,
      waitlistPosition: true,
      workshopId: true,
      workshop: {
        select: { capacity: true, waitlistCapacity: true, isActive: true },
      },
    },
  });
  if (!booking) {
    return { ok: false as const, error: "Booking not found.", code: "not_found" };
  }
  if (booking.status === "cancelled") {
    return {
      ok: false as const,
      error: "Cancelled bookings can't be approved — ask the attendee to re-book.",
      code: "cancelled",
    };
  }
  if (booking.status === "confirmed" || booking.status === "waitlist") {
    return {
      ok: true as const,
      status: booking.status,
      bookingId: booking.id,
      waitlistPosition: booking.waitlistPosition,
    };
  }
  // status === "pending" — decide based on current capacity.
  const [confirmedCount, waitlistCount] = await Promise.all([
    tx.workshopBooking.count({
      where: { workshopId: booking.workshopId, status: "confirmed" },
    }),
    tx.workshopBooking.count({
      where: { workshopId: booking.workshopId, status: "waitlist" },
    }),
  ]);

  let nextStatus: BookingStatus;
  let nextWaitlistPosition: number | null = null;
  if (confirmedCount < booking.workshop.capacity) {
    nextStatus = "confirmed";
  } else if (waitlistCount < booking.workshop.waitlistCapacity) {
    nextStatus = "waitlist";
    const lastWaitlist = await tx.workshopBooking.findFirst({
      where: { workshopId: booking.workshopId, status: "waitlist" },
      orderBy: { waitlistPosition: "desc" },
      select: { waitlistPosition: true },
    });
    nextWaitlistPosition = (lastWaitlist?.waitlistPosition ?? 0) + 1;
  } else {
    return {
      ok: false as const,
      error:
        "Both the seat capacity and the waitlist are full. Reject this booking, or " +
        "wait for a cancellation before approving.",
      code: "waitlist_full",
    };
  }

  await tx.workshopBooking.update({
    where: { id: booking.id },
    data: {
      status: nextStatus,
      waitlistPosition: nextWaitlistPosition,
      approvedAt: new Date(),
      approvedById: adminUserId,
    },
  });

  return {
    ok: true as const,
    status: nextStatus,
    bookingId: booking.id,
    waitlistPosition: nextWaitlistPosition,
  };
}

/** Single-shot wrapper around approveWorkshopBookingInTx. */
export async function approveWorkshopBooking(
  prisma: PrismaClient,
  bookingId: string,
  adminUserId: string,
): Promise<BookingOk | BookingErr> {
  return prisma.$transaction((tx) => approveWorkshopBookingInTx(tx, bookingId, adminUserId));
}

/**
 * Cancel a workshop booking inside an already-open transaction.
 * Same side-effect semantics as cancelWorkshopBooking; exposed so
 * admin operations (cancel registration → cascade-cancel each of
 * their bookings) can run the whole thing atomically.
 */
export async function cancelWorkshopBookingInTx(
  tx: Prisma.TransactionClient,
  userId: string,
  workshopId: string,
): Promise<{ ok: true; promoted: boolean } | BookingErr> {
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
  // pending → cancelled: no capacity/waitlist accounting to do.

  return { ok: true as const, promoted };
}

/**
 * Cancel a workshop booking. Side effects:
 *   • If the cancelled booking was CONFIRMED, the first waitlister
 *     (lowest waitlistPosition) is promoted to confirmed.
 *   • If the cancelled booking was on the WAITLIST, every waitlist
 *     row with a higher position is renumbered down by 1.
 *   • If the cancelled booking was PENDING, no further bookkeeping
 *     is needed — pending bookings don't hold a seat or position.
 *
 * Idempotent — cancelling an already-cancelled row returns ok=true.
 */
export async function cancelWorkshopBooking(
  prisma: PrismaClient,
  userId: string,
  workshopId: string,
): Promise<{ ok: true; promoted: boolean } | BookingErr> {
  return prisma.$transaction((tx) => cancelWorkshopBookingInTx(tx, userId, workshopId));
}

/**
 * Cancel an entire event registration and cascade-cancel every
 * non-cancelled workshop booking the attendee held for that event.
 * Each freed-up confirmed spot triggers the same waitlist-promotion
 * logic cancelWorkshopBookingInTx uses, so the released seats fill
 * back up automatically.
 *
 * Idempotent — calling on an already-cancelled registration is a no-op
 * (returns the existing state with cancelledBookings=0).
 */
export async function cancelRegistration(
  prisma: PrismaClient,
  registrationId: string,
): Promise<{ ok: true; cancelledBookings: number; promoted: number; waitlistPromoted: boolean } | BookingErr> {
  return prisma.$transaction(async (tx) => {
    const registration = await tx.registration.findUnique({
      where: { id: registrationId },
      select: { id: true, eventId: true, userId: true, registrationStatus: true },
    });
    if (!registration) {
      return { ok: false as const, error: "Registration not found.", code: "not_found" };
    }
    if (registration.registrationStatus === "cancelled") {
      return { ok: true as const, cancelledBookings: 0, promoted: 0, waitlistPromoted: false };
    }

    await tx.registration.update({
      where: { id: registration.id },
      data: { registrationStatus: "cancelled" },
    });

    // Workshop bookings + personal agenda entries are user-keyed. Guest
    // registrations (userId === null) can't have any, so skip those
    // cleanup loops entirely.
    let cancelledBookings = 0;
    let promoted = 0;
    if (registration.userId) {
      const activeBookings = await tx.workshopBooking.findMany({
        where: {
          userId: registration.userId,
          status: { not: "cancelled" },
          workshop: { eventId: registration.eventId },
        },
        select: { workshopId: true },
      });

      for (const b of activeBookings) {
        const r = await cancelWorkshopBookingInTx(tx, registration.userId, b.workshopId);
        if (r.ok && r.promoted) promoted++;
      }
      cancelledBookings = activeBookings.length;

      // Also clear any personal-agenda entries (breakout picks).
      await tx.personalAgendaEntry.deleteMany({
        where: { userId: registration.userId, session: { eventId: registration.eventId } },
      });
    }

    // Event-level waitlist promotion. When a CONFIRMED (or pending)
    // seat is freed, look for the lowest waitlistPosition for this
    // event and promote them to confirmed (or pending if the event
    // requires approval — keeps the audit story honest). Positions
    // above the promoted one are left as-is, gaps and all, so
    // attendees keep their "you're #N" promise stable.
    const wasOccupyingSeat =
      registration.registrationStatus === "confirmed" ||
      registration.registrationStatus === "pending";
    let waitlistPromoted = false;
    if (wasOccupyingSeat) {
      const eventForPromotion = await tx.bhnEvent.findUnique({
        where: { id: registration.eventId },
        select: { requiresApproval: true, maxAttendees: true },
      });
      if (eventForPromotion?.maxAttendees) {
        const nextUp = await tx.registration.findFirst({
          where: {
            eventId: registration.eventId,
            registrationStatus: "waitlist",
            waitlistPosition: { not: null },
          },
          orderBy: { waitlistPosition: "asc" },
          select: { id: true },
        });
        if (nextUp) {
          await tx.registration.update({
            where: { id: nextUp.id },
            data: {
              registrationStatus: eventForPromotion.requiresApproval
                ? "pending"
                : "confirmed",
              approvedAt: eventForPromotion.requiresApproval ? null : new Date(),
              waitlistPosition: null,
            },
          });
          waitlistPromoted = true;
        }
      }
    }

    return {
      ok: true as const,
      cancelledBookings,
      promoted,
      waitlistPromoted,
    };
  });
}

/**
 * Approve a pending Registration. Flips `registrationStatus` from
 * pending → confirmed and stamps approval audit columns. Idempotent
 * on already-confirmed rows.
 */
export async function approveRegistration(
  prisma: PrismaClient,
  registrationId: string,
  adminUserId: string,
): Promise<{ ok: true; alreadyConfirmed: boolean } | BookingErr> {
  return prisma.$transaction(async (tx) => {
    const registration = await tx.registration.findUnique({
      where: { id: registrationId },
      select: { id: true, registrationStatus: true },
    });
    if (!registration) {
      return { ok: false as const, error: "Registration not found.", code: "not_found" };
    }
    if (registration.registrationStatus === "cancelled") {
      return {
        ok: false as const,
        error: "This registration has been cancelled.",
        code: "cancelled",
      };
    }
    if (registration.registrationStatus === "confirmed") {
      return { ok: true as const, alreadyConfirmed: true };
    }
    await tx.registration.update({
      where: { id: registration.id },
      data: {
        registrationStatus: "confirmed",
        approvedAt: new Date(),
        approvedById: adminUserId,
      },
    });
    return { ok: true as const, alreadyConfirmed: false };
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

    // Registration gate — pending registrations can't pick breakouts
    // yet either (no point promising a breakout seat to someone who
    // might not be approved).
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
