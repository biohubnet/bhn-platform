import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";

export const runtime = "nodejs";

interface Body {
  value?: string;
  sortOrder?: number;
  active?: boolean;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole("admin");
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as Body;
  const data: Record<string, unknown> = {};
  if (typeof body.value === "string") data.value = body.value.trim();
  if (typeof body.sortOrder === "number") data.sortOrder = body.sortOrder;
  if (typeof body.active === "boolean") data.active = body.active;
  const option = await prisma.courseFilterOption.update({ where: { id }, data });
  return NextResponse.json({ ok: true, option });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole("admin");
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  await prisma.courseFilterOption.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
