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

/** Sample blurb bank — short 2–3 sentence course descriptions
 *  used to backfill missing `description` fields so every catalog
 *  card shows a "blurb under the title".
 *
 *  Each entry carries lowercase topic tags. When a course is
 *  missing a description, `pickBlurb(title, idx)` scores each
 *  blurb by how many tags appear in the course title; the
 *  best-scoring blurb wins, with the index-cycled fallback used
 *  when nothing matches. This keeps SCORM-imported courses with
 *  topical titles ("MSC Passaging", "GMP Cleanroom Gowning")
 *  paired with subject-appropriate blurbs instead of cycling
 *  generic prose. */
interface TaggedBlurb { text: string; tags: string[] }
const BLURB_BANK: TaggedBlurb[] = [
  {
    text: "Hands-on intro to the bench techniques every biomanufacturing role expects on day one. Build muscle memory before the placement starts.",
    tags: ["intro", "bench", "biomanufacturing", "fundamentals"],
  },
  {
    text: "Live cell-culture workflows from media design through bioreactor harvest. Lab partners simulate real biologics production.",
    tags: ["cell", "culture", "media", "bioreactor", "msc", "passaging", "stem"],
  },
  {
    text: "Master the downstream side — filtration, chromatography, polishing — to GMP standard. Bring your QC mindset.",
    tags: ["downstream", "filtration", "chromatography", "polish", "purification"],
  },
  {
    text: "Upstream process development — cell line selection, feed strategy, and scale-up from shake flask to single-use bioreactor.",
    tags: ["upstream", "process", "fermentation", "bioreactor", "scale", "feed"],
  },
  {
    text: "Engineer microbes to produce something useful (and tasty). Small-scale fermentation, flavour design, and microbial stability rolled into one lab.",
    tags: ["microbe", "fermentation", "yeast", "bacteria", "engineering", "kombucha", "probiotic"],
  },
  {
    text: "Express + purify luciferase in E. coli, then formulate it into glowing prototypes. STEM-fair friendly; outreach kits included.",
    tags: ["luciferase", "ecoli", "e. coli", "expression", "outreach", "glow"],
  },
  {
    text: "Bench-side primer on cell + gene therapy manufacturing — vector design, transfection, and the QC checks that catch contamination early.",
    tags: ["gene", "therapy", "vector", "transfection", "viral", "lentivirus", "aav"],
  },
  {
    text: "Engineer CAR-T cells end-to-end: leukapheresis prep, vector design, expansion, release testing, and the patient-side timing constraints.",
    tags: ["car-t", "cart", "tcell", "t-cell", "immunotherapy", "leukapheresis"],
  },
  {
    text: "mRNA workflow from IVT through LNP formulation to release testing. Cold-chain, capping efficiency, and the QC battery every regulatory file expects.",
    tags: ["mrna", "lnp", "vaccine", "ivt", "lipid", "nanoparticle"],
  },
  {
    text: "Aseptic technique + cleanroom behaviour — gowning, gait, gloved interventions, settle plates. The hygiene mindset that keeps a fill-finish line green.",
    tags: ["aseptic", "cleanroom", "gowning", "sterile", "gmp", "fill", "finish"],
  },
  {
    text: "GMP quality fundamentals — batch records, deviations, CAPA, and the audit trail that keeps a facility inspection-ready.",
    tags: ["gmp", "quality", "qa", "qc", "audit", "deviation", "capa", "sop"],
  },
  {
    text: "Regulatory affairs for life-science professionals — submission strategy, agency interactions, and the post-approval lifecycle.",
    tags: ["regulatory", "fda", "health canada", "submission", "approval", "ind", "bla"],
  },
  {
    text: "Analytical method development + validation — HPLC, mass-spec, capillary electrophoresis. Hands-on with simulated assay data sets.",
    tags: ["analytical", "hplc", "mass-spec", "mass spec", "ce", "validation", "assay"],
  },
  {
    text: "Proteomics workflow from sample prep through mass-spec interpretation. Includes simulated data sets to practice analysis.",
    tags: ["proteomics", "protein", "mass-spec", "mass spec", "ms"],
  },
  {
    text: "Bioassay development for biologics characterisation — ELISA, SPR, cell-based potency assays. Statistical design baked in.",
    tags: ["bioassay", "elisa", "spr", "potency", "characterisation", "characterization"],
  },
  {
    text: "Molecular biology toolkit — primer design, PCR, qPCR, restriction cloning, Sanger + nanopore sequencing read-outs.",
    tags: ["pcr", "qpcr", "primer", "cloning", "molecular", "sequencing", "sanger", "nanopore"],
  },
  {
    text: "Step into an MSL role: medical literature, payer conversations, regulatory boundaries. Field-ready in two days.",
    tags: ["msl", "medical", "liaison", "payer", "literature"],
  },
  {
    text: "Founder bootcamp built around a real IP-backed innovation. Validate the science, pitch the market, leave with a deck.",
    tags: ["entrepreneur", "founder", "startup", "ip", "pitch", "venture"],
  },
  {
    text: "Cultivate pigment-producing algae and convert their carotenoids into cosmetic formulations. Sustainable biotech meets beauty.",
    tags: ["algae", "carotenoid", "pigment", "cosmetic", "sustainable", "lipid"],
  },
  {
    text: "Knowledge-exchange placement at a partner lab. Choose 1, 4, or 6 months. You bring curiosity, the lab brings the project.",
    tags: ["placement", "ke", "exchange", "internship", "industry"],
  },
  {
    text: "Data integrity for regulated environments — ALCOA+, electronic batch records, 21 CFR Part 11 essentials.",
    tags: ["data integrity", "alcoa", "cfr", "21 cfr", "ebr", "records"],
  },
  {
    text: "Process scale-up from bench to pilot to commercial — sizing, mixing-time scaling, oxygen transfer, and the deviations to expect on each jump.",
    tags: ["scale-up", "scale up", "pilot", "commercial", "transfer", "oxygen"],
  },
];

