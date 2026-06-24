/**
 * POST /api/profile/master/strip-punctuation
 * Remove ATS-unfriendly punctuation from every bullet body in the
 * caller's master (quotes, pipes, brackets, commas, sentence periods,
 * em/en dashes, ; : ! ?). Keeps decimals, hyphens, and + # & % $ / @.
 * Returns how many bullets changed. The UI confirms first.
 */
import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getOrCreateMaster } from "@/lib/resume/master";
import { stripPunctuation } from "@/lib/resume/anchor";

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
    select: { id: true, body: true },
  });

  let changed = 0;
  for (const b of bullets) {
    const cleaned = stripPunctuation(b.body);
    if (cleaned && cleaned !== b.body) {
      await prisma.masterBullet.update({
        where: { id: b.id },
        data: { body: cleaned, embeddingText: cleaned },
      });
      changed++;
    }
  }
  return NextResponse.json({ ok: true, changed });
}
