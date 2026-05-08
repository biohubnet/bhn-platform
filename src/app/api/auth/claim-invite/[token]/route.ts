/**
 * Legacy claim-invite metadata endpoint. The full claim flow (POST
 * with name + password) was retired when employer invites became
 * magic links — the link itself is now the credential. This GET is
 * retained for any callers still introspecting an invite.
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const invite = await prisma.employerInvite.findUnique({
    where: { token },
    select: {
      email: true, companyName: true, companyWebsite: true,
      usedAt: true, expiresAt: true,
    },
  });
  if (!invite) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({
    email: invite.email,
    companyName: invite.companyName,
    companyWebsite: invite.companyWebsite,
    used: !!invite.usedAt,
    expired: invite.expiresAt < new Date(),
  });
}
