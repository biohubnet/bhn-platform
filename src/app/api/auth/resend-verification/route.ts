/**
 * POST /api/auth/resend-verification  { email: string }
 *
 * Re-issue a verification email for an unverified account. Always
 * returns 200 with a generic message regardless of whether the email
 * exists, so this can't be used to enumerate registered emails.
 *
 * Lightly rate-limited by relying on the upstream mailer's quota —
 * if you spam this endpoint, your SMTP provider will throttle before
 * the database does.
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { issueAndSendEmailVerification } from "@/lib/security/email-verify";

export async function POST(req: NextRequest) {
  const { email } = await req.json().catch(() => ({}));
  const cleanEmail = typeof email === "string" ? email.trim().toLowerCase() : "";

  // Generic "if this email exists, we sent it" response so the endpoint
  // can't be used to confirm whether an email is registered.
  const generic = NextResponse.json({
    ok: true,
    message: "If that email matches an unverified account, we've sent a fresh link.",
  });

  if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    return generic;
  }
  const user = await prisma.user.findUnique({
    where: { email: cleanEmail },
    select: { id: true, email: true, name: true, emailVerified: true },
  });
  if (!user) return generic;
  // Don't re-send if already verified — saves email quota and prevents
  // a "wait, why do I keep getting these?" experience.
  if (user.emailVerified) return generic;

  await issueAndSendEmailVerification({
    userId: user.id,
    email: user.email,
    name: user.name,
  });
  return generic;
}
