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

async function main() {
  const client = getAlgoliaClient();

  const [users, courses, postings] = await Promise.all([
    prisma.user.findMany({
      where: { accountKind: "real" },
      select: { id: true, name: true, email: true, role: true },
    }),
    prisma.course.findMany({
      select: { id: true, title: true, code: true },
    }),
    prisma.internshipPosting.findMany({
      select: { id: true, title: true, companyName: true },
    }),
  ]);

  await client.setSettings({
    indexName: ALGOLIA_INDEX.users,
    indexSettings: { searchableAttributes: ["name", "email"] },
  });
  await client.setSettings({
    indexName: ALGOLIA_INDEX.courses,
    indexSettings: { searchableAttributes: ["title", "code"] },
  });
  await client.setSettings({
    indexName: ALGOLIA_INDEX.postings,
    indexSettings: { searchableAttributes: ["title", "companyName"] },
  });

  await client.saveObjects({
    indexName: ALGOLIA_INDEX.users,
    objects: users.map((u) => ({ objectID: u.id, ...u })),
  });
  await client.saveObjects({
    indexName: ALGOLIA_INDEX.courses,
    objects: courses.map((c) => ({ objectID: c.id, ...c })),
  });
  await client.saveObjects({
    indexName: ALGOLIA_INDEX.postings,
    objects: postings.map((p) => ({ objectID: p.id, ...p })),
  });

  console.log(
    `Synced ${users.length} users, ${courses.length} courses, ${postings.length} postings to Algolia.`,
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
