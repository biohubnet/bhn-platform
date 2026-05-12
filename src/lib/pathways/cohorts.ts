/**
 * Pathway cohort service.
 *
 * A Pathway can run as a single open-enrollment track (no cohorts —
 * fall back to pathway-level capacity + window) or as a series of
 * cohorts (Spring 2026 / Fall 2026 / etc), each with its own
 * capacity, registration window, and waitlist policy.
 *
 * Public API
 *   • computeCohortState() — derives the user-facing badge state
 *     (open / full / waitlisted / closed) from stored fields +
 *     current enrollment counts. Single source of truth for the
 *     display logic.
 *   • cohortAvailability() — { cohort, state, confirmedCount,
 *     waitlistCount } per cohort, ready to render in a picker.
 *   • enrollInCohort() — books a user into a specific cohort,
 *     respecting capacity + waitlist rules. Returns
 *     { status: "approved" | "waitlisted", waitlistPosition }.
 *   • cancelCohortEnrollment() — withdraw an enrollment, promote
 *     the next waitlister if a confirmed seat was freed.
 *
 * State derivation rules
 *   - status="draft" or "archived"        → corresponding state
 *   - status="closed"                     → "closed"
 *   - enrollmentClosesAt < now           → "closed"
 *   - enrollmentOpensAt > now            → "not_open_yet"
 *   - confirmedCount >= capacity AND no waitlist  → "full"
 *   - confirmedCount >= capacity AND waitlist room → "waitlisted"
 *   - else                                → "open"
 *
 * The state is computed (not stored) so it stays consistent with
 * the underlying counts at all times — no sweeper to keep in sync.
 */
