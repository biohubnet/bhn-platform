/**
 * Grounding: the ONLY source of truth for drafting. Pulls career facts
 * from the user's master library (MasterBullet, extended with the
 * structured metric/mechanism/confidence fields) — by JD relevance
 * (pgvector cosine) or the full active set. Drafting may only cite
 * these; anything not here must be FLAGGED, never invented (rule 1).
 */
import { prisma } from "@/lib/prisma";
import { embed, toVectorLiteral } from "@/lib/ai";

export interface Fact {
  id: string;
  sectionKind: string;
  anchorTitle: string | null;
  anchorSubtitle: string | null;
  anchorDateRange: string | null;
  body: string;
  metric: string | null;
  mechanism: string | null;
  confidence: number | null;
}

const SELECT = {
  id: true, sectionKind: true, anchorTitle: true, anchorSubtitle: true,
  anchorDateRange: true, body: true, metric: true, mechanism: true, confidence: true,
} as const;

/** Every active fact in the user's library (cap for prompt safety). */
export async function loadFacts(userId: string, cap = 150): Promise<Fact[]> {
  return prisma.masterBullet.findMany({
    where: { master: { userId }, isArchived: false },
    orderBy: [{ sectionKind: "asc" }, { position: "asc" }],
    take: cap,
    select: SELECT,
  });
}

/** Top-k facts by cosine similarity to a query (the whole JD, or one
 *  requirement). Falls back to loadFacts when embeddings are absent or
 *  the embed call fails — drafting is never left ungrounded. */
export async function retrieveFacts(userId: string, query: string, k = 40): Promise<Fact[]> {
  const vecs = await embed([query]).catch(() => null);
  const vec = vecs?.[0];
  if (!vec) return (await loadFacts(userId)).slice(0, k);
  try {
    const rows = await prisma.$queryRawUnsafe<Fact[]>(
      `SELECT b."id", b."sectionKind", b."anchorTitle", b."anchorSubtitle",
              b."anchorDateRange", b."body", b."metric", b."mechanism", b."confidence"
         FROM "MasterBullet" b
         JOIN "MasterResume" m ON m."id" = b."masterId"
        WHERE m."userId" = $2 AND b."isArchived" = false AND b."embedding" IS NOT NULL
        ORDER BY b."embedding" <=> $1::vector
        LIMIT $3`,
      toVectorLiteral(vec), userId, k,
    );
    if (rows.length) return rows;
  } catch { /* fall through */ }
  return (await loadFacts(userId)).slice(0, k);
}

/** Render facts as a compact, ID-tagged block for the prompt. The
 *  drafter cites bullet ids; the verifier traces numbers back to this. */
export function factsToContext(facts: Fact[]): string {
  return facts.map((f) => {
    const anchor = [f.anchorTitle, f.anchorSubtitle, f.anchorDateRange].filter(Boolean).join(" · ");
    const extra = [f.metric ? `metric: ${f.metric}` : "", f.mechanism ? `how: ${f.mechanism}` : ""].filter(Boolean).join(" | ");
    return `[${f.id}] (${f.sectionKind}${anchor ? " — " + anchor : ""}) ${f.body}${extra ? `  {${extra}}` : ""}`;
  }).join("\n");
}

/** All numeric tokens present across the facts — the allow-list the
 *  fabrication check traces draft numbers against. */
export function factNumbers(facts: Fact[]): Set<string> {
  const out = new Set<string>();
  for (const f of facts) {
    const text = `${f.body} ${f.metric ?? ""} ${f.mechanism ?? ""} ${f.anchorDateRange ?? ""}`;
    for (const m of text.matchAll(/\d[\d,.]*/g)) out.add(normalizeNum(m[0]));
  }
  return out;
}

export function normalizeNum(s: string): string {
  return s.replace(/[,]/g, "").replace(/\.0+$/, "").replace(/\.$/, "");
}
