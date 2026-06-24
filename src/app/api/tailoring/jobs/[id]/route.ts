/**
 * One tailoring job.
 *   DELETE → remove the job (and its runs, via cascade)
 */
import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
interface Ctx { params: Promise<{ id: string }> }

async function uid(): Promise<string | null> {
  const s = await requireSession().catch(() => null);
  return s ? (s.user as { id?: string }).id ?? null : null;
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const userId = await uid();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  await prisma.tailoringJob.deleteMany({ where: { id, userId } });
  return NextResponse.json({ ok: true });
}
