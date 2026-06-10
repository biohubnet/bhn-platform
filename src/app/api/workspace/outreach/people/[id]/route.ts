/**
 * One directory person (admin-only). Shared fields — editing updates the
 * person in EVERY list they belong to.
 *   PATCH  /api/workspace/outreach/people/[id] { values }
 *     → 409 with { conflict } when the new e-mail already belongs to another
 *       person (the client offers to merge instead of creating a duplicate).
 *   DELETE /api/workspace/outreach/people/[id]
 *     → removes the person from the directory and all lists.
 */
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { emailKey } from "@/lib/outreach/directory";

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
  const person = await prisma.outreachPerson.findUnique({ where: { id } });
  if (!person) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const body = (await req.json().catch(() => ({}))) as { values?: unknown };
  const values = sanitizeValues(body.values);
  if (!values) return NextResponse.json({ error: "Invalid values." }, { status: 400 });

  // E-mail is the identity key: if the new address already belongs to a
  // DIFFERENT person, surface that so the client can offer a merge.
  const newEmail = emailKey(values.email);
  if (newEmail) {
    const others = await prisma.outreachPerson.findMany({
      where: { id: { not: id } },
      select: { id: true, values: true, memberships: { select: { list: { select: { name: true } } } } },
    });
    const clash = others.find((p) => emailKey((p.values as Record<string, string>)?.email) === newEmail);
    if (clash) {
      const cv = clash.values as Record<string, string>;
      return NextResponse.json(
        {
          error: "Another contact already uses this e-mail.",
          conflict: {
            id: clash.id,
            name: cv?.name ?? "",
            org: cv?.org ?? "",
            lists: clash.memberships.map((m) => m.list.name),
          },
        },
        { status: 409 },
      );
    }
  }

  await prisma.outreachPerson.update({
    where: { id },
    data: { values: values as unknown as Prisma.InputJsonValue },
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const session = await requireRole("admin").catch(() => null);
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await ctx.params;
  await prisma.outreachPerson.delete({ where: { id } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
