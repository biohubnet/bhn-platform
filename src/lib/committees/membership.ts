/**
 * Committee membership helpers.
 *
 * Server-side utilities for asking "is this user on committee X?"
 * and "what committees does this user belong to?". Centralised
 * here so the answers are cached per-request (via React's `cache`)
 * and the call sites stay one-liners.
 */
import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import {
  COMMITTEES,
  EQUIP_REVIEW_COMMITTEES,
  isCommitteeSlug,
  type CommitteeMeta,
  type CommitteeSlug,
} from "./registry";

/** Look up all *active* committee memberships for a user.
 *  Inactive rows (`active=false`) are excluded — those are the
 *  audit-trail records of past members. */
export const getCommitteesForUser = cache(async (userId: string): Promise<CommitteeSlug[]> => {
  if (!userId) return [];
  const rows = await prisma.committeeMembership.findMany({
    where: { userId, active: true },
    select: { committee: true },
  });
  return rows
    .map((r) => r.committee)
    .filter(isCommitteeSlug);
});

/** Resolve to full registry metadata (name, badge tone, sidebar
 *  items) for each active membership. Useful in the welcome-
 *  screen badge component and the sidebar. */
export const getCommitteeMetaForUser = cache(async (userId: string): Promise<CommitteeMeta[]> => {
  const slugs = await getCommitteesForUser(userId);
  return COMMITTEES.filter((c) => slugs.includes(c.slug));
});

export async function isOnCommittee(userId: string, slug: CommitteeSlug): Promise<boolean> {
  const slugs = await getCommitteesForUser(userId);
  return slugs.includes(slug);
}

/** True if the user holds *any* committee membership that grants
 *  /admin/equip review access. Used by the equip review API
 *  route + page guard so committee members can review without
 *  being upgraded to an admin role. */
export async function canReviewEquip(userId: string): Promise<boolean> {
  const slugs = await getCommitteesForUser(userId);
  return EQUIP_REVIEW_COMMITTEES.some((s) => slugs.includes(s));
}

/**
 * Auth shim for endpoints / pages that are open to either a
 * platform admin **or** a member of one of the listed committees
 * **or** a user in one of the listed role-seats. Used to widen
 * gates that originally only accepted committee membership now
 * that some user-types are first-class roles (e.g.
 * `equip_grant_reviewer`) instead of committee memberships.
 *
 *   const session = await requireCommitteeOrAdmin(["equip_review"]);
 *   const session = await requireCommitteeOrAdmin(
 *     ["equip_review"],
 *     ["equip_grant_reviewer"],
 *   );
 *
 * Returns the session on success, throws "Forbidden" otherwise.
 * Mirrors the throw-style of `requireRole` so it composes the
 * same way at call sites.
 */
export async function requireCommitteeOrAdmin(
  allowedCommittees: CommitteeSlug[],
  allowedRoles: string[] = [],
) {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");
  const role = (session.user as { role?: string }).role ?? "user";
  if (role === "admin" || role === "superadmin") return session;
  if (allowedRoles.includes(role)) return session;

  const userId = (session.user as { id?: string }).id;
  if (!userId) throw new Error("Forbidden");
  const slugs = await getCommitteesForUser(userId);
  if (allowedCommittees.some((s) => slugs.includes(s))) return session;
  throw new Error("Forbidden");
}
