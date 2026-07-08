import { prisma } from "@/lib/prisma";
import { TIER_META } from "./tiers";
import { TRAINEE_PERSONAS, PERSONA_META, type TraineePersona } from "./personas";

// Legacy single generic program from the first cut — retired (unpublished) in
// favour of the per-persona role tracks below.
const LEGACY_SLUG = "biomanufacturing-professional";

const slugFor = (p: TraineePersona) => `biomfg-${p.replace(/_/g, "-")}`;

const CORE_KW = ["what is", "introduction", "intro", "career", "foundation", "basic", "fundamental", "overview"];
const RESEARCH_KW = ["research", "r&d", "analyt", "qa", "qc", "protein", "structure", "assay", "characteriz", "development", "upstream"];
const APPLIED_KW = ["manufactur", "gmp", "aseptic", "downstream", "bioreactor", "process", "operation", "equipment", "cell", "fill"];

const matches = (hay: string, kws: string[]) => kws.some((k) => hay.includes(k));

/** Split a persona's courses across the three tiers by emphasis. Every tier is
 *  guaranteed at least one course as long as the pool is non-empty. */
function planCourses(
  emphasis: "research" | "applied",
  buckets: { core: string[]; research: string[]; applied: string[]; pool: string[] },
): { foundation: string[]; practitioner: string[]; advanced: string[] } {
  const foundation = (buckets.core.length ? buckets.core : buckets.pool).slice(0, 2);
  const stream = emphasis === "research" ? buckets.research : buckets.applied;
  const streamPool = (stream.length ? stream : buckets.pool).filter((id) => !foundation.includes(id));
  const half = Math.max(1, Math.ceil(streamPool.length / 2));
  let practitioner = streamPool.slice(0, half);
  let advanced = streamPool.slice(half);
  const fallback = buckets.pool[buckets.pool.length - 1];
  if (practitioner.length === 0 && fallback) practitioner = [fallback];
  if (advanced.length === 0 && fallback) advanced = [fallback];
  return {
    foundation: foundation.length ? foundation : fallback ? [fallback] : [],
    practitioner,
    advanced,
  };
}

/**
 * Lazily create one role-specific certification track per trainee persona
 * (Master's, PhD, Post-doc, Research Associate, Lab Technician). Each is a
 * Foundation → Practitioner → Advanced ladder with role-appropriate courses;
 * research personas emphasise R&D/analytics, applied personas emphasise
 * manufacturing/process. Idempotent per slug. Returns nothing.
 */
export async function ensureCertificationPrograms(createdById: string | null): Promise<void> {
  // Retire the legacy generic program if it's still published.
  await prisma.certificationProgram.updateMany({
    where: { slug: LEGACY_SLUG, status: "published" },
    data: { status: "draft" },
  });

  const existing = await prisma.certificationProgram.findMany({
    where: { slug: { in: TRAINEE_PERSONAS.map(slugFor) } },
    select: { slug: true },
  });
  const have = new Set(existing.map((e) => e.slug));
  if (have.size === TRAINEE_PERSONAS.length) return;

  const courses = await prisma.course.findMany({
    select: { id: true, title: true, code: true, topic: true },
    orderBy: { createdAt: "asc" },
  });
  const tagged = courses.map((c) => ({ id: c.id, hay: `${c.title} ${c.code ?? ""} ${c.topic ?? ""}`.toLowerCase() }));
  const buckets = {
    core: tagged.filter((c) => matches(c.hay, CORE_KW)).map((c) => c.id),
    research: tagged.filter((c) => matches(c.hay, RESEARCH_KW)).map((c) => c.id),
    applied: tagged.filter((c) => matches(c.hay, APPLIED_KW)).map((c) => c.id),
    pool: tagged.map((c) => c.id),
  };

  for (const persona of TRAINEE_PERSONAS) {
    const slug = slugFor(persona);
    if (have.has(slug)) continue;
    const meta = PERSONA_META[persona];
    const plan = planCourses(meta.emphasis, buckets);

    await prisma.certificationProgram.create({
      data: {
        slug,
        title: `Biomanufacturing Certification — ${meta.label}`,
        discipline: "Biomanufacturing",
        audience: [persona],
        summary: `A role-specific, three-level credential for ${meta.label.toLowerCase()}s. ${meta.blurb} Progress Foundation → Practitioner → Advanced, earning a verifiable credential at each tier.`,
        status: "published",
        createdById,
        levels: {
          create: [
            { tier: "foundation", order: TIER_META.foundation.order, title: "Foundation", summary: "Core biomanufacturing concepts and the industry landscape.", passingScore: TIER_META.foundation.passingScore, courseIds: plan.foundation },
            { tier: "practitioner", order: TIER_META.practitioner.order, title: "Practitioner", summary: meta.emphasis === "research" ? "Applied research methods, analytics, and process science." : "Hands-on upstream/downstream operations and quality practice.", passingScore: TIER_META.practitioner.passingScore, courseIds: plan.practitioner },
            { tier: "advanced", order: TIER_META.advanced.order, title: "Advanced", summary: meta.emphasis === "research" ? "Independent investigation, scale-up, and commercialization." : "Advanced operations, GMP rigor, and floor leadership.", passingScore: TIER_META.advanced.passingScore, courseIds: plan.advanced },
          ],
        },
      },
    });
  }
}
