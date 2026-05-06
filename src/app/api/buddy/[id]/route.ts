import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getMyBuddyPair } from "@/lib/buddy";
import { trackServer } from "@/lib/analytics";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id?: string }).id!;
  const { id } = await params;
  const pair = await getMyBuddyPair(id, userId);
  if (!pair) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(pair);
}

/**
 * Action endpoint: decision in body. Routes:
 *   accept | decline | end
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id?: string }).id!;
  const role = (session.user as { role?: string }).role;
  const { id } = await params;
  const { decision } = await req.json();

  const pair = await getMyBuddyPair(id, userId);
  if (!pair) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (decision === "accept") {
    if (pair.status !== "invited") {
      return NextResponse.json({ error: `Can't accept a ${pair.status} pair.` }, { status: 409 });
    }
    if (pair.partnerId !== userId) {
      return NextResponse.json({ error: "Only the recipient can accept." }, { status: 403 });
    }
    const updated = await prisma.buddyPair.update({
      where: { id },
      data: { status: "active", acceptedAt: new Date() },
    });
    trackServer({ userId, role, name: "buddy_accepted", props: { pairId: id } });
    return NextResponse.json(updated);
  }

  if (decision === "decline") {
    if (pair.status !== "invited") {
      return NextResponse.json({ error: `Can't decline a ${pair.status} pair.` }, { status: 409 });
    }
    if (pair.partnerId !== userId) {
      return NextResponse.json({ error: "Only the recipient can decline." }, { status: 403 });
    }
    const updated = await prisma.buddyPair.update({
      where: { id },
      data: { status: "declined", endedAt: new Date(), endedById: userId },
    });
    trackServer({ userId, role, name: "buddy_declined", props: { pairId: id } });
    return NextResponse.json(updated);
  }

  if (decision === "end") {
    if (pair.status === "ended" || pair.status === "declined") {
      return NextResponse.json({ error: "Already ended." }, { status: 409 });
    }
    const updated = await prisma.buddyPair.update({
      where: { id },
      data: { status: "ended", endedAt: new Date(), endedById: userId },
    });
    trackServer({ userId, role, name: "buddy_ended", props: { pairId: id } });
    return NextResponse.json(updated);
  }

  return NextResponse.json({ error: "Invalid decision" }, { status: 400 });
}
