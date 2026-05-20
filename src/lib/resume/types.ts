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
}

export interface ResumeItem {
  id: string;
  position: number;
  title?: string;        // e.g. "Process Engineer Intern"
  subtitle?: string;     // e.g. "STEMCELL Technologies · Vancouver"
  dateRange?: string;    // e.g. "May 2025 – Aug 2025"
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
 *  without an uploaded file. */
export function emptyResumeContent(): ResumeContent {
  return {
    sections: [
      { id: rid(), kind: "summary",    position: 0, items: [{ id: rid(), position: 0, bullets: [] }] },
      { id: rid(), kind: "experience", position: 1, items: [] },
      { id: rid(), kind: "skills",     position: 2, items: [{ id: rid(), position: 0, bullets: [] }] },
      { id: rid(), kind: "education",  position: 3, items: [] },
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
