/**
 * Magic-link demo route handler.
 *
 *   GET /employer/demo/[token]
 *
 * Implemented as a Route Handler (not a page) because Next.js 16
 * server components cannot set cookies — only Route Handlers, Server
 * Actions, and Middleware can. The URL remains the same as before;
 * visitors don't notice the difference.
 *
 * Flow:
 *   1. Validate the demo invite (exists, demoMode=true, not expired).
 *   2. Look up the already-claimed demo employer (return visit) OR
 *      spawn a fresh populated workspace (first visit).
 *   3. Mint a NextAuth JWT scoped to the invite's expiry, set the
 *      session cookie, redirect to /employer.
 *
 * Bad / expired links redirect to /employer/demo/error?reason=...
 * which renders a friendly explainer.
 */
import { NextRequest, NextResponse } from "next/server";
import { encode } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";
import { spawnDemoWorkspace } from "@/lib/demo/workspace";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const origin = req.nextUrl.origin;

  const invite = await prisma.employerInvite.findUnique({ where: { token } });
  if (!invite || !invite.demoMode) {
    return NextResponse.redirect(`${origin}/employer/demo/error?reason=invalid`);
  }
  if (invite.expiresAt < new Date()) {
    return NextResponse.redirect(`${origin}/employer/demo/error?reason=expired`);
  }

  // Reuse the already-claimed employer for return visits — the link
  // works as a bookmark until expiry.
  let employerId: string | null = invite.usedById;
  if (employerId) {
    const exists = await prisma.user.findUnique({
      where: { id: employerId },
      select: { id: true, accountKind: true },
    });
    if (!exists || exists.accountKind !== "demo") employerId = null;
  }

  if (!employerId) {
    const result = await spawnDemoWorkspace({
      email: invite.email,
      companyName: invite.companyName ?? "Demo Workspace",
      visitorName: null,
      websiteUrl: invite.companyWebsite ?? null,
      expiresAt: invite.expiresAt,
      mintedByAdminId: invite.invitedById ?? "system",
    });
    employerId = result.employerId;
    await prisma.employerInvite.update({
      where: { id: invite.id },
      data: { usedAt: new Date(), usedById: result.employerId },
    });
  }

  const employer = await prisma.user.findUnique({
    where: { id: employerId },
    select: { id: true, email: true, name: true, role: true },
  });
  if (!employer) {
    return NextResponse.redirect(`${origin}/employer/demo/error?reason=invalid`);
  }

  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    return NextResponse.redirect(`${origin}/employer/demo/error?reason=invalid`);
  }

  const sessionToken = await encode({
    token: {
      sub:   employer.id,
      id:    employer.id,
      email: employer.email,
      name:  employer.name,
      role:  employer.role,
      iat:   Math.floor(Date.now() / 1000),
      exp:   Math.floor(invite.expiresAt.getTime() / 1000),
    },
    secret,
  });

  const isProd = process.env.NODE_ENV === "production";
  const cookieName = isProd ? "__Secure-next-auth.session-token" : "next-auth.session-token";

  // Redirect to /employer with the session cookie attached.
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
