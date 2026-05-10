import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/rewards/merch/[id]/claim
 *
 * Trainee submits fulfillment details for an UNCLAIMED reward. Two paths:
 *   • PICKUP        — only recipientName + (optional) shirtSize and notes.
 *                     The bundle waits at the BHN office at U of T.
 *   • SHIP_REQUEST  — full address required; admin reviews postage
 *                     before committing.
 *
 * Once accepted, the row flips to CLAIMED. Address (if any) is frozen
 * here by design — see the model comment.
 */
export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as { id?: string }).id!;
  const { id } = await ctx.params;

  const reward = await prisma.merchReward.findUnique({ where: { id } });
  if (!reward || reward.userId !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (reward.status !== "UNCLAIMED") {
    return NextResponse.json(
      { error: `Already ${reward.status.toLowerCase()} — only UNCLAIMED rewards can be submitted.` },
      { status: 409 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const method = body.fulfillmentMethod === "SHIP_REQUEST" ? "SHIP_REQUEST" : "PICKUP";

  // Required fields differ by method. Pickup just needs a name we can
  // match at the door; ship_request needs the full mailing address.
  const requiredKeys =
    method === "PICKUP"
      ? (["recipientName"] as const)
      : (["recipientName", "addressLine1", "city", "region", "postalCode", "country"] as const);
  for (const k of requiredKeys) {
    const v = body[k];
    if (typeof v !== "string" || v.trim().length === 0) {
      return NextResponse.json({ error: `Missing required field: ${k}` }, { status: 400 });
    }
  }

  const clean = (v: unknown, max = 200) =>
    typeof v === "string" && v.trim().length > 0 ? v.trim().slice(0, max) : null;

  await prisma.merchReward.update({
    where: { id },
    data: {
      status: "CLAIMED",
      fulfillmentMethod: method,
      claimedAt: new Date(),
      recipientName:  clean(body.recipientName, 120),
      // Address fields only persisted when mailing was requested. Pickup
      // claims leave them null — the admin queue then knows there's
      // nothing to print on a label.
      addressLine1:   method === "SHIP_REQUEST" ? clean(body.addressLine1, 200) : null,
      addressLine2:   method === "SHIP_REQUEST" ? clean(body.addressLine2, 200) : null,
      city:           method === "SHIP_REQUEST" ? clean(body.city, 80) : null,
      region:         method === "SHIP_REQUEST" ? clean(body.region, 80) : null,
      postalCode:     method === "SHIP_REQUEST" ? clean(body.postalCode, 20) : null,
      country:        method === "SHIP_REQUEST" ? clean(body.country, 80) : null,
      phone:          method === "SHIP_REQUEST" ? clean(body.phone, 40) : null,
      shirtSize:      clean(body.shirtSize, 12),
      notes:          clean(body.notes, 400),
    },
  });

  return NextResponse.json({ ok: true });
}
