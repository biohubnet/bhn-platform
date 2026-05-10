import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * PATCH /api/admin/merch/[id]
 *
 * Admin updates fulfillment state on a MerchReward. Three transitions
 * supported:
 *   1. ship      — CLAIMED → SHIPPED, requires carrier + trackingNumber
 *   2. deliver   — SHIPPED → DELIVERED, no extra fields
 *   3. cancel    — any non-terminal → CANCELLED, with cancelledReason
 *
 * The action is in the request body as `action`. Other fields tag along.
 * We don't expose deeper edits (like rewriting an address) because
 * those are rare and better handled out-of-band; the trainee re-claim
 * path through support is intentional friction.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireRole("admin").catch(() => null);
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const adminId = (session.user as { id?: string }).id!;

  const { id } = await params;
  const reward = await prisma.merchReward.findUnique({ where: { id } });
  if (!reward) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const action = body.action;

  if (action === "ship") {
    if (reward.status !== "CLAIMED") {
      return NextResponse.json({ error: `Cannot ship from ${reward.status}` }, { status: 409 });
    }
    // Tracking is required when we're actually mailing it. For PICKUP
    // claims, "ship" semantically means "marked ready for pickup at the
    // office" — no carrier needed.
    const isShip = reward.fulfillmentMethod === "SHIP_REQUEST";
    const carrier = String(body.carrier ?? "").trim();
    const trackingNumber = String(body.trackingNumber ?? "").trim();
    const trackingUrl = body.trackingUrl ? String(body.trackingUrl).trim() : null;
    if (isShip && (!carrier || !trackingNumber)) {
      return NextResponse.json(
        { error: "carrier and trackingNumber are required when marking a SHIP_REQUEST shipped" },
        { status: 400 },
      );
    }
    await prisma.merchReward.update({
      where: { id },
      data: {
        status: "SHIPPED",
        shippedAt: new Date(),
        carrier: isShip ? carrier.slice(0, 80) : null,
        trackingNumber: isShip ? trackingNumber.slice(0, 80) : null,
        trackingUrl: isShip && trackingUrl ? trackingUrl.slice(0, 400) : null,
        fulfilledById: adminId,
      },
    });
    return NextResponse.json({ ok: true });
  }

  if (action === "deliver") {
    if (reward.status !== "SHIPPED") {
      return NextResponse.json({ error: `Cannot deliver from ${reward.status}` }, { status: 409 });
    }
    await prisma.merchReward.update({
      where: { id },
      data: { status: "DELIVERED" },
    });
    return NextResponse.json({ ok: true });
  }

  if (action === "cancel") {
    if (reward.status === "DELIVERED" || reward.status === "CANCELLED") {
      return NextResponse.json({ error: `Cannot cancel a ${reward.status} reward` }, { status: 409 });
    }
    const reason = String(body.cancelledReason ?? "").trim();
    if (!reason) {
      return NextResponse.json(
        { error: "cancelledReason is required" },
        { status: 400 },
      );
    }
    await prisma.merchReward.update({
      where: { id },
      data: {
        status: "CANCELLED",
        cancelledReason: reason.slice(0, 400),
        fulfilledById: adminId,
      },
    });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action — expected ship | deliver | cancel" }, { status: 400 });
}
