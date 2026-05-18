/**
 * Backfill the new catalog-card fields (code / delivery / provider /
 * creditCost / enrollByDate / cohortStartDate / cohortEndDate /
 * requiresApproval / isSpecial) on every existing Course row with
 * varied test values, so the redesigned /courses cards show off
 * the full metadata vocabulary.
 *
 * Idempotent — only fills fields that are still null / default.
 * Running this script a second time is effectively a no-op (it'll
 * skip every course it already touched).
 *
 * Run:  npx tsx scripts/seed-course-card-fields.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/** Course-code prefixes — a small bank that spans the rough
 *  categories BHN courses live in (biopharma, downstream, advanced
 *  cell / CAR-T, biomanufacturing, algae/lipids, quality, biophysics). */
const CODE_PREFIXES = ["BIOP", "BIOD", "ACRTM", "BMFG", "BIAL", "BIOQ", "BIPH"];

/** Delivery modes — cycled across courses so the catalog filter
 *  has a visible spread of each mode. */
const DELIVERIES = ["In-Person", "Online", "Hybrid", "On-Demand"];

/** Provider names — mix of post-secondary institutions and BHN
 *  partner orgs. The card chip on the right rail picks the
 *  rose-tinted treatment for whichever sits in `provider`. */
const PROVIDERS = [
  "Seneca",
  "Catti",
  "OBIO",
  "BioHubNet",
  "BioTalent Canada",
  "CASTL",
  "U of T BioZone",
];

/** Four sample cohort windows starting mid-summer through late-2026.
 *  Cohort-mode courses (In-Person + Hybrid) get a window each;
 *  on-demand + online courses stay date-less and show their
 *  duration in minutes instead. */
const COHORT_WINDOWS: Array<{
  start: string;
  end: string;
  enrollBy: string;
}> = [
  { start: "2026-07-13", end: "2026-08-15", enrollBy: "2026-06-30" },
  { start: "2026-09-08", end: "2026-10-17", enrollBy: "2026-08-25" },
  { start: "2026-08-04", end: "2026-09-12", enrollBy: "2026-07-22" },
  { start: "2026-10-20", end: "2026-12-05", enrollBy: "2026-10-06" },
];

async function main() {
  const courses = await prisma.course.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      title: true,
      code: true,
      delivery: true,
      provider: true,
      creditCost: true,
      duration: true,
      requiresApproval: true,
      enrollByDate: true,
      cohortStartDate: true,
      cohortEndDate: true,
      isSpecial: true,
    },
  });

  if (courses.length === 0) {
    console.log("No Course rows found — nothing to backfill.");
    return;
  }

  console.log(`Found ${courses.length} course${courses.length === 1 ? "" : "s"} — backfilling…\n`);
  let updated = 0;

  for (const [i, c] of courses.entries()) {
    // Pick a delivery mode either from the existing value or by
    // cycling through DELIVERIES. The "isCohort" decision below
    // hangs off this final value.
    const delivery = c.delivery ?? DELIVERIES[i % DELIVERIES.length];
    const isCohort = delivery === "In-Person" || delivery === "Hybrid";

    // Build the patch — only set fields the admin hasn't already
    // touched. `code === null` is the signal "this course hasn't
    // been admin-populated yet"; we use it as a guard around the
    // creditCost variety bump too, so admins who've set a custom
    // credit value don't lose it.
    const data: Record<string, unknown> = {};

    if (!c.code) {
      const prefix = CODE_PREFIXES[i % CODE_PREFIXES.length];
      // Spread numbers across 100–599 so duplicates only show up
      // after 50 courses per prefix bucket — fine for test data.
      const num = 100 + ((i * 11) % 500);
      data.code = `${prefix}${num}`;
    }
    if (!c.delivery) data.delivery = delivery;
    if (!c.provider) data.provider = PROVIDERS[i % PROVIDERS.length];

    // Credit cost variety — only adjust when the card is fresh
    // (no code yet) AND the value is still the default 0. Cohort
    // courses get 1000, online async courses get 500, on-demand
    // stays free — same vocabulary the reference image showed.
    if (!c.code && c.creditCost === 0) {
      data.creditCost =
        delivery === "On-Demand" ? 0 :
        delivery === "Online"    ? 500 :
                                    1000;
    }

    // Cohort window — only for In-Person / Hybrid courses without
    // an existing cohort start. Pulls from COHORT_WINDOWS by
    // course index so the spread is deterministic.
    if (isCohort && !c.cohortStartDate) {
      const win = COHORT_WINDOWS[i % COHORT_WINDOWS.length];
      data.cohortStartDate = new Date(win.start);
      data.cohortEndDate = new Date(win.end);
      if (!c.enrollByDate) data.enrollByDate = new Date(win.enrollBy);
      // Cohort = requires-approval by convention (admins curate
      // the cohort roster). Self-serve modes leave the flag alone.
      if (!c.requiresApproval) data.requiresApproval = true;
    }

    // Duration — set a sensible default for self-serve modes that
    // don't have one yet. On-demand = 60 min, Online = 180 min
    // (3-hour async module). Cohort courses skip this (the card
    // falls back to the date range).
    if (!isCohort && !c.duration) {
      data.duration = delivery === "On-Demand" ? 60 : 180;
    }

    // Mark every 5th course as "Special" so the Special-program
    // filter has variety to land on.
    if (!c.isSpecial && i % 5 === 4) {
      data.isSpecial = true;
    }

    if (Object.keys(data).length > 0) {
      await prisma.course.update({ where: { id: c.id }, data });
      updated++;
      const summary = Object.entries(data)
        .map(([k, v]) => `${k}=${v instanceof Date ? v.toISOString().slice(0, 10) : v}`)
        .join(", ");
      const title = c.title.length > 38 ? c.title.slice(0, 38) + "…" : c.title;
      console.log(`+ ${title.padEnd(40)} ${summary}`);
    }
  }

  console.log(`\nUpdated ${updated} / ${courses.length} course${courses.length === 1 ? "" : "s"}.`);
  if (updated === 0) {
    console.log("(every course already carried code + delivery + provider — nothing to fill)");
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch((err) => {
    console.error(err);
    return prisma.$disconnect().then(() => process.exit(1));
  });
