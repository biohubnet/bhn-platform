/**
 * Admin / superadmin preview workspace helper.
 *
 * The /employer surface is shaped for real employer accounts whose
 * data is naturally scoped through their CompanyMember row. Admins
 * and superadmins want to be able to PREVIEW that surface without
 * having to be a member of a real company.
 *
 * Previously each company-scoped page (calendar, analytics, team,
 * templates) handled this with a fallback that did:
 *
 *   1. Find the FIRST company in the table (ordered by createdAt).
 *   2. Auto-add the admin as an owner of that company.
 *
 * That leaked data between admins. The first company in the table
 * was typically whichever one the first admin had filled in (e.g.
 * Cytiva). Every subsequent admin became a CompanyMember of that
 * company, and `getActiveCompanyId(userId)` started returning the
 * shared company for them — they'd see each other's postings,
 * applicants, interviews, analytics, team rosters, etc. A new
 * admin who never filled in their own profile would see "Cytiva"
 * everywhere on /employer because that was the first company that
 * happened to exist.
 *
 * `ensureAdminPreviewCompany` replaces that. It guarantees each
 * admin gets a PRIVATE single-member Company workspace:
 *
 *   • Looks at the admin's existing CompanyMember rows.
 *   • For each, checks whether any OTHER user is also a member.
 *   • If a sole-member company exists, that's the admin's preview.
 *   • Otherwise creates a fresh Company + Membership, sole-member,
 *     and returns its id.
 *
 * The helper never adds the admin to a multi-member company. The
 * private preview can be reset with `Clear preview` in the UI
 * (deletes the Company + Membership) which cascades through
 * Postings / Interviews / etc.
 *
 * Real employers should NOT call this — their company resolution
 * still goes through `getActiveCompanyId` against their genuine
 * CompanyMember rows.
 */
import { prisma } from "@/lib/prisma";
import { getActiveCompanyId } from "./company";

/**
 * THE single source of truth for "which company does this caller's
 * /employer workspace resolve to" — used by BOTH the read pages
 * (postings / analytics / calendar / templates / team) AND the demo
 * seed routes, so seed-writes and page-reads always land on the same
 * company.
 *
 * Keyed on the caller's REAL role (session.user.realRole), NOT the
 * effective role. That matters for superadmins using view-as-employer:
 * their effective role is "employer" but they have no genuine
 * CompanyMember row, so without this they'd resolve to null on both
 * sides and seeding would silently do nothing. Keying on realRole
 * routes any admin/superadmin (acting-as or not) to their private
 * preview company.
 *
 *   • admin / superadmin (by real role) → ensureAdminPreviewCompany
 *     (a private, sole-member workspace — never a shared company, so
 *     no cross-admin leak).
 *   • genuine employer → getActiveCompanyId (their real CompanyMember).
 *
 * Returns null only for a genuine employer with no company yet;
 * callers render an empty state / 400 in that case.
 */
export async function resolveWorkspaceCompanyId(
  userId: string,
  realRole: string | null | undefined,
): Promise<string | null> {
  if (realRole === "admin" || realRole === "superadmin") {
    return ensureAdminPreviewCompany(userId);
  }
  return getActiveCompanyId(userId);
}

export async function ensureAdminPreviewCompany(
  userId: string,
  fallbackName?: string | null,
): Promise<string> {
  // Find a Company where this admin is the sole member — that's the
  // admin's existing private preview, if any. We sort by joinedAt asc
  // so if the admin somehow has multiple sole-member companies (rare
  // — e.g. they used to be an owner, the other member left), we
  // return the oldest one consistently.
  const myMemberships = await prisma.companyMember.findMany({
    where: { userId },
    select: { companyId: true },
    orderBy: { joinedAt: "asc" },
  });

  for (const m of myMemberships) {
    const others = await prisma.companyMember.count({
      where: { companyId: m.companyId, userId: { not: userId } },
    });
    if (others === 0) return m.companyId;
  }

  // No private preview yet — make one. The Company.name is required
  // (NOT NULL) so we fall back to a generic label rather than
  // copying the admin's own User row's employerCompany field
  // (which would itself be a leak vector if it ever shared via a
  // global default — keep this name independent).
  const name = (fallbackName ?? "").trim() || "My preview workspace";
  const created = await prisma.company.create({
    data: {
      name,
      members: { create: { userId, role: "owner", joinedAt: new Date() } },
    },
    select: { id: true },
  });
  return created.id;
}
