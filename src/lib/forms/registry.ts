import { prisma } from "@/lib/prisma";
import { OBIO_BOOTCAMP_DEFAULTS } from "./obio-bootcamp";

// All known seed forms. To add a new form, add a default constant in
// its own file and register it here. The first visit auto-provisions it.
const SEEDS = [OBIO_BOOTCAMP_DEFAULTS];

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
      fields: seed.fields,
    },
  });
}
