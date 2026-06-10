/**
 * Share links for one script (admin-only management).
 *   GET    /api/workspace/scripts/[id]/share              → active links
 *   POST   /api/workspace/scripts/[id]/share { label? }   → create link
 *   DELETE /api/workspace/scripts/[id]/share?tokenId=…    → revoke (hard delete)
 */
import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { newShareToken } from "@/lib/scripts/share";

export const runtime = "nodejs";
interface Ctx { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, ctx: Ctx) {
  const session = await requireRole("admin").catch(() => null);
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await ctx.params;
  const links = await prisma.scriptShareToken.findMany({
    where: { scriptId: id },
    orderBy: { createdAt: "desc" },
    select: { id: true, token: true, label: true, canEdit: true, expiresAt: true, createdAt: true },
  });
  return NextResponse.json({ ok: true, links });
}

export async function POST(req: NextRequest, ctx: Ctx) {
  const session = await requireRole("admin").catch(() => null);
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const uid = (session.user as { id?: string }).id ?? null;
  const { id } = await ctx.params;
  const script = await prisma.script.findUnique({ where: { id }, select: { id: true } });
  if (!script) return NextResponse.json({ error: "Script not found." }, { status: 404 });
  const body = (await req.json().catch(() => ({}))) as { label?: string };
  const link = await prisma.scriptShareToken.create({
    data: {
      scriptId: id,
      token: newShareToken(),
      label: typeof body.label === "string" ? body.label.trim().slice(0, 80) || null : null,
      canEdit: true,
      createdById: uid,
    },
    select: { id: true, token: true, label: true, canEdit: true, createdAt: true },
  });
  return NextResponse.json({ ok: true, link }, { status: 201 });
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const session = await requireRole("admin").catch(() => null);
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await ctx.params;
  const tokenId = new URL(req.url).searchParams.get("tokenId");
  if (!tokenId) return NextResponse.json({ error: "tokenId required." }, { status: 400 });
  await prisma.scriptShareToken.deleteMany({ where: { id: tokenId, scriptId: id } });
  return NextResponse.json({ ok: true });
}
