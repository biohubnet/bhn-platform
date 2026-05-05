import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireRole("admin");
  const { id } = await params;
  const { title, body, pinned } = await req.json();

  const a = await prisma.announcement.update({
    where: { id },
    data: { ...(title !== undefined && { title }), ...(body !== undefined && { body }), ...(pinned !== undefined && { pinned }) },
  });

  return NextResponse.json(a);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireRole("admin");
  const { id } = await params;
  await prisma.announcement.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
