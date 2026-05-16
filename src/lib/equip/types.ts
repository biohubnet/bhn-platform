/**
 * Shared types for the Equip funding-application pipeline.
 *
 * Lives in its own module so the client wizard, the API routes,
 * the admin queue, and the demo seeder all agree on the wire
 * shapes — without circular imports.
 *
 * The DB stores per-stream form data as JSON; the typed shapes
 * here describe what the client expects to read back / write.
 */

export type EquipStream = "venture_connect" | "venture_lift";

export type EquipStatus =
  | "draft"
  | "submitted"
  | "under_review"
  | "approved"
  | "rejected"
  | "funded";

export type ApplicantType = "grad" | "postdoc" | "research_associate" | "founder";

export type CommercializationStage = "exploring" | "building" | "unsure";

/** Maximum funding envelope per stream — used to validate budgets
 *  client-side and clamp on submit server-side. */
export const STREAM_BUDGETS: Record<EquipStream, number> = {
  venture_connect: 5_000,
  venture_lift:    25_000,
};

/** Stream metadata for picker copy + admin labels. */
export const STREAM_META: Record<EquipStream, {
  name: string;
  blurb: string;
  cadence: string;
  /** Headline use case — drives the wizard recommendation. */
  bestFor: string;
}> = {
  venture_connect: {
    name: "VentureConnect",
    blurb: "Up to $5,000 for conferences, pitch competitions, and networking events that move your innovation forward.",
    cadence: "Monthly funding cycle",
    bestFor: "Exploring — you need to get to a conference, demo day, or pitch event.",
  },
  venture_lift: {
    name: "VentureLift",
    blurb: "Up to $25,000 for accelerator participation, IP work, prototype builds, and commercialization roadmap execution.",
    cadence: "Quarterly funding cycle",
    bestFor: "Building — you have IP, a prototype, or an accelerator spot lined up.",
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

// ── Stream-specific form bodies ────────────────────────────────

/** Shape stored under EquipApplication.formData when stream =
 *  "venture_connect". All fields optional during draft;
 *  validated at submit time. */
export interface VentureConnectFormData {
  /** Conference / event name (freeform — curated list in v2). */
  eventName?: string;
  /** Event URL — opt; we'll auto-fill suggestion blurb from it. */
  eventUrl?: string;
  /** Event date (ISO yyyy-mm-dd). */
  eventDate?: string;
  /** Why this event is the right next step — 1-2 sentences. */
  alignmentNarrative?: string;
  /** Budget line items (sum must be ≤ $5K).
   *  registration / travel / lodging / other. */
  budgetRegistration?: number;
  budgetTravel?: number;
  budgetLodging?: number;
  budgetOther?: number;
  budgetOtherNote?: string;
  /** Single-line expected outcome ("a paid collaboration",
   *  "investor intro", "co-author lead"). */
  expectedOutcome?: string;
}

/** Shape stored under EquipApplication.formData when stream =
 *  "venture_lift". Phase B fills these in fully; Phase A keeps
 *  the type defined so the schema is stable. */
export interface VentureLiftFormData {
  /** 1-paragraph innovation summary — AI can draft from a URL. */
  innovationSummary?: string;
  /** "provisional" | "filed" | "granted" | "owned" | "licensed"
   *  | "in_progress" | "none". */
  ipStatus?: string;
  /** Country / region IP rights are held in (auto-fills CA). */
  ipJurisdiction?: string;
  /** Technology Readiness Level — 1 to 9. */
  trl?: number;
  /** Roadmap text — AI can draft. */
  commercializationRoadmap?: string;
  /** Accelerator participation. */
  acceleratorName?: string;
  acceleratorStart?: string;
  acceleratorEnd?: string;
  /** Budget line items (sum must be ≤ $25K). */
  budgetIp?: number;
  budgetPrototype?: number;
  budgetConsulting?: number;
  budgetMarket?: number;
  budgetOther?: number;
  budgetOtherNote?: string;
  /** Project timeline (≤ 6 months from start). */
  projectStart?: string;
  projectEnd?: string;
  /** What does success look like — single-line. */
  successCriteria?: string;
}

/** Document attachment record stored inside
 *  EquipApplication.documents. */
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

/** Statuses considered "open" — counted in the admin queue.
 *  Excludes draft (only the applicant sees those). */
export function isOpenForReview(status: EquipStatus): boolean {
  return status === "submitted" || status === "under_review";
}

/** Statuses that lock the application — no more edits, no decision
 *  changes (except funded after approved). */
export function isTerminal(status: EquipStatus): boolean {
  return status === "approved" || status === "rejected" || status === "funded";
}

/** Recommended stream for a given commercialization stage.
 *  Used by the eligibility wizard. */
export function recommendStream(stage: CommercializationStage): EquipStream | null {
  if (stage === "exploring") return "venture_connect";
  if (stage === "building")  return "venture_lift";
  return null; // "unsure" → wizard asks the applicant to pick
}
