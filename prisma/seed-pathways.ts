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
 * Idempotent: matched by title. Re-running updates the row in place and
 * rebuilds the course links, so enrolments survive a re-seed.
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
  /** Course codes from prisma/seed-catalog.ts, in the order they should be taken. */
  courseCodes: string[];
}

const PATHWAYS: SeedPathway[] = [
  {
    title: "Biomanufacturing",
    description:
      "Biomanufacturing is the process of using living cells or biological systems to produce therapeutic products or vaccines at scale under controlled conditions to ensure safety, quality, and consistency. Choose one from the following modalities for hands-on GMP-aligned training.",
    category: "Biomanufacturing",
    enrollmentStatus: "open",
    courseCodes: ["CST-GMP-101", "CST-USP-201", "CST-DSP-201", "CST-ASE-301", "SEN-BOOT-101"],
  },
  {
    title: "Entrepreneurship",
    description:
      "Creating a startup requires navigating intellectual property, regulatory, technical, and business requirements. Gain practical insights into transforming your research into market-ready products and successfully spinning out and building a startup.",
    category: "Business and Commercialization",
    enrollmentStatus: "open",
    courseCodes: ["BTC-COM-201", "TA-AI-101"],
  },
  {
    title: "Medical Affairs",
    description:
      "Medical Affairs is at the intersection of science, clinical practice, and patient care, bridging research, healthcare professionals, and commercial teams to ensure treatments are used safely and effectively. Learn about the Canadian Medical Affairs landscape and how to break into this field.",
    category: "Clinical Trials",
    enrollmentStatus: "open",
    courseCodes: ["CST-CT-201", "CST-RA-201", "TA-CAR-101"],
  },
  {
    title: "QA/QC",
    description:
      "Quality Control (QC) involves testing and monitoring products to ensure they meet safety, purity, potency, and consistency standards, while Quality Assurance (QA) ensures processes and procedures are followed to consistently produce high-quality outcomes. Choose one from the following modalities for hands-on, GMP-aligned training.",
    category: "Quality Control/Assurance",
    enrollmentStatus: "open",
    courseCodes: ["CST-QA-201", "CST-CAPA-201", "CST-GDP-101", "CST-GMP-101"],
  },
  {
    title: "Regulatory Affairs",
    description:
      "Regulatory affairs focuses on ensuring products comply with applicable laws, regulations and standards throughout their lifecycle. Learn how professionals interpret regulations, prepare submissions, and work with authorities to ensure products are safe, effective, and compliant.",
    category: "Regulatory Affairs",
    // Closed on the live platform — kept closed here so the status badge
    // has something real to show rather than every pathway reading "Open".
    enrollmentStatus: "closed",
    courseCodes: ["CST-RA-201", "CST-GDP-101"],
  },
  {
    title: "Research and Development",
    description:
      "Gain in-demand technical skills from discovery to process development and implement R&D best practices.",
    category: "Biomanufacturing - USP/DSP",
    enrollmentStatus: "open",
    courseCodes: ["TA-MAB-201", "CST-USP-201", "CST-DSP-201", "TA-AI-101"],
  },
];

async function main() {
  const courses = await prisma.course.findMany({ select: { id: true, code: true } });
  const byCode = new Map(courses.filter((c) => c.code).map((c) => [c.code as string, c.id]));

  const missing = PATHWAYS.flatMap((p) => p.courseCodes).filter((code) => !byCode.has(code));
  if (missing.length > 0) {
    throw new Error(
      `Course codes not found — run prisma/seed-catalog.ts first: ${[...new Set(missing)].join(", ")}`
    );
  }

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
      allowWaitlist: true,
    };

    const pathway = existing
      ? await prisma.pathway.update({ where: { id: existing.id }, data })
      : await prisma.pathway.create({ data });

    const wanted = p.courseCodes.map((code, order) => ({
      pathwayId: pathway.id,
      courseId: byCode.get(code) as string,
      order: order + 1,
      required: true,
    }));

    const current = await prisma.pathwayCourse.findMany({
      where: { pathwayId: pathway.id },
      orderBy: { order: "asc" },
      select: { courseId: true, order: true },
    });
    const same =
      current.length === wanted.length &&
      wanted.every((w, idx) => current[idx].courseId === w.courseId && current[idx].order === w.order);

    if (!same) {
      await prisma.pathwayCourse.deleteMany({ where: { pathwayId: pathway.id } });
      await prisma.pathwayCourse.createMany({ data: wanted, skipDuplicates: true });
    }

    console.log(
      `  ${p.title.padEnd(26)} ${(existing ? "updated" : "created").padEnd(8)} ` +
        `${p.enrollmentStatus.padEnd(7)} ${wanted.length} course(s)${same ? "" : " (relinked)"}`
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
