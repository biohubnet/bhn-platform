/**
 * One mock interview session (owner only).
 *   DELETE /api/mock-interview/[id] → delete the session + its answers.
 */
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
interface Ctx { params: Promise<{ id: string }> }

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const session = await getSession();
  const uid = (session?.user as { id?: string } | undefined)?.id;
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  // Scope the delete to the owner — deleteMany returns count, no 404 leak.
  await prisma.mockInterview.deleteMany({ where: { id, userId: uid } });
  return NextResponse.json({ ok: true });
}
