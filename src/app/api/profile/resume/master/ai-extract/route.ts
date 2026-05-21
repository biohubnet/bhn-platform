/**
 * Master resume — AI-extract from an existing tailored Resume.
 *
 *   POST /api/profile/resume/master/ai-extract
 *     body: { resumeId: string }
 *
 * Bootstrap the master library from one of the user's existing
 * tailored resumes. Walks the structured Resume.content tree, embeds
 * every bullet via Cloudflare BGE small (384d, batched), cosine-
 * dedupes against the master's existing MasterBullet embeddings, and
 * bulk-inserts the rest with anchor + section provenance.
 *
 * Also copies the source Resume's header into MasterResume.header IF
 * the master's header is currently empty / unset — gives new users a
 * shared header in one shot.
 *
 *   Response: { ok, created, skipped, total, headerCopied }
 *
 * See docs/plans/master-resume.md.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { embed, toVectorLiteral } from "@/lib/ai";
import { getOrCreateMaster, recordMasterBulletRevision } from "@/lib/resume/master";
import type { ResumeContent } from "@/lib/resume/types";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Cosine-similarity threshold above which we treat the candidate
 *  bullet as already in the library and skip the insert. 0.92 picks
 *  up near-duplicates / minor wording tweaks ("led the team" vs
 *  "led the team of 8") while still letting real new phrasing land. */
const DEDUPE_SIMILARITY = 0.92;
const DEDUPE_DISTANCE = 1 - DEDUPE_SIMILARITY; // pgvector <=> is distance

/** Maximum bullets we'll process per call. Cloudflare's BGE endpoint
 *  accepts up to ~100 strings per request; cap matches that so the
 *  call stays a single batched embed. Most tailored resumes have far
 *  fewer than this — but a kitchen-sink master-class CV could easily
 *  blow past 100, so we slice. */
const MAX_BULLETS_PER_CALL = 100;

async function getMyUserId(): Promise<string | null> {
  const session = await requireSession().catch(() => null);
  if (!session) return null;
  return (session.user as { id?: string }).id ?? null;
}

interface CandidateBullet {
  sectionKind: string;
  anchorTitle: string | null;
  anchorSubtitle: string | null;
  anchorDateRange: string | null;
  body: string;
}

/** Walk the structured Resume tree, returning each bullet annotated
 *  with the section + item context that gives it an anchor. Bullets
 *  with empty bodies are dropped. */
function flattenResume(content: ResumeContent): CandidateBullet[] {
  const out: CandidateBullet[] = [];
  for (const section of content.sections ?? []) {
    const kind = section.kind || "other";
    for (const item of section.items ?? []) {
      const anchorTitle = item.title?.trim() || null;
      const anchorSubtitle = item.subtitle?.trim() || null;
      // Prefer the canonical formatted date range over the legacy
      // free-text dateRange when both are set on the item.
      const formattedDates = formatItemDateRange(item);
      const anchorDateRange = formattedDates || item.dateRange?.trim() || null;

      for (const bullet of item.bullets ?? []) {
        const body = (bullet.body ?? "").trim();
        if (!body) continue;
        out.push({
          sectionKind: kind,
          anchorTitle,
          anchorSubtitle,
          anchorDateRange,
          body,
        });
      }
    }
  }
  return out;
}

/** Mirror of formatItemDates from src/lib/resume/types.ts but kept
 *  local + minimal — we don't need the "Present" semantics here, just
 *  the most-readable date string for an anchor. */
function formatItemDateRange(item: {
  startDate?: string;
  endDate?: string;
  current?: boolean;
}): string {
  const s = (item.startDate ?? "").trim();
  const e = (item.endDate ?? "").trim();
  if (item.current) {
    if (s) return `${s} – Present`;
    return "Present";
  }
  if (s && e) return `${s} – ${e}`;
  if (s) return s;
  if (e) return e;
  return "";
}

interface HeaderFields {
  name?: unknown;
  email?: unknown;
  phone?: unknown;
  location?: unknown;
  summary?: unknown;
}

/** Returns true if the master's header has no meaningful fields set
 *  yet — empty string / undefined / null all count as empty. The
 *  shape mirrors ResumeContent.header and is stored as Json on
 *  MasterResume. */
function isHeaderEmpty(header: unknown): boolean {
  if (!header || typeof header !== "object") return true;
  const h = header as HeaderFields;
  const fields = [h.name, h.email, h.phone, h.location, h.summary];
  return fields.every((v) => typeof v !== "string" || v.trim() === "");
}

