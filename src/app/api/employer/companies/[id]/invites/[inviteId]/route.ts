/**
 * DELETE /api/employer/companies/[id]/invites/[inviteId]
 *   Revokes a pending invite (sets status → "revoked").
 *   Requires: manager+ on the company.
 *
 *   Returns: { ok: true }
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { requireCompanyRole } from "@/lib/employer/company";
import { revalidatePath } from "next/cache";

export const runtime = "nodejs";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; inviteId: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId                   = (session.user as { id: string }).id;
  const { id: companyId, inviteId } = await params;

  try {
    await requireCompanyRole(companyId, userId, "manager");
  } catch {
    return NextResponse.json({ error: "Access denied — manager+ required" }, { status: 403 });
  }

  const invite = await prisma.companyInvite.findUnique({
    where:  { id: inviteId },
    select: { id: true, companyId: true, status: true },
  });

  if (!invite || invite.companyId !== companyId) {
    return NextResponse.json({ error: "Invite not found" }, { status: 404 });
  }
  if (invite.status !== "pending") {
    return NextResponse.json({ error: "Invite is not pending" }, { status: 409 });
  }

  await prisma.companyInvite.update({
    where: { id: inviteId },
    data:  { status: "revoked" },
  });

  revalidatePath("/employer/team");
  return NextResponse.json({ ok: true });
}
