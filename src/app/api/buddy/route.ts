import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { trackServer } from "@/lib/analytics";

const VALID_FOCUS = ["course", "pathway", "open"];

export async function GET() {
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id?: string }).id!;

  const pairs = await prisma.buddyPair.findMany({
    where: { OR: [{ initiatorId: userId }, { partnerId: userId }] },
    include: {
      initiator: { select: { id: true, name: true, email: true, jobTitle: true, organization: true } },
      partner:   { select: { id: true, name: true, email: true, jobTitle: true, organization: true } },
      _count:    { select: { messages: true } },
    },
    orderBy: [{ status: "asc" }, { invitedAt: "desc" }],
  });
  return NextResponse.json(pairs);
}

export async function POST(req: NextRequest) {
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const initiatorId = (session.user as { id?: string }).id!;
  const role = (session.user as { role?: string }).role;
  const body = await req.json();

  // Resolve partner — by id or by email
  let partnerId: string | null = null;
  if (typeof body.partnerId === "string" && body.partnerId.length > 0) {
    partnerId = body.partnerId;
  } else if (typeof body.partnerEmail === "string") {
    const email = body.partnerEmail.trim().toLowerCase();
    const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (!user) return NextResponse.json({ error: "No platform user with that email." }, { status: 404 });
    partnerId = user.id;
  }
  if (!partnerId) return NextResponse.json({ error: "Specify a buddy by id or email." }, { status: 400 });
  if (partnerId === initiatorId) {
    return NextResponse.json({ error: "You can't be your own buddy." }, { status: 400 });
  }

  const focusType = typeof body.focusType === "string" && VALID_FOCUS.includes(body.focusType)
    ? body.focusType
    : "open";
  const focusId = (focusType === "open" ? null : (typeof body.focusId === "string" ? body.focusId : null));
  const goalNote = typeof body.goalNote === "string" ? body.goalNote.trim().slice(0, 500) || null : null;

  if (focusType !== "open" && !focusId) {
    return NextResponse.json({ error: "Pick a course or pathway as the focus." }, { status: 400 });
  }

  // Existing pair? Either direction. Reuse if ended/declined.
  const existing = await prisma.buddyPair.findFirst({
    where: {
      OR: [
        { initiatorId, partnerId },
        { initiatorId: partnerId, partnerId: initiatorId },
      ],
    },
  });
  if (existing && (existing.status === "invited" || existing.status === "active")) {
    return NextResponse.json(
      { error: "You already have a pending or active buddy relationship with this person." },
      { status: 409 }
    );
  }

  if (existing) {
    // Re-invite: flip initiator + reset status
    const updated = await prisma.buddyPair.update({
      where: { id: existing.id },
      data: {
        initiatorId,
        partnerId,
        status: "invited",
        focusType, focusId, goalNote,
        invitedAt: new Date(),
        acceptedAt: null,
        endedAt: null,
        endedById: null,
      },
    });
    trackServer({ userId: initiatorId, role, name: "buddy_invited", props: { pairId: updated.id, focusType } });
    return NextResponse.json(updated, { status: 201 });
  }

  const created = await prisma.buddyPair.create({
    data: { initiatorId, partnerId, focusType, focusId, goalNote, status: "invited" },
  });
  trackServer({ userId: initiatorId, role, name: "buddy_invited", props: { pairId: created.id, focusType } });
  return NextResponse.json(created, { status: 201 });
}
