/**
 * Ingest a job: URL (via Jina Reader) or pasted JD → structured fields
 * + ATS detection + eligibility gates surfaced first (rules 2–4).
 * Persists a TailoringJob row.
 */
import { prisma } from "@/lib/prisma";
import { callStructured } from "@/lib/ai/reliability";
import { delimitContext } from "@/lib/ai/reliability";
import { extractJobDescription, extractJobDescriptionFromText } from "@/lib/simulator/jd-extractor";
import { detectAts } from "./ats";
import { JobParseSchema, type JobParse } from "./schemas";

export const INGEST_PROMPT_VERSION = "tailor_ingest@2026-06-24.1";

const SYSTEM = `You read a job description and return STRICT JSON only. Extract exactly what the posting says — do not infer or invent. Distinguish must-haves (required) from nice-to-haves (preferred) from responsibilities (what you'd do).

Eligibility gates are anything that could disqualify a candidate up front: on-site/hybrid location requirements, work-authorization or citizenship requirements, "no visa sponsorship", required licenses/clearances, and hard minimum years of experience or a required degree. Mark blocking:true when failing it likely disqualifies.

Return ONLY this JSON (no prose, no fences):
{"title":"","company":"","location":null,"comp":null,"mustHaves":[],"niceToHaves":[],"responsibilities":[],"eligibilityGates":[{"kind":"location|work_authorization|sponsorship|license|experience_minimum|education|other","text":"","blocking":true}]}`;

export interface IngestResult {
  ok: boolean;
  error?: string;
  jobId?: string;
  ats?: string;
  parse?: JobParse;
  rawJD?: string;
}

export async function ingestJob(args: { userId: string; url?: string | null; jdText?: string | null }): Promise<IngestResult> {
  const { userId } = args;
  const url = args.url?.trim() || null;

  // 1) Get clean JD text.
  let jd = "";
  if (args.jdText && args.jdText.trim().length >= 300) {
    const ex = extractJobDescriptionFromText(args.jdText, INGEST_PROMPT_VERSION);
    if (!ex.ok) return { ok: false, error: ex.error };
    jd = ex.content;
  } else if (url) {
    const ex = await extractJobDescription(url, INGEST_PROMPT_VERSION);
    if (!ex.ok) return { ok: false, error: ex.error + " You can paste the JD text instead." };
    jd = ex.content;
  } else {
    return { ok: false, error: "Provide a job URL or paste the job description (at least 300 characters)." };
  }

  // 2) Structured parse (must/nice/responsibilities + eligibility gates).
  const parsed = await callStructured(
    [
      { role: "system", content: SYSTEM },
      { role: "user", content: delimitContext("job_description", jd) },
    ],
    JobParseSchema,
    { feature: "tailor_ingest", userId, promptVersion: INGEST_PROMPT_VERSION, maxTokens: 1600 },
  );
  if (!parsed.ok) return { ok: false, error: `Couldn't parse the posting: ${parsed.error}` };

  // 3) ATS from the URL host (deterministic).
  const ats = detectAts(url);

  // 4) Persist.
  const p = parsed.data;
  const job = await prisma.tailoringJob.create({
    data: {
      userId, url, ats,
      title: p.title, company: p.company,
      location: p.location ?? null, comp: p.comp ?? null,
      mustHaves: p.mustHaves, niceToHaves: p.niceToHaves, responsibilities: p.responsibilities,
      rawJD: jd,
    },
    select: { id: true },
  });

  return { ok: true, jobId: job.id, ats, parse: p, rawJD: jd };
}
