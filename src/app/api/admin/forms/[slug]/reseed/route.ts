/**
 * Reset a form's schema to the latest source seed. Use sparingly —
 * this overwrites whatever the live form currently has, including
 * any admin-side customisations done via the inline editor on
 * /forms/[slug].
 *
 *   POST /api/admin/forms/[slug]/reseed
 *
 * No-op if the slug isn't in the registered seed list.
 */
import { NextResponse } from "next/server";
import { guardRole } from "@/lib/api/guard";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { OBIO_BOOTCAMP_DEFAULTS } from "@/lib/forms/obio-bootcamp";
import { TALENT_APPLICATION_DEFAULTS } from "@/lib/forms/talent-application";

const SEEDS = [OBIO_BOOTCAMP_DEFAULTS, TALENT_APPLICATION_DEFAULTS];

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const _guard = await guardRole("admin");
  if (_guard instanceof NextResponse) return _guard;
  const { slug } = await params;

  const seed = SEEDS.find((s) => s.slug === slug);
  if (!seed) {
    return NextResponse.json({ error: "No seed defined for this form." }, { status: 404 });
  }

  const existing = await prisma.eventForm.findUnique({ where: { slug }, select: { id: true } });
  if (!existing) {
    // Fresh — just create it.
    const created = await prisma.eventForm.create({
      data: {
        slug: seed.slug,
        title: seed.title,
        description: seed.description ?? null,
        fields: seed.fields as unknown as Prisma.InputJsonValue,
      },
    });
    return NextResponse.json({ ok: true, action: "created", id: created.id });
  }

  // Overwrite the schema in place.
  const updated = await prisma.eventForm.update({
    where: { slug },
    data: {
      title: seed.title,
      description: seed.description ?? null,
      fields: seed.fields as unknown as Prisma.InputJsonValue,
    },
  });
  return NextResponse.json({ ok: true, action: "updated", id: updated.id });
}
