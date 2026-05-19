/**
 * Hiring-pipeline stage metadata — pure, client-safe.
 *
 * This module is the constants + types + pure helpers that BOTH the
 * server-side state machine (transitions.ts) AND client components
 * (ApplicantActions, PipelineKanban, etc.) need.
 *
 * It MUST stay free of any server-only imports (prisma, mail,
 * filesystem, etc.) so client bundles don't accidentally pull
 * nodemailer through it. transitions.ts re-exports these so old
 * `import { Stage } from "@/lib/hiring/transitions"` call-sites keep
 * working, but new callers — especially client components — should
 * import from here directly.
 */

/** Canonical pipeline stages. */
export const STAGES = [
  "new",
  "reviewing",
  "shortlisted",
  "interview_scheduled",
  "interviewed",
  "offer",
  "hired",
  "passed",
  "withdrawn",
] as const;
export type Stage = (typeof STAGES)[number];

/** Which target stages are reachable from each source. Identity
 *  transitions (s → s) are NOT in the map; legalNextStages does NOT
 *  include "stay where you are". The service's transitionApplication
 *  short-circuits identical transitions as a no-op separately.
 *
 *  `shortlisted → offer` and `interview_scheduled → offer` are the
 *  two SKIP-INTERVIEW transitions — added so employers who don't
 *  need a formal interview (returning candidate, internal
 *  conversion, lab-rotation extension, etc.) can go straight to
 *  the offer. Both still gated by the "Offer row must exist"
 *  precondition in transitionApplication, so the only way to
 *  trigger them is through the Offer composer's Send path; the
 *  transition's AuditLog row records `from` + `to`, which makes
 *  skipped-interview offers easy to find in a later audit. */
export const LEGAL_TRANSITIONS: Record<Stage, Stage[]> = {
  new:                 ["reviewing", "shortlisted", "passed", "withdrawn"],
  reviewing:           ["shortlisted", "passed", "withdrawn"],
  shortlisted:         ["interview_scheduled", "offer", "reviewing", "passed", "withdrawn"],
  interview_scheduled: ["interviewed", "offer", "shortlisted", "passed", "withdrawn"],
  interviewed:         ["offer", "shortlisted", "passed", "withdrawn"],
  offer:               ["hired", "interviewed", "passed", "withdrawn"],
  hired:               [],         // terminal — no further transitions
  passed:              ["reviewing"], // re-open if a rejection is reversed
  withdrawn:           ["new"],    // trainee can rescind a withdrawal
};

/** Was this transition a skip past one or more intermediate stages
 *  (i.e., shortlisted/interview_scheduled → offer)? Used by the
 *  service to tag the AuditLog detail so audits can find them. */
export function isInterviewSkip(from: Stage, to: Stage): boolean {
  return to === "offer" && (from === "shortlisted" || from === "interview_scheduled");
}

/** Helper for legal-transitions exposed to the UI so disabled buttons
 *  match what the service would actually accept. Defensive on unknown
 *  inputs — returns []. */
export function legalNextStages(currentStage: string): Stage[] {
  const s = (STAGES as readonly string[]).includes(currentStage)
    ? (currentStage as Stage)
    : "new";
  return LEGAL_TRANSITIONS[s] ?? [];
}

/** Group canonical stages into the columns rendered by the Kanban
 *  view. Keeps the column → stages mapping in one place so adding a
 *  stage doesn't require editing both the service + the UI. */
export const KANBAN_COLUMNS: Array<{
  id: string;
  label: string;
  stages: Stage[];
}> = [
  { id: "applied",     label: "Applied",     stages: ["new"] },
  { id: "reviewing",   label: "Reviewing",   stages: ["reviewing", "shortlisted"] },
  { id: "interview",   label: "Interview",   stages: ["interview_scheduled", "interviewed"] },
  { id: "offer",       label: "Offer",       stages: ["offer"] },
  { id: "hired",       label: "Hired",       stages: ["hired"] },
  { id: "passed",      label: "Passed",      stages: ["passed", "withdrawn"] },
];

/** Pretty labels for the canonical stages — used in chips + dropdowns. */
export const STAGE_LABELS: Record<Stage, string> = {
  new:                 "New",
  reviewing:           "Reviewing",
  shortlisted:         "Shortlisted",
  interview_scheduled: "Interview scheduled",
  interviewed:         "Interviewed",
  offer:               "Offer sent",
  hired:               "Hired",
  passed:              "Passed",
  withdrawn:           "Withdrawn",
};
