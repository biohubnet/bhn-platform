/**
 * Magic-link employer-invite handler.
 *
 *   GET /signup/employer/[token]
 *
 * One click. No claim form, no password to set up front, no
 * credentials to copy. Same pattern as the demo magic-link route.
 *
 * Flow:
 *   1. Validate the invite (exists, not expired).
 *   2. Find existing User by invite.email — sign them in if they're
 *      already an employer/admin/superadmin (for repeat clicks).
 *      Refuse if the email belongs to a trainee/instructor (the link
 *      shouldn't quietly elevate them).
 *   3. If no user exists, create one with role=employer, no password.
 *      They can set a password later from /profile if they want
 *      cross-device sign-in via /login.
 *   4. Mint a NextAuth JWT scoped to invite expiry, set cookie,
 *      redirect to /employer.
 *
 * The token works as a reusable bookmark until expiry — admins can
 * "Test" the flow by clicking the same URL repeatedly.
 */
import { NextRequest, NextResponse } from "next/server";
import { encode } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const origin = req.nextUrl.origin;

  const invite = await prisma.employerInvite.findUnique({ where: { token } });
  if (!invite) {
    return NextResponse.redirect(`${origin}/signup/employer/error?reason=invalid`);
  }
  // Demo invites use a separate flow.
  if (invite.demoMode) {
    return NextResponse.redirect(`${origin}/employer/demo/${token}`);
  }
  if (invite.expiresAt < new Date()) {
    return NextResponse.redirect(`${origin}/signup/employer/error?reason=expired`);
  }

  // Find or create the employer user.
  let user = await prisma.user.findUnique({ where: { email: invite.email } });
  if (user && !["employer", "admin", "superadmin"].includes(user.role)) {
    return NextResponse.redirect(`${origin}/signup/employer/error?reason=conflict`);
  }
  if (!user) {
    user = await prisma.user.create({
      data: {
        email: invite.email,
        name: null,
        password: null, // can set later from /profile for /login access
        role: "employer",
        employerCompany: invite.companyName,
        companyWebsite: invite.companyWebsite,
        allowPlatformContent: false,
        emailVerified: new Date(),
        isActive: true,
      },
    });
  }

  // Stamp the invite as used on first claim, but don't block re-use.
  if (!invite.usedAt) {
    await prisma.employerInvite.update({
      where: { id: invite.id },
      data: { usedAt: new Date(), usedById: user.id },
    });
  }

  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    return NextResponse.redirect(`${origin}/signup/employer/error?reason=invalid`);
  }

  const sessionToken = await encode({
    token: {
      sub:   user.id,
      id:    user.id,
      email: user.email,
      name:  user.name,
      role:  user.role,
      iat:   Math.floor(Date.now() / 1000),
      // Cap session at invite expiry; users with a password can still
      // sign in via /login afterwards if they set one.
      exp:   Math.floor(invite.expiresAt.getTime() / 1000),
    },
    secret,
  });

  const isProd = process.env.NODE_ENV === "production";
  const cookieName = isProd ? "__Secure-next-auth.session-token" : "next-auth.session-token";

  const res = NextResponse.redirect(`${origin}/employer`);
  res.cookies.set({
    name: cookieName,
    value: sessionToken,
    httpOnly: true,
    sameSite: "lax",
    secure: isProd,
    path: "/",
    expires: invite.expiresAt,
  });
  return res;
}
