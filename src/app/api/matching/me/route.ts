/**
 * Trainee fit-ranked postings.
 *
 *   GET /api/matching/me
 *     query: ?limit=N (default 20, max 50)
 *
 * Returns the active postings ranked by their fit score for the
 * authenticated trainee. Each row carries the FitResult — score,
 * subscores, matched/missing skills, semantic bridges, pathway
 * boosts, caveats — so the client can render the full "why this
 * match?" explanation without a follow-up call.
 *
 * Auth: session required. Role-agnostic on the trainee side, but
 * we surface a 200 with `eligible: false` when the caller is in a
 * role that doesn't have a meaningful trainee profile (employer,
 * sponsor) so the client can hide the surface cleanly instead of
 * 403-ing into a sad path.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { rankPostingsForTrainee } from "@/lib/matching/fit";

export const runtime = "nodejs";

const MAX_LIMIT = 50;

export async function GET(req: NextRequest) {
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id?: string }).id;
  const role = (session.user as { role?: string }).role ?? "trainee";
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Eligibility — employers / sponsors aren't trainees; the matching
  // surface isn't meaningful for them. Return ok=true, eligible=false
  // so the client can render "this isn't for your role" copy without
  // a console error.
  const traineeRoles = ["trainee", "evaluating", "instructor", "admin", "superadmin"];
  if (!traineeRoles.includes(role)) {
    return NextResponse.json({
      ok: true,
      eligible: false,
      reason: "Your role doesn't have a trainee profile; the matches surface is meant for trainees.",
      matches: [],
    });
  }

  const url = new URL(req.url);
  const limitRaw = parseInt(url.searchParams.get("limit") ?? "20", 10);
  const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(MAX_LIMIT, limitRaw)) : 20;

  const matches = await rankPostingsForTrainee(userId, limit);

  return NextResponse.json({
    ok: true,
    eligible: true,
    matches: matches.map((m) => ({
      postingId: m.postingId,
      title: m.title,
      companyName: m.companyName,
      location: m.location,
      deadline: m.deadline?.toISOString() ?? null,
      fit: m.fit,
    })),
  });
}
