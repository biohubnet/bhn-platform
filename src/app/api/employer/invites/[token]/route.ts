/**
 * GET /api/employer/invites/[token]
 *   Public — no auth required. Returns the invite preview data so
 *   the accept page can render before the user signs in.
 *
 *   Returns: { company: { name }, inviterName, role, note, expiresAt }
 *   404 if token doesn't exist or is expired/revoked.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  const invite = await prisma.companyInvite.findUnique({
    where:  { token },
    select: {
      status:    true,
      expiresAt: true,
      role:      true,
      note:      true,
      email:     true,
      company:   { select: { id: true, name: true, logo: true, logoShape: true } },
      invitedBy: { select: { name: true } },
    },
  });

  if (!invite) return NextResponse.json({ error: "Invite not found" }, { status: 404 });
  if (invite.status !== "pending") {
    return NextResponse.json({ error: "This invite has already been used or revoked" }, { status: 410 });
  }
  if (invite.expiresAt < new Date()) {
    return NextResponse.json({ error: "This invite link has expired" }, { status: 410 });
  }

  return NextResponse.json({
    company:     invite.company,
    inviterName: invite.invitedBy.name ?? "A teammate",
    role:        invite.role,
    note:        invite.note,
    expiresAt:   invite.expiresAt,
    email:       invite.email,
  });
}
