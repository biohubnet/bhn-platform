/**
 * Newsletter workshop — issue collection.
 *
 *   GET  /api/workspace/newsletter        → issues, newest first
 *   POST /api/workspace/newsletter        → create an issue  (admin)
 *
 * Contributing a piece is instructor+ (see [id]/route.ts); creating and
 * generating an issue is admin — colleagues drop things in, an editor
 * assembles.
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const CreateSchema = z.object({
  title: z.string().trim().min(3).max(120),
  dateline: z.string().trim().min(3).max(60),
  preheader: z.string().trim().max(300).optional().nullable(),
});

export async function GET() {
  const session = await requireRole("instructor").catch(() => null);
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const issues = await prisma.newsletterIssue.findMany({
    orderBy: { createdAt: "desc" },
    take: 24,
    select: {
      id: true, title: true, dateline: true, status: true,
      renderedAt: true, createdAt: true,
      _count: { select: { pieces: true } },
    },
  });
  return NextResponse.json({ ok: true, issues });
}

export async function POST(req: NextRequest) {
  const session = await requireRole("admin").catch(() => null);
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = CreateSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Give the issue a title and a dateline." }, { status: 400 });
  }
  const meId = (session.user as { id?: string }).id ?? null;

  const issue = await prisma.newsletterIssue.create({
    data: {
      title: parsed.data.title,
      dateline: parsed.data.dateline,
      preheader: parsed.data.preheader ?? null,
      createdById: meId,
    },
    select: { id: true },
  });
  return NextResponse.json({ ok: true, id: issue.id });
}
