import { prisma } from "./prisma";

/**
 * Roles that may legitimately enroll in a pathway. Staff are not gated by
 * the request workflow — admins can simply force-enroll users via the
 * admin endpoints.
 */
export type PathwayWindowState = "open" | "closed" | "full";

/**
 * Resolve the effective enrollment state of a pathway, honoring explicit
 * status, scheduled close dates, and capacity vs. approved-count.
 */
export async function resolvePathwayWindow(pathwayId: string) {
  const p = await prisma.pathway.findUnique({
    where: { id: pathwayId },
    select: {
      enrollmentStatus: true,
      enrollmentOpensAt: true,
      enrollmentClosesAt: true,
      capacity: true,
      allowWaitlist: true,
      status: true,
    },
  });
  if (!p) return null;

  const now = new Date();
  const opensAt = p.enrollmentOpensAt;
  const closesAt = p.enrollmentClosesAt;

  // Explicit closed always wins
  if (p.enrollmentStatus === "closed") {
    return { state: "closed" as PathwayWindowState, reason: "Closed by admin", config: p };
  }
  if (closesAt && closesAt < now) {
    return { state: "closed" as PathwayWindowState, reason: "Enrollment window has ended", config: p };
  }
  if (opensAt && opensAt > now) {
    return { state: "closed" as PathwayWindowState, reason: `Opens on ${opensAt.toLocaleDateString()}`, config: p };
  }
  if (p.status !== "published") {
    return { state: "closed" as PathwayWindowState, reason: "Pathway is not published", config: p };
  }

  // Capacity check
  if (p.capacity != null) {
    const approved = await prisma.pathwayEnrollment.count({
      where: { pathwayId, status: { in: ["approved", "completed"] } },
    });
    if (approved >= p.capacity) {
      // Either explicit "full" or "open" with capacity reached
      return {
        state: "full" as PathwayWindowState,
        reason: `Capacity reached (${approved}/${p.capacity})`,
        config: p,
      };
    }
  }
  if (p.enrollmentStatus === "full") {
    return { state: "full" as PathwayWindowState, reason: "Marked full by admin", config: p };
  }

  return { state: "open" as PathwayWindowState, reason: null, config: p };
}

/** Returns a 1-based queue position among waitlisted requests, or null. */
export async function waitlistPosition(pathwayId: string, enrollmentId: string) {
  const me = await prisma.pathwayEnrollment.findUnique({
    where: { id: enrollmentId },
    select: { enrolledAt: true, status: true, pathwayId: true },
  });
  if (!me || me.status !== "waitlisted" || me.pathwayId !== pathwayId) return null;
  const ahead = await prisma.pathwayEnrollment.count({
    where: { pathwayId, status: "waitlisted", enrolledAt: { lt: me.enrolledAt } },
  });
  return ahead + 1;
}

/**
 * Pure, batch version of the window rules above.
 *
 * `resolvePathwayWindow` does its own findUnique plus a conditional
 * count, which makes it one-query-per-pathway — fine on a detail page,
 * an N+1 on the /pathways list. This takes rows the caller has already
 * fetched (plus a map of approved counts) and applies the SAME
 * precedence, so the list badge and the detail page cannot disagree.
 *
 * Keep the two in step: any rule added above belongs here too.
 */
export function pathwayWindowFrom(
  p: {
    status: string;
    enrollmentStatus: string;
    enrollmentOpensAt: Date | null;
    enrollmentClosesAt: Date | null;
    capacity: number | null;
  },
  approvedCount: number,
  now: Date = new Date(),
): { state: PathwayWindowState; reason: string | null } {
  if (p.enrollmentStatus === "closed") {
    return { state: "closed", reason: "Closed by admin" };
  }
  if (p.enrollmentClosesAt && p.enrollmentClosesAt < now) {
    return { state: "closed", reason: "Enrollment window has ended" };
  }
  if (p.enrollmentOpensAt && p.enrollmentOpensAt > now) {
    return {
      state: "closed",
      reason: `Opens on ${p.enrollmentOpensAt.toLocaleDateString()}`,
    };
  }
  if (p.status !== "published") {
    return { state: "closed", reason: "Pathway is not published" };
  }
  if (p.capacity != null && approvedCount >= p.capacity) {
    return {
      state: "full",
      reason: `Capacity reached (${approvedCount}/${p.capacity})`,
    };
  }
  if (p.enrollmentStatus === "full") {
    return { state: "full", reason: "Marked full by admin" };
  }
  return { state: "open", reason: null };
}
