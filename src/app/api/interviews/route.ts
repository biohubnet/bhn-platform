/**
 * Interview scheduling — both sides of the conversation.
 *
 *   POST   /api/interviews        — employer proposes slots (creates row)
 *   PATCH  /api/interviews        — applicant accepts / declines a slot
 *   GET    /api/interviews?postingId=xxx — list interviews for a posting
 *   GET    /api/interviews?mine=1 — list my pending interviews (applicant)
 */
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

async function authoriseEmployer(postingId: string) {
  const session = await getSession();
  if (!session) return null;
  const me = await prisma.user.findUnique({
    where: { email: session.user!.email! },
    select: { id: true, role: true },
  });
  if (!me) return null;
  if (me.role === "admin" || me.role === "superadmin") return me;
  if (me.role !== "employer") return null;
  const posting = await prisma.internshipPosting.findUnique({
    where: { id: postingId }, select: { createdById: true },
  });
  if (!posting || posting.createdById !== me.id) return null;
  return me;
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as {
    postingId?: string;
    applicantId?: string;
    proposedSlots?: string[];
    format?: string;
    location?: string;
    notes?: string;
  };
  if (!body.postingId || !body.applicantId) {
    return NextResponse.json({ error: "postingId and applicantId required" }, { status: 400 });
  }
  const me = await authoriseEmployer(body.postingId);
  if (!me) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const slots = (body.proposedSlots ?? []).filter((s): s is string => typeof s === "string" && !isNaN(Date.parse(s))).slice(0, 10);
  if (slots.length === 0) {
    return NextResponse.json({ error: "at least one slot required" }, { status: 400 });
  }

  // Replace any existing pending interview with this applicant for this posting.
  const existing = await prisma.interview.findFirst({
    where: { postingId: body.postingId, applicantId: body.applicantId, status: { in: ["proposed", "accepted"] } },
  });
  if (existing) {
    await prisma.interview.update({
      where: { id: existing.id },
      data: {
        proposedSlots: slots as unknown as Prisma.InputJsonValue,
        format: body.format ?? null,
        location: body.location ?? null,
        notes: body.notes ?? null,
        status: "proposed",
        acceptedSlot: null,
      },
    });
    return NextResponse.json({ ok: true, replaced: true });
  }

  await prisma.interview.create({
    data: {
      postingId: body.postingId,
      applicantId: body.applicantId,
      scheduledById: me.id,
      proposedSlots: slots as unknown as Prisma.InputJsonValue,
      format: body.format ?? null,
      location: body.location ?? null,
      notes: body.notes ?? null,
    },
  });
  // Stamp ApplicationStatus to "phone_screen" (best-effort).
  await prisma.applicationStatus.upsert({
    where: { postingId_applicantId: { postingId: body.postingId, applicantId: body.applicantId } },
    create: { postingId: body.postingId, applicantId: body.applicantId, status: "phone_screen", updatedById: me.id },
    update: { status: "phone_screen", updatedById: me.id },
  }).catch(() => undefined);

  return NextResponse.json({ ok: true });
}

export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const me = await prisma.user.findUnique({
    where: { email: session.user!.email! }, select: { id: true },
  });
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as { id?: string; acceptedSlot?: string; decline?: boolean };
  if (!body.id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const iv = await prisma.interview.findUnique({ where: { id: body.id } });
  if (!iv) return NextResponse.json({ error: "not found" }, { status: 404 });
  // Only the applicant can accept/decline.
  if (iv.applicantId !== me.id) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  if (body.decline) {
    await prisma.interview.update({
      where: { id: iv.id },
      data: { status: "declined", respondedAt: new Date() },
    });
    return NextResponse.json({ ok: true, status: "declined" });
  }
  if (body.acceptedSlot) {
    if (isNaN(Date.parse(body.acceptedSlot))) {
      return NextResponse.json({ error: "invalid slot" }, { status: 400 });
    }
    await prisma.interview.update({
      where: { id: iv.id },
      data: {
        status: "accepted",
        acceptedSlot: new Date(body.acceptedSlot),
        respondedAt: new Date(),
      },
    });
    return NextResponse.json({ ok: true, status: "accepted" });
  }
  return NextResponse.json({ error: "acceptedSlot or decline required" }, { status: 400 });
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const url = new URL(req.url);
  const postingId = url.searchParams.get("postingId");
  const mine = url.searchParams.get("mine");

  const me = await prisma.user.findUnique({
    where: { email: session.user!.email! }, select: { id: true, role: true },
  });
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  if (mine) {
    const list = await prisma.interview.findMany({
      where: { applicantId: me.id, status: { in: ["proposed", "accepted"] } },
      include: { posting: { select: { id: true, title: true, companyName: true } } },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ interviews: list });
  }

  if (postingId) {
    const auth = await authoriseEmployer(postingId);
    if (!auth) return NextResponse.json({ error: "forbidden" }, { status: 403 });
    const list = await prisma.interview.findMany({
      where: { postingId },
      include: { applicant: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ interviews: list });
  }
  return NextResponse.json({ error: "postingId or mine=1 required" }, { status: 400 });
}
