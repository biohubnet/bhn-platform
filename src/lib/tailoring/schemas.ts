/**
 * Schemas + types for the AI Job-Tailoring pipeline.
 * Every AI step returns one of these, schema-validated via callStructured.
 */
import { z } from "zod";

export type AtsKind = "workday" | "greenhouse" | "lever" | "ashby" | "successfactors" | "other";

/* ── Ingest: JD → structured ─────────────────────────────────────── */
export const EligibilityGateSchema = z.object({
  kind: z.enum(["location", "work_authorization", "sponsorship", "license", "experience_minimum", "education", "other"]),
  text: z.string(),
  /** True when this could disqualify the candidate outright (surfaced first). */
  blocking: z.boolean(),
});
export type EligibilityGate = z.infer<typeof EligibilityGateSchema>;

export const JobParseSchema = z.object({
  title: z.string().min(1),
  company: z.string().min(1),
  location: z.string().nullish(),
  comp: z.string().nullish(),
  mustHaves: z.array(z.string()).default([]),
  niceToHaves: z.array(z.string()).default([]),
  responsibilities: z.array(z.string()).default([]),
  eligibilityGates: z.array(EligibilityGateSchema).default([]),
});
export type JobParse = z.infer<typeof JobParseSchema>;

/* ── Gap analysis ────────────────────────────────────────────────── */
export const GapItemSchema = z.object({
  requirement: z.string(),
  kind: z.enum(["must", "nice"]),
  status: z.enum(["have", "partial", "gap"]),
  /** ids of the master bullets that evidence this (from the grounding set). */
  evidenceBulletIds: z.array(z.string()).default([]),
  rationale: z.string(),
  /** For partial/gap: the single piece of evidence that would close it. */
  closeWith: z.string().nullish(),
});
export type GapItem = z.infer<typeof GapItemSchema>;

export const GapReportSchema = z.object({
  items: z.array(GapItemSchema).default([]),
  reachCall: z.enum(["strong", "stretch", "skip"]),
  reachRationale: z.string(),
  /** Claims the JD wants that the master CANNOT support — never fabricate these. */
  unsupportedClaims: z.array(z.string()).default([]),
});
export type GapReport = z.infer<typeof GapReportSchema>;

/* ── Draft ───────────────────────────────────────────────────────── */
export const DraftSchema = z.object({
  header: z.object({
    name: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
    location: z.string().optional(),
    summary: z.string().optional(),
  }).optional(),
  sections: z.array(z.object({
    kind: z.string(),
    title: z.string().optional(),
    items: z.array(z.object({
      title: z.string().optional(),
      subtitle: z.string().optional(),
      dateRange: z.string().optional(),
      bullets: z.array(z.string()).default([]),
    })).default([]),
  })).default([]),
  coverLetter: z.string().default(""),
});
export type Draft = z.infer<typeof DraftSchema>;

/* ── Verify (deterministic QA gate) ──────────────────────────────── */
export interface QaCheck { id: string; label: string; pass: boolean; detail?: string }
export interface QaReport { pass: boolean; checks: QaCheck[] }

/* ── Fit scorecard ───────────────────────────────────────────────── */
export interface FitScorecard {
  overall: "strong" | "partial" | "gap";
  haves: number;
  partials: number;
  gaps: number;
  total: number;
  reachCall: "strong" | "stretch" | "skip";
  reachRationale: string;
  residuals: string[];
  flags: string[];
}
