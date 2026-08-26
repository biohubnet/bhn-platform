/**
 * Point every course and pathway at its cover art.
 *
 * The images are static files under `public/course-covers/`, so they ship
 * with the deploy and need no object storage. `Course.thumbnail` is
 * rendered by a plain <img>, not next/image, so a root-relative path is
 * all it wants.
 *
 * Filenames are the course code lowercased; pathways use
 * `pathway-<slugified title>`. Both mappings are derived here rather than
 * read from the manifest, so a renamed course surfaces as a missing file
 * instead of silently keeping stale art.
 *
 * Idempotent, and it verifies the file exists on disk before writing the
 * path — a thumbnail pointing at a 404 is worse than no thumbnail, because
 * the card renders a broken image instead of its gradient fallback.
 *
 *   npx tsx prisma/seed-cover-art.ts
 */
import { PrismaClient } from "@prisma/client";
import { existsSync } from "node:fs";
import path from "node:path";

const prisma = new PrismaClient();

const DIR = path.join(process.cwd(), "public", "course-covers");
const URL_BASE = "/course-covers";

const pathwaySlug = (title: string) =>
  "pathway-" + title.toLowerCase().replace(/\s+/g, "-").replace(/\//g, "");

async function main() {
  if (!existsSync(DIR)) throw new Error(`Cover directory not found: ${DIR}`);

  const [courses, pathways] = await Promise.all([
    prisma.course.findMany({
      where: { status: "published" },
      select: { id: true, code: true, title: true, thumbnail: true },
    }),
    prisma.pathway.findMany({
      where: { status: "published" },
      select: { id: true, title: true, thumbnail: true },
    }),
  ]);

  const missing: string[] = [];
  let set = 0, already = 0;

  for (const c of courses) {
    if (!c.code) { missing.push(`${c.title} (no code)`); continue; }
    const file = `${c.code.toLowerCase()}.webp`;
    if (!existsSync(path.join(DIR, file))) { missing.push(c.code); continue; }
    const url = `${URL_BASE}/${file}`;
    if (c.thumbnail === url) { already++; continue; }
    await prisma.course.update({ where: { id: c.id }, data: { thumbnail: url } });
    set++;
  }

  for (const p of pathways) {
    const file = `${pathwaySlug(p.title)}.webp`;
    if (!existsSync(path.join(DIR, file))) { missing.push(p.title); continue; }
    const url = `${URL_BASE}/${file}`;
    if (p.thumbnail === url) { already++; continue; }
    await prisma.pathway.update({ where: { id: p.id }, data: { thumbnail: url } });
    set++;
  }

  console.log(`Courses: ${courses.length} · Pathways: ${pathways.length}`);
  console.log(`  updated: ${set}   already correct: ${already}   no image found: ${missing.length}`);
  if (missing.length) console.log("  MISSING:", missing.join(", "));
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
