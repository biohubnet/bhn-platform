/**
 * Trainee accepts or declines an offer.
 *
 *   POST /api/applications/[id]/offer/respond
 *     body: { action: "accept" | "decline", reason?: string }
 *
 * On accept: writes an ElectronicSignature row (action=
 * "offer.accept"), stamps the Offer with signatureId + respondedAt,
 * transitions the application to `hired` — which auto-withdraws
 * the trainee's other open applications.
 *
 * On decline: stamps respondedAt + declineReason, leaves the
 * application in `offer` stage (employer can then transition to
 * `passed`).
 */
import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { transitionApplication } from "@/lib/hiring/transitions";

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
    select: {
      applicantId: true,
      offer: { select: { id: true, status: true } },
    },
  });
  if (!app) return NextResponse.json({ error: "Application not found" }, { status: 404 });
  if (app.applicantId !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!app.offer) {
    return NextResponse.json({ error: "No offer to respond to." }, { status: 404 });
  }
  if (app.offer.status !== "sent") {
    return NextResponse.json(
      { error: `Offer is currently ${app.offer.status}; can't respond.` },
      { status: 409 },
    );
  }

  const body = (await req.json().catch(() => ({}))) as {
    action?: string;
    reason?: string;
  };
  if (body.action !== "accept" && body.action !== "decline") {
    return NextResponse.json({ error: "action must be 'accept' or 'decline'." }, { status: 400 });
  }

  if (body.action === "accept") {
    // Write the e-signature first so the offer + signature land in
    // one transaction and the audit is consistent.
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
    const userAgent = req.headers.get("user-agent") ?? null;
    const result = await prisma.$transaction(async (tx) => {
      const sig = await tx.electronicSignature.create({
        data: {
          signerId: userId,
          action: "offer.accept",
          subjectType: "Offer",
          subjectId: app.offer!.id,
          meaning: "I accept the offer terms above. This signature is legally equivalent to my handwritten signature.",
          method: "session",
          ipAddress: ip,
          userAgent,
        },
      });
      await tx.offer.update({
        where: { id: app.offer!.id },
        data: { status: "accepted", respondedAt: new Date(), signatureId: sig.id },
      });
      return { sigId: sig.id };
    });

    // Transition to hired — auto-withdraws other applications.
    const trans = await transitionApplication({
      applicationStatusId: id,
      toStage: "hired",
      actorUserId: userId,
    });

    return NextResponse.json({
      ok: true,
      action: "accept",
      signatureId: result.sigId,
      transition: trans.ok ? { ok: true } : { ok: false, error: trans.error },
    });
  }

  // Decline path.
  await prisma.offer.update({
    where: { id: app.offer.id },
    data: {
      status: "declined",
      respondedAt: new Date(),
      declineReason: body.reason?.slice(0, 1000) || null,
    },
  });
  return NextResponse.json({ ok: true, action: "decline" });
}
