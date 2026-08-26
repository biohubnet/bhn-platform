/**
 * Learning Pathways seed.
 *
 * The pathways page, its accordions and the open/closed/full status logic
 * were already built — the table was simply empty, so a trainee saw only
 * the event-registration forms. This seeds the six pathways the live
 * platform lists, with their titles, descriptions and enrolment status
 * transcribed from it, and wires each to the catalogue courses that
 * actually belong to it.
 *
 * Idempotent: matched by title. Owns ONLY the pathway rows — title, copy,
 * status and accent colour.
 *
 * It deliberately does NOT touch PathwayCourse. seed-pathway-programmes.ts
 * owns those links, and an earlier version of this file rebuilt them from a
 * hardcoded list of catalogue course codes: running the two seeds in the
 * wrong order silently replaced the cohort programmes with on-demand
 * courses. One table, one owner.
 *
 *   npx tsx prisma/seed-pathways.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface SeedPathway {
  title: string;
  description: string;
  category: string;
  /** open | closed | full — mirrors the badge on the live platform. */
  enrollmentStatus: string;
  /** Identity colour, matched to the bar the live platform shows. */
  accentColor: string;
}

const PATHWAYS: SeedPathway[] = [
  {
    title: "Biomanufacturing",
    description:
      "Biomanufacturing is the process of using living cells or biological systems to produce therapeutic products or vaccines at scale under controlled conditions to ensure safety, quality, and consistency. Choose one from the following modalities for hands-on GMP-aligned training.",
    category: "Biomanufacturing",
    enrollmentStatus: "open",
    accentColor: "#A855F7",
  },
  {
    title: "Entrepreneurship",
    description:
      "Creating a startup requires navigating intellectual property, regulatory, technical, and business requirements. Gain practical insights into transforming your research into market-ready products and successfully spinning out and building a startup.",
    category: "Business and Commercialization",
    enrollmentStatus: "open",
    accentColor: "#F97316",
  },
  {
    title: "Medical Affairs",
    description:
      "Medical Affairs is at the intersection of science, clinical practice, and patient care, bridging research, healthcare professionals, and commercial teams to ensure treatments are used safely and effectively. Learn about the Canadian Medical Affairs landscape and how to break into this field.",
    category: "Clinical Trials",
    enrollmentStatus: "open",
    accentColor: "#DC2626",
  },
  {
    title: "QA/QC",
    description:
      "Quality Control (QC) involves testing and monitoring products to ensure they meet safety, purity, potency, and consistency standards, while Quality Assurance (QA) ensures processes and procedures are followed to consistently produce high-quality outcomes. Choose one from the following modalities for hands-on, GMP-aligned training.",
    category: "Quality Control/Assurance",
    enrollmentStatus: "open",
    accentColor: "#14B8A6",
  },
  {
    title: "Regulatory Affairs",
    description:
      "Regulatory affairs focuses on ensuring products comply with applicable laws, regulations and standards throughout their lifecycle. Learn how professionals interpret regulations, prepare submissions, and work with authorities to ensure products are safe, effective, and compliant.",
    category: "Regulatory Affairs",
    // Closed on the live platform — kept closed here so the status badge
    // has something real to show rather than every pathway reading "Open".
    enrollmentStatus: "closed",
    accentColor: "#16A34A",
  },
  {
    title: "Research and Development",
    description:
      "Gain in-demand technical skills from discovery to process development and implement R&D best practices.",
    category: "Biomanufacturing - USP/DSP",
    enrollmentStatus: "open",
    accentColor: "#C084FC",
  },
];

async function main() {
  console.log(`Seeding ${PATHWAYS.length} pathways…`);
  for (let i = 0; i < PATHWAYS.length; i++) {
    const p = PATHWAYS[i];
    const existing = await prisma.pathway.findFirst({ where: { title: p.title } });

    const data = {
      title: p.title,
      description: p.description,
      category: p.category,
      status: "published",
      creditCost: 0,
      enrollmentStatus: p.enrollmentStatus,
      accentColor: p.accentColor,
      allowWaitlist: true,
    };

    const pathway = existing
      ? await prisma.pathway.update({ where: { id: existing.id }, data })
      : await prisma.pathway.create({ data });

    console.log(
      `  ${p.title.padEnd(26)} ${(existing ? "updated" : "created").padEnd(8)} ` +
        `${p.enrollmentStatus.padEnd(7)} ${p.accentColor}`
    );
  }

  const published = await prisma.pathway.count({ where: { status: "published" } });
  console.log(`\nPublished pathways: ${published}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
