/**
 * Add a contact to an outreach list (admin-only).
 *   POST /api/workspace/outreach/lists/[id]/contacts { values? }
 * The contact is attributed to the signed-in admin (addedBy).
 */
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
interface Ctx { params: Promise<{ id: string }> }

function sanitizeValues(input: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (typeof input !== "object" || input === null) return out;
  for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
    if (typeof k === "string" && k.length <= 40 && typeof v === "string") {
      out[k] = v.slice(0, 1000);
    }
  }
  return out;
}

export async function POST(req: NextRequest, ctx: Ctx) {
  const session = await requireRole("admin").catch(() => null);
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const uid = (session.user as { id?: string }).id ?? null;
  const name = (session.user as { name?: string }).name ?? "Admin";
  const { id: listId } = await ctx.params;
  const list = await prisma.outreachList.findUnique({ where: { id: listId }, select: { id: true } });
  if (!list) return NextResponse.json({ error: "List not found." }, { status: 404 });

  const body = (await req.json().catch(() => ({}))) as { values?: unknown };
  const count = await prisma.outreachContact.count({ where: { listId } });
  const contact = await prisma.outreachContact.create({
    data: {
      listId,
      values: sanitizeValues(body.values) as unknown as Prisma.InputJsonValue,
      order: count,
      addedById: uid,
      addedByName: name,
    },
    select: { id: true, values: true, order: true, addedByName: true, createdAt: true },
  });
  return NextResponse.json({ ok: true, contact }, { status: 201 });
}