import type { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type CohortState =
  | "open"
  | "full"
  | "waitlisted"
  | "closed"
  | "not_open_yet"
  | "draft"
  | "archived";

/** Pretty label + tone for the badge UI. */
export const COHORT_STATE_META: Record<CohortState, { label: string; tone: "emerald" | "rose" | "amber" | "slate" | "sky" | "subtle" }> = {
  open:         { label: "Open",           tone: "emerald" },
  waitlisted:   { label: "Waitlist only",  tone: "amber"   },
  full:         { label: "Full",           tone: "rose"    },
  closed:       { label: "Closed",         tone: "slate"   },
  not_open_yet: { label: "Opens soon",     tone: "sky"     },
  draft:        { label: "Draft",          tone: "subtle"  },
  archived:     { label: "Past cohort",    tone: "slate"   },
};

interface CohortLike {
  status: string;
  capacity: number;
  allowWaitlist: boolean;
  waitlistCapacity: number | null;
  enrollmentOpensAt: Date | null;
  enrollmentClosesAt: Date | null;
}

export function computeCohortState(
  cohort: CohortLike,
  counts: { confirmed: number; waitlist: number },
  now: Date = new Date(),
): CohortState {
  if (cohort.status === "draft") return "draft";
  if (cohort.status === "archived") return "archived";
  if (cohort.status === "closed") return "closed";

  if (cohort.enrollmentClosesAt && cohort.enrollmentClosesAt < now) return "closed";
  if (cohort.enrollmentOpensAt && cohort.enrollmentOpensAt > now) return "not_open_yet";

  if (counts.confirmed >= cohort.capacity) {
    if (!cohort.allowWaitlist) return "full";
    if (cohort.waitlistCapacity !== null && counts.waitlist >= cohort.waitlistCapacity) {
      return "full";
    }
    return "waitlisted";
  }

  return "open";
}

export interface CohortAvailability {
  id: string;
  pathwayId: string;
  slug: string;
  name: string;
  description: string | null;
  startDate: Date;
  endDate: Date | null;
  capacity: number;
  allowWaitlist: boolean;
  waitlistCapacity: number | null;
  enrollmentOpensAt: Date | null;
  enrollmentClosesAt: Date | null;
  status: string;
  displayOrder: number;
  confirmedCount: number;
  waitlistCount: number;
  state: CohortState;
}

/**
 * Load every cohort for a pathway, plus current enrollment counts,
 * and derive the display state. One round-trip via groupBy keeps
 * this cheap even for many cohorts.
 */
export async function cohortAvailability(pathwayId: string): Promise<CohortAvailability[]> {
  const [cohorts, counts] = await Promise.all([
    prisma.pathwayCohort.findMany({
      where: { pathwayId },
      orderBy: [{ displayOrder: "asc" }, { startDate: "asc" }],
    }),
    prisma.pathwayEnrollment.groupBy({
      by: ["cohortId", "status"],
      where: { pathway: { id: pathwayId }, cohortId: { not: null } },
      _count: { _all: true },
    }),
  ]);

  const countMap = new Map<string, { confirmed: number; waitlist: number }>();
  for (const row of counts) {
    if (!row.cohortId) continue;
    const entry = countMap.get(row.cohortId) ?? { confirmed: 0, waitlist: 0 };
    if (row.status === "approved") entry.confirmed = row._count._all;
    else if (row.status === "waitlisted") entry.waitlist = row._count._all;
    countMap.set(row.cohortId, entry);
  }

  return cohorts.map((c) => {
    const cc = countMap.get(c.id) ?? { confirmed: 0, waitlist: 0 };
    return {
      ...c,
      confirmedCount: cc.confirmed,
      waitlistCount: cc.waitlist,
      state: computeCohortState(c, cc),
    };
  });
}

export type EnrollOk = {
  ok: true;
  enrollmentId: string;
  status: "approved" | "waitlisted" | "pending";
  waitlistPosition: number | null;
};
export type EnrollErr = { ok: false; error: string; code: string };

/**
 * Enroll a user in a specific cohort. Idempotent: if the user
 * already has a non-cancelled enrollment for this pathway, returns
 * its current state without changing anything (cohort can't be
 * switched via this endpoint — admin would have to withdraw first).
 *
 * Capacity + waitlist semantics computed inside the transaction
 * so concurrent applicants don't both slip in over the cap.
 */
export async function enrollInCohort(
  userId: string,
  cohortId: string,
  requestReason: string | null = null,
): Promise<EnrollOk | EnrollErr> {
  return prisma.$transaction(async (tx) => {
    const cohort = await tx.pathwayCohort.findUnique({
      where: { id: cohortId },
      select: {
        id: true, pathwayId: true, status: true, capacity: true,
        allowWaitlist: true, waitlistCapacity: true,
        enrollmentOpensAt: true, enrollmentClosesAt: true,
      },
    });
    if (!cohort) return { ok: false as const, error: "Cohort not found", code: "not_found" };

    // State check.
    const [confirmedCount, waitlistCount] = await Promise.all([
      tx.pathwayEnrollment.count({
        where: { cohortId, status: "approved" },
      }),
      tx.pathwayEnrollment.count({
        where: { cohortId, status: "waitlisted" },
      }),
    ]);
    const state = computeCohortState(cohort, { confirmed: confirmedCount, waitlist: waitlistCount });
    if (state === "closed" || state === "draft" || state === "archived") {
      return { ok: false as const, error: "This cohort isn't accepting enrollments.", code: state };
    }
    if (state === "not_open_yet") {
      return {
        ok: false as const,
        error: "Enrollment hasn't opened yet for this cohort.",
        code: "not_open_yet",
      };
    }
    if (state === "full") {
      return {
        ok: false as const,
        error: "This cohort is full and the waitlist is closed.",
        code: "full",
      };
    }

    // Existing enrollment for this pathway? Idempotent surface.
    const existing = await tx.pathwayEnrollment.findUnique({
      where: { userId_pathwayId: { userId, pathwayId: cohort.pathwayId } },
    });
    if (existing && existing.status !== "withdrawn" && existing.status !== "rejected") {
      return {
        ok: true as const,
        enrollmentId: existing.id,
        status: existing.status as "approved" | "waitlisted" | "pending",
        waitlistPosition: existing.waitlistPosition ?? null,
      };
    }

    // Final placement.
    let placementStatus: "approved" | "waitlisted";
    let waitlistPosition: number | null = null;
    if (state === "open") {
      placementStatus = "approved";
    } else {
      placementStatus = "waitlisted";
      const lastWait = await tx.pathwayEnrollment.findFirst({
        where: { cohortId, status: "waitlisted" },
        orderBy: { waitlistPosition: "desc" },
        select: { waitlistPosition: true },
      });
      waitlistPosition = (lastWait?.waitlistPosition ?? 0) + 1;
    }

    const data = {
      userId,
      pathwayId: cohort.pathwayId,
      cohortId,
      status: placementStatus,
      requestReason: requestReason ?? null,
      enrolledAt: new Date(),
      approvedAt: placementStatus === "approved" ? new Date() : null,
      waitlistPosition,
    };

    const created = existing
      ? await tx.pathwayEnrollment.update({
          where: { id: existing.id },
          data: { ...data, reviewerId: null, reviewerNote: null, reviewedAt: null, completedAt: null },
        })
      : await tx.pathwayEnrollment.create({ data });

    return {
      ok: true as const,
      enrollmentId: created.id,
      status: placementStatus,
      waitlistPosition,
    };
  });
}

/**
 * Withdraw an enrollment. If the cancelled row was an approved
 * (confirmed) seat, promote the next waitlister; if it was on the
 * waitlist, renumber positions densely down.
 */
export async function cancelCohortEnrollment(
  userId: string,
  pathwayId: string,
): Promise<{ ok: true; promoted: boolean } | EnrollErr> {
  return prisma.$transaction(async (tx) => {
    const e = await tx.pathwayEnrollment.findUnique({
      where: { userId_pathwayId: { userId, pathwayId } },
      select: { id: true, status: true, cohortId: true, waitlistPosition: true },
    });
    if (!e) return { ok: false as const, error: "Enrollment not found.", code: "not_found" };
    if (e.status === "withdrawn") return { ok: true as const, promoted: false };

    const wasApproved = e.status === "approved";
    const wasWaitlist = e.status === "waitlisted";

    await tx.pathwayEnrollment.update({
      where: { id: e.id },
      data: { status: "withdrawn", waitlistPosition: null, completedAt: null },
    });

    let promoted = false;
    if (e.cohortId) {
      if (wasApproved) {
        const next = await tx.pathwayEnrollment.findFirst({
          where: { cohortId: e.cohortId, status: "waitlisted" },
          orderBy: { waitlistPosition: "asc" },
          select: { id: true, waitlistPosition: true },
        });
        if (next) {
          await tx.pathwayEnrollment.update({
            where: { id: next.id },
            data: { status: "approved", waitlistPosition: null, approvedAt: new Date() },
          });
          await tx.pathwayEnrollment.updateMany({
            where: {
              cohortId: e.cohortId,
              status: "waitlisted",
              waitlistPosition: { gt: next.waitlistPosition ?? 0 },
            },
            data: { waitlistPosition: { decrement: 1 } },
          });
          promoted = true;
        }
      } else if (wasWaitlist && e.waitlistPosition !== null) {
        await tx.pathwayEnrollment.updateMany({
          where: {
            cohortId: e.cohortId,
            status: "waitlisted",
            waitlistPosition: { gt: e.waitlistPosition },
          },
          data: { waitlistPosition: { decrement: 1 } },
        });
      }
    }

    return { ok: true as const, promoted };
  });
}

/** True when the pathway uses cohort-mode (≥ 1 cohort row).
 *  Pathways with 0 cohorts fall back to legacy pathway-level
 *  enrollment fields. */
export async function pathwayHasCohorts(
  pathwayId: string,
  client: Pick<PrismaClient, "pathwayCohort"> = prisma,
): Promise<boolean> {
  const count = await client.pathwayCohort.count({ where: { pathwayId } });
  return count > 0;
}

/** Re-export for any caller that needs to introspect the type. */
export type { Prisma };
