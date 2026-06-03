/**
 * PATCH  /api/admin/showcase/groups/[id] — edit name/eyebrow/intro/active
 * DELETE /api/admin/showcase/groups/[id] — delete the group (submissions,
 *        which couple loosely by slug, are left in the dashboard).
 * Admin-gated.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const session = await requireRole("admin").catch(() => null);
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await ctx.params;

  const body = (await req.json().catch(() => ({}))) as {
    name?: unknown;
    eyebrow?: unknown;
    intro?: unknown;
    active?: unknown;
  };
  const data: {
    name?: string;
    eyebrow?: string | null;
    intro?: string | null;
    active?: boolean;
  } = {};
  if (typeof body.name === "string" && body.name.trim()) {
    data.name = body.name.trim().slice(0, 160);
  }
  if (typeof body.eyebrow === "string") {
    data.eyebrow = body.eyebrow.trim() ? body.eyebrow.trim().slice(0, 160) : null;
  }
  if (typeof body.intro === "string") {
    data.intro = body.intro.trim() ? body.intro.trim().slice(0, 600) : null;
  }
  if (typeof body.active === "boolean") {
    data.active = body.active;
  }
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  }

  const group = await prisma.showcaseGroup
    .update({ where: { id }, data })
    .catch(() => null);
  if (!group) return NextResponse.json({ error: "Not found." }, { status: 404 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const session = await requireRole("admin").catch(() => null);
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await ctx.params;
  await prisma.showcaseGroup.delete({ where: { id } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
