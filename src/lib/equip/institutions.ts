/**
 * Curated list of BHN-eligible partner institutions.
 *
 * Source of truth: the "List of Eligible Institutions" section on
 * https://biohubnet.ca/equip. Roster includes universities,
 * polytechnics, and hospital research institutes that BHN works
 * with on Equip funding eligibility.
 *
 * The Equip wizard renders these as a dropdown. "Other" is appended
 * by the picker UI itself — if a user picks it, the application
 * captures their free-text in `EquipApplication.institutionOther`.
 *
 * The slug is stored in `EquipApplication.institution`; the name is
 * the user-visible label. Keep this list in sync with the official
 * BHN partner roster — adding / removing institutions is a code
 * change (intentional — the list is small and changes rarely).
 */

export interface Institution {
  slug: string;
  name: string;
  /** Short token used in human-readable admin filters. */
  shortName?: string;
}

export const INSTITUTIONS: Institution[] = [
  // Universities (alphabetical by full name)
  { slug: "u-of-t",      name: "University of Toronto",            shortName: "U of T" },
  { slug: "queens",      name: "Queen's University",               shortName: "Queen's" },
  { slug: "western",     name: "Western University",               shortName: "Western" },
  { slug: "waterloo",    name: "University of Waterloo",           shortName: "UW" },
  { slug: "guelph",      name: "University of Guelph",             shortName: "Guelph" },
  { slug: "tmu",         name: "Toronto Metropolitan University",   shortName: "TMU" },
  { slug: "york",        name: "York University",                  shortName: "York" },
  { slug: "windsor",     name: "University of Windsor",            shortName: "Windsor" },

  // Polytechnic
  { slug: "seneca",      name: "Seneca Polytechnic",               shortName: "Seneca" },

  // Hospital research institutes / health networks
  { slug: "sickkids",    name: "Hospital for Sick Children",       shortName: "SickKids" },
  { slug: "sinai",       name: "Sinai Health",                     shortName: "Sinai" },
  { slug: "sunnybrook",  name: "Sunnybrook Research Institute",    shortName: "Sunnybrook" },
  { slug: "unity",       name: "Unity Health Toronto",             shortName: "Unity Health" },
  { slug: "uhn",         name: "University Health Network",        shortName: "UHN" },
];

const SLUG_MAP = new Map(INSTITUTIONS.map((i) => [i.slug, i]));

/** Lookup helper. Returns null if the slug isn't in the registry
 *  (e.g. a stale value from before an entry was removed). */
export function findInstitution(slug: string | null | undefined): Institution | null {
  if (!slug) return null;
  return SLUG_MAP.get(slug) ?? null;
}

/** Display label that gracefully handles the "Other" branch. */
export function institutionLabel(
  slug: string | null | undefined,
  other: string | null | undefined,
): string {
  if (slug === "other") return other?.trim() || "Other institution";
  return findInstitution(slug)?.name ?? "—";
}
