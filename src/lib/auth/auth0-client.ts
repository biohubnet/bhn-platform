/**
 * Auth0 client + configuration. Deliberately free of any Prisma import.
 *
 * proxy.ts imports this to mount Auth0's routes on every request, and
 * pulling the Prisma client into the proxy would load the query engine
 * on requests that never touch the database — including static asset
 * requests. The session lookup, which does need Prisma, lives next
 * door in auth0.ts.
 */
import { Auth0Client } from "@auth0/nextjs-auth0/server";

/**
 * Every var required before Auth0 can serve a login. Listed rather than
 * checked ad hoc so `missingAuth0Env()` can tell an operator exactly
 * which one is absent — a half-set tenant is the failure mode most
 * likely to happen at 5pm on a Friday.
 */
const REQUIRED_ENV = [
  "AUTH0_DOMAIN",
  "AUTH0_CLIENT_ID",
  "AUTH0_CLIENT_SECRET",
  "AUTH0_SECRET",
  "APP_BASE_URL",
] as const;

export function missingAuth0Env(): string[] {
  return REQUIRED_ENV.filter((k) => !process.env[k]);
}

/** True only when Auth0 is fully configured. Never partially true. */
export function isAuth0Enabled(): boolean {
  return missingAuth0Env().length === 0;
}

let cached: Auth0Client | null = null;

/**
 * The SDK client. Constructed lazily and cached: building it at module
 * scope would run at import time in every route that transitively
 * imports the auth seam, including during `next build`, where the
 * AUTH0_* vars may legitimately be absent.
 */
export function auth0Client(): Auth0Client {
  if (cached) return cached;
  const missing = missingAuth0Env();
  if (missing.length > 0) {
    throw new Error(
      `Auth0 is not configured — missing ${missing.join(", ")}. ` +
        `isAuth0Enabled() should have been checked before calling this.`,
    );
  }
  cached = new Auth0Client({
    domain: process.env.AUTH0_DOMAIN,
    clientId: process.env.AUTH0_CLIENT_ID,
    clientSecret: process.env.AUTH0_CLIENT_SECRET,
    secret: process.env.AUTH0_SECRET,
    appBaseUrl: process.env.APP_BASE_URL,
    authorizationParameters: {
      scope: "openid profile email",
      // Only sent when set. Without an audience Auth0 issues an opaque
      // access token and RBAC permissions never appear in it, so the
      // permissions half of "roles and permissions" needs this.
      audience: process.env.AUTH0_AUDIENCE,
    },
  });
  return cached;
}
