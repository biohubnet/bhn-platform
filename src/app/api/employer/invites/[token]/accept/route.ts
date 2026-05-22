/**
 * POST /api/employer/invites/[token]/accept
 *   Authenticated. Creates the CompanyMember row, marks the invite
 *   accepted, logs the join event, redirects to /employer.
 *
 *   Returns: { companyId, role } on success.
 *   The accept page calls this then redirects to /employer.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { writeEmployerAction } from "@/lib/employer/activity";
import { revalidatePath } from "next/cache";

export const runtime = "nodejs";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;
  const userName = (session.user as { name?: string }).name ?? null;
  const { token } = await params;

  const invite = await prisma.companyInvite.findUnique({
    where:  { token },
    select: {
      id:          true,
      companyId:   true,
      status:      true,
      expiresAt:   true,
      role:        true,
      invitedById: true,
    },
  });

  if (!invite) return NextResponse.json({ error: "Invite not found" }, { status: 404 });
  if (invite.status !== "pending") {
    return NextResponse.json({ error: "Invite already used or revoked" }, { status: 410 });
  }
  if (invite.expiresAt < new Date()) {
    return NextResponse.json({ error: "Invite expired" }, { status: 410 });
  }

  // Upsert the member row (idempotent — user might already be a member
  // e.g. if they accepted on another device).
  await prisma.$transaction([
    prisma.companyMember.upsert({
      where:  { companyId_userId: { companyId: invite.companyId, userId } },
      update: { role: invite.role },
      create: {
        companyId:   invite.companyId,
        userId,
        role:        invite.role,
        invitedById: invite.invitedById,
        joinedAt:    new Date(),
      },
    }),
    prisma.companyInvite.update({
      where: { id: invite.id },
      data:  { status: "accepted", acceptedById: userId, acceptedAt: new Date() },
    }),
  ]);

  await writeEmployerAction({
    kind:         "member_joined",
    companyId:    invite.companyId,
    actorId:      userId,
    payload:      { targetName: userName ?? "Someone", role: invite.role },
    targetUserId: userId,
  }).catch(() => {});

  revalidatePath("/employer/team");
  revalidatePath("/employer");
  return NextResponse.json({ companyId: invite.companyId, role: invite.role });
}
