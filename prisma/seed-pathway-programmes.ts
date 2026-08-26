/**
 * Cohort programmes that sit inside each Learning Pathway.
 *
 * These are a different animal from the on-demand catalogue: multi-day
 * in-person sittings run with partner providers (CATTI, CASTL, OBIO,
 * Agilis Health, Seneca), costing 1,000-3,500 credits rather than 100,
 * and gated by an application rather than a one-click enrol. They carry
 * `isSpecial` so the catalogue can separate them from self-paced courses.
 *
 * Transcribed from the current platform, including the two programmes
 * whose details are not settled yet — "Proteomics" has no dates and no
 * credit figure there either, and is shown closed. Reproducing that
 * rather than inventing numbers keeps the page honest about what is
 * actually bookable.
 *
 * Re-linking note: pathways were previously wired to on-demand catalogue
 * courses as placeholders. This seed replaces those links, because a
 * pathway on the live platform lists these cohort programmes, not the
 * 100-credit self-paced modules.
 *
 *   npx tsx prisma/seed-pathway-programmes.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface Programme {
  code: string;
  title: string;
  provider: string | null;
  /** open | closed — the programme's own state, independent of its pathway. */
  status: string;
  creditCost: number;
  delivery: string;
  sessionDates: string | null;
  /** null renders as "TBD", matching the live platform. */
  enrollBy: string | null;
  description: string;
}

const PATHWAYS: { pathway: string; programmes: Programme[] }[] = [
  {
    pathway: "Biomanufacturing",
    programmes: [
      {
        code: "PW-BIO-01", title: "Aseptic techniques and cell culture basics", provider: "CATTI",
        status: "open", creditCost: 3500, delivery: "In-Person",
        sessionDates: "Oct 21-23 (9am - 5pm, 3 days), Oct 26-28 (9am - 5pm, 3 days), Nov 18-20 (9am - 5pm, 3 days), Nov 23-25 (9am - 5pm, 3 days)",
        enrollBy: "2026-09-11",
        description: "Hands-on GMP-aligned training in aseptic technique and the fundamentals of mammalian cell culture, run as a three-day intensive.",
      },
      {
        code: "PW-BIO-02", title: "Closed systems and CAR-T manufacturing", provider: "CATTI",
        status: "open", creditCost: 3500, delivery: "In-Person",
        sessionDates: "Oct 7-9 (9am - 5pm, 3 days), Oct 14-16 (9am - 5pm, 3 days), Nov 4-6 (9am - 5pm, 3 days)",
        enrollBy: "2026-09-11",
        description: "Closed-system processing and the autologous cell therapy workflow, from apheresis through to formulation, in a GMP-aligned training suite.",
      },
      {
        code: "PW-BIO-03", title: "Aseptic practices and biologics manufacturing", provider: "CASTL",
        status: "open", creditCost: 3500, delivery: "In-Person",
        sessionDates: "Nov 24-26 (9am - 5pm, 3 days) in Montreal QC or Charlottetown PEI, Nov 30 - Dec 2 (9am - 5pm, 3 days) in Vancouver BC, Dec 8-10 (9am - 5pm, 3 days) in Vancouver BC, Dec 9-11 (9am - 5pm, 3 days) in Montreal QC",
        enrollBy: "2026-09-11",
        description: "Aseptic practice applied to biologics manufacturing, offered across CASTL's Montreal, Charlottetown and Vancouver training facilities.",
      },
      {
        code: "PW-BIO-04", title: "mRNA vaccine/therapeutic manufacturing", provider: "CASTL",
        status: "open", creditCost: 3500, delivery: "In-Person",
        sessionDates: "Nov 24-26 (9am - 5pm, 3 days) in Montreal QC, Dec 9-11 (9am - 5pm, 3 days) in Montreal QC",
        enrollBy: "2026-09-11",
        description: "The mRNA platform end to end — in vitro transcription, lipid nanoparticle formulation, and the analytics that release the product.",
      },
    ],
  },
  {
    pathway: "Entrepreneurship",
    programmes: [
      {
        code: "PW-ENT-01", title: "Entrepreneurship", provider: "OBIO",
        status: "open", creditCost: 1500, delivery: "In-Person",
        sessionDates: "Jan/Feb 2027",
        enrollBy: "2026-11-30",
        description: "Taking a life-sciences innovation out of the lab: intellectual property, regulatory strategy, and what investors ask before they fund a spin-out.",
      },
    ],
  },
  {
    pathway: "Medical Affairs",
    programmes: [
      {
        code: "PW-MA-01", title: "MSL Accelerator", provider: "Agilis Health",
        status: "open", creditCost: 1000, delivery: "In-Person",
        sessionDates: "Nov 18-19, 2026 (9am - 5pm, 2 days)",
        enrollBy: "2026-09-11",
        description: "A two-day intensive on the Medical Science Liaison role — scientific exchange, KOL engagement, and the line between medical and commercial.",
      },
    ],
  },
  {
    pathway: "QA/QC",
    programmes: [
      {
        code: "PW-QA-01", title: "QC Microbiology for biomanufacturing", provider: "CATTI",
        status: "open", creditCost: 3500, delivery: "In-Person",
        sessionDates: "Nov/Dec 2026 (9am - 5pm, 3 days)",
        enrollBy: "2026-09-11",
        description: "Microbiological control in a biomanufacturing environment: bioburden, endotoxin, sterility and environmental monitoring, performed hands-on.",
      },
      {
        code: "PW-QA-02", title: "Quality in biologics manufacturing", provider: "CASTL",
        status: "open", creditCost: 3500, delivery: "In-Person",
        sessionDates: "Nov 24-26 (9am - 5pm, 3 days) in Montreal QC or Charlottetown PEI, Nov 30 - Dec 2 (9am - 5pm, 3 days) in Vancouver BC, Dec 8-10 (9am - 5pm, 3 days) in Vancouver BC, Dec 9-11 (9am - 5pm, 3 days) in Montreal QC",
        enrollBy: "2026-09-11",
        description: "The quality system around a biologics process — batch record review, deviations, and the evidence a release decision actually rests on.",
      },
    ],
  },
  {
    pathway: "Regulatory Affairs",
    programmes: [
      {
        code: "PW-RA-01", title: "Intro to Pharmaceutical Regulatory Affairs", provider: "Seneca Polytechnic",
        status: "closed", creditCost: 1000, delivery: "Online (Synchronous)",
        sessionDates: "Sep 8 - Oct 22, 2026, Tues and Thurs, 4-6pm",
        enrollBy: "2026-08-09",
        description: "A seven-week evening course on Canadian pharmaceutical regulation: submission types, the review process, and post-market obligations.",
      },
    ],
  },
  {
    pathway: "Research and Development",
    programmes: [
      {
        code: "PW-RD-01", title: "Bioprocess Scale-up", provider: null,
        status: "open", creditCost: 3000, delivery: "In-Person",
        sessionDates: "Oct 27-28, 2026 (9am - 5pm, 2 days)",
        enrollBy: "2026-09-11",
        description: "Moving a process from bench to pilot scale — what transfers, what does not, and why geometric similarity alone will not save you.",
      },
      {
        code: "PW-RD-02", title: "Proteomics", provider: null,
        // Carried as in-development on the live platform: no dates, no credit
        // figure, closed. Left that way rather than inventing either.
        status: "closed", creditCost: 0, delivery: "In-Person",
        sessionDates: null,
        enrollBy: null,
        description: "In development. Details and dates will be published when the programme opens.",
      },
    ],
  },
];

