/* Manually trigger the same idempotent changelog upsert that runs on
 * every /changelog page load. Useful for filling in entries before
 * anyone visits the page (eg. right after a deploy).
 *
 * Run: npx tsx scripts/seed-changelog.ts
 */
import { PrismaClient } from "@prisma/client";
import { CHANGELOG_ENTRIES } from "../src/lib/changelog/entries";

const prisma = new PrismaClient();

async function main() {
  const existing = await prisma.changeLog.findMany({ select: { title: true } });
  const haveTitles = new Set(existing.map((e) => e.title));
  const missing = CHANGELOG_ENTRIES.filter((e) => !haveTitles.has(e.title));

  if (missing.length === 0) {
    console.log("Up to date — no entries to insert.");
    return;
  }

  for (const e of missing.slice().reverse()) {
    const publishedAt = new Date(Date.now() - e.daysAgo * 24 * 60 * 60 * 1000);
    await prisma.changeLog.create({
      data: {
        title: e.title,
        body: e.body,
        kind: e.kind,
        visibleTo: e.visibleTo,
        publishedAt,
      },
    });
    console.log(`+ ${e.title}`);
  }

  console.log(`\nInserted ${missing.length} entries.`);
}

main()
  .then(() => prisma.$disconnect())
  .catch((err) => {
    console.error(err);
    return prisma.$disconnect().then(() => process.exit(1));
  });
