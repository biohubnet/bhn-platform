/**
 * POST /api/auth/mfa/disable  { password }
 *
 * Turn MFA off — requires re-entering the user's password as a
 * defence-in-depth gate against a session-token-only attacker
 * stripping the second factor.
 *
 * Audit-logged. Also clears totpSecret so re-enabling generates a
 * fresh secret rather than reusing one the user might have shared
 * with a now-compromised authenticator.
 */
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const userId = (session.user as { id?: string }).id!;

  const body = (await req.json().catch(() => ({}))) as { password?: string };
  if (!body.password) return NextResponse.json({ error: "password is required" }, { status: 400 });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, password: true, totpEnabledAt: true },
  });
  if (!user) return NextResponse.json({ error: "User not found." }, { status: 404 });
  if (!user.totpEnabledAt) {
    return NextResponse.json({ error: "MFA already disabled." }, { status: 409 });
  }
  if (!user.password) {
    return NextResponse.json({ error: "Account has no password set." }, { status: 400 });
  }
  const ok = await bcrypt.compare(body.password, user.password);
  if (!ok) return NextResponse.json({ error: "Wrong password." }, { status: 401 });

  await prisma.user.update({
    where: { id: userId },
    data: { totpSecret: null, totpEnabledAt: null },
  });
  await prisma.auditLog.create({
    data: {
      actorId: userId,
      action: "mfa.disable",
      targetType: "user",
      targetId: userId,
    },
  }).catch(() => undefined);

  return NextResponse.json({ ok: true });
}
