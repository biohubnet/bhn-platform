/**
 * Download one artifact from a run, per the ATS output matrix.
 *   GET ?out=<output id>   (resume | resume-parse | skills | cover | combined)
 * Regenerates the file on demand from the stored draft — nothing is
 * persisted to object storage.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { atsPlan } from "@/lib/tailoring/ats";
import type { AtsKind } from "@/lib/tailoring/schemas";
import type { ResumeContent } from "@/lib/resume/types";
import { resumeDocx, coverDocx, combinedDocx, skillsTxt, parseSafeResumeText } from "@/lib/tailoring/docx";

export const runtime = "nodejs";
interface Ctx { params: Promise<{ id: string }> }

async function uid(): Promise<string | null> {
  const s = await requireSession().catch(() => null);
  return s ? (s.user as { id?: string }).id ?? null : null;
}

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "application";
const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export async function GET(req: NextRequest, ctx: Ctx) {
  const userId = await uid();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const outId = new URL(req.url).searchParams.get("out") ?? "resume";

  const run = await prisma.tailoringRun.findFirst({
    where: { id, userId },
    select: { resumeDoc: true, coverDoc: true, format: true, job: { select: { company: true } } },
  });
  if (!run || !run.resumeDoc) return NextResponse.json({ error: "Run not found." }, { status: 404 });

  let content: ResumeContent;
  try { content = JSON.parse(run.resumeDoc) as ResumeContent; }
  catch { return NextResponse.json({ error: "Stored draft is unreadable." }, { status: 422 }); }
  const cover = run.coverDoc ?? "";

  const plan = atsPlan((run.format ?? "other") as AtsKind);
  const out = plan.outputs.find((o) => o.id === outId);
  if (!out) return NextResponse.json({ error: "Unknown output." }, { status: 400 });

  const base = `${slug(run.job.company)}-${out.kind}`;

  if (out.fmt === "txt") {
    const text = out.kind === "skills" ? skillsTxt(content) : parseSafeResumeText(content);
    return new NextResponse(text, {
      headers: { "Content-Type": "text/plain; charset=utf-8", "Content-Disposition": `attachment; filename="${base}.txt"` },
    });
  }

  let buf: Buffer;
  if (out.kind === "combined") buf = await combinedDocx(cover, content, out.order ?? ["cover", "resume"]);
  else if (out.kind === "cover") buf = await coverDocx(cover, content.header);
  else buf = await resumeDocx(content);

  return new NextResponse(new Uint8Array(buf), {
    headers: { "Content-Type": DOCX_MIME, "Content-Disposition": `attachment; filename="${base}.docx"` },
  });
}
