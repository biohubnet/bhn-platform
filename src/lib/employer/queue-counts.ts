/**
 * Employer-side queue-count fetcher.
 *
 * Parallel to src/lib/admin/queue-counts.ts and
 * src/lib/trainee/queue-counts.ts — same "waiting on you" semantic
 * but scoped to the employer's company workspace.
 *
 * Today it exposes one badge:
 *   • employer-join-requests — pending domain-matched join requests
 *     waiting for a manager/owner to approve or decline.
 *
 * Only managers and owners see the badge (viewers/generalists can't
 * approve anyway). If the user has no CompanyMember row yet (backfill
 * hasn't run) the function returns an empty object — no badge, no error.
 */

import { prisma } from "@/lib/prisma";
import { meetsMinRole, type CompanyRole } from "@/lib/employer/company";

export type EmployerQueueBadgeKey = "employer-join-requests";
export type EmployerQueueCounts = Partial<Record<EmployerQueueBadgeKey, number>>;

export async function getEmployerQueueCounts(userId: string): Promise<EmployerQueueCounts> {
  // Resolve the user's most-recent company membership.
  const membership = await prisma.companyMember.findFirst({
    where:   { userId },
    select:  { companyId: true, role: true },
    orderBy: { joinedAt: "desc" },
  }).catch(() => null);

  if (!membership) return {};

  // Only manager+ can approve join requests — no badge for viewer/generalist.
  if (!meetsMinRole(membership.role as CompanyRole, "manager")) return {};

  const joinRequestCount = await prisma.companyJoinRequest.count({
    where: { companyId: membership.companyId, status: "pending" },
  }).catch(() => 0);

  return { "employer-join-requests": joinRequestCount };
}
