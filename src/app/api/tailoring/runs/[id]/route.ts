/**
 * One tailoring run — the stored draft + QA report + fit scorecard,
 * plus the ATS output plan so the client can render download buttons.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { atsPlan } from "@/lib/tailoring/ats";
import type { AtsKind } from "@/lib/tailoring/schemas";
import type { ResumeContent } from "@/lib/resume/types";

export const runtime = "nodejs";
interface Ctx { params: Promise<{ id: string }> }

async function uid(): Promise<string | null> {
  const s = await requireSession().catch(() => null);
  return s ? (s.user as { id?: string }).id ?? null : null;
}

export async function GET(_req: NextRequest, ctx: Ctx) {
  const userId = await uid();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const run = await prisma.tailoringRun.findFirst({
    where: { id, userId },
    select: {
      id: true, status: true, format: true, resumeDoc: true, coverDoc: true,
      fitCheck: true, qaReport: true, createdAt: true,
      job: { select: { id: true, title: true, company: true, ats: true } },
    },
  });
  if (!run) return NextResponse.json({ error: "Run not found." }, { status: 404 });
  let content: ResumeContent | null = null;
  try { content = run.resumeDoc ? (JSON.parse(run.resumeDoc) as ResumeContent) : null; } catch { content = null; }
  const plan = atsPlan((run.format ?? "other") as AtsKind);
  return NextResponse.json({
    ok: true,
    run: {
      id: run.id, status: run.status, format: run.format, createdAt: run.createdAt,
      job: run.job, content, cover: run.coverDoc ?? "",
      fit: run.fitCheck, qa: run.qaReport, plan,
    },
  });
}
