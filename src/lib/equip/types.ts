/**
 * Shared types for the Equip funding-application pipeline.
 *
 * Aligned to the actual BHN application forms published at
 *   https://biohubnet.ca/download/EQUIP_VentureConnect_AppForm_Mar2026.pdf
 *   https://biohubnet.ca/download/EQUIP_VentureLift_PreScreeningForm_v3.pdf
 *
 * The DB stores per-stream form data as JSON; the typed shapes
 * here describe what the client expects to read back / write so
 * the wizard, the form, the admin queue, and the demo seeder all
 * agree on field names without an enum migration.
 */

export type EquipStream = "venture_connect" | "venture_lift";

export type EquipStatus =
  | "draft"
  | "submitted"
  | "under_review"
  | "approved"
  | "rejected"
  | "funded";

/** Applicant role checkboxes from the PDF forms. VC distinguishes
 *  Master's vs. PhD; VL groups them as "Graduate Student". We
 *  store the finer-grained value so VC has the data it needs;
 *  the VL form just renders the two grad options together. */
export type ApplicantRole =
  | "master_student"
  | "phd_student"
  | "postdoc"
  | "research_associate";

export type CommercializationStage = "exploring" | "building" | "unsure";

/** Maximum funding envelope per stream — used to validate budgets
 *  client-side and clamp on submit server-side. Per the BHN PDFs:
 *  VentureConnect grants up to $5,000 CAD per application (and a
 *  company may submit up to 3 separate applications, max $5K each);
 *  VentureLift pre-screening references up to $25,000 CAD for the
 *  full application that follows a successful pre-screen. */
export const STREAM_BUDGETS: Record<EquipStream, number> = {
  venture_connect: 5_000,
  venture_lift:    25_000,
};

/** Stream metadata for picker copy + admin labels. */
export const STREAM_META: Record<EquipStream, {
  name: string;
  blurb: string;
  cadence: string;
  bestFor: string;
}> = {
  venture_connect: {
    name: "VentureConnect",
    blurb: "Up to $5,000 CAD per application for one conference, workshop, or pitch event. A company may submit up to three separate applications.",
    cadence: "Monthly funding cycle",
    bestFor: "Attending an industry conference, customer demo, or pitch competition.",
  },
  venture_lift: {
    name: "VentureLift (pre-screening)",
    blurb: "Pre-screening form for the full VentureLift grant (up to $25,000 CAD). Submitting this triggers a BHN-led pre-screening consultation; if eligible you're invited to submit a full application.",
    cadence: "Quarterly funding cycle",
    bestFor: "Pre-seed / seed-stage company with provisional patent, prototype, and a commercialization roadmap.",
  },
};

/** Status display metadata — colour ramp + human label.
 *  Used by both the applicant tracker and the admin queue. */
export const STATUS_META: Record<EquipStatus, { label: string; tone: "neutral" | "brand" | "amber" | "emerald" | "rose" | "violet" }> = {
  draft:        { label: "Draft",          tone: "neutral" },
  submitted:    { label: "Submitted",      tone: "brand"   },
  under_review: { label: "Under review",   tone: "amber"   },
  approved:     { label: "Approved",       tone: "emerald" },
  rejected:     { label: "Not selected",   tone: "rose"    },
  funded:       { label: "Funded",         tone: "violet"  },
};

// ── IP status shared between both forms ────────────────────────

/** The four IP-milestone checkboxes that appear on BOTH PDFs.
 *  Each is a checkbox + date pair; the applicant ticks any that
 *  apply. */
export interface IpStatusBlock {
  inventionDisclosureChecked?: boolean;
  inventionDisclosureDate?: string;     // ISO yyyy-mm-dd
  provisionalPatentChecked?: boolean;
  provisionalPatentDate?: string;
  fullPatentChecked?: boolean;
  fullPatentDate?: string;
  licensedTechnologyChecked?: boolean;
  licensedTechnologyDate?: string;
}

// ── VentureConnect form body (Mar 2026 PDF) ────────────────────

/** Shape stored under EquipApplication.formData when
 *  stream = "venture_connect". Mirrors the EQUIP VentureConnect
 *  Grant Application Form PDF section-by-section. */
export interface VentureConnectFormData {
  // ── Applicant Information ────────────────────────────────
  fullName?: string;
  institutionAffiliation?: string;
  departmentProgram?: string;
  currentRole?: ApplicantRole;
  institutionEmail?: string;

  // ── Company Information ──────────────────────────────────
  companyName?: string;
  companyWebsite?: string;
  /** Briefly describe your venture or innovation — overview of
   *  technology / product / service and current development stage. */
  ventureDescription?: string;

  // ── Intellectual Property (IP) Status ────────────────────
  ip?: IpStatusBlock;

  // ── Funding Request Justification ────────────────────────
  /** Single textarea covering: how attendance advances the
   *  business opportunity, specific examples (Meet with investor
   *  X from Y VC firm…), eligible activities, key outcomes. */
  fundingJustification?: string;

