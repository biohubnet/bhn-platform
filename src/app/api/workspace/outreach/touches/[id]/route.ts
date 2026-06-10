/**
 * Delete one logged reach-out (admin-only — for fixing mistakes).
 *   DELETE /api/workspace/outreach/touches/[id]
 */
import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
interface Ctx { params: Promise<{ id: string }> }

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const session = await requireRole("admin").catch(() => null);
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await ctx.params;
  await prisma.outreachTouch.delete({ where: { id } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
