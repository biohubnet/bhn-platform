/**
 * Admin: edit a single Registration.
 *
 *   PATCH /api/admin/events/[slug]/registrations/[rid]
 *     body: partial — any subset of editable fields. Omitted keys
 *     stay unchanged.
 *
 * Editable fields
 *   • attendeeType          one of trainee | industry | academic | student | sponsor | guest
 *   • includesSymposiumDay  boolean
 *   • registrationStatus    pending | confirmed | cancelled
 *   • paymentStatus         pending | paid | refunded | failed | waived
 *   • dietaryRestrictions   nullable string (null/empty clears)
 *   • accessibilityNeeds    nullable string
 *   • adminNote             nullable string
 *
 * Special case: setting registrationStatus to "cancelled" runs the
 * full cascade-cancel (workshop bookings + breakout picks). Setting
 * it BACK to "confirmed" from "cancelled" does NOT auto-restore
 * those bookings — the admin would need to re-book any workshops
 * via /workshop-bookings.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { cancelRegistration } from "@/lib/events/bookings";

export const runtime = "nodejs";

const VALID_ATTENDEE_TYPES = ["trainee", "industry", "academic", "student", "sponsor", "guest"] as const;
const VALID_REG_STATUSES = ["pending", "confirmed", "cancelled"] as const;
const VALID_PAYMENT_STATUSES = ["pending", "paid", "refunded", "failed", "waived"] as const;

function isOneOf<T extends readonly string[]>(v: unknown, vs: T): v is T[number] {
  return typeof v === "string" && (vs as readonly string[]).includes(v);
}

interface Body {
  attendeeType?: string;
  includesSymposiumDay?: boolean;
  registrationStatus?: string;
  paymentStatus?: string;
  dietaryRestrictions?: string | null;
  accessibilityNeeds?: string | null;
  adminNote?: string | null;
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ slug: string; rid: string }> },
) {
  const session = await requireRole("admin").catch(() => null);
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { slug, rid } = await ctx.params;
  const event = await prisma.bhnEvent.findUnique({
    where: { slug },
    select: { id: true },
  });
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

  const registration = await prisma.registration.findUnique({
    where: { id: rid },
    select: { id: true, eventId: true, userId: true, registrationStatus: true },
  });
  if (!registration || registration.eventId !== event.id) {
    return NextResponse.json({ error: "Registration not found for this event" }, { status: 404 });
  }

  const body = (await req.json().catch(() => ({}))) as Body;

  // Validate enums.
  if (body.attendeeType !== undefined && !isOneOf(body.attendeeType, VALID_ATTENDEE_TYPES)) {
    return NextResponse.json(
      { error: `attendeeType must be one of: ${VALID_ATTENDEE_TYPES.join(", ")}` },
      { status: 400 },
    );
  }
  if (body.registrationStatus !== undefined && !isOneOf(body.registrationStatus, VALID_REG_STATUSES)) {
    return NextResponse.json(
      { error: `registrationStatus must be one of: ${VALID_REG_STATUSES.join(", ")}` },
      { status: 400 },
    );
  }
  if (body.paymentStatus !== undefined && !isOneOf(body.paymentStatus, VALID_PAYMENT_STATUSES)) {
    return NextResponse.json(
      { error: `paymentStatus must be one of: ${VALID_PAYMENT_STATUSES.join(", ")}` },
      { status: 400 },
    );
  }
  if (body.includesSymposiumDay !== undefined && typeof body.includesSymposiumDay !== "boolean") {
    return NextResponse.json(
      { error: "includesSymposiumDay must be a boolean" },
      { status: 400 },
    );
  }

  // Handle the cascade-cancel side-effect BEFORE applying other
  // edits — that way if the admin's switching to "cancelled", the
  // workshop bookings are released atomically.
  let cancelMeta: { cancelledBookings: number; promoted: number } | null = null;
  if (
    body.registrationStatus === "cancelled" &&
    registration.registrationStatus !== "cancelled"
  ) {
    const r = await cancelRegistration(prisma, rid);
    if (!r.ok) {
      return NextResponse.json({ error: r.error, code: r.code }, { status: 400 });
    }
    cancelMeta = { cancelledBookings: r.cancelledBookings, promoted: r.promoted };
    // cancelRegistration already flipped the status — strip it from
    // the upcoming update so we don't redo work.
    body.registrationStatus = undefined;
  }

  // Build the plain-update payload for the remaining fields.
  const clean = (v: string | null | undefined, max: number): string | null | undefined => {
    if (v === undefined) return undefined;
    if (v === null) return null;
    const trimmed = v.trim();
    return trimmed.length === 0 ? null : trimmed.slice(0, max);
  };

  const data: Record<string, unknown> = {};
  if (body.attendeeType !== undefined) data.attendeeType = body.attendeeType;
  if (body.includesSymposiumDay !== undefined) data.includesSymposiumDay = body.includesSymposiumDay;
  if (body.registrationStatus !== undefined) data.registrationStatus = body.registrationStatus;
  if (body.paymentStatus !== undefined) data.paymentStatus = body.paymentStatus;
  if (body.dietaryRestrictions !== undefined)
    data.dietaryRestrictions = clean(body.dietaryRestrictions, 500);
  if (body.accessibilityNeeds !== undefined)
    data.accessibilityNeeds = clean(body.accessibilityNeeds, 1000);
  if (body.adminNote !== undefined) data.adminNote = clean(body.adminNote, 2000);

  if (Object.keys(data).length > 0) {
    await prisma.registration.update({ where: { id: rid }, data });
  }

  const updated = await prisma.registration.findUnique({ where: { id: rid } });
  return NextResponse.json({ ok: true, registration: updated, cancelMeta });
}

/**
 * Admin: hard-delete a Registration.
 *
 *   DELETE /api/admin/events/[slug]/registrations/[rid]
 *
 * Removes the attendee from the event entirely — workshop bookings
 * released, waitlist promoted, and the Registration row itself
 * deleted. This is the "remove from the list" path management
 * needs when a duplicate slips through, a record was created
 * fraudulently, or someone needs to be fully scrubbed for privacy
 * reasons (PIPEDA right-to-deletion request).
 *
 * Distinct from PATCH registrationStatus=cancelled — the cancel
 * path keeps the row around as a soft-cancelled record (so the
 * attendee can later be reinstated and the audit trail survives).
 * Delete is a clean wipe.
 *
 * Side effects on delete:
 *   1. Run cancelRegistration first — releases every workshop
 *      booking the attendee held and promotes waitlisters into
 *      the freed spots. We always go through this path even if
 *      registrationStatus was already "cancelled" (idempotent;
 *      bookings may not have been released yet for older rows).
 *   2. Delete the Registration row. Workshop bookings + breakout
 *      picks should cascade via FK; check-in records are part of
 *      the Registration row itself so no separate cleanup.
 */
export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ slug: string; rid: string }> },
) {
  const session = await requireRole("admin").catch(() => null);
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { slug, rid } = await ctx.params;
  const event = await prisma.bhnEvent.findUnique({
    where: { slug },
    select: { id: true },
  });
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

  const registration = await prisma.registration.findUnique({
    where: { id: rid },
    select: { id: true, eventId: true, userId: true, registrationStatus: true },
  });
  if (!registration || registration.eventId !== event.id) {
    return NextResponse.json({ error: "Registration not found for this event" }, { status: 404 });
  }

  // Release any held workshop bookings + promote waitlist. Idempotent
  // when the row was already cancelled (no bookings left to release;
  // returns ok with zeros).
  let cancelMeta: { cancelledBookings: number; promoted: number } | null = null;
  if (registration.registrationStatus !== "cancelled") {
    const r = await cancelRegistration(prisma, rid);
    if (!r.ok) {
      return NextResponse.json({ error: r.error, code: r.code }, { status: 400 });
    }
    cancelMeta = { cancelledBookings: r.cancelledBookings, promoted: r.promoted };
  }

  await prisma.registration.delete({ where: { id: rid } });
  return NextResponse.json({ ok: true, deleted: true, cancelMeta });
}
