import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { embed, toVectorLiteral, AI_CONFIGURED } from "@/lib/ai";
import { getSession, isStaff } from "@/lib/auth";
interface ResultRow {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  status: string;
  duration: number | null;
  creditCost: number;
  similarity: number;
}

/**
 * Hybrid course search: vector similarity if AI is configured AND we
 * have an embedding for the query; falls back to ILIKE substring match
 * otherwise. Always returns at most 24 rows ranked by relevance.
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim();
  const session = await getSession();
  const role = (session?.user as { role?: string })?.role ?? "trainee";
  const staff = isStaff(role);

  if (!q) return NextResponse.json({ results: [], mode: "empty" });

  const visibilityClause = staff ? "" : `AND "status" = 'published'`;

  // 1) Try semantic search
  if (AI_CONFIGURED.embed) {
    const vectors = await embed([q], { feature: "course_search" });
    if (vectors?.[0]) {
      const lit = toVectorLiteral(vectors[0]);
      const rows = await prisma.$queryRawUnsafe<ResultRow[]>(
        `SELECT "id", "title", "description", "category", "status", "duration", "creditCost",
                1 - ("embedding" <=> $1::vector) AS "similarity"
         FROM "Course"
         WHERE "embedding" IS NOT NULL ${visibilityClause}
         ORDER BY "embedding" <=> $1::vector
         LIMIT 24`,
        lit
      );
      if (rows.length > 0) {
        return NextResponse.json({ results: rows, mode: "semantic" });
      }
    }
  }

  // 2) Fallback: title/description/category ILIKE
  const fallback = await prisma.course.findMany({
    where: {
      ...(staff ? {} : { status: "published" }),
      OR: [
        { title:       { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
        { category:    { contains: q, mode: "insensitive" } },
      ],
    },
    select: {
      id: true, title: true, description: true, category: true,
      status: true, duration: true, creditCost: true,
    },
    take: 24,
  });
  return NextResponse.json({
    results: fallback.map((c) => ({ ...c, similarity: 0 })),
    mode: "keyword",
  });
}
