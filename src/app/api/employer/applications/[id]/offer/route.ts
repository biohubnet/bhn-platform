/**
 * Create or update an offer for an application.
 *
 *   POST /api/employer/applications/[id]/offer
 *     body: {
 *       templateKey?: string,
 *       body: string,
 *       compensation?, startDate?, endDate?, hoursPerWeek?,
 *       location?, acceptDeadline?: string (ISO),
 *       send?: boolean  // when true, mark sentAt + transition to "offer"
 *     }
 *
 * One Offer per application — repeat POSTs upsert. The transition
 * to status="offer" happens on the first send.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { transitionApplication } from "@/lib/hiring/transitions";

export const runtime = "nodejs";

const MAX_BODY = 16000;

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id?: string }).id;
  const role = (session.user as { role?: string }).role ?? "";
  if (!userId || !["employer", "admin", "superadmin"].includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await ctx.params;
  const app = await prisma.applicationStatus.findUnique({
    where: { id },
    select: {
      postingId: true,
      applicantId: true,
      posting: { select: { createdById: true } },
    },
  });
  if (!app) return NextResponse.json({ error: "Application not found" }, { status: 404 });
  if (role === "employer" && app.posting.createdById !== userId) {
    return NextResponse.json({ error: "Forbidden — not your posting" }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    templateKey?: string;
    body?: string;
    compensation?: string;
    startDate?: string;
    endDate?: string;
    hoursPerWeek?: string;
    location?: string;
    acceptDeadline?: string;
    send?: boolean;
  };

  if (!body.body || typeof body.body !== "string" || body.body.trim().length < 80) {
    return NextResponse.json({ error: "Offer body must be at least 80 characters." }, { status: 400 });
  }
  if (body.body.length > MAX_BODY) {
    return NextResponse.json({ error: `Offer body must be ≤ ${MAX_BODY} characters.` }, { status: 400 });
  }

  function toDate(s: string | undefined): Date | null {
    if (!s) return null;
    const d = new Date(s);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  const data = {
    templateKey: body.templateKey?.slice(0, 80) || null,
    body: body.body.trim(),
    compensation: body.compensation?.trim().slice(0, 200) || null,
    startDate: toDate(body.startDate),
    endDate: toDate(body.endDate),
    hoursPerWeek: body.hoursPerWeek?.trim().slice(0, 80) || null,
    location: body.location?.trim().slice(0, 200) || null,
    acceptDeadline: toDate(body.acceptDeadline),
  };

  const offer = await prisma.offer.upsert({
    where: { applicationStatusId: id },
    create: {
      applicationStatusId: id,
      postingId: app.postingId,
      applicantId: app.applicantId,
      createdById: userId,
      status: body.send ? "sent" : "draft",
      sentAt: body.send ? new Date() : null,
      ...data,
    },
    update: {
      ...data,
      ...(body.send ? { status: "sent", sentAt: new Date() } : {}),
    },
    select: { id: true, status: true },
  });

  // On send, transition the application to status="offer". Already
  // sent? No-op. Different stage? The state machine will allow it.
  let transitionError: string | null = null;
  if (body.send) {
    const r = await transitionApplication({
      applicationStatusId: id,
      toStage: "offer",
      actorUserId: userId,
    });
    if (!r.ok) transitionError = r.error;
  }

  return NextResponse.json({
    ok: true,
    offerId: offer.id,
    status: offer.status,
    transitionError,
  });
}
