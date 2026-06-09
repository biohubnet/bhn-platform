/**
 * One shared file (admin-only).
 *   PATCH  /api/workspace/files/[id]   → { title?, description?, isArchived? }
 *   DELETE /api/workspace/files/[id]   → soft-archive; ?force=true hard delete (also removes the R2 object)
 */
import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { deleteR2ObjectByUrl } from "@/lib/r2";

export const runtime = "nodejs";
interface Ctx { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const session = await requireRole("admin").catch(() => null);
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as {
    title?: string;
    description?: string;
    isArchived?: boolean;
  };
  const data: Record<string, unknown> = {};
  if (typeof body.title === "string" && body.title.trim()) data.title = body.title.trim().slice(0, 160);
  if (typeof body.description === "string") data.description = body.description.slice(0, 600);
  if (typeof body.isArchived === "boolean") data.isArchived = body.isArchived;
  if (Object.keys(data).length === 0) return NextResponse.json({ error: "No changes." }, { status: 400 });
  const file = await prisma.sharedFile.update({ where: { id }, data }).catch(() => null);
  if (!file) return NextResponse.json({ error: "Not found." }, { status: 404 });
  return NextResponse.json({
    ok: true,
    file: { id: file.id, title: file.title, description: file.description, isArchived: file.isArchived },
  });
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const session = await requireRole("admin").catch(() => null);
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await ctx.params;
  const force = new URL(req.url).searchParams.get("force") === "true";
  if (force) {
    const file = await prisma.sharedFile.delete({ where: { id } }).catch(() => null);
    if (file) await deleteR2ObjectByUrl(file.storageKey);
    return NextResponse.json({ ok: true, deleted: true });
  }
  await prisma.sharedFile.update({ where: { id }, data: { isArchived: true } }).catch(() => null);
  return NextResponse.json({ ok: true, archived: true });
}
