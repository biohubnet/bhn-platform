/**
 * Public (no login) — add a new contact to a shared outreach list.
 *   POST /api/outreach/shared/[token]/memberships {}
 * Needs an edit link + the per-list collaborator cookie; the new contact's
 * "Added by" carries the collaborator's name.
 */
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { resolveOutreachToken, getOutreachCollaborator } from "@/lib/outreach/share";

export const runtime = "nodejs";
interface Ctx { params: Promise<{ token: string }> }

export async function POST(_req: NextRequest, ctx: Ctx) {
  const { token } = await ctx.params;
  const res = await resolveOutreachToken(token);
  if (!res.ok) return NextResponse.json({ error: "This link is no longer valid." }, { status: 404 });
  if (!res.token.canEdit) return NextResponse.json({ error: "This link is view-only." }, { status: 403 });
  const collab = await getOutreachCollaborator(res.list.id);
  if (!collab) return NextResponse.json({ error: "Please join with your name first." }, { status: 401 });

  const order = await prisma.outreachMembership.count({ where: { listId: res.list.id } });
  const person = await prisma.outreachPerson.create({
    data: {
      values: {} as unknown as Prisma.InputJsonValue,
      addedByName: collab.name,
      memberships: {
        create: [{
          listId: res.list.id,
          order,
          values: {} as unknown as Prisma.InputJsonValue,
          addedByName: collab.name,
        }],
      },
    },
    select: { id: true },
  });
  await prisma.outreachCollaborator.update({ where: { id: collab.id }, data: { lastSeenAt: new Date() } }).catch(() => {});
  return NextResponse.json({ ok: true, personId: person.id }, { status: 201 });
}
