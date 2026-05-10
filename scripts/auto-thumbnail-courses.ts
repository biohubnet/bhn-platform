/* Auto-generate AI thumbnails for every course in the catalog.
 *
 * Pipeline per course:
 *   1. Ask the LLM for 3–5 concrete visual elements an illustrator
 *      would draw to evoke this course (title + category + tags +
 *      description as signal).
 *   2. Build an SDXL prompt anchored on those motifs — gives the
 *      model specific things to draw rather than an abstract single
 *      word, so output is topic-accurate instead of generic.
 *   3. Generate via Cloudflare SDXL Lightning, upload to R2 at a
 *      timestamped key, write the URL back to Course.thumbnail.
 *   4. Best-effort delete the previous R2 object so the bucket
 *      doesn't accumulate dead files.
 *
 * Default: regenerates EVERY course (overrides any existing
 * thumbnail). Pass --missing-only to keep existing thumbnails and
 * only fill in gaps.
 *
 * Run:
 *   npx tsx scripts/auto-thumbnail-courses.ts                  # regen all
 *   npx tsx scripts/auto-thumbnail-courses.ts --missing-only   # gaps only
 *   npx tsx scripts/auto-thumbnail-courses.ts --limit 20       # cap batch
 *
 * Reads env: CF_ACCOUNT_ID, CF_AI_TOKEN, R2_*, DATABASE_URL.
 */
import { PrismaClient } from "@prisma/client";
import {
  generateImage,
  extractThumbnailMotifs,
  buildTopicThumbnailPrompt,
  AI_CONFIGURED,
} from "../src/lib/ai";
import {
  putR2Object,
  r2PublicUrl,
  R2_PUBLIC_URL,
  deleteR2ObjectByUrl,
} from "../src/lib/r2";

const prisma = new PrismaClient();

const args = new Set(process.argv.slice(2));
const missingOnly = args.has("--missing-only");
const limitArg = process.argv.find((a) => a.startsWith("--limit"));
const limit = limitArg
  ? Number(limitArg.split("=")[1] ?? process.argv[process.argv.indexOf(limitArg) + 1])
  : Infinity;

// Concurrency cap: SDXL Lightning is fast (4–8s per image) but the
// account-level rate limit on Cloudflare AI is finite; 3 in flight
// keeps us well under the limit and keeps logs readable.
const CONCURRENCY = 3;

async function main() {
  if (!AI_CONFIGURED.image) {
    console.error("Image generation not configured. Set CF_ACCOUNT_ID + CF_AI_TOKEN.");
    process.exit(1);
  }
  if (!R2_PUBLIC_URL) {
    console.error("R2_PUBLIC_URL not set.");
    process.exit(1);
  }

  const where = missingOnly ? { thumbnail: null } : {};
  const courses = await prisma.course.findMany({
    where,
    select: {
      id: true,
      title: true,
      category: true,
      tags: true,
      description: true,
      thumbnail: true,
    },
    orderBy: { createdAt: "asc" },
  });

  const queue = courses.slice(0, isFinite(limit) ? limit : courses.length);
  console.log(
    `Found ${courses.length} candidates; processing ${queue.length} ` +
    `${missingOnly ? "(filling gaps)" : "(regenerating all)"}.`,
  );
  if (queue.length === 0) {
    console.log("Nothing to do.");
    return;
  }

  let cursor = 0;
  let done = 0;
  let failed = 0;

  async function worker(workerId: number) {
    while (true) {
      const i = cursor++;
      if (i >= queue.length) return;
      const c = queue[i];
      const tag = `[${workerId}] ${i + 1}/${queue.length}  ${c.title}`;
      try {
        // 1. Motif extraction — what objects should the illustrator draw?
        const motifs = await extractThumbnailMotifs(
          {
            title: c.title,
            category: c.category,
            tags: c.tags,
            description: c.description,
          },
          { feature: "thumbnail_motif_batch" },
        );

        // 2. Build a topic-anchored SDXL prompt around those motifs.
        const prompt = buildTopicThumbnailPrompt({
          title: c.title,
          category: c.category,
          motifs,
        });

        // 3. Render.
        const png = await generateImage(prompt, { feature: "thumbnail_course_batch", steps: 8 });
        if (!png) {
          console.error(`${tag} — generation returned null`);
          failed++;
          continue;
        }

        // 4. Upload to R2 at a timestamped key. Old URLs keep working
        //    until the best-effort cleanup below; in-flight page
        //    views never 404 mid-regen.
        const key = `thumbnails/courses/${c.id}/${Date.now()}.png`;
        await putR2Object(key, Buffer.from(png), "image/png");
        const url = r2PublicUrl(key);
        const previousUrl = c.thumbnail;
        await prisma.course.update({ where: { id: c.id }, data: { thumbnail: url } });

        // 5. Best-effort delete of the prior R2 object (only when we
        //    actually regenerated over an existing one).
        if (previousUrl && previousUrl !== url) {
          try {
            await deleteR2ObjectByUrl(previousUrl);
          } catch {
            // Non-fatal — leaves an orphan but doesn't fail the run.
          }
        }

        done++;
        console.log(`${tag} — motifs: [${motifs.join(", ")}] -> ${url}`);
      } catch (e) {
        failed++;
        console.error(`${tag} — error:`, (e as Error).message);
      }
    }
  }

  await Promise.all(
    Array.from({ length: CONCURRENCY }, (_, n) => worker(n + 1)),
  );

  console.log(
    `\nDone. ${done} updated, ${failed} failed, ${queue.length - done - failed} skipped.`,
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    return prisma.$disconnect().then(() => process.exit(1));
  });
