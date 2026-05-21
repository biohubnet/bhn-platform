/**
 * Structured resume types.
 *
 * Persisted as JSON in `Resume.content`. Every node carries a stable
 * id so comments can pin to any granularity. IDs are generated
 * client-side or server-side via `crypto.randomUUID()` — short
 * unique strings, not cuids, since they live inside the JSON tree
 * not as DB rows.
 */

export type ResumeSectionKind =
  | "summary"
  | "experience"
  | "skills"
  | "education"
  | "projects"
  | "certifications"
  | "publications"
  | "awards"
  | "volunteering"
  | "other";

export interface ResumeBullet {
  id: string;
  position: number;
  body: string;
  /** Marks bullets that came from an AI suggest/tailor run, so the
   *  UI can highlight "AI proposed" rows differently until the user
   *  accepts them. Once accepted (or manually edited), set false. */
  aiSuggested?: boolean;
  /** The master-library bullet this resume bullet was derived from
   *  (via the AI tailor flow or a future drag-from-master pull).
   *  When the user edits a bullet that carries this id, the editor
   *  surfaces the "Promote this edit to the master?" chip so a good
   *  rewrite can flow back to the library instead of dying in one
   *  draft. Cleared when the user explicitly de-links the bullet. */
  derivedFromMasterBulletId?: string;
}

export interface ResumeItem {
  id: string;
  position: number;
  /** Primary line — meaning depends on parent section.kind:
   *    experience      → job title              ("Process Engineer Intern")
   *    education       → degree / programme     ("BSc Biotechnology")
   *    projects        → project name           ("Bioreactor digital twin")
   *    certifications  → certification name     ("GMP Documentation 101")
   *    publications    → paper title
   *    awards          → award name
   *    volunteering    → role
   *    other / skills  → free text */
  title?: string;
  /** Secondary line — meaning depends on parent section.kind:
   *    experience      → company + location     ("STEMCELL · Vancouver")
   *    education       → institution            ("University of Toronto")
   *    projects        → role / stack
   *    certifications  → issuing org            ("ISPE Canada")
   *    publications    → venue                  ("Nature Methods")
   *    awards          → awarding body
   *    volunteering    → organisation */
  subtitle?: string;
  /** Free-text date range — kept for backward compatibility with the
   *  original schema (and what the AI parser still tends to emit).
   *  Render falls back to this when `startDate` / `endDate` are blank
   *  so old resume rows from before the structured fields landed
   *  still display correctly. */
  dateRange?: string;
  /** Structured start of the item ("Jan 2025"). Free string so users
   *  can write "May 2025", "Spring 2025", or "2025-05" — we don't
   *  try to enforce a date format. */
  startDate?: string;
  /** Structured end. Ignored when `current` is true. */
  endDate?: string;
  /** "Currently working / studying / volunteering here." When true,
   *  the UI renders "Present" for the end and hides the End field. */
  current?: boolean;
  /** Section-appropriate quantitative field. Used by:
   *    education       → GPA / grade / classification
   *    awards          → ranking / placement
   *    certifications  → credential id
   *  Free string — different programmes use different scales. */
  metric?: string;
  /** External link — repo / live demo / certificate verify URL / DOI. */
  url?: string;
  /** Optional intro paragraph that renders ABOVE bullets. Useful for
   *  projects + experience where a sentence of context helps before
   *  the achievement-bullets, and for "Summary" sections that don't
   *  need bullets at all. */
  description?: string;
  bullets: ResumeBullet[];
}

export interface ResumeSection {
  id: string;
  kind: ResumeSectionKind;
  position: number;
  /** Override the default section heading derived from `kind`. */
  title?: string;
  items: ResumeItem[];
}

export interface ResumeContent {
  sections: ResumeSection[];
  /** Top-of-resume personal block. Optional — many users keep
   *  contact info in their PDF header, not in the structured
   *  representation. */
  header?: {
    name?: string;
    email?: string;
    phone?: string;
    location?: string;
    summary?: string;
  };
}

/** Per-kind UI hints. The editor renders item fields differently for
 *  Experience (start/end + currently here + description) vs Education
 *  (school + degree + GPA + dates) vs Projects (name + role + URL +
 *  description + bullets) etc. Each hint says which optional fields
 *  to surface AND what to label them as — labels are part of UX, not
 *  schema, so they live here next to the kind enum. */
export interface SectionFieldHints {
  /** Render an item editor at all? `false` for Summary which is just
   *  a single description paragraph at section level. */
  itemEditor: boolean;
  /** Label for `title`. */
  titleLabel: string;
  /** Label for `subtitle`. Empty string ⇒ field hidden. */
  subtitleLabel: string;
  /** Label for `metric`. Empty string ⇒ field hidden. */
  metricLabel: string;
  /** Show start / end / current toggle? */
  showDates: boolean;
  /** Show description paragraph? */
  showDescription: boolean;
  /** Show external URL field? */
  showUrl: boolean;
  /** Render the bullet list? Almost always true except summary-like
   *  sections that use description only. */
  showBullets: boolean;
  /** Label for the "Add bullet" / bullet-list eyebrow. */
  bulletLabel: string;
  /** Placeholder shown when the bullet textarea is empty. */
  bulletPlaceholder: string;
}