async function main() {
  const instructor =
    (await prisma.user.findFirst({ where: { role: "admin" } })) ??
    (await prisma.user.findFirst({ where: { role: "superadmin" } }));

  let created = 0, updated = 0, linked = 0;

  for (let pi = 0; pi < PATHWAYS.length; pi++) {
    const { pathway: title, programmes } = PATHWAYS[pi];
    const pathway = await prisma.pathway.findFirst({ where: { title } });
    if (!pathway) {
      console.warn(`  pathway not found, skipping: ${title}`);
      continue;
    }

    const ids: string[] = [];
    for (let i = 0; i < programmes.length; i++) {
      const p = programmes[i];
      const data = {
        code: p.code,
        title: p.title,
        description: p.description,
        category: pathway.category,
        topic: pathway.category,
        provider: p.provider,
        delivery: p.delivery,
        sessionDates: p.sessionDates,
        enrollByDate: p.enrollBy ? new Date(`${p.enrollBy}T23:59:59Z`) : null,
        creditCost: p.creditCost,
        // Application-gated rather than one-click enrol, and flagged so the
        // catalogue can tell these apart from self-paced modules.
        isSpecial: true,
        requiresApproval: true,
        status: p.status === "closed" ? "archived" : "published",
        courseType: "content",
        tags: JSON.stringify(["pathway programme", pathway.title, p.provider ?? "BioHubNet"].filter(Boolean)),
        displayOrder: 1000 + pi * 10 + i,
        instructorId: instructor?.id ?? null,
      };

      const existing = await prisma.course.findFirst({ where: { code: p.code } });
      const course = existing
        ? await prisma.course.update({ where: { id: existing.id }, data })
        : await prisma.course.create({ data });
      existing ? updated++ : created++;
      ids.push(course.id);
    }

    // Re-point the pathway at its programmes. The previous links were
    // on-demand catalogue courses standing in until these existed.
    await prisma.pathwayCourse.deleteMany({ where: { pathwayId: pathway.id } });
    await prisma.pathwayCourse.createMany({
      data: ids.map((courseId, order) => ({
        pathwayId: pathway.id, courseId, order: order + 1, required: false,
      })),
      skipDuplicates: true,
    });
    linked += ids.length;
    console.log(`  ${title.padEnd(26)} ${ids.length} programme(s)`);
  }

  console.log(`\ncreated ${created}, updated ${updated}, linked ${linked}`);
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
