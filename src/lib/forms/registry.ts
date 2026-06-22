import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { OBIO_BOOTCAMP_DEFAULTS } from "./obio-bootcamp";
import { TALENT_APPLICATION_DEFAULTS } from "./talent-application";
import { EMPLOYER_INTAKE_DEFAULTS } from "./employer-intake";

// All known seed forms. To add a new form, add a default constant in
// its own file and register it here. The first visit auto-provisions it.
const SEEDS = [OBIO_BOOTCAMP_DEFAULTS, TALENT_APPLICATION_DEFAULTS, EMPLOYER_INTAKE_DEFAULTS];

/** Look up a form by slug, auto-provisioning from a seed if missing. */
export async function getOrSeedForm(slug: string) {
  const existing = await prisma.eventForm.findUnique({ where: { slug } });
  if (existing) return existing;
  const seed = SEEDS.find((s) => s.slug === slug);
  if (!seed) return null;
  return prisma.eventForm.create({
    data: {
      slug: seed.slug,
      title: seed.title,
      description: seed.description ?? null,
      fields: seed.fields as unknown as Prisma.InputJsonValue,
    },
  });
}

/**
 * Idempotent: ensure every registered seed form exists in the DB.
 * Cheap (one findUnique per seed); call from any page that lists forms
 * so a fresh deployment doesn't show empty until someone visits the
 * specific /forms/[slug] URL first.
 */
export async function ensureRegisteredForms() {
  for (const seed of SEEDS) {
    const existing = await prisma.eventForm.findUnique({
      where: { slug: seed.slug },
      select: { id: true },
    });
    if (existing) continue;
    await prisma.eventForm.create({
      data: {
        slug: seed.slug,
        title: seed.title,
        description: seed.description ?? null,
        fields: seed.fields as unknown as Prisma.InputJsonValue,
      },
    });
  }
}
