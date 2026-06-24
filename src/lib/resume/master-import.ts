/**
 * Import a structured ResumeContent's bullets into the user's master
 * bullet library — embed, cosine-dedupe against what's already there
 * (and against each other), and bulk-insert the rest with anchor +
 * section provenance. Optionally copies the source header into the
 * master when the master's header is still empty.
 *
 * Shared by:
 *   • POST /api/profile/resume/master/ai-extract   (from an existing Resume)
 *   • POST /api/profile/resume/master/import-file   (from a dropped file)
 *
 * Throws `EmbeddingUnavailableError` when the embedding service is down
 * so the caller can return a 503 instead of a silent zero-import.
 *
 * See docs/plans/master-resume.md.
 */
import { prisma } from "@/lib/prisma";
import { embed, toVectorLiteral } from "@/lib/ai";
import { getOrCreateMaster, recordMasterBulletRevision } from "@/lib/resume/master";
import type { ResumeContent } from "@/lib/resume/types";

/** Cosine-similarity threshold above which a candidate bullet is
 *  treated as already in the library. 0.92 catches near-duplicates
 *  ("led the team" vs "led the team of 8") while letting genuinely new
 *  phrasing land. */
const DEDUPE_SIMILARITY = 0.92;
const DEDUPE_DISTANCE = 1 - DEDUPE_SIMILARITY; // pgvector <=> is distance

/** Cloudflare BGE accepts ~100 strings per request; cap to keep the
 *  embed a single batched call. */
const MAX_BULLETS_PER_CALL = 100;

export class EmbeddingUnavailableError extends Error {
  constructor() {
    super("Embedding service unavailable.");
    this.name = "EmbeddingUnavailableError";
  }
}

export interface MasterImportResult {
  created: number;
  skipped: number;
  total: number;
  headerCopied: boolean;
  note?: string;
}

interface CandidateBullet {
  sectionKind: string;
  anchorTitle: string | null;
  anchorSubtitle: string | null;
  anchorDateRange: string | null;
  body: string;
}

/** Walk the structured Resume tree into candidate bullets.
 *
 *  Items WITH bullets contribute one candidate per bullet, anchored to
 *  the item (job / degree / project). Items with NO bullets — summary,
 *  certifications, publications, conferences, awards, and any bare
 *  education / project — would otherwise be lost, so we synthesize a
 *  single line from the item's own fields. A header-only professional
 *  summary is captured too. Empty bodies are dropped. */
function flattenResume(content: ResumeContent): CandidateBullet[] {
  const out: CandidateBullet[] = [];
  for (const section of content.sections ?? []) {
    const kind = section.kind || "other";
    for (const item of section.items ?? []) {
      const anchorTitle = item.title?.trim() || null;
      const anchorSubtitle = item.subtitle?.trim() || null;
      const formattedDates = formatItemDateRange(item);
      const anchorDateRange = formattedDates || item.dateRange?.trim() || null;

      const bullets = (item.bullets ?? []).map((b) => (b.body ?? "").trim()).filter(Boolean);
      if (bullets.length > 0) {
        for (const body of bullets) {
          out.push({ sectionKind: kind, anchorTitle, anchorSubtitle, anchorDateRange, body });
        }
      } else {
        // Flat one-liner — the body holds everything, so no anchor header.
        const body = composeItemBody(item, anchorDateRange);
        if (body) out.push({ sectionKind: kind, anchorTitle: null, anchorSubtitle: null, anchorDateRange: null, body });
      }
    }
  }
  // Capture a professional summary even when the parser only put it in
  // the header (no dedicated Summary section).
  const headerSummary = (content.header?.summary ?? "").trim();
  if (headerSummary && !out.some((c) => c.sectionKind === "summary")) {
    out.push({ sectionKind: "summary", anchorTitle: null, anchorSubtitle: null, anchorDateRange: null, body: headerSummary });
  }
  return out;
}

/** A readable single line for a bullet-less item — folds title,
 *  subtitle, metric, dates, and description together so nothing is
 *  lost when the section has no bullets. */
function composeItemBody(
  item: { title?: string; subtitle?: string; metric?: string; description?: string },
  dateRange: string | null,
): string {
  const head = [item.title?.trim(), item.subtitle?.trim()].filter(Boolean).join(" — ");
  const bits: string[] = [];
  if (head) bits.push(head);
  if (item.metric?.trim()) bits.push(item.metric.trim());
  if (dateRange) bits.push(dateRange);
  let line = bits.join(" · ");
  const desc = item.description?.trim();
  if (desc && desc !== line) line = line ? `${line}. ${desc}` : desc;
  return line.trim();
}

function formatItemDateRange(item: { startDate?: string; endDate?: string; current?: boolean }): string {
  const s = (item.startDate ?? "").trim();
  const e = (item.endDate ?? "").trim();
  if (item.current) return s ? `${s} – Present` : "Present";
  if (s && e) return `${s} – ${e}`;
  if (s) return s;
  if (e) return e;
  return "";
}

