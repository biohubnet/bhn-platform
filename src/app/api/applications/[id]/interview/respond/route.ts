/**
 * Trainee picks (or declines) a proposed interview slot.
 *
 *   POST /api/applications/[id]/interview/respond
 *     body: { acceptedSlot: string (ISO) } | { decline: true, reason?: string }
 *
 * Auth: the signed-in user must own the application. Once accepted,
 * the Interview row carries `acceptedSlot` + status="accepted"; the
 * /profile/applications page renders the confirmed time + the
 * employer gets a transactional email.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendMail, mailConfigured } from "@/lib/mail";

export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id?: string }).id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const app = await prisma.applicationStatus.findUnique({
    where: { id },
    select: { applicantId: true, postingId: true, posting: { select: { title: true, companyName: true, createdById: true } } },
  });
  if (!app) return NextResponse.json({ error: "Application not found" }, { status: 404 });
  if (app.applicantId !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const interview = await prisma.interview.findFirst({
    where: {
      postingId: app.postingId,
      applicantId: app.applicantId,
      status: "proposed",
    },
    orderBy: { createdAt: "desc" },
  });
  if (!interview) {
    return NextResponse.json({ error: "No proposed interview to respond to." }, { status: 404 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    acceptedSlot?: string;
    decline?: boolean;
    reason?: string;
  };

  if (body.decline) {
    await prisma.interview.update({
      where: { id: interview.id },
      data: {
        status: "declined",
        notes: body.reason ? `Declined: ${body.reason}` : interview.notes,
        respondedAt: new Date(),
      },
    });
    await notifyEmployer({
      postingTitle: app.posting.title,
      companyName: app.posting.companyName,
      employerUserId: app.posting.createdById,
      kind: "declined",
      reason: body.reason,
    });
    return NextResponse.json({ ok: true, status: "declined" });
  }

  if (typeof body.acceptedSlot !== "string") {
    return NextResponse.json({ error: "acceptedSlot (ISO date string) required, or pass decline=true." }, { status: 400 });
  }
  const slot = new Date(body.acceptedSlot);
  if (Number.isNaN(slot.getTime())) {
    return NextResponse.json({ error: "Invalid acceptedSlot." }, { status: 400 });
  }
  // Verify the slot was in the proposed list.
  const proposed = Array.isArray(interview.proposedSlots)
    ? (interview.proposedSlots as string[])
    : [];
  if (!proposed.some((p) => new Date(p).getTime() === slot.getTime())) {
    return NextResponse.json({ error: "That slot wasn't in the proposal." }, { status: 400 });
  }

  await prisma.interview.update({
    where: { id: interview.id },
    data: { acceptedSlot: slot, status: "accepted", respondedAt: new Date() },
  });
  await notifyEmployer({
    postingTitle: app.posting.title,
    companyName: app.posting.companyName,
    employerUserId: app.posting.createdById,
    kind: "accepted",
    slot: slot.toISOString(),
  });
  return NextResponse.json({ ok: true, status: "accepted", acceptedSlot: slot.toISOString() });
}

async function notifyEmployer(args: {
  postingTitle: string;
  companyName: string;
  employerUserId: string | null;
  kind: "accepted" | "declined";
  slot?: string;
  reason?: string;
}): Promise<void> {
  if (!mailConfigured() || !args.employerUserId) return;
  const employer = await prisma.user.findUnique({
    where: { id: args.employerUserId },
    select: { email: true, name: true },
  });
  if (!employer?.email) return;
  const subject =
    args.kind === "accepted"
      ? `Interview confirmed — ${args.postingTitle}`
      : `Interview declined — ${args.postingTitle}`;
  const body =
    args.kind === "accepted"
      ? `Your applicant accepted the interview slot ${args.slot} for ${args.postingTitle}.`
      : `Your applicant declined the proposed interview slots for ${args.postingTitle}.${
          args.reason ? `\n\nTheir reason: ${args.reason}` : ""
        }`;
  try {
    await sendMail({ to: employer.email, subject, text: body });
  } catch (e) {
    console.error("Interview-response email failed:", (e as Error).message);
  }
}
