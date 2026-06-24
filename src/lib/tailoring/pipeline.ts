/**
 * The tailoring pipeline (rules end-to-end):
 *   load job + grounding facts → gap analysis → draft under rules →
 *   verify (QA gate) → fit scorecard → store a TailoringRun.
 * Never submits anything — it produces artifacts + a scorecard for the
 * human to review.
 */
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { ResumeContent } from "@/lib/resume/types";
import { retrieveFacts } from "./grounding";
import { analyzeGap } from "./gap";
import { draftApplication, roleArchetype } from "./draft";
import { draftToResumeContent } from "./content";
import { verifyDraft } from "./verify";
import { buildScorecard } from "./fit";
import { loadActiveRules } from "./rules";
import type { GapReport, FitScorecard, QaReport } from "./schemas";

export interface RunResult {
  ok: boolean;
  error?: string;
  runId?: string;
  status?: "verified" | "blocked";
  content?: ResumeContent;
  cover?: string;
  gap?: GapReport;
  fit?: FitScorecard;
  qa?: QaReport;
}

export async function runTailoring(args: { userId: string; jobId: string }): Promise<RunResult> {
  const job = await prisma.tailoringJob.findFirst({ where: { id: args.jobId, userId: args.userId } });
  if (!job) return { ok: false, error: "Job not found." };

  const master = await prisma.masterResume.findUnique({ where: { userId: args.userId }, select: { header: true } });
  const header = (master?.header as ResumeContent["header"]) ?? null;

  // Grounding: facts relevant to this JD.
  const query = `${job.title} ${job.company}\n${job.mustHaves.join("; ")}\n${job.rawJD.slice(0, 2000)}`;
  const facts = await retrieveFacts(args.userId, query, 50);
  if (!facts.length) {
    return { ok: false, error: "Your master library has no bullets to ground on. Add or import bullets on the Master resume page first." };
  }

  // Gap analysis.
  const gapRes = await analyzeGap({ userId: args.userId, mustHaves: job.mustHaves, niceToHaves: job.niceToHaves, facts });
  if (!gapRes.ok) return { ok: false, error: `Gap analysis failed: ${gapRes.error}` };
  const gap = gapRes.report;

  // Learned rules in scope.
  const rules = await loadActiveRules(args.userId, { ats: job.ats, company: job.company, roleType: roleArchetype(job.title).archetype });

  // Draft.
  const draftRes = await draftApplication({
    userId: args.userId, jobTitle: job.title, company: job.company,
    mustHaves: job.mustHaves, niceToHaves: job.niceToHaves, facts, rules, header,
  });
  if (!draftRes.ok) return { ok: false, error: `Drafting failed: ${draftRes.error}` };
  const content = draftToResumeContent(draftRes.draft);
  const cover = draftRes.draft.coverLetter ?? "";

  // Verify + fit.
  const qa = verifyDraft({ content, coverText: cover, mustHaves: job.mustHaves, facts });
  const fit = buildScorecard(gap);
  const status: "verified" | "blocked" = qa.pass ? "verified" : "blocked";

  // Store.
  const run = await prisma.tailoringRun.create({
    data: {
      userId: args.userId, jobId: job.id,
      resumeDoc: JSON.stringify(content), coverDoc: cover, format: job.ats,
      fitCheck: fit as unknown as Prisma.InputJsonValue,
      qaReport: qa as unknown as Prisma.InputJsonValue,
      status, finishedAt: new Date(),
    },
    select: { id: true },
  });

  return { ok: true, runId: run.id, status, content, cover, gap, fit, qa };
}
