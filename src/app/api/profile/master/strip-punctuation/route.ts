/**
 * POST /api/profile/master/strip-punctuation
 * Remove ATS-unfriendly punctuation from JOB TITLES, company, and
 * location across the caller's master (quotes, commas, periods, pipes,
 * brackets, em/en dashes, ; : ! ?) — e.g. "Acme, Inc." → "Acme Inc".
 * Bullet TEXT is left untouched. Keeps decimals, hyphens, and
 * + # & % $ / @. Returns how many rows changed. The UI confirms first.
 */
import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getOrCreateMaster } from "@/lib/resume/master";
import { stripPunctuation, composeSubtitle } from "@/lib/resume/anchor";

export const runtime = "nodejs";

async function getMyUserId(): Promise<string | null> {
  const session = await requireSession().catch(() => null);
  if (!session) return null;
  return (session.user as { id?: string }).id ?? null;
}

export async function POST() {
  const userId = await getMyUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const master = await getOrCreateMaster(prisma, userId);
  const bullets = await prisma.masterBullet.findMany({
    where: { masterId: master.id, isArchived: false },
    select: { id: true, anchorTitle: true, anchorCompany: true, anchorLocation: true, anchorSubtitle: true },
  });

  // Clean each anchor field; never blank a field out (fall back to the
  // original if stripping leaves nothing). Recompose the display
  // subtitle from the cleaned company/location.
  const clean = (v: string | null) => (v ? stripPunctuation(v) || v : v);

  let changed = 0;
  for (const b of bullets) {
    const title = clean(b.anchorTitle);
    const company = clean(b.anchorCompany);
    const location = clean(b.anchorLocation);
    const subtitle = (company || location)
      ? composeSubtitle(company, location)
      : clean(b.anchorSubtitle);
    if (title !== b.anchorTitle || company !== b.anchorCompany || location !== b.anchorLocation || subtitle !== b.anchorSubtitle) {
      await prisma.masterBullet.update({
        where: { id: b.id },
        data: { anchorTitle: title, anchorCompany: company, anchorLocation: location, anchorSubtitle: subtitle },
      });
      changed++;
    }
  }
  return NextResponse.json({ ok: true, changed });
}
