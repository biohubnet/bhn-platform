/**
 * Merge two directory people (admin-only) — used when an e-mail collision
 * reveals a duplicate. Everything the dropped person carries is moved onto the
 * survivor BEFORE the drop is deleted, in one transaction:
 *   • memberships   → moved (or dropped where the survivor is already in that list)
 *   • touches       → reassigned (they cascade-delete with the person, so they
 *                     MUST be reassigned first or the reach-out history is lost)
 *   • campaigns      → every sentPersonIds array has dropId rewritten to keepId
 *                     (deduped) so the survivor stays "reached" and we never
 *                     re-send a cold intro to someone we already contacted
 *   • introSentAt   → the earliest of the two (first time this human was introed)
 *   POST /api/workspace/outreach/people/merge { keepId, dropId }
 */
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const asIds = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];

export async function POST(req: NextRequest) {
  const session = await requireRole("admin").catch(() => null);
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = (await req.json().catch(() => ({}))) as { keepId?: string; dropId?: string };
  const { keepId, dropId } = body;
  if (!keepId || !dropId || keepId === dropId) {
    return NextResponse.json({ error: "keepId and dropId required." }, { status: 400 });
  }
  const [keep, drop] = await Promise.all([
    prisma.outreachPerson.findUnique({ where: { id: keepId }, select: { id: true, introSentAt: true } }),
    prisma.outreachPerson.findUnique({ where: { id: dropId }, include: { memberships: true } }),
  ]);
  if (!keep || !drop) return NextResponse.json({ error: "Person not found." }, { status: 404 });

  await prisma.$transaction(async (tx) => {
    // 1. Move memberships. Can't rely on catch-the-unique-violation inside a
    //    transaction (a failed write aborts the whole tx), so check explicitly:
    //    if the survivor is already in that list, the duplicate membership is
    //    dropped; otherwise it's repointed at the survivor.
    for (const m of drop.memberships) {
      const clash = await tx.outreachMembership.findUnique({
        where: { listId_personId: { listId: m.listId, personId: keepId } },
        select: { id: true },
      });
      if (clash) {
        await tx.outreachMembership.delete({ where: { id: m.id } });
      } else {
        await tx.outreachMembership.update({ where: { id: m.id }, data: { personId: keepId } });
      }
    }

    // 2. Reassign the reach-out history BEFORE the delete (touches cascade with
    //    the person). Without this the drop's entire history vanishes.
    await tx.outreachTouch.updateMany({ where: { personId: dropId }, data: { personId: keepId } });

    // 3. Rewrite campaign reach state: any campaign that had dropId now has
    //    keepId (deduped), so the survivor reads as reached and we don't
    //    re-cold-email them next round.
    const campaigns = await tx.outreachCampaign.findMany({ select: { id: true, sentPersonIds: true } });
    for (const c of campaigns) {
      const ids = asIds(c.sentPersonIds);
      if (!ids.includes(dropId)) continue;
      const next = Array.from(new Set(ids.map((x) => (x === dropId ? keepId : x))));
      await tx.outreachCampaign.update({
        where: { id: c.id },
        data: { sentPersonIds: next as unknown as Prisma.InputJsonValue },
      });
    }

    // 4. introSentAt = the earliest intro across the two (true first contact).
    const dates = [keep.introSentAt, drop.introSentAt].filter((d): d is Date => d != null);
    const earliest = dates.length ? dates.reduce((a, b) => (a < b ? a : b)) : null;
    if (earliest && keep.introSentAt?.getTime() !== earliest.getTime()) {
      await tx.outreachPerson.update({ where: { id: keepId }, data: { introSentAt: earliest } });
    }

    // 5. Now safe to delete the duplicate.
    await tx.outreachPerson.delete({ where: { id: dropId } });
  });

  return NextResponse.json({ ok: true });
}
