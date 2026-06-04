/**
 * POST /api/admin/showcase/pathways/[id]/cohorts — add a cohort to a
 * pathway. Auto-numbers (max existing cohortNumber + 1) and names it
 * "Cohort N" by default (or an optional custom label). Slug =
 * <pathway-slug>-cohort-N. The cohort is a ShowcaseGroup with pathwayId
 * set, so it gets its own public /showcase/<slug> link but inherits the
 * pathway's branding. Admin-gated.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, ctx: Ctx) {
  const session = await requireRole("admin").catch(() => null);
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const userId = (session.user as { id?: string }).id ?? null;
  const { id: pathwayId } = await ctx.params;

  const pathway = await prisma.showcasePathway.findUnique({
    where: { id: pathwayId },
    include: { cohorts: { select: { cohortNumber: true } } },
  });
  if (!pathway) {
    return NextResponse.json({ error: "Pathway not found." }, { status: 404 });
  }

  const body = (await req.json().catch(() => ({}))) as { label?: unknown };
  const maxN = pathway.cohorts.reduce(
    (m, c) => Math.max(m, c.cohortNumber ?? 0),
    0,
  );
  const n = maxN + 1;
  const label =
    typeof body.label === "string" && body.label.trim()
      ? body.label.trim().slice(0, 80)
      : `Cohort ${n}`;

  const base = `${pathway.slug}-cohort-${n}`;
  let slug = base;
  let k = 2;
  while (
    await prisma.showcaseGroup.findUnique({ where: { slug }, select: { id: true } })
  ) {
    slug = `${base}-${k++}`;
  }

  const cohort = await prisma.showcaseGroup.create({
    data: { slug, name: label, pathwayId, cohortNumber: n, createdById: userId },
  });

  return NextResponse.json(
    {
      ok: true,
      cohort: {
        id: cohort.id,
        slug: cohort.slug,
        name: cohort.name,
        cohortNumber: n,
        active: cohort.active,
        submissionCount: 0,
      },
    },
    { status: 201 },
  );
}
