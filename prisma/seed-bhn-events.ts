/**
 * Seeds the two BhnEvent rows the trainee dashboard's "Coming up" rail
 * and the /events surface read.
 *
 * Deliberately TWO separate events, not one with a long date range:
 * Training Week and the Symposium are different commitments — you can
 * attend either without the other — and the dashboard rail is more
 * useful listing both than collapsing them into a single week-long bar.
 *
 * Dates are late October 2026, which is still EDT (UTC-4); DST ends on
 * the first Sunday of November. They are written as explicit UTC
 * instants with the offset applied rather than as bare local strings,
 * so the row does not shift depending on where the seed is run.
 *
 * Idempotent: upsert by slug. Re-running updates the existing rows
 * rather than creating duplicates, and touches nothing else.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/** Late-October 2026 Toronto is EDT = UTC-4. */
const EDT = "-04:00";

const EVENTS = [
  {
    slug: "2026-training-week",
    title: "Training Week 2026",
    tagline: "Three days of hands-on sessions leading into the Symposium.",
    description:
      "Three days of intensive, hands-on training in the run-up to the Annual Symposium. Sessions run across biomanufacturing, regulatory affairs, quality and analytical tracks.",
    startDate: new Date(`2026-10-26T00:00:00${EDT}`),
    endDate: new Date(`2026-10-28T23:59:59${EDT}`),
  },
  {
    slug: "2026-annual-symposium",
    title: "Annual Symposium 2026",
    tagline: "One day. The whole network in one room.",
    description:
      "The BioHubNet Annual Symposium — keynotes, panels and the year's cohort showcase, closing out Training Week.",
    startDate: new Date(`2026-10-29T00:00:00${EDT}`),
    endDate: new Date(`2026-10-29T23:59:59${EDT}`),
  },
];

async function main() {
  const host = (process.env.DATABASE_URL ?? "").match(/@([^:/?]+)/)?.[1] ?? "";
  if (!host.includes("supabase.com")) {
    throw new Error(`Refusing to write — unexpected DB host: ${host}`);
  }

  // Training Week must end before the Symposium starts, or the "three
  // days before" relationship the dates encode is wrong.
  const [week, symposium] = EVENTS;
  if (week.endDate >= symposium.startDate) {
    throw new Error("Training Week must finish before the Symposium begins");
  }

  for (const e of EVENTS) {
    const row = await prisma.bhnEvent.upsert({
      where: { slug: e.slug },
      create: { ...e, status: "published", timezone: "America/Toronto" },
      update: { ...e, status: "published", timezone: "America/Toronto" },
    });
    const d = (x: Date) =>
      x.toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric", timeZone: "America/Toronto" });
    console.log(`  ${row.status.padEnd(9)} ${d(row.startDate)} → ${d(row.endDate)}  ${row.title}`);
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch((err) => {
    console.error(err);
    return prisma.$disconnect().then(() => process.exit(1));
  });
