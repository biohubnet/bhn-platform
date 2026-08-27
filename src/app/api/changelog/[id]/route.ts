import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, ROLE_RANK } from "@/lib/auth";
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireRole("admin").catch(() => null);
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const body = await req.json();

  const validRoles = Object.keys(ROLE_RANK).filter((r) => r !== "user");
  const data: Record<string, unknown> = {};
  if (body.title !== undefined) data.title = String(body.title).trim();
  if (body.body !== undefined) data.body = String(body.body).trim();
  if (body.kind !== undefined && ["feature", "fix", "improvement", "note"].includes(body.kind)) {
    data.kind = body.kind;
  }
  if (body.version !== undefined) data.version = body.version || null;
  if (Array.isArray(body.visibleTo)) {
    data.visibleTo = body.visibleTo.filter((r: string) => validRoles.includes(r));
  }
  if (body.publishedAt) data.publishedAt = new Date(body.publishedAt);

  const entry = await prisma.changeLog.update({ where: { id }, data });
  return NextResponse.json(entry);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireRole("admin").catch(() => null);
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  await prisma.changeLog.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
