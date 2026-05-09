/**
 * POST /api/auth/mfa/check  { email }
 *
 * Pre-login probe: does this account have MFA enabled? Drives the
 * login UI's two-step disclosure (password first; if MFA, expand
 * to ask for the TOTP code).
 *
 * Always returns 200 with a minimal payload regardless of whether
 * the email exists, so this endpoint can't be used to enumerate
 * registered emails. The response is `{ mfaRequired: boolean }`
 * — `false` if the account doesn't exist OR doesn't have MFA, both
 * conflate intentionally.
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as { email?: string };
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!email) return NextResponse.json({ mfaRequired: false });

  const user = await prisma.user.findUnique({
    where: { email },
    select: { totpEnabledAt: true },
  });
  return NextResponse.json({ mfaRequired: !!user?.totpEnabledAt });
}
