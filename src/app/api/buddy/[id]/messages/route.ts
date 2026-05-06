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

  const messages = await prisma.buddyMessage.findMany({
    where: { pairId: id },
    orderBy: { createdAt: "asc" },
    take: 200,
  });

  // Mark messages from the OTHER party as read
  await prisma.buddyMessage.updateMany({
    where: { pairId: id, senderId: { not: userId }, readAt: null },
    data: { readAt: new Date() },
  });

  return NextResponse.json(messages);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id?: string }).id!;
  const { id } = await params;
  const pair = await getMyBuddyPair(id, userId);
  if (!pair) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (pair.status !== "active") return NextResponse.json({ error: "Pair is not active." }, { status: 409 });

  const body = await req.json();
  const text = (body.body as string | undefined)?.trim();
  if (!text) return NextResponse.json({ error: "Empty message." }, { status: 400 });
  if (text.length > 2000) return NextResponse.json({ error: "Message too long (2000 max)." }, { status: 400 });

  const refType = typeof body.refType === "string" ? body.refType : null;
  const refId = typeof body.refId === "string" ? body.refId : null;

  const created = await prisma.buddyMessage.create({
    data: { pairId: id, senderId: userId, body: text, refType, refId },
  });
  trackServer({ userId, name: "buddy_message_sent", props: { pairId: id } });
  return NextResponse.json(created, { status: 201 });
}
