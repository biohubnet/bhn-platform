/**
 * PATCH /api/profile/master/group
 * Edit the structured details of one experience-type group (a "job").
 * The group is keyed by (sectionKind, anchorTitle); all bullets in it
 * carry the same job fields, so we updateMany. Renaming the title
 * re-keys the group. anchorSubtitle + anchorDateRange are derived for
 * display + back-compat.
 *   body: { sectionKind, anchorTitle, title?, company?, location?,
 *           start?, end?, current? }
 */
import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getOrCreateMaster } from "@/lib/resume/master";
import { composeSubtitle, composeDateRange } from "@/lib/resume/anchor";

export const runtime = "nodejs";

async function getMyUserId(): Promise<string | null> {
  const session = await requireSession().catch(() => null);
  if (!session) return null;
  return (session.user as { id?: string }).id ?? null;
}

const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);

export async function PATCH(req: NextRequest) {
  const userId = await getMyUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const sectionKind = str(b.sectionKind);
  const oldAnchorTitle = typeof b.anchorTitle === "string" ? b.anchorTitle : null; // "" allowed (ungrouped)
  if (!sectionKind) return NextResponse.json({ error: "sectionKind required" }, { status: 400 });

  const title = str(b.title);
  const company = str(b.company);
  const location = str(b.location);
  const start = str(b.start);
  const end = str(b.end);
  const current = b.current === true;

  const master = await getOrCreateMaster(prisma, userId);
  const res = await prisma.masterBullet.updateMany({
    where: { masterId: master.id, sectionKind, anchorTitle: oldAnchorTitle || null },
    data: {
      anchorTitle: title,
      anchorCompany: company,
      anchorLocation: location,
      anchorStart: start,
      anchorEnd: current ? start : end,
      anchorCurrent: current,
      anchorSubtitle: composeSubtitle(company, location),
      anchorDateRange: composeDateRange(start, current ? null : end, current),
    },
  });
  return NextResponse.json({ ok: true, updated: res.count });
}
