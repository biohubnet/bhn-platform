/**
 * Admin: nuke every phantom user in one call.
 *
 *   POST /api/admin/phantom-users/clear-all
 *
 * Convenience endpoint for the in-page demo-phantom trays. The
 * per-phantom DELETE endpoint already exists for granular control;
 * this one lets the admin clean up an entire demo with a single
 * click instead of N requests. Reuses the same deletePhantom() so
 * cascade rules + audit behaviour are identical.
 */
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { deletePhantom } from "@/lib/phantom";

export const runtime = "nodejs";

export async function POST() {
  const session = await requireRole("admin").catch(() => null);
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const phantoms = await prisma.user.findMany({
    where: { accountKind: "phantom" },
    select: { id: true },
  });
  let deleted = 0;
  let failed = 0;
  for (const p of phantoms) {
    const r = await deletePhantom(p.id);
    if (r.ok) deleted++;
    else failed++;
  }
  return NextResponse.json({ ok: true, deleted, failed });
}
