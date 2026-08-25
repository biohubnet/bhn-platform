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

/**
 * How many published courses sit behind each filter value.
 *
 * The current platform shows these inline — "CASTL (24)" — so a trainee
 * can see which facets are worth opening before they click. Counts are
 * of PUBLISHED courses only: a count that includes drafts would promise
 * results the catalogue then refuses to show.
 *
 * Three grouped queries rather than one per option. Values with no
 * courses are simply absent from the map; callers should treat a
 * missing key as 0 rather than hiding the option, so an empty facet
 * still reads as "0" instead of vanishing.
 */
export async function getCourseFilterCounts(): Promise<Record<FilterType, Record<string, number>>> {
  const where = { status: "published" as const };
  const [topics, deliveries, providers] = await Promise.all([
    prisma.course.groupBy({ by: ["topic"], where, _count: { _all: true } }),
    prisma.course.groupBy({ by: ["delivery"], where, _count: { _all: true } }),
    prisma.course.groupBy({ by: ["provider"], where, _count: { _all: true } }),
  ]);

  const out: Record<FilterType, Record<string, number>> = {
    topic: {}, delivery: {}, provider: {},
  };
  for (const r of topics)     if (r.topic)    out.topic[r.topic]       = r._count._all;
  for (const r of deliveries) if (r.delivery) out.delivery[r.delivery] = r._count._all;
  for (const r of providers)  if (r.provider) out.provider[r.provider] = r._count._all;
  return out;
}
