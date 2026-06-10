/**
 * One list membership (admin-only) — per-list fields + position.
 *   PATCH  /api/workspace/outreach/memberships/[id]
 *     { values }       → update this list's fields for the person
 *     { move: -1 | 1 } → swap with the neighbour in the same list
 *   DELETE /api/workspace/outreach/memberships/[id]
 *     → remove the person from this list (they stay in the directory)
 */
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
interface Ctx { params: Promise<{ id: string }> }

function sanitizeValues(input: unknown): Record<string, string> | null {
  if (typeof input !== "object" || input === null) return null;
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
    if (typeof k === "string" && k.length <= 40 && typeof v === "string") out[k] = v.slice(0, 1000);
  }
  return out;
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const session = await requireRole("admin").catch(() => null);
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await ctx.params;
  const membership = await prisma.outreachMembership.findUnique({ where: { id } });
  if (!membership) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const body = (await req.json().catch(() => ({}))) as { values?: unknown; move?: number };

  if (body.move === -1 || body.move === 1) {
    const neighbour = await prisma.outreachMembership.findFirst({
      where: {
        listId: membership.listId,
        order: body.move === -1 ? { lt: membership.order } : { gt: membership.order },
      },
      orderBy: { order: body.move === -1 ? "desc" : "asc" },
    });
    if (neighbour) {
      await prisma.$transaction([
        prisma.outreachMembership.update({ where: { id: membership.id }, data: { order: neighbour.order } }),
        prisma.outreachMembership.update({ where: { id: neighbour.id }, data: { order: membership.order } }),
      ]);
    }
    return NextResponse.json({ ok: true });
  }

  if (body.values !== undefined) {
    const values = sanitizeValues(body.values);
    if (!values) return NextResponse.json({ error: "Invalid values." }, { status: 400 });
    await prisma.outreachMembership.update({
      where: { id },
      data: { values: values as unknown as Prisma.InputJsonValue },
    });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "No changes." }, { status: 400 });
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const session = await requireRole("admin").catch(() => null);
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await ctx.params;
  await prisma.outreachMembership.delete({ where: { id } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
