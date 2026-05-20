/**
 * AI-tailor the caller's structured resume to a specific posting.
 *
 *   POST /api/profile/resume/structure/tailor
 *     body: { postingId: string; apply?: boolean }
 *
 * Two-step flow on the client:
 *
 *   1) POST { postingId }            → returns { rewrites: [...] }
 *                                       (preview; nothing persisted)
 *   2) POST { postingId, apply: true } → persists the rewrites onto
 *                                       Resume.content, marks each
 *                                       changed bullet aiSuggested
 *                                       so the editor highlights it,
 *                                       and writes a ResumeRevision
 *                                       snapshot with
 *                                       triggeredBy: "ai_tailor".
 *
 * The two-step is on purpose: the trainee should see what changed
 * before the AI overwrites their resume. Step 1 is cheap to re-run
 * (just generation, no DB write) so they can flip to a different
 * posting and preview again before committing.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { ResumeContent } from "@/lib/resume/types";
import { applyBulletRewrites, flattenBullets, tailorToPosting } from "@/lib/resume/tailor";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id?: string }).id ?? null;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as {
    postingId?: unknown;
    apply?: unknown;
  };
  const postingId = typeof body.postingId === "string" ? body.postingId : null;
  if (!postingId) {
    return NextResponse.json({ error: "postingId required" }, { status: 400 });
  }
  const apply = body.apply === true;

  // Fetch posting + its required-skill names so the prompt can name
  // them in the rewrite guidance. Read-anyone since postings are
  // public to all signed-in trainees.
  const posting = await prisma.internshipPosting.findUnique({
    where: { id: postingId },
    select: {
      title: true,
      positionDetails: true,
      keySkills: true,
      // The PostingSkill -> Skill chain. We surface required skills
      // first; "nice-to-have" weights come second. Falls back to the
      // legacy `keySkills` scalar list if the relation is empty.
      skills: {
        select: { required: true, weight: true, skill: { select: { name: true } } },
        orderBy: [{ required: "desc" }, { weight: "desc" }],
      },
    },
  });
  if (!posting) {
    return NextResponse.json({ error: "Posting not found." }, { status: 404 });
  }
  const relSkills = posting.skills.map((s) => s.skill.name);
  const skills = relSkills.length > 0 ? relSkills : posting.keySkills;

  // Load the caller's resume + flatten the bullets.
  const resume = await prisma.resume.findUnique({
    where: { userId },
    select: { id: true, content: true, version: true },
  });
  if (!resume) {
    return NextResponse.json(
      { error: "No structured resume yet. Visit /profile/resume to scaffold one first." },
      { status: 400 },
    );
  }
  const content = resume.content as unknown as ResumeContent;
  const bullets = flattenBullets(content);
  if (bullets.length === 0) {
    return NextResponse.json(
      { ok: true, rewrites: [], note: "Resume has no bullets yet — add some before tailoring." },
    );
  }

  // `positionDetails` is the long-form description on InternshipPosting;
  // trim to keep prompt size sane. The model only needs the gist.
  const summary = posting.positionDetails
    ? posting.positionDetails.slice(0, 800)
    : null;
  const result = await tailorToPosting({
    posting: { title: posting.title, summary, skills },
    bullets,
    userId,
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 502 });
  }

  // Preview mode — return the rewrites without writing anything.
  if (!apply) {
    return NextResponse.json({
      ok: true,
      preview: true,
      rewrites: result.rewrites,
      postingTitle: posting.title,
    });
  }

  // Apply mode — persist the changes + snapshot a revision.
  const rewriteMap: Record<string, string> = {};
  for (const r of result.rewrites) {
    if (r.changed) rewriteMap[r.id] = r.rewritten;
  }
  if (Object.keys(rewriteMap).length === 0) {
    return NextResponse.json({
      ok: true,
      applied: 0,
      note: "No bullet changes recommended for this posting — resume kept as-is.",
    });
  }
  const next = applyBulletRewrites(content, rewriteMap);

  const updated = await prisma.$transaction(async (tx) => {
    const r = await tx.resume.update({
      where: { id: resume.id },
      data: {
        content: next as unknown as object,
        version: { increment: 1 },
        lastEditedAt: new Date(),
      },
      select: { id: true, version: true },
    });
    await tx.resumeRevision.create({
      data: {
        resumeId: r.id,
        version: r.version,
        content: next as unknown as object,
        triggeredBy: "ai_tailor",
        note: `Tailored to: ${posting.title}`,
      },
    });
    return r;
  });

  return NextResponse.json({
    ok: true,
    applied: Object.keys(rewriteMap).length,
    version: updated.version,
    rewrites: result.rewrites,
  });
}
