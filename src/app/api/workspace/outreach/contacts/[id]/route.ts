/**
 * One outreach contact (admin-only).
 *   PATCH  /api/workspace/outreach/contacts/[id]
 *     { values? }            → update cell values
 *     { move: -1 | 1 }       → swap with the neighbour in the same list
 *     { listId }             → move to the end of another list
 *   DELETE /api/workspace/outreach/contacts/[id]
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
    if (typeof k === "string" && k.length <= 40 && typeof v === "string") {
      out[k] = v.slice(0, 1000);
    }
  }
  return out;
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const session = await requireRole("admin").catch(() => null);
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await ctx.params;
  const contact = await prisma.outreachContact.findUnique({ where: { id } });
  if (!contact) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const body = (await req.json().catch(() => ({}))) as { values?: unknown; move?: number; listId?: string };

  // Reorder within the list: swap order with the adjacent contact.
  if (body.move === -1 || body.move === 1) {
    const neighbour = await prisma.outreachContact.findFirst({
      where: {
        listId: contact.listId,
        order: body.move === -1 ? { lt: contact.order } : { gt: contact.order },
      },
      orderBy: { order: body.move === -1 ? "desc" : "asc" },
    });
    if (neighbour) {
      await prisma.$transaction([
        prisma.outreachContact.update({ where: { id: contact.id }, data: { order: neighbour.order } }),
        prisma.outreachContact.update({ where: { id: neighbour.id }, data: { order: contact.order } }),
      ]);
    }
    return NextResponse.json({ ok: true });
  }

  // Move to another list (appends at the end).
  if (typeof body.listId === "string" && body.listId !== contact.listId) {
    const target = await prisma.outreachList.findUnique({ where: { id: body.listId }, select: { id: true } });
    if (!target) return NextResponse.json({ error: "Target list not found." }, { status: 404 });
    const count = await prisma.outreachContact.count({ where: { listId: target.id } });
    await prisma.outreachContact.update({
      where: { id },
      data: { listId: target.id, order: count },
    });
    return NextResponse.json({ ok: true });
  }

  // Cell-value update.
  if (body.values !== undefined) {
    const values = sanitizeValues(body.values);
    if (!values) return NextResponse.json({ error: "Invalid values." }, { status: 400 });
    await prisma.outreachContact.update({
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
  await prisma.outreachContact.delete({ where: { id } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
