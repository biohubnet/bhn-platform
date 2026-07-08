// Of the platform's four top-level personas — Trainee, Employer, Admin,
// Evaluator — only TRAINEES take training. Trainees are further classified
// into five career sub-types, and each gets its own role-specific
// certification track (Foundation → Practitioner → Advanced).

export const TRAINEE_PERSONAS = [
  "masters",
  "phd",
  "postdoc",
  "research_associate",
  "lab_technician",
] as const;
export type TraineePersona = (typeof TRAINEE_PERSONAS)[number];

export const PERSONA_META: Record<
  TraineePersona,
  { label: string; short: string; blurb: string; emphasis: "research" | "applied" }
> = {
  masters: {
    label: "Master's Student",
    short: "Master's",
    blurb: "Graduate researchers building foundational biomanufacturing competency alongside coursework.",
    emphasis: "research",
  },
  phd: {
    label: "PhD Candidate",
    short: "PhD",
    blurb: "Doctoral researchers deepening process science and independent investigation.",
    emphasis: "research",
  },
  postdoc: {
    label: "Post-doctoral Fellow",
    short: "Post-doc",
    blurb: "Advanced researchers translating bench science toward scale-up and commercialization.",
    emphasis: "research",
  },
  research_associate: {
    label: "Research Associate",
    short: "Research Assoc.",
    blurb: "Applied scientists running upstream/downstream processes and analytics day to day.",
    emphasis: "applied",
  },
  lab_technician: {
    label: "Lab Technician",
    short: "Lab Tech",
    blurb: "Hands-on operators executing protocols, equipment, and quality checks on the floor.",
    emphasis: "applied",
  },
};

export function personaLabel(p: string): string {
  return PERSONA_META[p as TraineePersona]?.label ?? p;
}
export function personaShort(p: string): string {
  return PERSONA_META[p as TraineePersona]?.short ?? p;
}

/**
 * Per-persona, per-tier course themes — keyword profiles the seed matches
 * against real course titles/codes/topics so each of the five tracks gets a
 * genuinely distinct curriculum (not just a research-vs-applied split).
 * Foundation differs per persona too. Keywords are matched case-insensitively
 * against "title code topic"; the seed dedupes a course to one tier.
 */
export const PERSONA_TRACK: Record<TraineePersona, { foundation: string[]; practitioner: string[]; advanced: string[] }> = {
  masters: {
    foundation: ["aseptic technique", "basics", "resume", "introduction"],
    practitioner: ["upstream", "bioprocess", "proteomic", "qa/qc (analyt"],
    advanced: ["protein structure", "clinical", "graduate"],
  },
  phd: {
    foundation: ["aseptic_cell", "cell culture", "basics"],
    practitioner: ["upstream", "bioprocess", "proteomic", "protein"],
    advanced: ["clinical", "advanced therap", "car_t", "car-t"],
  },
  postdoc: {
    foundation: ["biologics", "manufactur", "basics"],
    practitioner: ["upstream", "bioprocess", "qa/qc"],
    advanced: ["entrepreneur", "regulatory", "customer relationship", "car_t"],
  },
  research_associate: {
    foundation: ["aseptic technique", "cell culture", "basics"],
    practitioner: ["qa/qc (analyt", "analyt", "upstream", "biologics"],
    advanced: ["qa/qc (micro", "advanced therap", "mab", "manufactur"],
  },
  lab_technician: {
    foundation: ["aseptic technique", "aseptic_cell", "cell culture"],
    practitioner: ["mab", "manufactur", "qa/qc (micro", "biologics"],
    advanced: ["closed systems", "car_t", "car-t", "regulatory"],
  },
};
