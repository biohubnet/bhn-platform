/**
 * Core helpers for the multi-user employer company layer.
 *
 * requireCompanyRole   — throws HTTP-style errors if the caller
 *                        isn't a member of the company at the
 *                        required tier or higher.
 * getUserCompanies     — returns every Company the user is a member
 *                        of, with their role on each.
 * getActiveCompanyId   — resolves the "current" company for a user
 *                        (first company if they only belong to one;
 *                        stored in session / header for multi-company
 *                        users — fallback to first alphabetically).
 * assertPostingAccess  — convenience wrapper that loads a posting,
 *                        confirms it belongs to the company, and
 *                        checks the caller's tier.
 *
 * All helpers accept a Prisma transaction client so callers can
 * compose them inside a $transaction.
 */

import { prisma } from "@/lib/prisma";
import type { PrismaClient, Prisma } from "@prisma/client";

// ── Role tier ordering ────────────────────────────────────────────

const ROLE_TIERS = { owner: 4, manager: 3, generalist: 2, viewer: 1 } as const;
export type CompanyRole = keyof typeof ROLE_TIERS;

function tierOf(role: string): number {
  return ROLE_TIERS[role as CompanyRole] ?? 0;
}

/** Returns true if `role` meets or exceeds `minRole`. */
export function meetsMinRole(role: string, minRole: CompanyRole): boolean {
  return tierOf(role) >= tierOf(minRole);
}

// ── Core types ────────────────────────────────────────────────────

export interface CompanyMembership {
  companyId: string;
  role: CompanyRole;
  title: string | null;
  company: {
    id: string;
    name: string;
    logo: string | null;
    logoShape: string | null;
    domain: string | null;
  };
}

// ── getUserCompanies ──────────────────────────────────────────────

/**
 * Returns every Company the user is a member of, ordered by name.
 * Each entry includes the user's role on that company.
 */
export async function getUserCompanies(
  userId: string,
  tx?: Prisma.TransactionClient,
): Promise<CompanyMembership[]> {
  const db = (tx ?? prisma) as PrismaClient;
  const rows = await db.companyMember.findMany({
    where: { userId },
    select: {
      companyId: true,
      role: true,
      title: true,
      company: {
        select: {
          id: true,
          name: true,
          logo: true,
          logoShape: true,
          domain: true,
        },
      },
    },
    orderBy: { company: { name: "asc" } },
  });
  return rows as CompanyMembership[];
}

// ── getActiveCompanyId ────────────────────────────────────────────

/**
 * Resolves the "current" company for a user:
 *   1. If `candidateCompanyId` is provided and the user is a member,
 *      return it (used when the UI passes ?companyId=… in the URL or
 *      the session carries it).
 *   2. If the user belongs to exactly one company, return that.
 *   3. Otherwise return the first company alphabetically.
 *   4. Returns null if the user has no memberships.
 */
export async function getActiveCompanyId(
  userId: string,
  candidateCompanyId?: string | null,
  tx?: Prisma.TransactionClient,
): Promise<string | null> {
  const memberships = await getUserCompanies(userId, tx);
  if (memberships.length === 0) return null;
  if (candidateCompanyId) {
    const match = memberships.find((m) => m.companyId === candidateCompanyId);
    if (match) return match.companyId;
  }
  return memberships[0].companyId;
}

// ── requireCompanyRole ────────────────────────────────────────────

export class CompanyAccessError extends Error {
  constructor(
    public readonly code: "NOT_MEMBER" | "INSUFFICIENT_ROLE" | "NOT_FOUND",
    message: string,
  ) {
    super(message);
    this.name = "CompanyAccessError";
  }
}

/**
 * Resolves the caller's role on a company and asserts it meets the
 * minimum tier required. Throws `CompanyAccessError` if the check
 * fails — callers in route handlers should catch this and return 403.
 *
 * Also returns the resolved role so callers can do further checks
 * (e.g. "is this user the owner?") without a second query.
 *
 * @example
 * const { role } = await requireCompanyRole(companyId, userId, "manager");
 * // throws if user isn't at least a manager
 */
export async function requireCompanyRole(
  companyId: string,
  userId: string,
  minRole: CompanyRole,
  tx?: Prisma.TransactionClient,
): Promise<{ role: CompanyRole; memberId: string }> {
  const db = (tx ?? prisma) as PrismaClient;
  const member = await db.companyMember.findUnique({
    where:  { companyId_userId: { companyId, userId } },
    select: { id: true, role: true },
  });

  if (!member) {
    throw new CompanyAccessError("NOT_MEMBER", "You are not a member of this company.");
  }
  if (!meetsMinRole(member.role, minRole)) {
    throw new CompanyAccessError(
      "INSUFFICIENT_ROLE",
      `This action requires at least the ${minRole} role.`,
    );
  }
  return { role: member.role as CompanyRole, memberId: member.id };
}

