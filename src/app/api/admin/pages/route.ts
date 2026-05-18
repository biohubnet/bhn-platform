/**
 * POST /api/admin/pages — create a new CMS page. Admin only.
 *
 * Body: { title, slug, body, excerpt?, status, audience }
 * Returns: { id }
 */
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PAGE_AUDIENCES, PAGE_STATUSES } from "@/lib/cms/audience";

export async function POST(req: Request) {
  const session = await requireRole("admin").catch(() => null);
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

  const title = String(body.title ?? "").trim();
  const slug = String(body.slug ?? "").trim();
  const bodyText = String(body.body ?? "");
  const excerpt = body.excerpt == null ? null : String(body.excerpt).trim() || null;
  const status = String(body.status ?? "draft");
  const audience = String(body.audience ?? "public");

  if (!title) return NextResponse.json({ error: "Title is required" }, { status: 400 });
  if (!slug) return NextResponse.json({ error: "Slug is required" }, { status: 400 });
  if (!/^[a-z0-9-]+$/.test(slug)) {
    return NextResponse.json({ error: "Slug must be lowercase letters, numbers, and dashes only" }, { status: 400 });
  }
  if (!bodyText.trim()) return NextResponse.json({ error: "Body is required" }, { status: 400 });
  if (!PAGE_STATUSES.includes(status as never)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }
  if (!PAGE_AUDIENCES.includes(audience as never)) {
    return NextResponse.json({ error: "Invalid audience" }, { status: 400 });
  }

  const userId = (session.user as { id?: string }).id!;

  // Slug-uniqueness check up front so we can return a friendly
  // error instead of a Prisma P2002.
  const existing = await prisma.page.findUnique({ where: { slug } });
  if (existing) {
    return NextResponse.json({ error: `Slug "${slug}" is already in use.` }, { status: 409 });
  }

  const now = new Date();
  const page = await prisma.page.create({
    data: {
      title,
      slug,
      body: bodyText,
      excerpt,
      status,
      audience,
      publishedAt: status === "published" ? now : null,
      createdById: userId,
      updatedById: userId,
    },
    select: { id: true },
  });

  return NextResponse.json({ id: page.id });
}
