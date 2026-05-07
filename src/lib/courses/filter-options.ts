import { prisma } from "@/lib/prisma";
import { COURSE_TOPICS, COURSE_DELIVERY, COURSE_PROVIDERS } from "./filters";

export type FilterType = "topic" | "delivery" | "provider";

/**
 * Seed the CourseFilterOption table from the canonical hardcoded lists
 * the first time anyone hits /courses on a fresh deploy. Idempotent —
 * re-running just no-ops on the unique (type, value) constraint.
 */
export async function ensureCourseFilterOptions() {
  try {
    const existing = await prisma.courseFilterOption.findMany({
      select: { type: true, value: true },
    });
    const have = new Set(existing.map((e) => `${e.type}:${e.value}`));

    const seeds: { type: FilterType; values: readonly string[] }[] = [
      { type: "topic",    values: COURSE_TOPICS },
      { type: "delivery", values: COURSE_DELIVERY },
      { type: "provider", values: COURSE_PROVIDERS },
    ];
    const missing = seeds.flatMap(({ type, values }) =>
      values
        .map((value, i) => ({ type, value, sortOrder: i }))
        .filter((row) => !have.has(`${row.type}:${row.value}`))
    );
    if (missing.length === 0) return;
    await prisma.courseFilterOption.createMany({
      data: missing,
      skipDuplicates: true,
    });
  } catch {
    // Don't break the catalog page if seeding fails.
  }
}

/** Fetch all active filter options grouped by type, sorted by sortOrder. */
export async function getCourseFilterOptions() {
  const rows = await prisma.courseFilterOption.findMany({
    where: { active: true },
    orderBy: [{ type: "asc" }, { sortOrder: "asc" }, { value: "asc" }],
  });
  const out: Record<FilterType, string[]> = { topic: [], delivery: [], provider: [] };
  for (const r of rows) {
    if (r.type === "topic" || r.type === "delivery" || r.type === "provider") {
      out[r.type].push(r.value);
    }
  }
  return out;
}
