/**
 * Employer interview calendar.
 *
 *   GET /api/employer/calendar?from=ISO&to=ISO
 *
 * Auth: employer or admin.
 *
 * Query params:
 *   from  — ISO date/datetime string (inclusive). Default: current week Monday 00:00.
 *   to    — ISO date/datetime string (inclusive). Default: current week Sunday 23:59.
 *
 * Fetches all Interview rows for this company's postings where status is in
 * ["proposed", "accepted", "completed", "cancelled"].
 *
 * Filters in JS:
 *   - "accepted": included if acceptedSlot falls within [from, to].
 *   - "proposed": included if ANY proposedSlot parsed as Date falls within [from, to].
 *   - "completed"/"cancelled": included if acceptedSlot falls within [from, to],
 *     OR any proposedSlot falls within range.
 *
 * Returns: {
 *   events: Array<{
 *     interviewId, postingId, postingTitle, applicantId, applicantName,
 *     applicationStatusId, acceptedSlot, proposedSlots, status, format, location
 *   }>
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getActiveCompanyId } from "@/lib/employer/company";

export const runtime = "nodejs";

/** Returns the Monday of the current week at 00:00 local-ish (UTC). */
function currentWeekBounds(): { from: Date; to: Date } {
  const now = new Date();
  const day = now.getUTCDay(); // 0=Sun, 1=Mon, …
  const diffToMonday = (day === 0 ? -6 : 1 - day);
  const monday = new Date(now);
  monday.setUTCDate(now.getUTCDate() + diffToMonday);
  monday.setUTCHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  sunday.setUTCHours(23, 59, 59, 999);

  return { from: monday, to: sunday };
}

/** Resolves companyId for employer or admin (same fallback pattern as analytics). */
async function resolveCompanyId(userId: string, isAdmin: boolean): Promise<string | null> {
  const own = await getActiveCompanyId(userId);
  if (own) return own;
  if (!isAdmin) return null;

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

  const companyId = await resolveCompanyId(userId, isAdmin);
  if (!companyId) {
    return NextResponse.json({ error: "No company workspace found" }, { status: 400 });
  }

  // Parse from/to query params, fall back to current week
  const url = new URL(req.url);
  const fromParam = url.searchParams.get("from");
  const toParam = url.searchParams.get("to");

  const defaults = currentWeekBounds();
  let from: Date;
  let to: Date;

  if (fromParam) {
    const d = new Date(fromParam);
    if (Number.isNaN(d.getTime())) {
      return NextResponse.json({ error: "Invalid from date" }, { status: 400 });
    }
    from = d;
  } else {
    from = defaults.from;
  }

  if (toParam) {
    const d = new Date(toParam);
    if (Number.isNaN(d.getTime())) {
      return NextResponse.json({ error: "Invalid to date" }, { status: 400 });
    }
    to = d;
  } else {
    to = defaults.to;
  }

  if (from > to) {
    return NextResponse.json({ error: "from must be before to" }, { status: 400 });
  }

  // Fetch all interviews for this company's postings
  const interviews = await prisma.interview.findMany({
    where: {
      status: { in: ["proposed", "accepted", "completed", "cancelled"] },
      posting: { companyId },
    },
    select: {
      id: true,
      postingId: true,
      applicantId: true,
      proposedSlots: true,
      acceptedSlot: true,
      status: true,
      format: true,
      location: true,
      posting: {
        select: { title: true, companyId: true },
      },
      applicant: {
        select: { name: true },
      },
    },
  });

  // Resolve applicationStatusId for each interview
  // (Interview has postingId + applicantId; ApplicationStatus has the canonical id)
  const appStatuses = interviews.length > 0
    ? await prisma.applicationStatus.findMany({
        where: {
          postingId: { in: [...new Set(interviews.map((i) => i.postingId))] },
          applicantId: { in: [...new Set(interviews.map((i) => i.applicantId))] },
        },
        select: { id: true, postingId: true, applicantId: true },
      })
    : [];

  // Build a lookup: (postingId, applicantId) → applicationStatusId
  const appStatusMap = new Map<string, string>();
  for (const as of appStatuses) {
    appStatusMap.set(`${as.postingId}:${as.applicantId}`, as.id);
  }

  const fromMs = from.getTime();
  const toMs = to.getTime();

  /** Check if a date falls within [from, to]. */
  function inRange(date: Date): boolean {
    const ms = date.getTime();
    return ms >= fromMs && ms <= toMs;
  }

  /** Parse a proposed slot string to Date, returns null if invalid. */
  function parseSlot(s: unknown): Date | null {
    if (typeof s !== "string") return null;
    const d = new Date(s);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  // Filter interviews to those with events in the date range
  const events = interviews
    .filter((interview) => {
      const slots = Array.isArray(interview.proposedSlots) ? interview.proposedSlots : [];

      if (interview.status === "accepted" || interview.status === "completed" || interview.status === "cancelled") {
        // For accepted/completed/cancelled: check acceptedSlot first, then proposedSlots
        if (interview.acceptedSlot && inRange(interview.acceptedSlot)) return true;
        // Also check proposedSlots for completed/cancelled where no acceptedSlot was set
        return slots.some((s) => {
          const d = parseSlot(s);
          return d !== null && inRange(d);
        });
      }

      // "proposed": include if ANY proposedSlot falls within range
      if (interview.status === "proposed") {
        return slots.some((s) => {
          const d = parseSlot(s);
          return d !== null && inRange(d);
        });
      }

      return false;
    })
    .map((interview) => ({
      interviewId: interview.id,
      postingId: interview.postingId,
      postingTitle: interview.posting?.title ?? null,
      applicantId: interview.applicantId,
      applicantName: interview.applicant?.name ?? null,
      applicationStatusId: appStatusMap.get(`${interview.postingId}:${interview.applicantId}`) ?? null,
      acceptedSlot: interview.acceptedSlot ?? null,
      proposedSlots: interview.proposedSlots,
      status: interview.status,
      format: interview.format,
      location: interview.location ?? null,
    }));

  return NextResponse.json({ events });
}
