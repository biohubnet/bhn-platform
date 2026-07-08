import { prisma } from "@/lib/prisma";
import { TIER_META } from "./tiers";

const PROGRAM_SLUG = "biomanufacturing-professional";

/**
 * Lazily create the flagship "Biomanufacturing Professional Certification" —
 * a three-tier Foundation → Practitioner → Advanced framework — mapping real
 * platform courses into each tier. Idempotent: once the program exists we
 * leave it (and any admin edits) alone. Called on the /certifications pages
 * so the framework is always present, even on a fresh database.
 */
export async function ensureBiomanufacturingCertification(createdById: string | null): Promise<string> {
  const existing = await prisma.certificationProgram.findUnique({
    where: { slug: PROGRAM_SLUG },
    select: { id: true },
  });
  if (existing) return existing.id;

  // Pull real courses, biomanufacturing-relevant first, to populate the tiers.
  const KEYWORDS = ["biomanufactur", "bioprocess", "biolog", "upstream", "downstream", "aseptic", "cell", "protein", "qa", "qc", "gmp", "cdmo", "manufactur"];
  const courses = await prisma.course.findMany({
    select: { id: true, title: true, code: true, topic: true },
    orderBy: { createdAt: "asc" },
  });
  const relevant = courses.filter((c) => {
    const hay = `${c.title} ${c.code ?? ""} ${c.topic ?? ""}`.toLowerCase();
    return KEYWORDS.some((k) => hay.includes(k));
  });
  // Fall back to any courses if we couldn't find biomanufacturing-tagged ones,
  // so the framework is never empty on a sparse database.
  const pool = (relevant.length >= 3 ? relevant : courses).map((c) => c.id);

  // Distribute the pool across the three tiers (roughly even, Foundation-first).
  const perTier = Math.max(1, Math.ceil(pool.length / 3));
  const tierCourses: Record<string, string[]> = {
    foundation: pool.slice(0, perTier),
    practitioner: pool.slice(perTier, perTier * 2),
    advanced: pool.slice(perTier * 2),
  };
  // Guarantee each tier has at least one course when the pool is tiny.
  if (pool.length > 0) {
    if (tierCourses.practitioner.length === 0) tierCourses.practitioner = [pool[pool.length - 1]];
    if (tierCourses.advanced.length === 0) tierCourses.advanced = [pool[pool.length - 1]];
  }

  const program = await prisma.certificationProgram.create({
    data: {
      slug: PROGRAM_SLUG,
      title: "Biomanufacturing Professional Certification",
      discipline: "Biomanufacturing",
      summary:
        "A three-level professional credential for Canada's biomanufacturing workforce. Progress from Foundation through Practitioner to Advanced, earning a verifiable credential at each tier.",
      status: "published",
      createdById,
      levels: {
        create: [
          {
            tier: "foundation",
            order: TIER_META.foundation.order,
            title: "Foundation",
            summary: "Core biomanufacturing concepts, vocabulary, and the industry landscape.",
            passingScore: TIER_META.foundation.passingScore,
            courseIds: tierCourses.foundation,
          },
          {
            tier: "practitioner",
            order: TIER_META.practitioner.order,
            title: "Practitioner",
            summary: "Applied upstream/downstream processing, quality, and hands-on competency.",
            passingScore: TIER_META.practitioner.passingScore,
            courseIds: tierCourses.practitioner,
          },
          {
            tier: "advanced",
            order: TIER_META.advanced.order,
            title: "Advanced",
            summary: "Specialised mastery — advanced modalities, GMP rigor, and independent practice.",
            passingScore: TIER_META.advanced.passingScore,
            courseIds: tierCourses.advanced,
          },
        ],
      },
    },
    select: { id: true },
  });
  return program.id;
}
