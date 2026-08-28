/**
 * Request proxy (Next 16's rename of `middleware`).
 *
 * Exists for one reason: the Auth0 SDK mounts its own routes —
 * /auth/login, /auth/logout, /auth/callback, /auth/profile,
 * /auth/access-token — from middleware rather than from route files.
 * Without this the Universal Login redirect has nothing to come back
 * to, so the callback 404s and login silently fails.
 *
 * When Auth0 is not configured this is a pass-through. That is the
 * default state of the repo today: the credentials provider owns login
 * and nothing here should touch the request. Keeping the check first
 * means the proxy costs one env lookup per request until cutover.
 *
 * Imports auth0-client, NOT auth0 — the latter pulls in Prisma, which
 * has no business loading on a request the proxy is only passing
 * through.
 */
import { NextResponse, type NextRequest } from "next/server";
import { auth0Client, isAuth0Enabled } from "@/lib/auth/auth0-client";

/** Pages that render the credentials form Auth0 replaces. */
const CREDENTIALS_PAGES = new Set(["/login", "/register"]);

export async function proxy(request: NextRequest) {
  if (!isAuth0Enabled()) return NextResponse.next();

  // Send the credentials pages to Universal Login. Done here rather
  // than inside the page components deliberately: those are client
  // components, so a redirect from them renders the email/password
  // form first and replaces it a tick later — a visible flash of a
  // login form that no longer works. The proxy decides before any
  // React runs.
  //
  // NextAuth spells the post-login destination `callbackUrl`; Auth0
  // spells it `returnTo` and sanitises it against the app base URL, so
  // it is translated rather than passed through.
  const { pathname, searchParams } = request.nextUrl;
  if (CREDENTIALS_PAGES.has(pathname)) {
    const target = new URL("/auth/login", request.url);
    const callbackUrl = searchParams.get("callbackUrl");
    if (callbackUrl) target.searchParams.set("returnTo", callbackUrl);
    return NextResponse.redirect(target);
  }

  return auth0Client().middleware(request);
}

export const config = {
  /**
   * Everything except Next's own build output, the favicon, and files
   * with an extension (images, fonts, the SCORM asset paths). Auth0's
   * middleware needs to see /auth/* and every page that may carry a
   * session cookie to refresh, so the matcher is deliberately broad —
   * but static assets never need it and would only add latency.
   */
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
