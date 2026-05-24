/**
 * Scorecard submissions for a posting.
 *
 *   GET  /api/employer/postings/[id]/scorecard/submissions
 *     Lists all ScorecardSubmission rows for this posting's scorecard.
 *     Includes interviewer { name, email } on each submission.
 *     Auth: manager+ or admin.
 *     Returns: { submissions: [...] }
 *
 *   POST /api/employer/postings/[id]/scorecard/submissions
 *     Upsert a submission (interviewerId = caller).
 *     Body: {
 *       applicationStatusId: string,
 *       scores: Record<string, { score: number, note?: string }>,
 *       recommendation: "strong_yes"|"yes"|"no_decision"|"no"|"strong_no",
 *       summary?: string,
 *       status: "draft"|"submitted"
 *     }
 *     Auth: any authenticated employer or admin.
 *     Returns: { ok: true, submission: {...} }
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { requireCompanyRole } from "@/lib/employer/company";

export const runtime = "nodejs";

const VALID_RECOMMENDATIONS = ["strong_yes", "yes", "no_decision", "no", "strong_no"] as const;
type Recommendation = (typeof VALID_RECOMMENDATIONS)[number];

function isValidRecommendation(r: unknown): r is Recommendation {
  return typeof r === "string" && (VALID_RECOMMENDATIONS as readonly string[]).includes(r);
}

// ── Shared: resolve posting + scorecard ──────────────────────────

async function resolveScorecard(postingId: string) {
  const posting = await prisma.internshipPosting.findUnique({
    where: { id: postingId },
    select: { id: true, companyId: true },
  });
  if (!posting) return { ok: false as const, status: 404, error: "Posting not found" };

  const scorecard = await prisma.interviewScorecard.findUnique({
    where: { postingId },
    select: { id: true, locked: true },
  });
  if (!scorecard) return { ok: false as const, status: 404, error: "No scorecard for this posting" };

  return { ok: true as const, posting, scorecard };
}

// ── GET — list submissions ────────────────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id?: string }).id;
  const role = (session.user as { role?: string }).role ?? "";
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: postingId } = await params;

  const gate = await resolveScorecard(postingId);
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });

  const isAdmin = role === "admin" || role === "superadmin";

  if (!isAdmin) {
    if (!gate.posting.companyId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    try {
      await requireCompanyRole(gate.posting.companyId, userId, "manager");
    } catch {
      return NextResponse.json({ error: "Access denied — manager+ required" }, { status: 403 });
    }
  }

  const submissions = await prisma.scorecardSubmission.findMany({
    where: { scorecardId: gate.scorecard.id },
    include: {
      interviewer: {
        select: { name: true, email: true },
      },
    },
    orderBy: { submittedAt: "desc" },
  });

  return NextResponse.json({ submissions });
}

// ── POST — upsert submission ──────────────────────────────────────

interface SubmissionBody {
  applicationStatusId?: string;
  scores?: Record<string, { score: number; note?: string }>;
  recommendation?: string;
  summary?: string;
  status?: string;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id?: string }).id;
  const role = (session.user as { role?: string }).role ?? "";
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const isAdmin = role === "admin" || role === "superadmin";
  const isEmployer = role === "employer";
  if (!isAdmin && !isEmployer) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id: postingId } = await params;

  const gate = await resolveScorecard(postingId);
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });

  let body: SubmissionBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.applicationStatusId || typeof body.applicationStatusId !== "string") {
    return NextResponse.json({ error: "applicationStatusId is required" }, { status: 400 });
  }
  if (!isValidRecommendation(body.recommendation)) {
    return NextResponse.json(
      { error: `recommendation must be one of: ${VALID_RECOMMENDATIONS.join(", ")}` },
      { status: 400 },
    );
  }
  if (body.status !== "draft" && body.status !== "submitted") {
    return NextResponse.json({ error: 'status must be "draft" or "submitted"' }, { status: 400 });
  }
  if (typeof body.scores !== "object" || body.scores === null || Array.isArray(body.scores)) {
    return NextResponse.json({ error: "scores must be a key→{score, note?} object" }, { status: 400 });
  }

  // Confirm applicationStatusId belongs to this posting
  const appStatus = await prisma.applicationStatus.findUnique({
    where: { id: body.applicationStatusId },
    select: { postingId: true },
  });
  if (!appStatus || appStatus.postingId !== postingId) {
    return NextResponse.json({ error: "applicationStatusId does not belong to this posting" }, { status: 400 });
  }

  const submittedAt = body.status === "submitted" ? new Date() : undefined;

  const submission = await prisma.scorecardSubmission.upsert({
    where: {
      scorecardId_applicationStatusId_interviewerId: {
        scorecardId: gate.scorecard.id,
        applicationStatusId: body.applicationStatusId,
        interviewerId: userId,
      },
    },
    create: {
      scorecardId: gate.scorecard.id,
      applicationStatusId: body.applicationStatusId,
      interviewerId: userId,
      scores: body.scores,
      recommendation: body.recommendation,
      summary: body.summary?.trim() ?? null,
      status: body.status,
      submittedAt: submittedAt ?? null,
    },
    update: {
      scores: body.scores,
      recommendation: body.recommendation,
      summary: body.summary?.trim() ?? null,
      status: body.status,
      ...(submittedAt ? { submittedAt } : {}),
    },
  });

  return NextResponse.json({ ok: true, submission });
}
