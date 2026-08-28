/**
 * Auth0 Universal Login — provider implementation behind the existing
 * auth seam.
 *
 * Why it plugs in here rather than replacing lib/auth.ts outright
 * ──────────────────────────────────────────────────────────────
 * 519 files import `@/lib/auth`; only 19 touch `next-auth` directly.
 * The consumer surface is `getSession()` / `requireSession()` /
 * `requireRole()` and the shape `session.user.{id,email,name,role}`.
 * So swapping the identity provider is a change to who ANSWERS those
 * calls, not a change to the 519 callers. This module answers them
 * from Auth0; lib/auth.ts picks which implementation is live.
 *
 * Activation is by environment, not by code
 * ─────────────────────────────────────────
 * `isAuth0Enabled()` is false until every required AUTH0_* var is set,
 * and the platform keeps using the existing credentials provider until
 * then. That matters because this is a live deployment: a half-
 * configured tenant must not be able to lock users out. Cutover is a
 * Vercel env change plus a redeploy, and rollback is the same change
 * in reverse — no code deploy either way.
 *
 * What still has to happen outside this repo (see docs/auth0-migration.md):
 *   • create the tenant + application, set the callback/logout URLs
 *   • enable RBAC and add the roles/permissions claim via an Action
 *   • import existing users (their bcrypt hashes are importable, so
 *     people keep their current passwords)
 * None of that can be done from here — it needs tenant credentials.
 */
import type { SessionData, User as Auth0User } from "@auth0/nextjs-auth0/types";
import { auth0Client, isAuth0Enabled, missingAuth0Env } from "./auth0-client";
import { prisma } from "../prisma";

// Re-exported so callers have one import site for "the Auth0 layer"
// even though the config half has to stay Prisma-free for the proxy.
export { auth0Client, isAuth0Enabled, missingAuth0Env };

const CLAIM_NAMESPACE =
  process.env.AUTH0_CLAIM_NAMESPACE ?? "https://biohubnet.ca";
const ROLES_CLAIM = `${CLAIM_NAMESPACE}/roles`;
const PERMISSIONS_CLAIM = `${CLAIM_NAMESPACE}/permissions`;

/** Reads a namespaced string-array claim without widening to `any`. */
function claimArray(user: Auth0User, claim: string): string[] {
  const raw: unknown = user[claim];
  if (!Array.isArray(raw)) return [];
  return raw.filter((v): v is string => typeof v === "string");
}

/**
 * The session shape the rest of the platform already consumes. Kept
 * structurally identical to what NextAuth returned so no caller can
 * tell which provider answered.
 */
export interface AppSessionUser {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  role: string;
  /** Auth0 RBAC permissions, when an API audience is configured. */
  permissions: string[];
}

export interface AppSession {
  user: AppSessionUser;
  expires: string;
}

/**
 * Resolve an Auth0 login to a platform session.
 *
 * Identity is matched on verified email. The platform has always keyed
 * users by email and every existing row has one, so this links current
 * accounts on first login with no schema change and no backfill.
 *
 * Role precedence is Auth0 first, database second. The spec puts roles
 * in Auth0, so a role claim is authoritative when present; the database
 * role is the fallback for tenants where the Action is not deployed
 * yet, which keeps the platform usable mid-migration instead of
 * demoting everyone to the default role the moment Auth0 goes live.
 */
export async function auth0Session(): Promise<AppSession | null> {
  if (!isAuth0Enabled()) return null;

  const session: SessionData | null = await auth0Client().getSession();
  if (!session?.user?.email) return null;

  // Unverified emails are refused outright: role and identity both hang
  // off this address, so accepting an unverified one would let anyone
  // who can sign up with a claimed address inherit that account.
  if (session.user.email_verified === false) return null;

  const email = session.user.email.toLowerCase();
  const dbUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, name: true, image: true, role: true },
  });

  if (!dbUser) {
    // No local row. Deliberately NOT auto-provisioned by default: this
    // platform grants real capability by role, and silently creating an
    // account for anyone who can authenticate to the tenant is a
    // different security posture than the one it has today. Opt in
    // explicitly once the tenant's connections are locked down.
    if (process.env.AUTH0_JIT_PROVISION !== "true") return null;
    const created = await prisma.user.create({
      data: {
        email,
        name: session.user.name ?? null,
        image: session.user.picture ?? null,
        role: process.env.AUTH0_JIT_DEFAULT_ROLE ?? "trainee",
      },
      select: { id: true, email: true, name: true, image: true, role: true },
    });
    return toAppSession(created, session);
  }

  return toAppSession(dbUser, session);
}

function toAppSession(
  dbUser: {
    id: string;
    email: string | null;
    name: string | null;
    image: string | null;
    role: string;
  },
  session: SessionData,
): AppSession {
  const roles = claimArray(session.user, ROLES_CLAIM);
  const permissions = claimArray(session.user, PERMISSIONS_CLAIM);

  return {
    user: {
      id: dbUser.id,
      email: dbUser.email ?? "",
      name: dbUser.name,
      image: dbUser.image,
      role: roles[0] ?? dbUser.role,
      permissions,
    },
    // Mirrors NextAuth's ISO-string `expires`. Auth0 tracks its own
    // expiry on the session cookie; this is for callers that read it.
    expires: new Date(
      (session.internal.sessionExpiresAt ??
        Math.floor(Date.now() / 1000) + 60 * 60 * 24) * 1000,
    ).toISOString(),
  };
}
