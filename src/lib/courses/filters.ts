// Canonical filter option lists for the Course catalog. Stored as
// strings on Course rows so admins can extend without a schema change;
// the UI surfaces these defaults but accepts any value already on a
// course.

export const COURSE_TOPICS = [
  "Sector/Technology Overview",
  "Career Insights",
  "Business and Commercialization",
  "Clinical Trials",
  "Regulatory Affairs",
  "Industry Fundamentals (GxPs)",
  "Quality Control/Assurance",
  "Biomanufacturing - General",
  "Biomanufacturing - USP/DSP",
] as const;

export const COURSE_DELIVERY = [
  "Asynchronous",
  "Online (Synchronous)",
  "In-Person",
  "Blended",
] as const;

export const COURSE_PROVIDERS = [
  "Talent Accelerator",
  "BioTalent Canada",
  "CASTL",
  "Seneca Polytechnic",
  "CRAFT",
  "Agilis Health",
  "University of Toronto",
  "INSPIRE",
  "CANTRAIN",
] as const;

export type CourseTopic = (typeof COURSE_TOPICS)[number];
export type CourseDelivery = (typeof COURSE_DELIVERY)[number];
export type CourseProvider = (typeof COURSE_PROVIDERS)[number];

export interface CourseFilterParams {
  topic: string[];
  delivery: string[];
  provider: string[];
  special: boolean;
}

/** Read URL search params into a filter object. */
export function parseFilters(sp: { [k: string]: string | string[] | undefined }): CourseFilterParams {
  const list = (v: string | string[] | undefined) =>
    typeof v === "string" ? v.split(",").map((s) => s.trim()).filter(Boolean) : [];
  return {
    topic: list(sp.topic),
    delivery: list(sp.delivery),
    provider: list(sp.provider),
    special: sp.special === "1",
  };
}

/** Total count of active filters — used to show "Clear all" pill. */
export function filterCount(f: CourseFilterParams): number {
  return f.topic.length + f.delivery.length + f.provider.length + (f.special ? 1 : 0);
}
