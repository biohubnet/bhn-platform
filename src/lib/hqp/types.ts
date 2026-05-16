/**
 * Types for the HQP Advisory Committee application + lifecycle.
 *
 * Derived from the BHN HQP Advisory Committee Charter:
 *   • 10-member voluntary committee, annual open call
 *   • Members are active participants in ≥ 1 BHN program
 *   • Expected to spend ~12 h/year on meetings + feedback
 *   • Must adhere to confidentiality + COI requirements
 *   • Consent for name / headshot use in BHN communications
 *
 * The application captures everything the BHN program team
 * needs to pick the cohort while keeping the form small enough
 * that an interested trainee can complete it in 10–15 minutes.
 */

export type HqpApplicationStatus = "draft" | "submitted" | "approved" | "rejected";

/** Which BHN program the applicant is participating in. */
export type HqpProgramPillar = "engage" | "experience" | "equip";

/** Which area(s) the applicant most wants to give feedback on.
 *  Maps to the Scope of Responsibilities in the Charter. */
export type HqpAreaOfInterest =
  | "curriculum"          // courses + pathways
  | "platform_ux"         // BHN web platform UX
  | "events"              // workshops, seminars, networking, symposia
  | "application_process" // EQUIP + EXPERIENCE intake flows
  | "career_development"  // training + career gaps
  | "communications";     // website, LinkedIn, newsletter

/** Shape stored under HqpMemberApplication.formData. */
export interface HqpApplicationFormData {
  /** Why are you interested in joining the committee? */
  motivation?: string;
  /** Which BHN program pillars are you participating in.
   *  At least one is required at submit. */
  programsParticipating?: HqpProgramPillar[];
  /** Free text — which specific BHN programs / cohorts. */
  programDetails?: string;
  /** What unique perspective do you bring to the committee? */
  perspective?: string;
  /** Areas the applicant most wants to feed back on. */
  areasOfInterest?: HqpAreaOfInterest[];
  /** Confirmation: ~12 h/year time commitment. */
  timeCommitmentAcknowledged?: boolean;
  /** Confirmation: confidentiality + COI charter section 8. */
  confidentialityAck?: boolean;
  /** Charter section 11 — consent to use of name + headshot. */
  nameImageConsent?: boolean;
  /** Anything else the applicant wants the program team to know. */
  additionalNotes?: string;
}

export const PROGRAM_PILLAR_LABELS: Record<HqpProgramPillar, string> = {
  engage:     "ENGAGE — training / courses / pathways",
  experience: "EXPERIENCE — internships / KE / talent pool",
  equip:      "EQUIP — VentureConnect / VentureLift funding",
};

export const AREA_LABELS: Record<HqpAreaOfInterest, string> = {
  curriculum:           "Curriculum + pathways",
  platform_ux:          "BHN platform UX",
  events:               "Events / workshops / networking",
  application_process:  "Application flows (EQUIP, EXPERIENCE)",
  career_development:   "Training + career-development gaps",
  communications:       "Communications (web, social, newsletter)",
};

export const STATUS_META: Record<HqpApplicationStatus, { label: string; tone: "neutral" | "brand" | "emerald" | "rose" }> = {
  draft:     { label: "Draft",       tone: "neutral" },
  submitted: { label: "Submitted",   tone: "brand"   },
  approved:  { label: "Approved",    tone: "emerald" },
  rejected:  { label: "Not selected", tone: "rose"   },
};

/** Server-side validation for the application form. Returns a
 *  list of human-readable errors; empty array = ready to submit. */
export function validateApplication(f: HqpApplicationFormData): string[] {
  const errors: string[] = [];
  if (!f.motivation?.trim() || f.motivation.trim().length < 50) {
    errors.push("Why are you interested? — needs at least 50 characters");
  }
  if (!f.programsParticipating || f.programsParticipating.length === 0) {
    errors.push("Tick at least one BHN program pillar you're participating in");
  }
  if (!f.perspective?.trim() || f.perspective.trim().length < 30) {
    errors.push("Perspective — needs at least 30 characters");
  }
  if (!f.areasOfInterest || f.areasOfInterest.length === 0) {
    errors.push("Pick at least one area of interest");
  }
  if (!f.timeCommitmentAcknowledged) errors.push("Confirm the ~12 h/year time commitment");
  if (!f.confidentialityAck)         errors.push("Confirm the confidentiality + COI acknowledgement");
  if (!f.nameImageConsent)           errors.push("Confirm the name / image consent (Charter §11)");
  return errors;
}
