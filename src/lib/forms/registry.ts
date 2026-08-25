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
 * Call from any page that lists forms so a fresh deployment doesn't
 * show empty until someone visits the specific /forms/[slug] URL first.
 *
 * One batched read, and a write only when something is genuinely
 * missing — which is to say, almost never. This used to loop and
 * `await` a findUnique per seed. That read "cheap" when the database
 * was local, but each of those is a network round trip: three seeds
 * meant three strictly sequential round trips on every render of a
 * page that lists forms, spent confirming that rows which already
 * exist still exist. Query *time* was never the cost here; the number
 * of round trips was.
 *
 * `skipDuplicates` covers the race where two first-requests arrive
 * together — the same race the sequential version already had.
 */
export async function ensureRegisteredForms() {
  const existing = await prisma.eventForm.findMany({
    where: { slug: { in: SEEDS.map((s) => s.slug) } },
    select: { slug: true },
  });
  const have = new Set(existing.map((row) => row.slug));
  const missing = SEEDS.filter((seed) => !have.has(seed.slug));
  if (missing.length === 0) return;

  await prisma.eventForm.createMany({
    data: missing.map((seed) => ({
      slug: seed.slug,
      title: seed.title,
      description: seed.description ?? null,
      fields: seed.fields as unknown as Prisma.InputJsonValue,
    })),
    skipDuplicates: true,
  });
}
