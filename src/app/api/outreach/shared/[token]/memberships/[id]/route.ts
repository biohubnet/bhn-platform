/**
 * Public (no login) — edit one membership on a shared outreach list.
 *   PATCH /api/outreach/shared/[token]/memberships/[id]
 *     { values }       → per-list fields (e.g. Notes)
 *     { move: -1 | 1 } → reorder within the list
 * Scoped hard to the token's list; needs an edit link + collaborator cookie.
 */
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { resolveOutreachToken, getOutreachCollaborator } from "@/lib/outreach/share";

export const runtime = "nodejs";
interface Ctx { params: Promise<{ token: string; id: string }> }

function sanitizeValues(input: unknown): Record<string, string> | null {
  if (typeof input !== "object" || input === null) return null;
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
    if (typeof k === "string" && k.length <= 40 && typeof v === "string") out[k] = v.slice(0, 1000);
  }
  return out;
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const { token, id } = await ctx.params;
  const res = await resolveOutreachToken(token);
  if (!res.ok) return NextResponse.json({ error: "This link is no longer valid." }, { status: 404 });
  if (!res.token.canEdit) return NextResponse.json({ error: "This link is view-only." }, { status: 403 });
  const collab = await getOutreachCollaborator(res.list.id);
  if (!collab) return NextResponse.json({ error: "Please join with your name first." }, { status: 401 });

  const membership = await prisma.outreachMembership.findUnique({ where: { id } });
  if (!membership || membership.listId !== res.list.id) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

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
