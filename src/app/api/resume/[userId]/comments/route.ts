/**
 * Comments on someone's (or your own) structured resume.
 *
 *   GET  /api/resume/[userId]/comments
 *   POST /api/resume/[userId]/comments
 *     body: { body: string; anchorBulletId?, anchorItemId?, anchorSectionId? }
 *
 * Read + write gated via `canViewResume()` / `canCommentOnResume()`
 * (see src/lib/resume/permissions.ts) — the same gate that determines
 * whether the resume is visible at all.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canCommentOnResume, canViewResume } from "@/lib/resume/permissions";

export const runtime = "nodejs";

interface RouteCtx { params: Promise<{ userId: string }> }

async function whoAmI() {
  const session = await requireSession().catch(() => null);
  if (!session) return null;
  const id = (session.user as { id?: string }).id ?? null;
  const role = (session.user as { role?: string }).role ?? "trainee";
  if (!id) return null;
  return { id, role };
}

export async function GET(_req: NextRequest, ctx: RouteCtx) {
  const me = await whoAmI();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { userId: ownerId } = await ctx.params;

  const allowed = await canViewResume({
    viewerId: me.id, viewerRole: me.role, resumeOwnerId: ownerId,
  });
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const resume = await prisma.resume.findUnique({
    where: { userId: ownerId },
    select: { id: true },
  });
  if (!resume) return NextResponse.json({ ok: true, comments: [] });

  const comments = await prisma.resumeComment.findMany({
    where: { resumeId: resume.id },
    include: { author: { select: { id: true, name: true, email: true, role: true } } },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ ok: true, comments });
}

export async function POST(req: NextRequest, ctx: RouteCtx) {
  const me = await whoAmI();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { userId: ownerId } = await ctx.params;

  const allowed = await canCommentOnResume({
    viewerId: me.id, viewerRole: me.role, resumeOwnerId: ownerId,
  });
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = (await req.json().catch(() => ({}))) as {
    body?: string;
    anchorBulletId?: string;
    anchorItemId?: string;
    anchorSectionId?: string;
  };
  const text = typeof body.body === "string" ? body.body.trim().slice(0, 4000) : "";
  if (!text) return NextResponse.json({ error: "body required" }, { status: 400 });

  const resume = await prisma.resume.upsert({
    where: { userId: ownerId },
    create: {
      userId: ownerId,
      // Empty scaffold — the owner hasn't visited /profile/resume yet,
      // but a reviewer can still drop a comment they'll see on arrival.
      content: { sections: [] } as unknown as object,
    },
    update: {},
  });

  const comment = await prisma.resumeComment.create({
    data: {
      resumeId: resume.id,
      authorId: me.id,
      authorRole: me.role,
      body: text,
      anchorBulletId:  body.anchorBulletId  || null,
      anchorItemId:    body.anchorItemId    || null,
      anchorSectionId: body.anchorSectionId || null,
    },
    include: { author: { select: { id: true, name: true, email: true, role: true } } },
  });

  return NextResponse.json({ ok: true, comment });
}
