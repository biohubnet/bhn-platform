/**
 * Admin CRUD for showcase groups.
 *   GET  /api/admin/showcase/groups  → list (with per-group submission counts)
 *   POST /api/admin/showcase/groups  → create { name, eyebrow?, intro?, slug? }
 * Admin-gated. Slug is generated from the name (or a provided slug) and
 * made unique.
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

async function uniqueSlug(base: string): Promise<string> {
  const root = base || "showcase";
  let slug = root;
  let n = 2;
  while (
    await prisma.showcaseGroup.findUnique({ where: { slug }, select: { id: true } })
  ) {
    slug = `${root}-${n++}`;
  }
  return slug;
}

export async function GET() {
  const session = await requireRole("admin").catch(() => null);
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const groups = await prisma.showcaseGroup.findMany({
    orderBy: { createdAt: "desc" },
  });
  const counts = await prisma.showcaseMembership.groupBy({
    by: ["groupId"],
    _count: { _all: true },
  });
  const byGroupId = new Map(counts.map((c) => [c.groupId, c._count._all]));

  return NextResponse.json({
    ok: true,
    groups: groups.map((g) => ({
      id: g.id,
      slug: g.slug,
      name: g.name,
      eyebrow: g.eyebrow,
      intro: g.intro,
      active: g.active,
      submissionCount: byGroupId.get(g.id) ?? 0,
    })),
  });
}

export async function POST(req: NextRequest) {
  const session = await requireRole("admin").catch(() => null);
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const userId = (session.user as { id?: string }).id ?? null;

  const body = (await req.json().catch(() => ({}))) as {
    name?: unknown;
    slug?: unknown;
    eyebrow?: unknown;
    intro?: unknown;
  };
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) {
    return NextResponse.json({ error: "Name is required." }, { status: 400 });
  }
  const base =
    typeof body.slug === "string" && body.slug.trim()
      ? slugify(body.slug)
      : slugify(name);
  const slug = await uniqueSlug(base);
  const eyebrow =
    typeof body.eyebrow === "string" && body.eyebrow.trim()
      ? body.eyebrow.trim().slice(0, 160)
      : null;
  const intro =
    typeof body.intro === "string" && body.intro.trim()
      ? body.intro.trim().slice(0, 600)
      : null;

  const group = await prisma.showcaseGroup.create({
    data: { slug, name: name.slice(0, 160), eyebrow, intro, createdById: userId },
  });

  return NextResponse.json(
    {
      ok: true,
      group: {
        id: group.id,
        slug: group.slug,
        name: group.name,
        eyebrow: group.eyebrow,
        intro: group.intro,
        active: group.active,
        submissionCount: 0,
      },
    },
    { status: 201 },
  );
}
