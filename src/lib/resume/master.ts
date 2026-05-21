/**
 * Master-resume helpers — shared logic that runs across the
 * /api/profile/master endpoints.
 *
 * - getOrCreateMaster(userId) — singleton fetch; lazy-creates on
 *   first call.
 * - shapeBulletsAsContent(bullets) — projects the master's bullets
 *   into a ResumeContent tree, used for snapshot payloads and
 *   downloads.
 * - recordBulletRevision(prisma, args) — 5-minute coalesce-aware
 *   revision write. Mirrors lib/resume/revisions for the master.
 */
import type { PrismaClient, Prisma } from "@prisma/client";
import type { ResumeContent, ResumeSectionKind } from "@/lib/resume/types";
import { rid } from "@/lib/resume/types";

const SECTION_ORDER: ResumeSectionKind[] = [
  "summary",
  "experience",
  "skills",
  "education",
  "projects",
  "certifications",
  "publications",
  "awards",
  "volunteering",
  "other",
];

/** Ensure the calling user has a MasterResume row. Returns the
 *  master's id + header so callers can pipe straight through. */
export async function getOrCreateMaster(
  prisma: PrismaClient,
  userId: string,
): Promise<{ id: string; header: unknown | null; createdAt: Date; updatedAt: Date }> {
  const existing = await prisma.masterResume.findUnique({
    where: { userId },
    select: { id: true, header: true, createdAt: true, updatedAt: true },
  });
  if (existing) return existing;
  const created = await prisma.masterResume.create({
    data: { userId },
    select: { id: true, header: true, createdAt: true, updatedAt: true },
  });
  return created;
}

interface BulletRow {
  id: string;
  sectionKind: string;
  anchorTitle: string | null;
  anchorSubtitle: string | null;
  anchorDateRange: string | null;
  body: string;
  tags: string[];
  position: number;
}

/** Project the master's bullets into a ResumeContent JSON tree
 *  (header + sections + items + bullets). Used to snapshot the
 *  master, hand it to /profile/resume/preview, and serve as JSON
 *  download. Bullets without an anchor get bucketed under a single
 *  "Library" item; bullets with the same anchor share an item. */
export function shapeBulletsAsContent(
  header: ResumeContent["header"] | null | undefined,
  bullets: BulletRow[],
): ResumeContent {
  // Group bullets by (sectionKind, anchorKey).
  type Key = string;
  const buckets = new Map<ResumeSectionKind, Map<Key, BulletRow[]>>();
  for (const b of bullets) {
    const kind = (SECTION_ORDER.includes(b.sectionKind as ResumeSectionKind)
      ? b.sectionKind
      : "other") as ResumeSectionKind;
    const anchorKey = [b.anchorTitle ?? "", b.anchorSubtitle ?? "", b.anchorDateRange ?? ""].join("|");
    if (!buckets.has(kind)) buckets.set(kind, new Map());
    const inner = buckets.get(kind)!;
    if (!inner.has(anchorKey)) inner.set(anchorKey, []);
    inner.get(anchorKey)!.push(b);
  }

  const sections: ResumeContent["sections"] = [];
  let sectionPosition = 0;
  for (const kind of SECTION_ORDER) {
    const inner = buckets.get(kind);
    if (!inner || inner.size === 0) continue;
    const items: ResumeContent["sections"][number]["items"] = [];
    let itemPosition = 0;
    for (const [, group] of inner) {
      // Sort bullets within an item by their stored position.
      group.sort((a, b) => a.position - b.position);
      items.push({
        id: rid(),
        position: itemPosition++,
        title: group[0].anchorTitle ?? undefined,
        subtitle: group[0].anchorSubtitle ?? undefined,
        dateRange: group[0].anchorDateRange ?? undefined,
        bullets: group.map((g, i) => ({
          id: g.id,
          position: i,
          body: g.body,
        })),
      });
    }
    sections.push({ id: rid(), kind, position: sectionPosition++, items });
  }

  return {
    header: header ?? undefined,
    sections,
  };
}

/** Record a MasterBulletRevision with the same 5-minute coalesce
 *  window as ResumeRevision — inside the window, the most recent
 *  revision row is updated in place; outside, a new row is written. */
export async function recordMasterBulletRevision(
  prisma: PrismaClient | Prisma.TransactionClient,
  args: {
    bulletId: string;
    body: string;
    tags: string[];
    source: "user_edit" | "ai_rewrite" | "promoted_from_resume" | "imported_from_pdf";
  },
): Promise<void> {
  const recent = await prisma.masterBulletRevision.findFirst({
    where: { bulletId: args.bulletId },
    orderBy: { createdAt: "desc" },
    select: { id: true, createdAt: true, source: true },
  });

  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  if (
    recent
    && recent.source === args.source
    && recent.createdAt > fiveMinutesAgo
  ) {
    // Coalesce — same source, within window → overwrite the existing
    // row instead of stacking a new one.
    await prisma.masterBulletRevision.update({
      where: { id: recent.id },
      data: { body: args.body, tags: args.tags },
    });
    return;
  }
  await prisma.masterBulletRevision.create({
    data: {
      bulletId: args.bulletId,
      body: args.body,
      tags: args.tags,
      source: args.source,
    },
  });
}
