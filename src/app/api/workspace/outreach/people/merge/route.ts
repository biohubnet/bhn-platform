/**
 * Merge two directory people (admin-only) — used when an e-mail collision
 * reveals a duplicate. Memberships of `dropId` move onto `keepId` (skipped
 * where keep is already in that list), then the duplicate person is deleted.
 *   POST /api/workspace/outreach/people/merge { keepId, dropId }
 */
import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const session = await requireRole("admin").catch(() => null);
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = (await req.json().catch(() => ({}))) as { keepId?: string; dropId?: string };
  const { keepId, dropId } = body;
  if (!keepId || !dropId || keepId === dropId) {
    return NextResponse.json({ error: "keepId and dropId required." }, { status: 400 });
  }
  const [keep, drop] = await Promise.all([
    prisma.outreachPerson.findUnique({ where: { id: keepId }, select: { id: true } }),
    prisma.outreachPerson.findUnique({ where: { id: dropId }, include: { memberships: true } }),
  ]);
  if (!keep || !drop) return NextResponse.json({ error: "Person not found." }, { status: 404 });

  for (const m of drop.memberships) {
    await prisma.outreachMembership
      .update({ where: { id: m.id }, data: { personId: keepId } })
      .catch(async () => {
        // keep already sits in that list — the duplicate membership goes away.
        await prisma.outreachMembership.delete({ where: { id: m.id } }).catch(() => {});
      });
  }
  await prisma.outreachPerson.delete({ where: { id: dropId } }).catch(() => {});
  return NextResponse.json({ ok: true });
}
