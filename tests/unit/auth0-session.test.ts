/**
 * Auth0 session mapping and access control.
 *
 * These exist because the Auth0 path cannot be exercised end-to-end
 * until a tenant exists, and the rules they cover are the ones you
 * least want to discover are wrong during a cutover: who gets in, who
 * is refused, and which role a session ends up carrying.
 *
 * Everything here is pure — no tenant, no database, no network. That
 * is the point of `auth0AccessDecision` being split out from the IO in
 * `auth0Session()`.
 */
import { expect, test } from "@playwright/test";
import type { SessionData, User as Auth0User } from "@auth0/nextjs-auth0/types";
import {
  auth0AccessDecision,
  claimArray,
  toAppSession,
} from "../../src/lib/auth/auth0";
import { missingAuth0Env } from "../../src/lib/auth/auth0-client";

const NS = "https://biohubnet.ca";

function auth0User(over: Partial<Auth0User> = {}): Auth0User {
  return { sub: "auth0|abc123", email: "person@biohubnet.ca", ...over };
}

function sessionData(user: Auth0User, over: Record<string, unknown> = {}): SessionData {
  return {
    user,
    tokenSet: { accessToken: "at", idToken: "it", expiresAt: 0 },
    internal: { sid: "sid-1", createdAt: 0, ...over },
  } as SessionData;
}

const dbUser = {
  id: "usr_1",
  email: "person@biohubnet.ca",
  name: "A Person",
  image: null,
  role: "trainee",
};

// ── Access control ────────────────────────────────────────────────

test("a verified user with a local account is allowed without provisioning", () => {
  expect(auth0AccessDecision(auth0User(), true, false)).toEqual({
    allow: true,
    provision: false,
  });
});

test("an unverified email is refused even when a local account exists", () => {
  // The dangerous case: identity and role both key off the address, so
  // an unverified one would let whoever claimed it inherit the account.
  expect(
    auth0AccessDecision(auth0User({ email_verified: false }), true, false),
  ).toEqual({ allow: false, reason: "unverified-email" });
});

test("email_verified absent is treated as acceptable, only an explicit false refuses", () => {
  // Some connections (enterprise SSO) omit the claim entirely. Refusing
  // on absence would lock out every such tenant on day one.
  const user = auth0User();
  expect(user.email_verified).toBeUndefined();
  expect(auth0AccessDecision(user, true, false)).toEqual({
    allow: true,
    provision: false,
  });
});

test("a token with no email is refused", () => {
  expect(auth0AccessDecision(auth0User({ email: undefined }), true, false)).toEqual({
    allow: false,
    reason: "no-email",
  });
});

test("no local account is refused unless JIT provisioning is explicitly on", () => {
  expect(auth0AccessDecision(auth0User(), false, false)).toEqual({
    allow: false,
    reason: "no-local-account",
  });
  expect(auth0AccessDecision(auth0User(), false, true)).toEqual({
    allow: true,
    provision: true,
  });
});

test("an unverified email is refused before JIT provisioning can create a row", () => {
  // Ordering matters: if JIT ran first, an unverified address could
  // mint itself a brand-new account.
  expect(
    auth0AccessDecision(auth0User({ email_verified: false }), false, true),
  ).toEqual({ allow: false, reason: "unverified-email" });
});

// ── Role and permission mapping ───────────────────────────────────

test("an Auth0 role claim overrides the database role", () => {
  const session = toAppSession(
    dbUser,
    sessionData(auth0User({ [`${NS}/roles`]: ["admin"] })),
  );
  expect(session.user.role).toBe("admin");
});

test("the database role is used when Auth0 sends no role claim", () => {
  // The mid-migration case: Auth0 is live but the Action is not
  // deployed yet. Falling back keeps the platform usable instead of
  // demoting everyone to a default role.
  const session = toAppSession(dbUser, sessionData(auth0User()));
  expect(session.user.role).toBe("trainee");
});

test("only the first role is taken when Auth0 sends several", () => {
  const session = toAppSession(
    dbUser,
    sessionData(auth0User({ [`${NS}/roles`]: ["superadmin", "trainee"] })),
  );
  expect(session.user.role).toBe("superadmin");
});

test("permissions come through as an array and default to empty", () => {
  const withPerms = toAppSession(
    dbUser,
    sessionData(auth0User({ [`${NS}/permissions`]: ["read:courses", "write:courses"] })),
  );
  expect(withPerms.user.permissions).toEqual(["read:courses", "write:courses"]);
  expect(toAppSession(dbUser, sessionData(auth0User())).user.permissions).toEqual([]);
});

test("the session keeps the database id, not the Auth0 sub", () => {
  // Every foreign key in the schema points at User.id. Leaking the
  // Auth0 sub into session.user.id would break all of them.
  const session = toAppSession(dbUser, sessionData(auth0User()));
  expect(session.user.id).toBe("usr_1");
  expect(session.user.id).not.toBe("auth0|abc123");
});

test("the session shape matches what the platform already consumes", () => {
  const session = toAppSession(dbUser, sessionData(auth0User()));
  expect(Object.keys(session).sort()).toEqual(["expires", "user"]);
  expect(typeof session.expires).toBe("string");
  expect(Number.isNaN(Date.parse(session.expires))).toBe(false);
});

// ── Claim parsing ─────────────────────────────────────────────────

test("malformed claims degrade to empty rather than throwing", () => {
  // Claims are attacker-adjacent input — an Auth0 Action is editable in
  // a dashboard. A non-array, or an array with non-strings in it, must
  // not reach ROLE_RANK as a truthy value.
  expect(claimArray(auth0User({ [`${NS}/roles`]: "admin" }), `${NS}/roles`)).toEqual([]);
  expect(claimArray(auth0User(), `${NS}/roles`)).toEqual([]);
  expect(
    claimArray(auth0User({ [`${NS}/roles`]: ["admin", 42, null] }), `${NS}/roles`),
  ).toEqual(["admin"]);
});

test("a role claim that is not a string cannot become the session role", () => {
  const session = toAppSession(
    dbUser,
    sessionData(auth0User({ [`${NS}/roles`]: [{ name: "admin" }] })),
  );
  expect(session.user.role).toBe("trainee");
});

// ── Enablement ────────────────────────────────────────────────────

test("every required Auth0 variable is reported when none are set", () => {
  // Guards the failure mode this is designed around: a half-configured
  // tenant must never be half-enabled.
  const saved: Record<string, string | undefined> = {};
  const keys = [
    "AUTH0_DOMAIN",
    "AUTH0_CLIENT_ID",
    "AUTH0_CLIENT_SECRET",
    "AUTH0_SECRET",
    "APP_BASE_URL",
  ];
  for (const k of keys) {
    saved[k] = process.env[k];
    delete process.env[k];
  }
  try {
    expect(missingAuth0Env().sort()).toEqual([...keys].sort());
    process.env.AUTH0_DOMAIN = "tenant.us.auth0.com";
    expect(missingAuth0Env()).not.toContain("AUTH0_DOMAIN");
    expect(missingAuth0Env().length).toBe(4);
  } finally {
    for (const k of keys) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
  }
});