/** Score each blurb's tags against the course title's words; pick
 *  the highest-scoring blurb. Tied scores resolve to the lowest
 *  bank index (stable). If no tag matches at all, fall back to a
 *  per-course index cycle so the catalog still gets variety. */
function pickBlurb(title: string, fallbackIdx: number): string {
  const t = title.toLowerCase();
  let bestIdx = -1;
  let bestScore = 0;
  for (let i = 0; i < BLURB_BANK.length; i++) {
    const score = BLURB_BANK[i].tags.reduce(
      (n, tag) => (t.includes(tag) ? n + 1 : n),
      0,
    );
    if (score > bestScore) {
      bestScore = score;
      bestIdx = i;
    }
  }
  if (bestIdx >= 0) return BLURB_BANK[bestIdx].text;
  return BLURB_BANK[fallbackIdx % BLURB_BANK.length].text;
}

/** Detect the legacy SCORM bulk-uploader placeholder so we know
 *  to overwrite it rather than treating it as a real admin-curated
 *  description. The historical format was:
 *      "SCORM 1.2 / 2004 module — <title>"
 *  Match loosely so minor formatting variations (en-dash, hyphen,
 *  whitespace) all get caught. */
const SCORM_BOILERPLATE = /^\s*SCORM\s+1\.2\s*\/?\s*2004\s+module/i;

async function main() {
  const courses = await prisma.course.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      title: true,
      description: true,
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
    // Normalize empty strings to null — Postgres stored some test
    // courses with delivery=""/provider="" rather than null, and
    // `??` doesn't catch those (it only handles undefined / null).
    // Without this, the cycle below never fires for those rows.
    const existingDelivery = c.delivery && c.delivery.trim() !== "" ? c.delivery : null;
    const existingProvider = c.provider && c.provider.trim() !== "" ? c.provider : null;

    // Pick a delivery mode either from the existing value or by
    // cycling through DELIVERIES. The "isCohort" decision below
    // hangs off this final value.
    const delivery = existingDelivery ?? DELIVERIES[i % DELIVERIES.length];
    const isCohort = delivery === "In-Person" || delivery === "Hybrid";

    // True when delivery was missing on the row and we're SETTING
    // it in this run. When that happens any cascading fields a
    // previous (buggy) run wrote out of an empty-delivery branch
    // need re-deriving from the now-correct delivery mode — that's
    // why several blocks below also fire on this flag.
    const justSetDelivery = !existingDelivery;

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
    if (!existingDelivery) data.delivery = delivery;
    if (!existingProvider) data.provider = PROVIDERS[i % PROVIDERS.length];

    // Credit cost variety — adjust when the card is fresh (no code
    // yet) AND the value is still default 0, OR when we're fixing
    // a row where a previous buggy run set creditCost=1000 via
    // the empty-delivery fallback branch.
    if ((!c.code && c.creditCost === 0) || (justSetDelivery && c.creditCost === 1000)) {
      data.creditCost =
        delivery === "On-Demand" ? 0 :
        delivery === "Online"    ? 500 :
                                    1000;
    }

    // Cohort window — only for In-Person / Hybrid courses without
    // an existing cohort start (OR where delivery was just set —
    // a row that's freshly Hybrid needs its window populated).
    if (isCohort && (!c.cohortStartDate || justSetDelivery)) {
      const win = COHORT_WINDOWS[i % COHORT_WINDOWS.length];
      if (!c.cohortStartDate) data.cohortStartDate = new Date(win.start);
      if (!c.cohortEndDate)   data.cohortEndDate   = new Date(win.end);
      if (!c.enrollByDate)    data.enrollByDate    = new Date(win.enrollBy);
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

    // Description blurb — fill when missing, too short to read as
    // a 2-3 sentence blurb, OR when it's the legacy SCORM-uploader
    // placeholder ("SCORM 1.2 / 2004 module — <title>"). The
    // CourseCard line-clamp-3 already adds CSS-driven ellipsis for
    // long ones; we just need every course to HAVE something
    // readable and topical. Title-keyword matching from
    // `pickBlurb` ensures e.g. an "MSC Passaging" course gets the
    // cell-culture blurb, not a random cycle pick.
    const existingDesc = c.description?.trim() ?? "";
    const isPlaceholder = SCORM_BOILERPLATE.test(existingDesc);
    if (existingDesc.length < 40 || isPlaceholder) {
      data.description = pickBlurb(c.title, i);
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
