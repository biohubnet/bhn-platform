/**
 * Reach-out history for one directory person (admin-only).
 *   GET  /api/workspace/outreach/people/[id]/touches
 *     → all touches, newest first, with the list each was made for
 *   POST /api/workspace/outreach/people/[id]/touches
 *     { kind?, note?, happenedAt?, listId? }
 *     → log a reach-out; "who initiated" is stamped from the session
 */
import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
interface Ctx { params: Promise<{ id: string }> }

const KINDS = new Set(["email", "call", "meeting", "linkedin", "event", "other"]);

export async function GET(_req: NextRequest, ctx: Ctx) {
  const session = await requireRole("admin").catch(() => null);
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await ctx.params;
  const touches = await prisma.outreachTouch.findMany({
    where: { personId: id },
    orderBy: { happenedAt: "desc" },
    take: 200,
    include: { list: { select: { name: true } } },
  });
  return NextResponse.json({
    ok: true,
    touches: touches.map((t) => ({
      id: t.id,
      kind: t.kind,
      note: t.note,
      happenedAt: t.happenedAt.toISOString(),
      byName: t.byName,
      listName: t.list?.name ?? null,
    })),
  });
}

export async function POST(req: NextRequest, ctx: Ctx) {
  const session = await requireRole("admin").catch(() => null);
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const uid = (session.user as { id?: string }).id ?? null;
  const name = (session.user as { name?: string }).name ?? "Admin";
  const { id } = await ctx.params;
  const person = await prisma.outreachPerson.findUnique({ where: { id }, select: { id: true } });
  if (!person) return NextResponse.json({ error: "Person not found." }, { status: 404 });

  const body = (await req.json().catch(() => ({}))) as {
    kind?: string; note?: string; happenedAt?: string; listId?: string;
  };
  const kind = KINDS.has(body.kind ?? "") ? body.kind! : "email";
  const note = typeof body.note === "string" ? body.note.slice(0, 2000) : "";
  let happenedAt = new Date();
  if (typeof body.happenedAt === "string") {
    const d = new Date(body.happenedAt);
    if (!Number.isNaN(d.getTime())) happenedAt = d;
  }
  let listId: string | null = null;
  if (typeof body.listId === "string" && body.listId) {
    const list = await prisma.outreachList.findUnique({ where: { id: body.listId }, select: { id: true } });
    listId = list?.id ?? null;
  }

  const touch = await prisma.outreachTouch.create({
    data: { personId: id, listId, kind, note, happenedAt, byId: uid, byName: name },
    include: { list: { select: { name: true } } },
  });
  return NextResponse.json({
    ok: true,
    touch: {
      id: touch.id,
      kind: touch.kind,
      note: touch.note,
      happenedAt: touch.happenedAt.toISOString(),
      byName: touch.byName,
      listName: touch.list?.name ?? null,
    },
  }, { status: 201 });
}
