import { prisma } from "@/lib/prisma";
import { TIER_META } from "./tiers";
import { TRAINEE_PERSONAS, PERSONA_META, PERSONA_TRACK, type TraineePersona } from "./personas";

// Legacy single generic program from the first cut — retired (unpublished) in
// favour of the per-persona role tracks below.
const LEGACY_SLUG = "biomanufacturing-professional";

const slugFor = (p: TraineePersona) => `biomfg-${p.replace(/_/g, "-")}`;

type Tagged = { id: string; hay: string };
type Plan = { foundation: string[]; practitioner: string[]; advanced: string[] };

/**
 * Build one persona's three-tier course plan by matching the persona's per-tier
 * keyword themes (PERSONA_TRACK) against the real course catalogue. A course is
 * assigned to at most one tier within a program (foundation-first), and every
 * tier is guaranteed at least one course while the catalogue is non-empty — so
 * each of the five tracks gets a genuinely distinct curriculum.
 */
function planForPersona(persona: TraineePersona, tagged: Tagged[]): Plan {
  const track = PERSONA_TRACK[persona];
  const used = new Set<string>();
  const pick = (kws: string[], max: number): string[] => {
    const out: string[] = [];
    for (const c of tagged) {
      if (used.has(c.id)) continue;
      if (kws.some((k) => c.hay.includes(k))) {
        out.push(c.id);
        used.add(c.id);
        if (out.length >= max) break;
      }
    }
    return out;
  };
  const ensureOne = (arr: string[]): string[] => {
    if (arr.length) return arr;
    const fill = tagged.find((c) => !used.has(c.id));
    if (fill) { used.add(fill.id); return [fill.id]; }
    return arr;
  };
  return {
    foundation: ensureOne(pick(track.foundation, 3)),
    practitioner: ensureOne(pick(track.practitioner, 3)),
    advanced: ensureOne(pick(track.advanced, 3)),
  };
}

const sameIds = (a: string[], b: string[]) => JSON.stringify(a) === JSON.stringify(b);

/**
 * Lazily create one role-specific certification track per trainee persona
 * (Master's, PhD, Post-doc, Research Associate, Lab Technician). Each is a
 * Foundation → Practitioner → Advanced ladder with a persona-curated course
 * mix. Self-healing: existing tracks have their tier→course mapping refreshed
 * to the current plan (so curation changes propagate) without disturbing any
 * other fields.
 */
export async function ensureCertificationPrograms(createdById: string | null): Promise<void> {
  // Retire the legacy generic program if it's still published.
  await prisma.certificationProgram.updateMany({
    where: { slug: LEGACY_SLUG, status: "published" },
    data: { status: "draft" },
  });

  const courses = await prisma.course.findMany({
    select: { id: true, title: true, code: true, topic: true },
    orderBy: { createdAt: "asc" },
  });
  const tagged: Tagged[] = courses.map((c) => ({
    id: c.id,
    hay: `${c.title} ${c.code ?? ""} ${c.topic ?? ""}`.toLowerCase(),
  }));

  for (const persona of TRAINEE_PERSONAS) {
    const slug = slugFor(persona);
    const meta = PERSONA_META[persona];
    const plan = planForPersona(persona, tagged);
    const byTier: Record<string, string[]> = { foundation: plan.foundation, practitioner: plan.practitioner, advanced: plan.advanced };

    const existing = await prisma.certificationProgram.findUnique({
      where: { slug },
      include: { levels: true },
    });

    if (!existing) {
      await prisma.certificationProgram.create({
        data: {
          slug,
          title: `Biomanufacturing Certification — ${meta.label}`,
          discipline: "Biomanufacturing",
          audience: [persona],
          summary: `A role-specific, three-level credential for ${meta.label.toLowerCase()}s. ${meta.blurb} Progress Foundation → Practitioner → Advanced, earning a credential at each tier.`,
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
      continue;
    }

    // Self-heal: refresh each tier's course mapping to the current plan.
    for (const level of existing.levels) {
      const want = byTier[level.tier];
      if (want && !sameIds(level.courseIds, want)) {
        await prisma.certificationLevel.update({ where: { id: level.id }, data: { courseIds: want } });
      }
    }
  }
}
