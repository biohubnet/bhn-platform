/**
 * Per-posting prep session.
 *
 *   GET /api/prep/[postingId]
 *     Returns the PrepSession row for the current user × this
 *     posting, creating one if it doesn't exist yet. Also returns
 *     the supporting data the client needs: posting basics, the
 *     trainee's resume text, the recommended interview-question set.
 *
 *   PATCH /api/prep/[postingId]
 *     body: { currentStep?: number, state?: PrepSessionState }
 *     Saves the user's progress. Idempotent — every save is a full
 *     state-blob upsert. The `state` here is trusted because the
 *     client owns the data structure; if a future audit needs to
 *     validate it, add a Zod parser here.
 *
 *   POST /api/prep/[postingId]/analyze
 *     Re-runs the JD ↔ resume keyword comparison. Lives in a sibling
 *     route file (.../analyze/route.ts).
 */
import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { emptyState, type PrepSessionState } from "@/lib/prep/types";
import { recommendQuestionsForPosting } from "@/lib/prep/library";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ postingId: string }> },
) {
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id?: string }).id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { postingId } = await ctx.params;

  const posting = await prisma.internshipPosting.findUnique({
    where: { id: postingId },
    select: {
      id: true,
      title: true,
      companyName: true,
      positionDetails: true,
      keySkills: true,
      status: true,
      skills: { select: { skillId: true, required: true, skill: { select: { name: true } } } },
    },
  });
  if (!posting) return NextResponse.json({ error: "Posting not found" }, { status: 404 });
  if (posting.status === "draft") {
    return NextResponse.json({ error: "Posting not available" }, { status: 404 });
  }

  // Upsert the session — idempotent. Re-opening returns the same row.
  let prep = await prisma.prepSession.findUnique({
    where: { userId_postingId: { userId, postingId } },
  });
  if (!prep) {
    prep = await prisma.prepSession.create({
      data: { userId, postingId, state: emptyState() as unknown as object },
    });
  }

  // The trainee's "resume" — we don't have a parsed resume body in
  // the schema, only a URL. Fall back to elevatorPitch + bio as
  // synthetic resume text; the analysis still produces useful output
  // (more useful than nothing).
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { resumeUrl: true, elevatorPitch: true, bio: true, name: true, jobTitle: true, organization: true },
  });

  const resumeSynth = synthResumeText({
    pitch: user?.elevatorPitch ?? null,
    bio: user?.bio ?? null,
    jobTitle: user?.jobTitle ?? null,
    organization: user?.organization ?? null,
    resumeUrl: user?.resumeUrl ?? null,
  });

  return NextResponse.json({
    ok: true,
    prep: {
      id: prep.id,
      currentStep: prep.currentStep,
      state: prep.state as unknown as PrepSessionState,
      updatedAt: prep.updatedAt.toISOString(),
    },
    posting,
    resume: {
      url: user?.resumeUrl ?? null,
      synthText: resumeSynth,
    },
    questions: recommendQuestionsForPosting(posting.keySkills),
  });
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ postingId: string }> },
) {
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id?: string }).id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { postingId } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as {
    currentStep?: number;
    state?: PrepSessionState;
  };

  const data: Record<string, unknown> = {};
  if (typeof body.currentStep === "number" && body.currentStep >= 1 && body.currentStep <= 4) {
    data.currentStep = body.currentStep;
  }
  if (body.state !== undefined) {
    data.state = body.state as unknown as object;
  }

  const updated = await prisma.prepSession.upsert({
    where: { userId_postingId: { userId, postingId } },
    create: {
      userId,
      postingId,
      currentStep: typeof data.currentStep === "number" ? (data.currentStep as number) : 1,
      state: (body.state ?? emptyState()) as unknown as object,
    },
    update: data,
    select: { id: true, currentStep: true, state: true, updatedAt: true },
  });

  return NextResponse.json({
    ok: true,
    prep: {
      id: updated.id,
      currentStep: updated.currentStep,
      state: updated.state as unknown as PrepSessionState,
      updatedAt: updated.updatedAt.toISOString(),
    },
  });
}

/** Build a synthetic "resume text" from whatever User-level artifacts
 *  the trainee has populated. The JD ↔ resume analyzer accepts any
 *  text — the more the user has filled in, the better the signal. */
function synthResumeText(parts: {
  pitch: string | null;
  bio: string | null;
  jobTitle: string | null;
  organization: string | null;
  resumeUrl: string | null;
}): string {
  const lines: string[] = [];
  if (parts.jobTitle) lines.push(`Current role: ${parts.jobTitle}`);
  if (parts.organization) lines.push(`Organisation: ${parts.organization}`);
  if (parts.pitch) lines.push(`\n${parts.pitch}`);
  if (parts.bio) lines.push(`\n${parts.bio}`);
  if (lines.length === 0 && !parts.resumeUrl) {
    lines.push("(Empty profile — add an elevator pitch + bio at /profile/application for sharper analysis.)");
  }
  return lines.join("\n");
}
