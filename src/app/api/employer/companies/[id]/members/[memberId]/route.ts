/**
 * PATCH /api/employer/companies/[id]/members/[memberId]
 *   Change a member's role or title.
 *   Requires: owner (role changes); manager+ (title changes).
 *
 * DELETE /api/employer/companies/[id]/members/[memberId]
 *   Remove a member from the company.
 *   Requires: owner.
 *   Cannot remove the last owner (409).
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { requireCompanyRole } from "@/lib/employer/company";
import { writeEmployerAction } from "@/lib/employer/activity";
import { revalidatePath } from "next/cache";

export const runtime = "nodejs";

// ── PATCH — change role or title ─────────────────────────────────

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; memberId: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const callerId = (session.user as { id: string }).id;
  const { id: companyId, memberId } = await params;

  const body = await req.json().catch(() => ({})) as { role?: string; title?: string };

  // Role changes require owner; title changes require manager+.
  const minTier = body.role ? "owner" : "manager";
  try {
    await requireCompanyRole(companyId, callerId, minTier);
  } catch {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  const member = await prisma.companyMember.findUnique({
    where: { id: memberId },
    select: {
      id:        true,
      companyId: true,
      role:      true,
      user:      { select: { id: true, name: true, email: true } },
    },
  });
  if (!member || member.companyId !== companyId) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  // Can't demote the last owner.
  if (body.role && member.role === "owner" && body.role !== "owner") {
    const ownerCount = await prisma.companyMember.count({
      where: { companyId, role: "owner" },
    });
    if (ownerCount <= 1) {
      return NextResponse.json(
        { error: "Cannot demote the last owner. Transfer ownership first." },
        { status: 409 },
      );
    }
  }

  const updated = await prisma.companyMember.update({
    where: { id: memberId },
    data: {
      ...(body.role  ? { role:  body.role  } : {}),
      ...(body.title !== undefined ? { title: body.title ?? null } : {}),
    },
    select: { id: true, role: true, title: true },
  });

  if (body.role) {
    await writeEmployerAction({
      kind:         "member_role_changed",
      companyId,
      actorId:      callerId,
      payload:      { targetName: member.user.name ?? member.user.email, newRole: body.role, prevRole: member.role },
      targetUserId: member.user.id,
    }).catch(() => {});
  }

  revalidatePath("/employer/team");
  return NextResponse.json(updated);
}

// ── DELETE — remove member ────────────────────────────────────────

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; memberId: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const callerId = (session.user as { id: string }).id;
  const { id: companyId, memberId } = await params;

  try {
    await requireCompanyRole(companyId, callerId, "owner");
  } catch {
    return NextResponse.json({ error: "Access denied — owner required" }, { status: 403 });
  }

  const member = await prisma.companyMember.findUnique({
    where: { id: memberId },
    select: {
      id:        true,
      companyId: true,
      role:      true,
      user:      { select: { id: true, name: true, email: true } },
    },
  });
  if (!member || member.companyId !== companyId) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  // Cannot remove the last owner.
  if (member.role === "owner") {
    const ownerCount = await prisma.companyMember.count({ where: { companyId, role: "owner" } });
    if (ownerCount <= 1) {
      return NextResponse.json(
        { error: "Cannot remove the last owner. Transfer ownership or add another owner first." },
        { status: 409 },
      );
    }
  }

  // Don't allow self-removal — use the Transfer + resign flow.
  if (member.user.id === callerId) {
    return NextResponse.json(
      { error: "Cannot remove yourself. Ask another owner to remove you." },
      { status: 409 },
    );
  }

  await prisma.companyMember.delete({ where: { id: memberId } });

  await writeEmployerAction({
    kind:         "member_removed",
    companyId,
    actorId:      callerId,
    payload:      { targetName: member.user.name ?? member.user.email, role: member.role },
    targetUserId: member.user.id,
  }).catch(() => {});

  revalidatePath("/employer/team");
  return NextResponse.json({ ok: true });
}
