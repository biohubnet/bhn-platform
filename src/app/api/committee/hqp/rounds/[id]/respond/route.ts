/**
 * Member feedback response — save / submit.
 *
 *   POST /api/committee/hqp/rounds/[id]/respond
 *     action=save    → shallow-merge answers
 *     action=submit  → bump status + submittedAt
 *
 * Authn: requireCommitteeOrAdmin(["hqp"]) — only HQP committee
 * members (plus admins for moderation) respond.
 */
import { NextResponse } from "next/server";
import { requireCommitteeOrAdmin } from "@/lib/committees/membership";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireCommitteeOrAdmin(["hqp"]);
  const userId = (session.user as { id?: string }).id ?? "";
  const { id: roundId } = await params;
  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  const action = typeof body.action === "string" ? body.action : "save";
  const answers = (body.answers ?? {}) as Record<string, string>;

  const round = await prisma.hqpFeedbackRound.findUnique({ where: { id: roundId } });
  if (!round) return NextResponse.json({ error: "Round not found" }, { status: 404 });
  if (round.status === "closed") {
    return NextResponse.json({ error: "This round is closed for new responses." }, { status: 400 });
  }

  const existing = await prisma.hqpFeedbackResponse.findUnique({
    where: { roundId_userId: { roundId, userId } },
  });

  const merged = {
    ...((existing?.answers as Record<string, string>) ?? {}),
    ...answers,
  };

  if (action === "submit") {
    const created = existing
      ? await prisma.hqpFeedbackResponse.update({
          where: { id: existing.id },
          data: { answers: merged as unknown as object, status: "submitted", submittedAt: new Date() },
        })
      : await prisma.hqpFeedbackResponse.create({
          data: { roundId, userId, answers: merged as unknown as object, status: "submitted", submittedAt: new Date() },
        });
    return NextResponse.json({ ok: true, response: created });
  }

  const saved = existing
    ? await prisma.hqpFeedbackResponse.update({
        where: { id: existing.id },
        data: { answers: merged as unknown as object },
      })
    : await prisma.hqpFeedbackResponse.create({
        data: { roundId, userId, answers: merged as unknown as object, status: "draft" },
      });
  return NextResponse.json({ ok: true, response: saved });
}
