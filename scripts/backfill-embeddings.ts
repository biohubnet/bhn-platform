/**
 * One-off: embed every Course/Pathway and write to pgvector.
 * Reads CF_ACCOUNT_ID + CF_AI_TOKEN from .env.
 * Run: npx tsx scripts/backfill-embeddings.ts
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const CF_ACCOUNT = process.env.CF_ACCOUNT_ID!;
const CF_TOKEN   = process.env.CF_AI_TOKEN!;
if (!CF_ACCOUNT || !CF_TOKEN) {
  console.error("Set CF_ACCOUNT_ID and CF_AI_TOKEN in .env");
  process.exit(1);
}

async function embed(texts: string[]): Promise<number[][]> {
  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT}/ai/run/@cf/baai/bge-small-en-v1.5`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${CF_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({ text: texts }),
    }
  );
  const j = await res.json();
  if (!j.success) throw new Error(JSON.stringify(j.errors));
  return j.result.data as number[][];
}

function literal(v: number[]) { return `[${v.join(",")}]`; }

async function main() {
  const courses = await prisma.course.findMany({
    select: { id: true, title: true, description: true, category: true },
  });
  const pathways = await prisma.pathway.findMany({
    select: { id: true, title: true, description: true, category: true },
  });

  console.log(`Embedding ${courses.length} courses + ${pathways.length} pathways…`);

  async function embedTable<T extends { id: string; title: string; description: string | null; category: string | null }>(
    rows: T[],
    table: "Course" | "Pathway"
  ) {
    for (let i = 0; i < rows.length; i += 20) {
      const batch = rows.slice(i, i + 20);
      const texts = batch.map((r) => `${r.category ? r.category + " · " : ""}${r.title}\n\n${r.description ?? ""}`);
      const vectors = await embed(texts);
      for (let k = 0; k < batch.length; k++) {
        await prisma.$executeRawUnsafe(
          `UPDATE "${table}" SET "embedding" = $1::vector, "embeddedAt" = NOW() WHERE "id" = $2`,
          literal(vectors[k]),
          batch[k].id
        );
      }
      console.log(`  ${table}: ${i + batch.length}/${rows.length}`);
    }
  }

  await embedTable(courses, "Course");
  await embedTable(pathways, "Pathway");
  console.log("Done.");
}

main().then(() => prisma.$disconnect()).catch((e) => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});