  // ── Budget & Supporting Documentation ────────────────────
  /** Each line item from the PDF table. Values in CAD. */
  budgetAirfare?: number;
  budgetTrainFare?: number;
  budgetRideshareTaxi?: number;
  budgetAccommodation?: number;
  budgetRegistration?: number;

  // ── Signature ────────────────────────────────────────────
  /** "I acknowledge that the information provided in this
   *  application is accurate and that the requested funds will
   *  be used for the purposes outlined in this application." */
  acknowledged?: boolean;
  signaturePrintedName?: string;
  signatureDate?: string;             // ISO yyyy-mm-dd
}

// ── VentureLift pre-screening form (v3 PDF) ────────────────────

/** Shape stored under EquipApplication.formData when
 *  stream = "venture_lift". This mirrors the VentureLift
 *  Pre-Screening Form — NOT the full application, which BHN
 *  invites separately. */
export interface VentureLiftFormData {
  // ── Company Information ──────────────────────────────────
  companyName?: string;
  companyWebsite?: string;

  // ── Applicant Information ────────────────────────────────
  fullName?: string;
  institutionAffiliation?: string;
  departmentProgram?: string;
  currentRole?: "grad_student" | "postdoc" | "research_associate";
  institutionalEmail?: string;
  /** Title / position the applicant holds in the company. */
  applicantTitleInCompany?: string;
  /** Estimated time commitment to the company — accepts % or
   *  FTE string ("20%", "0.4 FTE", etc.). */
  applicantTimeCommitment?: string;

  // ── Principal Investigator (PI) Information ─────────────
  piFullName?: string;
  piInstitutionAffiliation?: string;
  piDepartmentProgram?: string;
  piInstitutionalEmail?: string;
  piTitleInCompany?: string;

  // ── IP Status ────────────────────────────────────────────
  ip?: IpStatusBlock;

  // ── Company Overview (max 100 words) ────────────────────
  /** Concise summary of the company — core mission, key
   *  products / technologies, target market, competitive
   *  advantage, biomanufacturing-sector contribution,
   *  commercialization potential. */
  companyOverview?: string;

  // ── Project Summary (max 100 words) ─────────────────────
  /** Funding-request summary — commercialization-enabling
   *  activities, expected outcomes and impact, $25K allocation,
   *  CRO / consultant / external partner identification. */
  projectSummary?: string;

  // ── Eligibility Checklist (seven self-attestations) ─────
  eligibilityStemProfessional?: boolean;
  eligibilityCanadianIp?: boolean;
  eligibilityHealthOutcomesBiomanufacturing?: boolean;
  eligibilityAcceleratorParticipated?: boolean;
  /** Free-text list of accelerator / incubator program names. */
  acceleratorPrograms?: string;
  eligibilityPreseedStageReady?: boolean;
  eligibilityNoDuplicateFunding?: boolean;
  eligibilityPiHoldsFunds?: boolean;

  // ── Signature ────────────────────────────────────────────
  signaturePrintedName?: string;
  signatureDate?: string;
}

/** Document attachment record stored inside
 *  EquipApplication.documents. Pitch decks are explicitly
 *  encouraged by both PDFs ("attach a business pitch deck to
 *  support your application"). */
export interface EquipDocument {
  key: string;
  name: string;
  size: number;
  contentType: string;
  /** What this attachment represents in the application. */
  kind: "pitch_deck" | "prototype_photo" | "letter" | "video_pitch" | "other";
  uploadedAt: string;
}

/** Milestone record stored inside EquipApplication.milestones.
 *  Templated when an application transitions to "funded". */
export interface EquipMilestone {
  id: string;
  title: string;
  /** ISO date — when this check-in is expected. */
  dueOn: string;
  status: "pending" | "in_progress" | "complete" | "blocked";
  note?: string;
  updatedAt: string;
}

// ── State-machine guards ───────────────────────────────────────

/** Statuses where the applicant can still edit. */
export function isEditable(status: EquipStatus): boolean {
  return status === "draft";
}

/** Statuses considered "open" — counted in the admin queue. */
export function isOpenForReview(status: EquipStatus): boolean {
  return status === "submitted" || status === "under_review";
}

/** Statuses that lock the application. */
export function isTerminal(status: EquipStatus): boolean {
  return status === "approved" || status === "rejected" || status === "funded";
}

/** Recommended stream for a given commercialization stage.
 *  Used by the eligibility wizard. */
export function recommendStream(stage: CommercializationStage): EquipStream | null {
  if (stage === "exploring") return "venture_connect";
  if (stage === "building")  return "venture_lift";
  return null;
}

/** Word counter used to enforce the PDF's 100-word limits on the
 *  VentureLift Company Overview + Project Summary fields. */
export function wordCount(text: string | undefined | null): number {
  if (!text) return 0;
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/** Hard prohibition the BHN PDFs spell out: "Applicants are
 *  strongly advised against using AI writing tools to complete the
 *  application sections. Applications found to contain
 *  AI-generated content will be disqualified." Surface this
 *  prominently on every form. */
export const NO_AI_DISCLAIMER =
  "Applicants are strongly advised against using AI writing tools to complete the application sections. Applications found to contain AI-generated content will be disqualified.";
