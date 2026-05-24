/**
 * Employer hiring analytics.
 *
 *   GET /api/employer/analytics
 *
 * Auth: employer or admin/superadmin.
 *
 * Returns:
 *   {
 *     summary: { totalApplicants, totalHired, offerAcceptanceRate, activePostings },
 *     postings: Array<{
 *       id, title, status,
 *       counts: { new, reviewing, shortlisted, interview_scheduled, interviewed,
 *                 offer, hired, passed, withdrawn, total },
 *       conversions: { toReviewing, toShortlisted, toInterview, toOffer, toHired }
 *     }>,
 *     stageVelocity: Array<{ stage, avgDays }>,
 *   }
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getActiveCompanyId } from "@/lib/employer/company";

export const runtime = "nodejs";

// Stage keys we track
const STAGE_KEYS = [
  "new", "reviewing", "shortlisted", "interview_scheduled",
  "interviewed", "offer", "hired", "passed", "withdrawn",
] as const;
type StageKey = (typeof STAGE_KEYS)[number];

type StageCounts = Record<StageKey, number> & { total: number };

function emptyStages(): StageCounts {
  return {
    new: 0, reviewing: 0, shortlisted: 0, interview_scheduled: 0,
    interviewed: 0, offer: 0, hired: 0, passed: 0, withdrawn: 0,
    total: 0,
  };
}

function pct(numerator: number, denominator: number): number {
  if (denominator === 0) return 0;
  return Math.round((numerator / denominator) * 100);
}

/** Resolves companyId for an employer or admin (same fallback pattern as team-seed). */
async function resolveCompanyId(userId: string, isAdmin: boolean): Promise<string | null> {
  const own = await getActiveCompanyId(userId);
  if (own) return own;
  if (!isAdmin) return null;

  // Admin fallback: adopt the first company alphabetically.
  const existing = await prisma.company.findFirst({
    orderBy: { name: "asc" },
    select: { id: true },
  });
  if (!existing) return null;

  await prisma.companyMember.upsert({
    where: { companyId_userId: { companyId: existing.id, userId } },
    create: { companyId: existing.id, userId, role: "owner", joinedAt: new Date() },
    update: {},
  });
  return existing.id;
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id?: string }).id;
  const role = (session.user as { role?: string }).role ?? "";
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const isAdmin = role === "admin" || role === "superadmin";
  if (role !== "employer" && !isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Allow ?companyId= for admin overrides
  const url = new URL(req.url);
  const candidateCompanyId = url.searchParams.get("companyId");

  const companyId = await resolveCompanyId(userId, isAdmin);
  if (!companyId) {
    return NextResponse.json({ error: "No company workspace found" }, { status: 400 });
  }

  // Fetch all non-deleted postings for this company
  const postings = await prisma.internshipPosting.findMany({
    where: {
      companyId,
      status: { not: "deleted" },
    },
    select: { id: true, title: true, status: true },
    orderBy: { id: "asc" },
  });

  const postingIds = postings.map((p) => p.id);
  if (postingIds.length === 0) {
    return NextResponse.json({
      summary: { totalApplicants: 0, totalHired: 0, offerAcceptanceRate: 0, activePostings: 0 },
      postings: [],
      stageVelocity: [],
    });
  }

  // Fetch all ApplicationStatus rows for those postings
  const appStatuses = await prisma.applicationStatus.findMany({
    where: { postingId: { in: postingIds } },
    select: {
      id: true,
      postingId: true,
      status: true,
      stageEnteredAt: true,
      createdAt: true,
      rating: true,
      offer: { select: { status: true } },
    },
  });

  // ── Per-posting counts + conversions ─────────────────────────────

  const postingMap = new Map(postings.map((p) => [p.id, p]));
  const countsByPosting = new Map<string, StageCounts>();

  for (const pid of postingIds) {
    countsByPosting.set(pid, emptyStages());
  }

  for (const row of appStatuses) {
    const counts = countsByPosting.get(row.postingId);
    if (!counts) continue;
    const stage = row.status as StageKey;
    if (stage in counts) {
      (counts as Record<string, number>)[stage] = ((counts as Record<string, number>)[stage] ?? 0) + 1;
    }
    counts.total += 1;
  }

  const postingResults = postings.map((p) => {
    const counts = countsByPosting.get(p.id) ?? emptyStages();
    const total = counts.total;
    const conversions = {
      toReviewing:   pct(counts.reviewing + counts.shortlisted + counts.interview_scheduled + counts.interviewed + counts.offer + counts.hired, total),
      toShortlisted: pct(counts.shortlisted + counts.interview_scheduled + counts.interviewed + counts.offer + counts.hired, total),
      toInterview:   pct(counts.interview_scheduled + counts.interviewed + counts.offer + counts.hired, total),
      toOffer:       pct(counts.offer + counts.hired, total),
      toHired:       pct(counts.hired, total),
    };
    return { id: p.id, title: p.title, status: p.status, counts, conversions };
  });

  // ── Company-wide summary ──────────────────────────────────────────

  const totalApplicants = appStatuses.length;
  const totalHired = appStatuses.filter((a) => a.status === "hired").length;
  const activePostings = postings.filter((p) => p.status === "active").length;

  // Offer acceptance rate: among offers with a response (accepted / declined)
  const offers = appStatuses.filter((a) => a.offer);
  const offersAccepted = offers.filter((a) => a.offer?.status === "accepted").length;
  const offersDeclined = offers.filter((a) => a.offer?.status === "declined").length;
  const offersResponded = offersAccepted + offersDeclined;
  const offerAcceptanceRate = offersResponded > 0
    ? Math.round((offersAccepted / offersResponded) * 100)
    : 0;

  // ── Stage velocity: avg days spent in each stage ──────────────────

  const stageVelocityMap = new Map<string, { totalDays: number; count: number }>();
  const now = Date.now();

  for (const row of appStatuses) {
    if (!row.stageEnteredAt) continue;
    const stage = row.status;
    const entered = row.stageEnteredAt.getTime();
    const days = Math.max(0, Math.floor((now - entered) / 86_400_000));

    const entry = stageVelocityMap.get(stage) ?? { totalDays: 0, count: 0 };
    entry.totalDays += days;
    entry.count += 1;
    stageVelocityMap.set(stage, entry);
  }

  const stageVelocity = Array.from(stageVelocityMap.entries()).map(([stage, { totalDays, count }]) => ({
    stage,
    avgDays: count > 0 ? Math.round(totalDays / count) : 0,
  })).sort((a, b) => {
    const order = STAGE_KEYS as readonly string[];
    return order.indexOf(a.stage) - order.indexOf(b.stage);
  });

  return NextResponse.json({
    summary: {
      totalApplicants,
      totalHired,
      offerAcceptanceRate,
      activePostings,
    },
    postings: postingResults,
    stageVelocity,
  });
}
