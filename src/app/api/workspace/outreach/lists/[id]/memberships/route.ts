/**
 * Put a person on a list (admin-only).
 *   POST /api/workspace/outreach/lists/[id]/memberships
 *     { personId }  → add an EXISTING directory person to this list
 *     { }           → create a new (blank) person AND add them here
 * Attribution (addedBy) is stamped from the signed-in admin.
 */
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
interface Ctx { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, ctx: Ctx) {
  const session = await requireRole("admin").catch(() => null);
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const uid = (session.user as { id?: string }).id ?? null;
  const name = (session.user as { name?: string }).name ?? "Admin";
  const { id: listId } = await ctx.params;
  const list = await prisma.outreachList.findUnique({ where: { id: listId }, select: { id: true } });
  if (!list) return NextResponse.json({ error: "List not found." }, { status: 404 });

  const body = (await req.json().catch(() => ({}))) as { personId?: string };
  const order = await prisma.outreachMembership.count({ where: { listId } });

  let personId = body.personId ?? null;
  if (personId) {
    const person = await prisma.outreachPerson.findUnique({ where: { id: personId }, select: { id: true } });
    if (!person) return NextResponse.json({ error: "Person not found." }, { status: 404 });
    const existing = await prisma.outreachMembership.findUnique({
      where: { listId_personId: { listId, personId } },
      select: { id: true },
    });
    if (existing) return NextResponse.json({ error: "Already on this list." }, { status: 409 });
  } else {
    const person = await prisma.outreachPerson.create({
      data: {
        values: {} as unknown as Prisma.InputJsonValue,
        addedById: uid,
        addedByName: name,
      },
      select: { id: true },
    });
    personId = person.id;
  }

  const membership = await prisma.outreachMembership.create({
    data: {
      listId,
      personId,
      order,
      values: {} as unknown as Prisma.InputJsonValue,
      addedById: uid,
      addedByName: name,
    },
    select: { id: true, personId: true },
  });
  return NextResponse.json({ ok: true, membership }, { status: 201 });
}
