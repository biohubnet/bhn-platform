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

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireRole("superadmin");
  const actorId = (session.user as { id?: string }).id!;
  const { id } = await params;

  await prisma.user.delete({ where: { id } });

  await prisma.auditLog.create({
    data: {
      actorId,
      action: "user.delete",
      targetType: "user",
      targetId: id,
    },
  });

  return NextResponse.json({ ok: true });
}