export const SECTION_HINTS: Record<ResumeSectionKind, SectionFieldHints> = {
  summary: {
    itemEditor: true,
    titleLabel: "",
    subtitleLabel: "",
    metricLabel: "",
    showDates: false,
    showDescription: true,
    showUrl: false,
    showBullets: false,
    bulletLabel: "",
    bulletPlaceholder: "",
  },
  experience: {
    itemEditor: true,
    titleLabel: "Job title",
    subtitleLabel: "Company · Location",
    metricLabel: "",
    showDates: true,
    showDescription: true,
    showUrl: false,
    showBullets: true,
    bulletLabel: "Achievements",
    bulletPlaceholder: "One bullet — what you did, the action, and the outcome (numbers if you have them)",
  },
  education: {
    itemEditor: true,
    titleLabel: "Degree / Programme",
    subtitleLabel: "Institution · Location",
    metricLabel: "GPA / Grade",
    showDates: true,
    showDescription: false,
    showUrl: false,
    showBullets: true,
    bulletLabel: "Coursework / Honours",
    bulletPlaceholder: "Relevant course, thesis title, honour, or research project",
  },
  projects: {
    itemEditor: true,
    titleLabel: "Project name",
    subtitleLabel: "Role / Stack",
    metricLabel: "",
    showDates: true,
    showDescription: true,
    showUrl: true,
    showBullets: true,
    bulletLabel: "Highlights",
    bulletPlaceholder: "Outcome, method, or contribution — one bullet",
  },
  certifications: {
    itemEditor: true,
    titleLabel: "Certification name",
    subtitleLabel: "Issuing organisation",
    metricLabel: "Credential ID",
    showDates: true,
    showDescription: false,
    showUrl: true,
    showBullets: false,
    bulletLabel: "",
    bulletPlaceholder: "",
  },
  publications: {
    itemEditor: true,
    titleLabel: "Paper title",
    subtitleLabel: "Authors",
    metricLabel: "Venue / Journal",
    showDates: true,
    showDescription: true,
    showUrl: true,
    showBullets: false,
    bulletLabel: "",
    bulletPlaceholder: "",
  },
  awards: {
    itemEditor: true,
    titleLabel: "Award",
    subtitleLabel: "Awarding body",
    metricLabel: "Ranking / Placement",
    showDates: true,
    showDescription: true,
    showUrl: false,
    showBullets: false,
    bulletLabel: "",
    bulletPlaceholder: "",
  },
  volunteering: {
    itemEditor: true,
    titleLabel: "Role",
    subtitleLabel: "Organisation",
    metricLabel: "",
    showDates: true,
    showDescription: true,
    showUrl: false,
    showBullets: true,
    bulletLabel: "Activities",
    bulletPlaceholder: "Activity, scope, or impact — one bullet",
  },
  skills: {
    itemEditor: false,
    titleLabel: "",
    subtitleLabel: "",
    metricLabel: "",
    showDates: false,
    showDescription: false,
    showUrl: false,
    showBullets: true,
    bulletLabel: "Skills",
    bulletPlaceholder: "One skill — keyword, framework, technique",
  },
  other: {
    itemEditor: true,
    titleLabel: "Title",
    subtitleLabel: "Subtitle",
    metricLabel: "",
    showDates: true,
    showDescription: true,
    showUrl: true,
    showBullets: true,
    bulletLabel: "Details",
    bulletPlaceholder: "Free-form bullet",
  },
};

/** Derive the rendered date string from an item.
 *
 * Priority (in order — first match wins):
 *   1. current + start + end     → "{startDate} – {endDate} (expected)"
 *                                   — student with a graduation date,
 *                                     contractor with a projected end,
 *                                     etc.
 *   2. current + start (no end)  → "{startDate} – Present"
 *   3. current + end (no start)  → "Expected: {endDate}"
 *   4. both start + end          → "{startDate} – {endDate}"
 *   5. only one of the two       → that one alone
 *   6. fallback to dateRange     → for legacy rows that pre-date the
 *                                   structured-date fields
 *   7. ""                        → no date renderable */
export function formatItemDates(item: {
  startDate?: string;
  endDate?: string;
  current?: boolean;
  dateRange?: string;
}): string {
  const s = (item.startDate ?? "").trim();
  const e = (item.endDate ?? "").trim();
  if (item.current) {
    if (s && e) return `${s} – ${e} (expected)`;
    if (s)      return `${s} – Present`;
    if (e)      return `Expected: ${e}`;
    return "Present";
  }
  if (s && e) return `${s} – ${e}`;
  if (s) return s;
  if (e) return e;
  return (item.dateRange ?? "").trim();
}

/** Canonical section labels used when rendering. */
export const SECTION_LABEL: Record<ResumeSectionKind, string> = {
  summary:        "Summary",
  experience:     "Experience",
  skills:         "Skills",
  education:      "Education",
  projects:       "Projects",
  certifications: "Certifications",
  publications:   "Publications",
  awards:         "Awards",
  volunteering:   "Volunteering",
  other:          "Other",
};

/** Empty-state resume content used when a user opens /profile/resume
 *  without an uploaded file.
 *
 *  Note: the "summary" SectionKind is still supported — users can
 *  manually add one as a longer-form "Profile" section if they want.
 *  But we no longer seed it on new resumes, because it duplicated
 *  the role of `header.summary` (the 2-3 sentence opener the editor
 *  surfaces at the top of the page). Two summaries by default
 *  confused users on which one to fill in. */
export function emptyResumeContent(): ResumeContent {
  return {
    sections: [
      { id: rid(), kind: "experience", position: 0, items: [] },
      { id: rid(), kind: "skills",     position: 1, items: [{ id: rid(), position: 0, bullets: [] }] },
      { id: rid(), kind: "education",  position: 2, items: [] },
    ],
  };
}

/** Short stable id for tree nodes. Client + server both call this;
 *  uniqueness is per-resume so collisions are impossible in practice. */
export function rid(): string {
  // Crypto.randomUUID exists everywhere modern. Fall back to a
  // simpler base36 string if it doesn't (legacy node, jest jsdom).
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID().slice(0, 12);
  }
  return Math.random().toString(36).slice(2, 14);
}
