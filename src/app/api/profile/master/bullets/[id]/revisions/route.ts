/**
 * GET /api/profile/master/bullets/[id]/revisions
 *
 * Returns the last 10 revisions for a single master bullet, ordered
 * newest-first. Used by the inline revision-history strip on
 * /profile/master so a user can scan prior versions of any bullet
 * and "Restore" one with a single click.
 *
 * Cap. The 5-minute coalesce on writes already prevents a runaway
 * row count for normal use, but a user could still accumulate
 * hundreds of revisions over a long-lived library. Capping at 10
 * keeps the response small and matches the UX — older history is
 * archival, not browsable.
 *
 * Auth. Ownership is enforced by joining through the bullet's
 * master.userId, same shape as the PATCH/DELETE bullet endpoint.
 */
import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id?: string }).id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;

  // Confirm ownership before reading revisions. The cheaper alternative
  // (revisions.findMany with a nested bullet.master.userId where) would
  // happily return an empty array for someone else's bullet — which is
  // fine privacy-wise but hides the 404 from the UI. An explicit
  // existence check lets us return a clean 404.
  const bullet = await prisma.masterBullet.findFirst({
    where: { id, master: { userId } },
    select: { id: true },
  });
  if (!bullet) {
    return NextResponse.json({ error: "Bullet not found." }, { status: 404 });
  }

  const revisions = await prisma.masterBulletRevision.findMany({
    where: { bulletId: id },
    orderBy: { createdAt: "desc" },
    take: 10,
    select: {
      id: true,
      body: true,
      tags: true,
      source: true,
      createdAt: true,
    },
  });

  return NextResponse.json({
    ok: true,
    revisions: revisions.map((r) => ({
      id: r.id,
      body: r.body,
      tags: r.tags,
      source: r.source,
      createdAt: r.createdAt.toISOString(),
    })),
  });
}