interface HeaderFields {
  name?: unknown; email?: unknown; phone?: unknown; location?: unknown; summary?: unknown;
}
function isHeaderEmpty(header: unknown): boolean {
  if (!header || typeof header !== "object") return true;
  const h = header as HeaderFields;
  return [h.name, h.email, h.phone, h.location, h.summary].every(
    (v) => typeof v !== "string" || v.trim() === "",
  );
}

/** Plain cosine similarity over two equal-length vectors. Used for
 *  in-batch dedupe (pgvector only knows about already-inserted rows). */
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

export async function importContentIntoMaster(
  userId: string,
  content: ResumeContent,
  opts: { sourceResumeId?: string | null } = {},
): Promise<MasterImportResult> {
  const sourceResumeId = opts.sourceResumeId ?? null;
  const candidates = flattenResume(content).slice(0, MAX_BULLETS_PER_CALL);
  const total = candidates.length;

  const master = await getOrCreateMaster(prisma, userId);

  // One-way, one-shot header copy: only if the master's header is empty
  // AND the source has at least one populated header field.
  let headerCopied = false;
  const sourceHeader = content.header;
  if (isHeaderEmpty(master.header) && sourceHeader && !isHeaderEmpty(sourceHeader)) {
    await prisma.masterResume.update({
      where: { id: master.id },
      data: { header: sourceHeader as object },
    });
    headerCopied = true;
  }

  if (total === 0) {
    return { created: 0, skipped: 0, total: 0, headerCopied, note: "No bullets found in this resume — nothing to import." };
  }

  const vectors = await embed(candidates.map((c) => c.body), { feature: "master_ai_extract", userId });
  if (!vectors || vectors.length !== candidates.length) {
    throw new EmbeddingUnavailableError();
  }

  // Dedupe each candidate against the existing master via pgvector.
  const decisions: Array<{ candidate: CandidateBullet; vec: number[]; keep: boolean }> = [];
  for (let i = 0; i < candidates.length; i++) {
    const literal = toVectorLiteral(vectors[i]);
    const nearest = await prisma.$queryRawUnsafe<{ distance: number }[]>(
      `SELECT "embedding" <=> $1::vector AS distance
         FROM "MasterBullet"
        WHERE "masterId" = $2 AND "embedding" IS NOT NULL
        ORDER BY distance
        LIMIT 1`,
      literal,
      master.id,
    );
    const dupe = nearest[0] && Number(nearest[0].distance) <= DEDUPE_DISTANCE;
    decisions.push({ candidate: candidates[i], vec: vectors[i], keep: !dupe });
  }

  // Dedupe the batch against itself (a source resume can repeat near-
  // identical bullets). First wins, rest skipped.
  const keptVectors: number[][] = [];
  for (const d of decisions) {
    if (!d.keep) continue;
    if (keptVectors.some((v) => cosineSimilarity(v, d.vec) >= DEDUPE_SIMILARITY)) { d.keep = false; continue; }
    keptVectors.push(d.vec);
  }

  // Next position per (sectionKind, anchorTitle) group so new bullets
  // land at the end of each existing group.
  type GroupKey = string;
  const groupKey = (sectionKind: string, anchorTitle: string | null): GroupKey => `${sectionKind}::${anchorTitle ?? ""}`;
  const neededGroups = Array.from(new Set(
    decisions.filter((d) => d.keep).map((d) => groupKey(d.candidate.sectionKind, d.candidate.anchorTitle)),
  ));
  const positionByGroup = new Map<GroupKey, number>();
  for (const key of neededGroups) {
    const [sectionKind, anchorPart] = key.split("::");
    const anchorTitle = anchorPart === "" ? null : anchorPart;
    const max = await prisma.masterBullet.aggregate({
      where: { masterId: master.id, sectionKind, anchorTitle },
      _max: { position: true },
    });
    positionByGroup.set(key, (max._max.position ?? -1) + 1);
  }

  let created = 0;
  for (const d of decisions) {
    if (!d.keep) continue;
    const key = groupKey(d.candidate.sectionKind, d.candidate.anchorTitle);
    const position = positionByGroup.get(key) ?? 0;
    positionByGroup.set(key, position + 1);

    const newRow = await prisma.masterBullet.create({
      data: {
        masterId: master.id,
        sectionKind: d.candidate.sectionKind,
        anchorTitle: d.candidate.anchorTitle,
        anchorSubtitle: d.candidate.anchorSubtitle,
        anchorDateRange: d.candidate.anchorDateRange,
        body: d.candidate.body,
        tags: [],
        position,
        sourceResumeId,
        embeddingText: d.candidate.body,
      },
      select: { id: true },
    });
    await prisma.$executeRawUnsafe(
      `UPDATE "MasterBullet" SET "embedding" = $1::vector, "updatedAt" = NOW() WHERE "id" = $2`,
      toVectorLiteral(d.vec),
      newRow.id,
    );
    await recordMasterBulletRevision(prisma, {
      bulletId: newRow.id,
      body: d.candidate.body,
      tags: [],
      source: "imported_from_pdf",
    });
    created++;
  }

  return { created, skipped: total - created, total, headerCopied };
}
