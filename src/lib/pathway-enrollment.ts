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
