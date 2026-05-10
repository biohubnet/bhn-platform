import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/rewards/merch/[id]/claim
 *
 * Trainee submits the shipping snapshot for an UNCLAIMED reward.
 * Once accepted, the row flips to CLAIMED and lands in the admin
 * fulfillment queue at /admin/merch.
 *
 * The address is frozen at this moment by design — see the model
 * comment. Edits go through admin support after the fact.
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

  // Required fields. Light validation — server-side mirror of the
  // form's `required` markers, defended with one consolidated message.
  const required = [
    "recipientName",
    "addressLine1",
    "city",
    "region",
    "postalCode",
    "country",
    "shirtSize",
  ] as const;
  for (const k of required) {
    const v = body[k];
    if (typeof v !== "string" || v.trim().length === 0) {
      return NextResponse.json(
        { error: `Missing required field: ${k}` },
        { status: 400 },
      );
    }
  }

  // Trim + cap to keep a single bad paste from blowing the column
  // limits. 200 chars is generous for any address line.
  const clean = (v: unknown, max = 200) =>
    typeof v === "string" ? v.trim().slice(0, max) : null;

  await prisma.merchReward.update({
    where: { id },
    data: {
      status: "CLAIMED",
      claimedAt: new Date(),
      recipientName:  clean(body.recipientName, 120),
      addressLine1:   clean(body.addressLine1, 200),
      addressLine2:   clean(body.addressLine2, 200),
      city:           clean(body.city, 80),
      region:         clean(body.region, 80),
      postalCode:     clean(body.postalCode, 20),
      country:        clean(body.country, 80),
      phone:          clean(body.phone, 40),
      shirtSize:      clean(body.shirtSize, 12),
      notes:          clean(body.notes, 400),
    },
  });

  return NextResponse.json({ ok: true });
}
