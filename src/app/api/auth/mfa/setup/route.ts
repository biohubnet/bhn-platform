/**
 * POST /api/auth/mfa/setup — start MFA enrolment for the calling user.
 *
 * Generates a fresh TOTP secret, persists it on User.totpSecret
 * (still pending — totpEnabledAt is null until verify-setup
 * succeeds), and returns the otpauth URI + an inline SVG QR for
 * the enrolment UI to render.
 *
 * Idempotent on the secret column: hitting setup twice generates a
 * NEW secret each time (so an abandoned enrolment doesn't leave a
 * leaked one usable). The previous QR/secret is invalidated.
 */
import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateTotpSecret, totpAuthUri, totpQrSvg } from "@/lib/security/mfa";

export async function POST() {
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const userId = (session.user as { id?: string }).id!;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, totpEnabledAt: true },
  });
  if (!user) return NextResponse.json({ error: "User not found." }, { status: 404 });
  if (user.totpEnabledAt) {
    return NextResponse.json(
      { error: "MFA is already enabled. Disable first to re-enrol." },
      { status: 409 },
    );
  }

  const secret = generateTotpSecret();
  await prisma.user.update({
    where: { id: userId },
    data: { totpSecret: secret },
  });

  const uri = totpAuthUri({ email: user.email, secret });
  const qrSvg = totpQrSvg(uri);
  return NextResponse.json({ secret, uri, qrSvg });
}
