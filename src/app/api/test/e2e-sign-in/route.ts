/**
 * Gated E2E auth-bypass — mint a NextAuth-compatible session cookie
 * for a given user without going through the email-code + MFA UI.
 *
 *   POST /api/test/e2e-sign-in
 *     headers: { "x-e2e-secret": process.env.E2E_AUTH_SECRET }
 *     body:    { email: string }
 *
 * Why this exists
 * ───────────────
 * Playwright specs need a deterministic "I am logged in as <role>"
 * primitive. The real login path requires an email-code we can't
 * read from a mailbox the test runner controls. Rather than rebuild
 * authentication for tests, we mint the same JWT the real
 * NextAuth callback would mint after a successful sign-in and set
 * the same cookie name NextAuth checks for.
 *
 * Gating (three doors must all open)
 * ──────────────────────────────────
 *   1. `E2E_AUTH_SECRET` env var must be set. Absence of the env var
 *      itself means this route 404s effectively (route present but
 *      every call returns 403).
 *   2. Incoming `x-e2e-secret` header must match the env var
 *      verbatim. We use `timingSafeEqual` so an attacker can't
 *      narrow the secret with response-time analysis.
 *   3. We refuse to run on production deployments. `VERCEL_ENV`
 *      is `"production"` only on the main branch alias — preview
 *      builds get `"preview"`. Local dev where VERCEL_ENV is
 *      undefined is also allowed.
 *
 * The triple gate means: lose the secret to a leak and a Vercel
 * preview is fair game (which is what E2E is for); production main
 * is still safe even if the secret leaks, because the env check
 * blocks all calls. Rotate the secret quarterly anyway.
 *
 * What it mints
 * ─────────────
 * A NextAuth JWE matching what the real `jwt({ user })` callback
 * would issue for that user: `id`, `role`, `email`, `name`. The
 * session-cookie name follows NextAuth's host-prefix convention —
 * `__Secure-next-auth.session-token` over HTTPS,
 * `next-auth.session-token` over HTTP (local dev).
 */
import { NextRequest, NextResponse } from "next/server";
import { encode } from "next-auth/jwt";
import { timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const SESSION_MAX_AGE = 30 * 24 * 60 * 60; // 30 days — matches auth.ts LONG_SESSION

function constantTimeEquals(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

export async function POST(req: NextRequest) {
  // Gate 1: secret must be configured.
  const expected = process.env.E2E_AUTH_SECRET;
  if (!expected) {
    return NextResponse.json(
      { error: "E2E sign-in is not enabled on this deployment." },
      { status: 403 },
    );
  }

  // Gate 2: header must match.
  const provided = req.headers.get("x-e2e-secret") ?? "";
  if (!constantTimeEquals(provided, expected)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Gate 3: refuse on production deployments. `VERCEL_ENV` is
  // "production" only when the deploy is aliased to a production
  // domain — preview branches get "preview", and locally it's
  // unset entirely (we allow local for `npm run test:e2e:local`).
  if (process.env.VERCEL_ENV === "production") {
    return NextResponse.json(
      { error: "E2E sign-in is disabled on production." },
      { status: 403 },
    );
  }

  const nextAuthSecret = process.env.NEXTAUTH_SECRET;
  if (!nextAuthSecret) {
    return NextResponse.json(
      { error: "NEXTAUTH_SECRET is not configured." },
      { status: 500 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const email = typeof (body as { email?: unknown })?.email === "string"
    ? ((body as { email: string }).email).trim().toLowerCase()
    : "";
  if (!email) {
    return NextResponse.json({ error: "email required" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, name: true, role: true, isActive: true },
  });
  if (!user || !user.isActive) {
    return NextResponse.json(
      { error: "No active user with that email." },
      { status: 404 },
    );
  }

  // Mint the JWT exactly as the real flow would have. The fields
  // mirror what `jwt({ user })` in src/lib/auth.ts puts on the
  // token after a credentials sign-in.
  const token = await encode({
    token: {
      id: user.id,
      email: user.email,
      name: user.name ?? null,
      role: user.role,
      shortSession: false,
    },
    secret: nextAuthSecret,
    maxAge: SESSION_MAX_AGE,
  });

  // NextAuth uses host-prefixed cookies over HTTPS so a non-secure
  // page can't overwrite the session cookie. Vercel preview deploys
  // are HTTPS; local dev is HTTP.
  const isSecure = (req.headers.get("x-forwarded-proto") ?? "")
    .toLowerCase()
    .includes("https") || req.nextUrl.protocol === "https:";
  const cookieName = isSecure
    ? "__Secure-next-auth.session-token"
    : "next-auth.session-token";

  const res = NextResponse.json({
    ok: true,
    cookieName,
    user: { id: user.id, email: user.email, role: user.role },
  });
  res.cookies.set(cookieName, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: isSecure,
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  return res;
}