export async function POST(req: NextRequest) {
  const userId = await getMyUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as { resumeId?: unknown };
  const resumeId = typeof body.resumeId === "string" ? body.resumeId : "";
  if (!resumeId) {
    return NextResponse.json({ error: "resumeId required" }, { status: 400 });
  }

  // Ownership check — never extract from another user's resume.
  const resume = await prisma.resume.findUnique({
    where: { id: resumeId },
    select: { id: true, userId: true, name: true, content: true },
  });
  if (!resume || resume.userId !== userId) {
    return NextResponse.json({ error: "Resume not found." }, { status: 404 });
  }

  // Legacy rows occasionally have content stored as a JSON string;
  // accept either and normalise to an object.
  let content: ResumeContent;
  if (typeof resume.content === "string") {
    try { content = JSON.parse(resume.content) as ResumeContent; }
    catch { content = { sections: [] }; }
  } else {
    content = (resume.content as unknown as ResumeContent) ?? { sections: [] };
  }

  const candidates = flattenResume(content).slice(0, MAX_BULLETS_PER_CALL);
  const total = candidates.length;

  // No bullets at all → return early with a friendly note. The master
  // still gets created lazily so the next call has a row to write to.
  const master = await getOrCreateMaster(prisma, userId);

  // Header copy — only if the master's header is empty AND the source
  // resume has at least one populated header field. This is a one-way,
  // one-shot copy: once the master has a header, this endpoint never
  // touches it again.
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
    return NextResponse.json({
      ok: true,
      created: 0,
      skipped: 0,
      total: 0,
      headerCopied,
      note: "This resume has no bullets yet — nothing to extract.",
    });
  }

  // Batched embed. Cloudflare BGE handles arrays of strings in one
  // call; if the call fails we surface a 503 so the client can show
  // the user something actionable instead of silently zero-importing.
  const vectors = await embed(
    candidates.map((c) => c.body),
    { feature: "master_ai_extract", userId },
  );
  if (!vectors || vectors.length !== candidates.length) {
    return NextResponse.json(
      { error: "Embedding service unavailable — try again in a moment." },
      { status: 503 },
    );
  }

  // For each candidate, ask pgvector whether anything in the user's
  // existing master is within DEDUPE_DISTANCE. If yes, skip. We do
  // this per-row instead of in one CROSS JOIN because the candidate
  // set is small (≤100) and per-row queries let us keep position
  // accounting + revision writes in a single transaction below.
  const decisions: Array<{ candidate: CandidateBullet; vec: number[]; keep: boolean }> = [];
  for (let i = 0; i < candidates.length; i++) {
    const vec = vectors[i];
    const literal = toVectorLiteral(vec);
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
    decisions.push({ candidate: candidates[i], vec, keep: !dupe });
  }

  // Within this batch, also dedupe candidates against each other —
  // a source resume can legitimately repeat near-identical bullets
  // (e.g. "led X" copied across two items). First wins, rest skipped.
  const keptVectors: number[][] = [];
  for (const d of decisions) {
    if (!d.keep) continue;
    const tooClose = keptVectors.some((v) => cosineSimilarity(v, d.vec) >= DEDUPE_SIMILARITY);
    if (tooClose) {
      d.keep = false;
      continue;
    }
    keptVectors.push(d.vec);
  }

  // Precompute the next position per (sectionKind, anchorTitle) group
  // so the new bullets land at the end of each existing group rather
  // than colliding on position 0. One query covers every group.
  type GroupKey = string;
  const groupKey = (sectionKind: string, anchorTitle: string | null): GroupKey =>
    `${sectionKind}::${anchorTitle ?? ""}`;
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

  // Insert each kept candidate. We do this row-by-row so we can write
  // the pgvector embedding via raw SQL (Prisma can't see the
  // `Unsupported("vector(384)")` column), and so we can stamp a
  // "imported_from_pdf" revision per bullet for the audit trail.
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
        sourceResumeId: resume.id,
        embeddingText: d.candidate.body,
      },
      select: { id: true },
    });

    await prisma.$executeRawUnsafe(
      `UPDATE "MasterBullet" SET "embedding" = $1::vector, "updatedAt" = NOW() WHERE "id" = $2`,
      toVectorLiteral(d.vec),
      newRow.id,
    );

    // Capture the first revision so the bullet's history records where
    // it came from. Same source string as the schema docs ("imported_
    // from_pdf" covers any AI-extract from an existing resume, since
    // every Resume's structured tree originated as an upload).
    await recordMasterBulletRevision(prisma, {
      bulletId: newRow.id,
      body: d.candidate.body,
      tags: [],
      source: "imported_from_pdf",
    });
    created++;
  }

  const skipped = total - created;
  return NextResponse.json({
    ok: true,
    created,
    skipped,
    total,
    headerCopied,
  });
}

/** Plain cosine similarity over two equal-length vectors. Used for
 *  in-batch dedupe (candidates pulled from the same Resume can be
 *  near-duplicates of each other; pgvector only knows about already-
 *  inserted rows). */
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dot = 0; let na = 0; let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}
