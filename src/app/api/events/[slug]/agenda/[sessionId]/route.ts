/**
 * Personal-agenda entries (breakout picks + "save to schedule").
 *
 *   POST   /api/events/[slug]/agenda/[sessionId]
 *     Adds the session to the user's PersonalAgendaEntry. When the
 *     session has a breakoutGroupId, any prior pick in the same
 *     group is removed atomically — pick-one semantics.
 *
 *   DELETE /api/events/[slug]/agenda/[sessionId]
 *     Removes the entry. Idempotent.
 *
 * Both gate by the user's confirmed Registration AND require
 * includesSymposiumDay (breakouts live on the symposium day).
 */
import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { pickBreakout, unpickBreakout } from "@/lib/events/bookings";

export const runtime = "nodejs";

const ERROR_STATUS: Record<string, number> = {
  not_found: 404,
  no_registration: 403,
  not_attending: 403,
};

async function gate(slug: string, sessionId: string) {
  const event = await prisma.bhnEvent.findUnique({
    where: { slug },
    select: { id: true, status: true },
  });
  if (!event || event.status !== "published") {
    return { ok: false as const, status: 404, error: "Event not found" };
  }
  const session = await prisma.symposiumSession.findUnique({
    where: { id: sessionId },
    select: { eventId: true },
  });
  if (!session || session.eventId !== event.id) {
    return { ok: false as const, status: 404, error: "Session not found for this event" };
  }
  return { ok: true as const };
}

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ slug: string; sessionId: string }> },
) {
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id?: string }).id ?? null;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { slug, sessionId } = await ctx.params;
  const g = await gate(slug, sessionId);
  if (!g.ok) return NextResponse.json({ error: g.error }, { status: g.status });

  const result = await pickBreakout(prisma, userId, sessionId);
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, code: result.code },
      { status: ERROR_STATUS[result.code] ?? 400 },
    );
  }
  return NextResponse.json(result);
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ slug: string; sessionId: string }> },
) {
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id?: string }).id ?? null;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { slug, sessionId } = await ctx.params;
  const g = await gate(slug, sessionId);
  if (!g.ok) return NextResponse.json({ error: g.error }, { status: g.status });

  const result = await unpickBreakout(prisma, userId, sessionId);
  return NextResponse.json(result);
}
