/**
 * One-off: bulk-upload SCORM zips from a local directory. Creates a
 * Course per zip, extracts to /tmp, streams every file to R2, and
 * persists the ScormPackage row.
 *
 * Run: npx tsx scripts/bulk-upload-scorm.ts <zip-dir> [--instructorEmail you@example.com]
 */
import "dotenv/config";
import fs from "fs";
import os from "os";
import path from "path";
import unzipper from "unzipper";
import { PrismaClient } from "@prisma/client";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { parseStringPromise } from "xml2js";

const prisma = new PrismaClient();

const CF_ACCOUNT = process.env.R2_ACCOUNT_ID!;
const R2_KEY    = process.env.R2_ACCESS_KEY_ID!;
const R2_SECRET = process.env.R2_SECRET_ACCESS_KEY!;
const R2_BUCKET = process.env.R2_BUCKET || "bhn-scorm";
if (!CF_ACCOUNT || !R2_KEY || !R2_SECRET) {
  console.error("Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY in .env");
  process.exit(1);
}

const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${CF_ACCOUNT}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: R2_KEY, secretAccessKey: R2_SECRET },
});

function contentTypeFor(filename: string) {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    html: "text/html; charset=utf-8", htm: "text/html; charset=utf-8",
    js: "application/javascript; charset=utf-8", mjs: "application/javascript; charset=utf-8",
    css: "text/css; charset=utf-8",
    json: "application/json; charset=utf-8",
    xml: "application/xml; charset=utf-8",
    svg: "image/svg+xml", png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg",
    gif: "image/gif", webp: "image/webp", ico: "image/x-icon",
    mp3: "audio/mpeg", mp4: "video/mp4", webm: "video/webm",
    woff: "font/woff", woff2: "font/woff2", ttf: "font/ttf",
    pdf: "application/pdf", zip: "application/zip",
    txt: "text/plain; charset=utf-8",
  };
  return map[ext] ?? "application/octet-stream";
}

interface ParsedManifest { title: string; entryPoint: string; version: string }

async function parseManifest(xml: string): Promise<ParsedManifest> {
  const parsed = await parseStringPromise(xml, { explicitArray: false, ignoreAttrs: false });
  const m = parsed.manifest;
  const orgs = m.organizations;
  const org = Array.isArray(orgs.organization) ? orgs.organization[0] : orgs.organization;
  const title = (Array.isArray(org.title) ? org.title[0] : org.title) ?? "Untitled";

  const resources = m.resources;
  const res = Array.isArray(resources.resource) ? resources.resource[0] : resources.resource;
  const entryPoint = res.$?.href ?? "index.html";

  const meta = m.metadata;
  const schemaVersion = meta?.schemaversion ?? "1.2";
  const version = String(schemaVersion).startsWith("2004") ? "SCORM_2004" : "SCORM_12";

  return { title: String(title).trim(), entryPoint, version };
}

async function uploadCourse(zipPath: string, instructorId?: string | null) {
  console.log(`\n→ ${path.basename(zipPath)}`);
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "scorm-bulk-"));
  try {
    // Extract
    await new Promise<void>((resolve, reject) => {
      fs.createReadStream(zipPath)
        .pipe(unzipper.Extract({ path: tmpDir }))
        .on("close", resolve)
        .on("error", reject);
    });

    const manifestPath = path.join(tmpDir, "imsmanifest.xml");
    if (!fs.existsSync(manifestPath)) {
      console.log("  ✗ no imsmanifest.xml — skipped");
      return;
    }
    const manifestXml = fs.readFileSync(manifestPath, "utf-8");
    const manifest = await parseManifest(manifestXml);

    // Create course shell
    const titleSlug = manifest.title.replace(/\s+/g, "-").toLowerCase();
    const description = `SCORM 1.2 / 2004 module — ${manifest.title}`;
    const existing = await prisma.course.findFirst({ where: { title: manifest.title } });
    const course = existing
      ? await prisma.course.update({
          where: { id: existing.id },
          data: { status: "published" },
        })
      : await prisma.course.create({
          data: {
            title: manifest.title,
            description,
            category: "BHN",
            status: "published",
            courseType: "scorm",
            passingScore: 80,
            instructorId: instructorId ?? null,
          },
        });
    console.log(`  course: ${course.title} (${course.id}) [${existing ? "updated" : "created"}]`);

    // Walk + upload
    const files: { abs: string; rel: string }[] = [];
    function walk(dir: string, base = "") {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const abs = path.join(dir, e.name);
        const rel = base ? `${base}/${e.name}` : e.name;
        if (e.isDirectory()) walk(abs, rel);
        else if (e.isFile()) files.push({ abs, rel });
      }
    }
    walk(tmpDir);

    const r2Prefix = `scorm/${course.id}`;
    let uploaded = 0;
    const concurrency = 6;
    for (let i = 0; i < files.length; i += concurrency) {
      await Promise.all(files.slice(i, i + concurrency).map(async ({ abs, rel }) => {
        const Body = fs.readFileSync(abs);
        await r2.send(new PutObjectCommand({
          Bucket: R2_BUCKET,
          Key: `${r2Prefix}/${rel}`,
          Body,
          ContentType: contentTypeFor(rel),
        }));
        uploaded++;
      }));
    }
    console.log(`  uploaded ${uploaded} files → R2 ${r2Prefix}`);

    // Same-origin proxy path so SCORM ↔ LMS API works
    const uploadPath = `/scorm-files/${course.id}`;

    await prisma.scormPackage.upsert({
      where: { courseId: course.id },
      update: {
        version: manifest.version,
        entryPoint: manifest.entryPoint,
        manifestData: JSON.stringify(manifest),
        uploadPath,
      },
      create: {
        courseId: course.id,
        version: manifest.version,
        entryPoint: manifest.entryPoint,
        manifestData: JSON.stringify(manifest),
        uploadPath,
      },
    });
    void titleSlug;
    console.log(`  ✓ ScormPackage ready · ${manifest.version} · ${manifest.entryPoint}`);
  } finally {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
  }
}

async function main() {
  const dir = process.argv[2];
  const idx = process.argv.indexOf("--instructorEmail");
  const instructorEmail = idx >= 0 ? process.argv[idx + 1] : null;
  if (!dir) {
    console.error("Usage: npx tsx scripts/bulk-upload-scorm.ts <dir> [--instructorEmail email]");
    process.exit(1);
  }

  let instructorId: string | null = null;
  if (instructorEmail) {
    const u = await prisma.user.findUnique({ where: { email: instructorEmail }, select: { id: true } });
    instructorId = u?.id ?? null;
    if (!instructorId) console.warn(`! No user with email ${instructorEmail}; courses will have no instructor.`);
  }

  const zips = fs.readdirSync(dir).filter((f) => f.toLowerCase().endsWith(".zip"));
  console.log(`Found ${zips.length} zip(s) in ${dir}`);

  for (const z of zips) {
    try {
      await uploadCourse(path.join(dir, z), instructorId);
    } catch (e) {
      console.error(`  ✗ ${z}:`, (e as Error).message);
    }
  }
}

main().then(() => prisma.$disconnect()).catch((e) => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});