// ── assertPostingAccess ───────────────────────────────────────────

export interface PostingWithCompany {
  id: string;
  title: string;
  companyId: string | null;
  createdById: string | null;
}

/**
 * Loads a posting, verifies it belongs to the given company, and
 * asserts the caller's role meets the minimum tier. Returns the
 * posting on success, throws otherwise.
 */
export async function assertPostingAccess(
  postingId: string,
  companyId: string,
  userId: string,
  minRole: CompanyRole,
  tx?: Prisma.TransactionClient,
): Promise<PostingWithCompany> {
  const db = (tx ?? prisma) as PrismaClient;

  const posting = await db.internshipPosting.findUnique({
    where:  { id: postingId },
    select: { id: true, title: true, companyId: true, createdById: true },
  });

  if (!posting) {
    throw new CompanyAccessError("NOT_FOUND", "Posting not found.");
  }
  if (posting.companyId !== companyId) {
    throw new CompanyAccessError("NOT_MEMBER", "Posting does not belong to this company.");
  }

  await requireCompanyRole(companyId, userId, minRole, tx);
  return posting;
}

// ── Convenience: resolve companyId for an existing posting ───────

/**
 * Given a postingId, returns the companyId. Useful in route handlers
 * that receive a postingId but need the companyId for access checks.
 * Returns null if the posting doesn't exist or isn't company-tagged.
 */
export async function getCompanyIdForPosting(
  postingId: string,
  tx?: Prisma.TransactionClient,
): Promise<string | null> {
  const db = (tx ?? prisma) as PrismaClient;
  const row = await db.internshipPosting.findUnique({
    where:  { id: postingId },
    select: { companyId: true },
  });
  return row?.companyId ?? null;
}

// ── updateLastSeen ────────────────────────────────────────────────

/**
 * Stamps the member's `lastSeenAt` on any /employer/* page load.
 * Fire-and-forget — we never await this in a critical path.
 */
export function updateLastSeen(companyId: string, userId: string): void {
  prisma.companyMember
    .updateMany({
      where: { companyId, userId },
      data:  { lastSeenAt: new Date() },
    })
    .catch(() => {/* non-critical — swallow */});
}

// ── Domain-based auto-suggest ─────────────────────────────────────

const CONSUMER_DOMAINS = new Set([
  "gmail.com", "googlemail.com", "outlook.com", "hotmail.com",
  "live.com", "yahoo.com", "icloud.com", "me.com", "mac.com",
  "proton.me", "protonmail.com", "aol.com", "msn.com",
]);

/**
 * Given a user's email, returns any existing Company rows whose
 * domain matches the email domain (and the email domain isn't a
 * consumer provider). Used by the signup auto-suggest panel.
 */
export async function findCompaniesByDomain(
  email: string,
): Promise<Array<{ id: string; name: string; memberCount: number }>> {
  const parts = email.split("@");
  if (parts.length !== 2) return [];
  const domain = parts[1].toLowerCase();
  if (CONSUMER_DOMAINS.has(domain)) return [];

  const companies = await prisma.company.findMany({
    where: { domain },
    select: {
      id:      true,
      name:    true,
      _count:  { select: { members: true } },
    },
  });

  return companies.map((c) => ({
    id:          c.id,
    name:        c.name,
    memberCount: c._count.members,
  }));
}

// ── Title → role auto-detect ─────────────────────────────────────

/**
 * Suggests a CompanyRole from a job title. Used on invite + join-
 * request flows so the approver gets a sensible default.
 */
export function titleToSuggestedRole(title: string | null | undefined): CompanyRole {
  if (!title) return "generalist";
  const t = title.toLowerCase();
  if (/director|vp |vice.?president|head of|chief|coo|ceo|cto|chro/.test(t)) return "owner";
  if (/\bmanager\b|lead|senior recruiter|talent partner|hr business/.test(t))   return "manager";
  if (/recruiter|coordinator|generalist|specialist|advisor/.test(t))            return "generalist";
  if (/hiring manager|eng(ineering)? manager|product manager/.test(t))          return "manager";
  return "generalist";
}
