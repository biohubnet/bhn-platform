/* Auto-generate AI thumbnails for every course that doesn't already
 * have one. Picks a single representative word per course (chooseOneWord)
 * and renders an editorial brand-blue thumbnail via Cloudflare SDXL,
 * uploads to R2, then writes the URL back to Course.thumbnail.
 *
 * Idempotent: skips courses with an existing thumbnail unless --force.
 *
 * Run:
 *   npx tsx scripts/auto-thumbnail-courses.ts             # only missing
 *   npx tsx scripts/auto-thumbnail-courses.ts --force     # regenerate all
 *   npx tsx scripts/auto-thumbnail-courses.ts --limit 20  # cap batch
 *
 * Reads env: CF_ACCOUNT_ID, CF_AI_TOKEN, R2_*, DATABASE_URL.
 */
import { PrismaClient } from "@prisma/client";
import {
  generateImage,
  buildOneWordThumbnailPrompt,
  chooseOneWord,
  AI_CONFIGURED,
} from "../src/lib/ai";
import { putR2Object, r2PublicUrl, R2_PUBLIC_URL } from "../src/lib/r2";

const prisma = new PrismaClient();

const args = new Set(process.argv.slice(2));
const force = args.has("--force");
const limitArg = process.argv.find((a) => a.startsWith("--limit"));
const limit = limitArg
  ? Number(limitArg.split("=")[1] ?? process.argv[process.argv.indexOf(limitArg) + 1])
  : Infinity;

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

  const where = force ? {} : { thumbnail: null };
  const courses = await prisma.course.findMany({
    where,
    select: { id: true, title: true, category: true, thumbnail: true },
    orderBy: { createdAt: "asc" },
  });

  const queue = courses.slice(0, isFinite(limit) ? limit : courses.length);
  console.log(
    `Found ${courses.length} candidates; processing ${queue.length} ${force ? "(forced)" : "(missing only)"}.`
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
      const word = chooseOneWord(c);
      const prompt = buildOneWordThumbnailPrompt(word);
      const tag = `[${workerId}] ${i + 1}/${queue.length}  ${c.title}`;
      try {
        const png = await generateImage(prompt, { feature: "thumbnail_course_batch" });
        if (!png) {
          console.error(`${tag} — generation returned null`);
          failed++;
          continue;
        }
        const key = `thumbnails/courses/${c.id}/${Date.now()}.png`;
        await putR2Object(key, Buffer.from(png), "image/png");
        const url = r2PublicUrl(key);
        await prisma.course.update({ where: { id: c.id }, data: { thumbnail: url } });
        done++;
        console.log(`${tag} — "${word}" -> ${url}`);
      } catch (e) {
        failed++;
        console.error(`${tag} — error:`, (e as Error).message);
      }
    }
  }

  await Promise.all(
    Array.from({ length: CONCURRENCY }, (_, n) => worker(n + 1))
  );

  console.log(`\nDone. ${done} updated, ${failed} failed, ${queue.length - done - failed} skipped.`);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    return prisma.$disconnect().then(() => process.exit(1));
  });
