/**
 * PATCH /api/admin/pages/[id] — update a CMS page. Admin only.
 * DELETE /api/admin/pages/[id] — delete a CMS page. Admin only.
 *
 * PATCH body: any subset of { title, slug, body, excerpt, status,
 * audience }. Validates each field present.
 */
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PAGE_AUDIENCES, PAGE_STATUSES } from "@/lib/cms/audience";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(req: Request, ctx: RouteContext) {
  const session = await requireRole("admin").catch(() => null);
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await ctx.params;

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

  const existing = await prisma.page.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const data: Record<string, unknown> = {};

  if (typeof body.title === "string") {
    const t = body.title.trim();
    if (!t) return NextResponse.json({ error: "Title can't be empty" }, { status: 400 });
    data.title = t;
  }

  if (typeof body.slug === "string") {
    const s = body.slug.trim();
    if (!/^[a-z0-9-]+$/.test(s)) {
      return NextResponse.json({ error: "Slug must be lowercase letters, numbers, and dashes only" }, { status: 400 });
    }
    if (s !== existing.slug) {
      const dupe = await prisma.page.findUnique({ where: { slug: s } });
      if (dupe) return NextResponse.json({ error: `Slug "${s}" is already in use.` }, { status: 409 });
    }
    data.slug = s;
  }

  if (typeof body.body === "string") {
    if (!body.body.trim()) return NextResponse.json({ error: "Body can't be empty" }, { status: 400 });
    data.body = body.body;
  }

  if ("excerpt" in body) {
    data.excerpt = body.excerpt == null ? null : String(body.excerpt).trim() || null;
  }

  if (typeof body.status === "string") {
    if (!PAGE_STATUSES.includes(body.status as never)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    data.status = body.status;
    // Stamp publishedAt the first time we cross to "published".
    if (body.status === "published" && !existing.publishedAt) {
      data.publishedAt = new Date();
    }
  }

  if (typeof body.audience === "string") {
    if (!PAGE_AUDIENCES.includes(body.audience as never)) {
      return NextResponse.json({ error: "Invalid audience" }, { status: 400 });
    }
    data.audience = body.audience;
  }

  data.updatedById = (session.user as { id?: string }).id!;

  const updated = await prisma.page.update({
    where: { id },
    data,
    select: { id: true, slug: true, status: true },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, ctx: RouteContext) {
  const session = await requireRole("admin").catch(() => null);
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await ctx.params;

  const existing = await prisma.page.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.page.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
