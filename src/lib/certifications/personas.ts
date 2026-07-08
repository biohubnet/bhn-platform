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
