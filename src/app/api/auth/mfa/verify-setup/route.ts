/**
 * POST /api/auth/mfa/verify-setup  { code }
 *
 * Confirm the user's authenticator-app pairing by submitting a
 * 6-digit TOTP code. On success, set User.totpEnabledAt = now()
 * (the gate the login flow checks). Writes an audit-log row so
 * SOC 2 + Part 11 can prove who turned on MFA when.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { verifyTotp } from "@/lib/security/mfa";

export async function POST(req: NextRequest) {
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const userId = (session.user as { id?: string }).id!;

  const body = (await req.json().catch(() => ({}))) as { code?: string };
  if (!body.code) return NextResponse.json({ error: "code is required" }, { status: 400 });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, totpSecret: true, totpEnabledAt: true },
  });
  if (!user?.totpSecret) {
    return NextResponse.json({ error: "Run /setup first." }, { status: 400 });
  }
  if (user.totpEnabledAt) {
    return NextResponse.json({ error: "MFA already enabled." }, { status: 409 });
  }
  if (!verifyTotp(user.totpSecret, body.code)) {
    return NextResponse.json({ error: "Code didn't match. Check your authenticator clock." }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: userId },
    data: { totpEnabledAt: new Date() },
  });
  await prisma.auditLog.create({
    data: {
      actorId: userId,
      action: "mfa.enable",
      targetType: "user",
      targetId: userId,
    },
  }).catch(() => undefined);

  return NextResponse.json({ ok: true, enabledAt: new Date().toISOString() });
}
