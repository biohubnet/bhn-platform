/**
 * Event host — DELETE.
 *
 *   DELETE /api/admin/events/[slug]/hosts/[hostId]
 *     Removes the host attribution. The User row stays — only the
 *     EventHost junction is deleted.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ slug: string; hostId: string }> },
) {
  const session = await requireRole("admin").catch(() => null);
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { slug, hostId } = await ctx.params;
  const event = await prisma.bhnEvent.findUnique({
    where: { slug },
    select: { id: true },
  });
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

  const host = await prisma.eventHost.findUnique({
    where: { id: hostId },
    select: { eventId: true },
  });
  if (!host || host.eventId !== event.id) {
    return NextResponse.json({ error: "Host not found for this event" }, { status: 404 });
  }
  await prisma.eventHost.delete({ where: { id: hostId } });
  return NextResponse.json({ ok: true });
}
