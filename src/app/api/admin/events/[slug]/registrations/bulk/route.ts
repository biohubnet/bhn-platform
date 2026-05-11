/**
 * Admin: bulk operation on a set of registrations.
 *
 *   POST /api/admin/events/[slug]/registrations/bulk
 *     body: {
 *       registrationIds: string[],
 *       action: "check-in" | "uncheck-in" | "cancel" | "reinstate"
 *     }
 *
 * Returns a per-id outcome list so the UI can update each row
 * accurately — a partial-success batch (e.g. one row was deleted
 * between the page load and the click) doesn't fail the whole
 * request.
 *
 * Side-effect rules
 *   • cancel    — runs cancelRegistration which cascade-cancels every
 *                 active workshop booking + breakout pick. Triggers
 *                 waitlist promotion per booking.
 *   • reinstate — sets registrationStatus back to "confirmed". Does
 *                 NOT restore previously-cancelled workshop bookings;
 *                 admin can re-book via the per-attendee detail page.
 *   • check-in  — sets checkedInAt = now() if null. No-op when set.
 *                 Skips cancelled registrations.
 *   • uncheck-in — clears checkedInAt. Used for "I scanned them by
 *                 mistake" corrections.
 *
 * Hard-capped at 500 ids per request to keep individual requests
 * bounded — events at Phase-1 volumes never approach this.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { cancelRegistration } from "@/lib/events/bookings";

export const runtime = "nodejs";

const MAX_BULK = 500;
const VALID_ACTIONS = ["check-in", "uncheck-in", "cancel", "reinstate"] as const;
type BulkAction = (typeof VALID_ACTIONS)[number];
function isBulkAction(s: unknown): s is BulkAction {
  return typeof s === "string" && (VALID_ACTIONS as readonly string[]).includes(s);
}

type Outcome =
  | { id: string; ok: true; status?: string; checkedInAt?: string | null }
  | { id: string; ok: false; error: string };

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

  const body = (await req.json().catch(() => ({}))) as {
    registrationIds?: unknown;
    action?: unknown;
  };

  if (!isBulkAction(body.action)) {
    return NextResponse.json(
      { error: `action must be one of: ${VALID_ACTIONS.join(", ")}` },
      { status: 400 },
    );
  }
  if (
    !Array.isArray(body.registrationIds) ||
    !body.registrationIds.every((id) => typeof id === "string")
  ) {
    return NextResponse.json(
      { error: "registrationIds must be an array of strings" },
      { status: 400 },
    );
  }
  const ids = Array.from(new Set(body.registrationIds as string[]));
  if (ids.length === 0) {
    return NextResponse.json({ ok: true, results: [] });
  }
  if (ids.length > MAX_BULK) {
    return NextResponse.json(
      { error: `At most ${MAX_BULK} ids per request.` },
      { status: 400 },
    );
  }

  // Pre-load all candidate rows in one query — defends against
  // foreign / cross-event ids and lets us echo back which were
  // skipped vs touched.
  const rows = await prisma.registration.findMany({
    where: { id: { in: ids }, eventId: event.id },
    select: { id: true, userId: true, registrationStatus: true, checkedInAt: true },
  });
  const byId = new Map(rows.map((r) => [r.id, r]));

  const results: Outcome[] = [];

  for (const id of ids) {
    const row = byId.get(id);
    if (!row) {
      results.push({ id, ok: false, error: "Not found in this event" });
      continue;
    }

    try {
      if (body.action === "check-in") {
        if (row.registrationStatus === "cancelled") {
          results.push({ id, ok: false, error: "Cancelled registration — can't check in." });
          continue;
        }
        if (row.checkedInAt) {
          results.push({ id, ok: true, checkedInAt: row.checkedInAt.toISOString() });
          continue;
        }
        const updated = await prisma.registration.update({
          where: { id },
          data: { checkedInAt: new Date() },
          select: { checkedInAt: true },
        });
        results.push({
          id,
          ok: true,
          checkedInAt: updated.checkedInAt?.toISOString() ?? null,
        });
      } else if (body.action === "uncheck-in") {
        if (!row.checkedInAt) {
          results.push({ id, ok: true, checkedInAt: null });
          continue;
        }
        await prisma.registration.update({
          where: { id },
          data: { checkedInAt: null },
        });
        results.push({ id, ok: true, checkedInAt: null });
      } else if (body.action === "cancel") {
        const r = await cancelRegistration(prisma, event.id, row.userId);
        if (!r.ok) {
          results.push({ id, ok: false, error: r.error });
        } else {
          results.push({ id, ok: true, status: "cancelled" });
        }
      } else if (body.action === "reinstate") {
        if (row.registrationStatus === "confirmed") {
          results.push({ id, ok: true, status: "confirmed" });
          continue;
        }
        await prisma.registration.update({
          where: { id },
          data: { registrationStatus: "confirmed" },
        });
        results.push({ id, ok: true, status: "confirmed" });
      }
    } catch (e) {
      results.push({ id, ok: false, error: (e as Error).message });
    }
  }

  return NextResponse.json({ ok: true, results });
}
