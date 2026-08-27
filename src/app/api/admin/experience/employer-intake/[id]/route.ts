/**
 * Admin edit/delete for a single employer-intake submission.
 *   PATCH  — update the editable fields (merged into the data JSON + email col)
 *   DELETE — remove the row (spam / duplicates)
 * Admin-only. Scoped to the "employer-intake" form so this can't touch other
 * form submissions (e.g. talent applications).
 */
import { NextRequest, NextResponse } from "next/server";
import { guardRole } from "@/lib/api/guard";
import { Prisma } from "@prisma/client";
import { z } from "zod";

import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const PatchSchema = z.object({
  name: z.string().trim().max(200).optional(),
  email: z.string().trim().max(320).optional(),
  organization: z.string().trim().max(300).optional(),
  title: z.string().trim().max(200).optional(),
  website: z.string().trim().max(500).optional(),
  address: z.string().trim().max(500).optional(),
  hiring_timeline: z.string().trim().max(100).optional(),
  needs: z.string().trim().max(4000).optional(),
  companyId: z.string().trim().max(100).optional(),
  numberOfInterviews: z.string().trim().max(20).optional(),
  latestInterviewScheduled: z.string().trim().max(100).optional(),
});

async function loadOwned(id: string) {
  const sub = await prisma.eventFormSubmission.findUnique({
    where: { id },
    select: { id: true, data: true, form: { select: { slug: true } } },
  });
  if (!sub || sub.form.slug !== "employer-intake") return null;
  return sub;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const _guard = await guardRole("admin");
  if (_guard instanceof NextResponse) return _guard;
  const { id } = await params;
  const sub = await loadOwned(id);
  if (!sub) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const parsed = PatchSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid fields." }, { status: 400 });

  const current = sub.data && typeof sub.data === "object" ? (sub.data as Record<string, unknown>) : {};
  const next = { ...current, ...parsed.data };

  await prisma.eventFormSubmission.update({
    where: { id },
    data: {
      data: next as Prisma.InputJsonValue,
      ...(parsed.data.email !== undefined ? { email: parsed.data.email.toLowerCase() } : {}),
    },
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const _guard = await guardRole("admin");
  if (_guard instanceof NextResponse) return _guard;
  const { id } = await params;
  const sub = await loadOwned(id);
  if (!sub) return NextResponse.json({ error: "Not found." }, { status: 404 });
  await prisma.eventFormSubmission.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
