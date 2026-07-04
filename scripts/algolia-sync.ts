/**
 * One-off / re-runnable sync from Postgres into the 3 Algolia indices used
 * by the admin global search box. Run with:
 *   npx tsx scripts/algolia-sync.ts
 */
import { config } from "dotenv";
// Mirror Next.js's own precedence: .env first, then .env.local overrides —
// the Algolia keys live in .env.local alongside the other local-only secrets.
config({ path: ".env" });
config({ path: ".env.local", override: true });

import { prisma } from "../src/lib/prisma";
import { getAlgoliaClient, ALGOLIA_INDEX } from "../src/lib/algolia";

// Domain-specific synonym sets — real abbreviations that show up in this
// platform's actual course/posting titles (e.g. "Biologics_mAb_Manufacturing",
// "Upstream Bioprocessing (R&D)", "QA/QC (Analytics) for Biologics",
// "Bioprocess Development Intern"). Two-way ("synonym") so either form finds
// the other.
const COURSE_SYNONYMS: { objectID: string; synonyms: string[] }[] = [
  { objectID: "mab", synonyms: ["mAb", "monoclonal antibody", "monoclonal antibodies"] },
  { objectID: "rnd", synonyms: ["R&D", "research and development"] },
  { objectID: "qaqc", synonyms: ["QA/QC", "quality assurance", "quality control"] },
  { objectID: "bioprocessing", synonyms: ["bioprocessing", "bioprocess"] },
];
const POSTING_SYNONYMS: { objectID: string; synonyms: string[] }[] = [
  { objectID: "intern", synonyms: ["intern", "internship", "co-op", "coop"] },
];

async function main() {
  const client = getAlgoliaClient();

  const [users, courses, postings] = await Promise.all([
    prisma.user.findMany({
      where: { accountKind: "real" },
      select: { id: true, name: true, email: true, role: true, isActive: true },
    }),
    prisma.course.findMany({
      select: { id: true, title: true, code: true, status: true },
    }),
    prisma.internshipPosting.findMany({
      select: { id: true, title: true, companyName: true, status: true, createdAt: true },
    }),
  ]);

  await client.setSettings({
    indexName: ALGOLIA_INDEX.users,
    indexSettings: {
      searchableAttributes: ["name", "email"],
      // Active accounts rank first — accountKind is already filtered to
      // "real" above, so this only separates deactivated from active users.
      customRanking: ["desc(isActive)"],
    },
  });
  await client.setSettings({
    indexName: ALGOLIA_INDEX.courses,
    indexSettings: {
      searchableAttributes: ["title", "code"],
      // Published courses outrank drafts/archived for the same query match.
      customRanking: ["desc(isPublished)"],
    },
  });
  await client.setSettings({
    indexName: ALGOLIA_INDEX.postings,
    indexSettings: {
      searchableAttributes: ["title", "companyName"],
      // Open postings first, then newest-first as a tiebreaker.
      customRanking: ["desc(isOpen)", "desc(createdAtTs)"],
    },
  });

  await client.saveSynonyms({
    indexName: ALGOLIA_INDEX.courses,
    synonymHit: COURSE_SYNONYMS.map((s) => ({ objectID: s.objectID, type: "synonym", synonyms: s.synonyms })),
  });
  await client.saveSynonyms({
    indexName: ALGOLIA_INDEX.postings,
    synonymHit: POSTING_SYNONYMS.map((s) => ({ objectID: s.objectID, type: "synonym", synonyms: s.synonyms })),
  });

  await client.saveObjects({
    indexName: ALGOLIA_INDEX.users,
    objects: users.map((u) => ({ objectID: u.id, ...u })),
  });
  await client.saveObjects({
    indexName: ALGOLIA_INDEX.courses,
    objects: courses.map((c) => ({
      objectID: c.id,
      ...c,
      isPublished: c.status === "published",
    })),
  });
  await client.saveObjects({
    indexName: ALGOLIA_INDEX.postings,
    objects: postings.map((p) => ({
      objectID: p.id,
      ...p,
      isOpen: p.status === "active",
      createdAtTs: p.createdAt.getTime(),
    })),
  });

  console.log(
    `Synced ${users.length} users, ${courses.length} courses, ${postings.length} postings to Algolia ` +
      `(+ ${COURSE_SYNONYMS.length} course synonym groups, ${POSTING_SYNONYMS.length} posting synonym group, customRanking on all 3 indices).`,
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
