/**
 * One-click magic-link sign-in for sandbox + demo + showcase accounts.
 *
 *   GET /sandbox/[token]
 *
 * Looks up a User by `magicToken`. If the user exists AND their
 * accountKind is one of "sandbox" / "demo" / "showcase", we mint a
 * NextAuth JWT and redirect to the appropriate dashboard. Real
 * accounts (accountKind = "real") are *never* honoured here — even
 * if a token were somehow set on a real user, the route would refuse,
 * so a leaked sandbox/showcase token can't escalate to a real-user
 * takeover.
 *
 * The cookie scope is browser-wide; visitors should open the link
 * in an incognito window if they want to keep their main admin
 * session active alongside.
 */
import { NextRequest, NextResponse } from "next/server";
import { encode } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const origin = req.nextUrl.origin;

  if (!token || token.length < 12) {
    return NextResponse.redirect(`${origin}/login?error=sandbox_invalid`);
  }

  const user = await prisma.user.findUnique({
    where: { magicToken: token },
    select: { id: true, email: true, name: true, role: true, accountKind: true, demoExpiresAt: true, isActive: true },
  });
  if (!user) {
    return NextResponse.redirect(`${origin}/login?error=sandbox_invalid`);
  }
  if (!user.isActive) {
    return NextResponse.redirect(`${origin}/login?error=sandbox_disabled`);
  }
  if (
    user.accountKind !== "sandbox" &&
    user.accountKind !== "demo" &&
    user.accountKind !== "showcase"
  ) {
    // Defence in depth — should never happen since real accounts
    // never have magicToken set, but if they do, refuse anyway.
    return NextResponse.redirect(`${origin}/login?error=sandbox_invalid`);
  }
  if (user.accountKind === "demo" && user.demoExpiresAt && user.demoExpiresAt < new Date()) {
    return NextResponse.redirect(`${origin}/login?error=demo_expired`);
  }

  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    return NextResponse.redirect(`${origin}/login?error=server`);
  }

  // Cap the session at the demo expiry for demo accounts; sandboxes
  // get a 7-day session (refreshed on each magic-link click).
  const exp = user.accountKind === "demo" && user.demoExpiresAt
    ? Math.floor(user.demoExpiresAt.getTime() / 1000)
    : Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60;

  const sessionToken = await encode({
    token: {
      sub:   user.id,
      id:    user.id,
      email: user.email,
      name:  user.name,
      role:  user.role,
      iat:   Math.floor(Date.now() / 1000),
      exp,
    },
    secret,
  });

  const isProd = process.env.NODE_ENV === "production";
  const cookieName = isProd ? "__Secure-next-auth.session-token" : "next-auth.session-token";

  const dest = user.role === "employer" ? "/employer" : "/dashboard";
  const res = NextResponse.redirect(`${origin}${dest}`);
  res.cookies.set({
    name: cookieName,
    value: sessionToken,
    httpOnly: true,
    sameSite: "lax",
    secure: isProd,
    path: "/",
    expires: new Date(exp * 1000),
  });
  return res;
}
