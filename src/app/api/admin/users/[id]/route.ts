import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireRole("admin");
  const actorId = (session.user as { id?: string }).id!;
  const { id } = await params;
  const body = await req.json();

  const updateData: Record<string, unknown> = {};
  if (body.role !== undefined) updateData.role = body.role;
  if (body.isActive !== undefined) updateData.isActive = body.isActive;
  if (body.name !== undefined) updateData.name = body.name;
  if (body.credits !== undefined) updateData.credits = body.credits;
  if (body.password) updateData.password = await bcrypt.hash(body.password, 12);

  const user = await prisma.user.update({
    where: { id },
    data: updateData,
    select: { id: true, name: true, email: true, role: true, isActive: true, credits: true },
  });

  await prisma.auditLog.create({
    data: {
      actorId,
      action: body.isActive !== undefined
        ? (body.isActive ? "user.reactivate" : "user.deactivate")
        : "user.update",
      targetType: "user",
      targetId: id,
      detail: JSON.stringify(updateData),
      ip: req.headers.get("x-forwarded-for") ?? undefined,
    },
  });

  return NextResponse.json(user);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireRole("admin");
  const actorId = (session.user as { id?: string }).id!;
  const { id } = await params;

  // ── Safety gates ─────────────────────────────────────────────
  // 1. Never delete yourself — accidental keyboard sweeps shouldn't
  //    lock you out.
  if (id === actorId) {
    return NextResponse.json(
      { error: "You can't delete your own account from this surface." },
      { status: 400 },
    );
  }

  // 2. Look up the target to inspect role + accountKind. Admins can
  //    delete demo / sandbox / phantom freely; deleting a real user
  //    or a superadmin requires superadmin level.
  const target = await prisma.user.findUnique({
    where: { id },
    select: { id: true, role: true, accountKind: true, email: true },
  });
  if (!target) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  const actorRole = (session.user as { role?: string }).role ?? "";
  const isSuperadmin = actorRole === "superadmin";
  const isProtectedAccountKind = target.accountKind === "real";
  if (isProtectedAccountKind && !isSuperadmin) {
    return NextResponse.json(
      { error: "Deleting a real user account requires superadmin." },
      { status: 403 },
    );
  }
  if (target.role === "superadmin") {
    if (!isSuperadmin) {
      return NextResponse.json(
        { error: "Only a superadmin can delete a superadmin account." },
        { status: 403 },
      );
    }
    // 3. Last-superadmin guard — never leave the platform without one.
    const otherSupers = await prisma.user.count({
      where: { role: "superadmin", id: { not: id } },
    });
    if (otherSupers === 0) {
      return NextResponse.json(
        { error: "Refusing to delete the last superadmin." },
        { status: 400 },
      );
    }
  }

  await prisma.user.delete({ where: { id } });

  await prisma.auditLog.create({
    data: {
      actorId,
      action: "user.delete",
      targetType: "user",
      targetId: id,
      detail: JSON.stringify({
        targetEmail: target.email,
        targetRole: target.role,
        targetAccountKind: target.accountKind,
      }),
      ip: req.headers.get("x-forwarded-for") ?? undefined,
    },
  });

  return NextResponse.json({ ok: true });
}
