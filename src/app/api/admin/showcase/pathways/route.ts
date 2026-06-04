/**
 * Admin CRUD for showcase PATHWAYS (the program a showcase belongs to).
 *   GET  /api/admin/showcase/pathways  → list (with nested cohorts + counts)
 *   POST /api/admin/showcase/pathways  → create { name, eyebrow?, intro? }
 * Admin-gated. A pathway is created once and named WITHOUT a cohort number;
 * cohorts are added under it via .../pathways/[id]/cohorts.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}
async function uniquePathwaySlug(base: string): Promise<string> {
  const root = base || "pathway";
  let slug = root;
  let n = 2;
  while (
    await prisma.showcasePathway.findUnique({ where: { slug }, select: { id: true } })
  ) {
    slug = `${root}-${n++}`;
  }
  return slug;
}

export async function GET() {
  const session = await requireRole("admin").catch(() => null);
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const [pathways, counts] = await Promise.all([
    prisma.showcasePathway.findMany({
      orderBy: { createdAt: "desc" },
      include: { cohorts: { orderBy: { cohortNumber: "asc" } } },
    }),
    prisma.showcaseSubmission.groupBy({
      by: ["programSlug"],
      _count: { _all: true },
    }),
  ]);
  const bySlug = new Map(counts.map((c) => [c.programSlug, c._count._all]));

  return NextResponse.json({
    ok: true,
    pathways: pathways.map((p) => ({
      id: p.id,
      slug: p.slug,
      name: p.name,
      eyebrow: p.eyebrow,
      intro: p.intro,
      cohorts: p.cohorts.map((c) => ({
        id: c.id,
        slug: c.slug,
        name: c.name,
        cohortNumber: c.cohortNumber,
        active: c.active,
        submissionCount: bySlug.get(c.slug) ?? 0,
      })),
    })),
  });
}

export async function POST(req: NextRequest) {
  const session = await requireRole("admin").catch(() => null);
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const userId = (session.user as { id?: string }).id ?? null;

  const body = (await req.json().catch(() => ({}))) as {
    name?: unknown;
    eyebrow?: unknown;
    intro?: unknown;
  };
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) {
    return NextResponse.json({ error: "Pathway name is required." }, { status: 400 });
  }
  const slug = await uniquePathwaySlug(slugify(name));
  const eyebrow =
    typeof body.eyebrow === "string" && body.eyebrow.trim()
      ? body.eyebrow.trim().slice(0, 160)
      : null;
  const intro =
    typeof body.intro === "string" && body.intro.trim()
      ? body.intro.trim().slice(0, 600)
      : null;

  const p = await prisma.showcasePathway.create({
    data: { slug, name: name.slice(0, 160), eyebrow, intro, createdById: userId },
  });

  return NextResponse.json(
    {
      ok: true,
      pathway: {
        id: p.id,
        slug: p.slug,
        name: p.name,
        eyebrow: p.eyebrow,
        intro: p.intro,
        cohorts: [],
      },
    },
    { status: 201 },
  );
}
