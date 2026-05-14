/**
 * Save a structured interview score for an application.
 *
 *   POST /api/employer/applications/[id]/interview-score
 *     body: {
 *       interviewId: string,
 *       overallScore: 1..5,
 *       recommendation: "hire"|"maybe"|"pass",
 *       skillScores?: { [skillId: string]: 1..5 },
 *       strengths?: string,
 *       concerns?: string
 *     }
 *
 * Upserts on (interviewId, scorerUserId) so each interviewer can
 * iterate on their own row but never overwrite a peer's. Multi-
 * stakeholder by design.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const VALID_RECS = ["hire", "maybe", "pass"] as const;

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
    select: { postingId: true, applicantId: true, posting: { select: { createdById: true } } },
  });
  if (!app) return NextResponse.json({ error: "Application not found" }, { status: 404 });
  if (role === "employer" && app.posting.createdById !== userId) {
    return NextResponse.json({ error: "Forbidden — not your posting" }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    interviewId?: string;
    overallScore?: number;
    recommendation?: string;
    skillScores?: Record<string, number>;
    strengths?: string;
    concerns?: string;
  };

  if (!body.interviewId || typeof body.interviewId !== "string") {
    return NextResponse.json({ error: "interviewId required" }, { status: 400 });
  }
  // Verify the interview belongs to this application.
  const interview = await prisma.interview.findUnique({
    where: { id: body.interviewId },
    select: { postingId: true, applicantId: true },
  });
  if (
    !interview ||
    interview.postingId !== app.postingId ||
    interview.applicantId !== app.applicantId
  ) {
    return NextResponse.json({ error: "Interview not found for this application." }, { status: 404 });
  }

  const score = Number(body.overallScore);
  if (!Number.isInteger(score) || score < 1 || score > 5) {
    return NextResponse.json({ error: "overallScore must be 1..5." }, { status: 400 });
  }
  if (!body.recommendation || !VALID_RECS.includes(body.recommendation as typeof VALID_RECS[number])) {
    return NextResponse.json(
      { error: `recommendation must be one of: ${VALID_RECS.join(", ")}` },
      { status: 400 },
    );
  }
  let skillScores: Record<string, number> | undefined;
  if (body.skillScores) {
    skillScores = {};
    for (const [k, v] of Object.entries(body.skillScores)) {
      const n = Number(v);
      if (!Number.isInteger(n) || n < 1 || n > 5) continue;
      skillScores[k] = n;
    }
  }

  await prisma.interviewScore.upsert({
    where: {
      interviewId_scorerUserId: { interviewId: body.interviewId, scorerUserId: userId },
    },
    create: {
      interviewId: body.interviewId,
      scorerUserId: userId,
      overallScore: score,
      recommendation: body.recommendation,
      skillScores: skillScores ?? undefined,
      strengths: body.strengths?.slice(0, 2000) || null,
      concerns: body.concerns?.slice(0, 2000) || null,
    },
    update: {
      overallScore: score,
      recommendation: body.recommendation,
      skillScores: skillScores ?? undefined,
      strengths: body.strengths?.slice(0, 2000) || null,
      concerns: body.concerns?.slice(0, 2000) || null,
    },
  });

  // Mark the interview itself as completed once we have a score.
  await prisma.interview.update({
    where: { id: body.interviewId },
    data: { status: "completed" },
  });

  return NextResponse.json({ ok: true });
}
