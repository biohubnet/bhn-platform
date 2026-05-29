/**
 * Reporting funnel bands.
 *
 * Two stage vocabularies live in the DB and the reports must read both:
 *   • canonical transitions (src/lib/hiring/stages.ts):
 *       new, reviewing, shortlisted, interview_scheduled, interviewed,
 *       offer, hired, passed, withdrawn
 *   • demo-seeder / legacy analytics set:
 *       new, reviewing, shortlisted, phone_screen, onsite, offer,
 *       hired, rejected
 *
 * We normalise both into a single ordered funnel so snapshots + cohort
 * conversion are consistent regardless of which path produced the row.
 */

export type FunnelBandKey =
  | "new" | "reviewing" | "shortlisted" | "interview" | "final" | "offer" | "hired";

export const FUNNEL_BANDS: { key: FunnelBandKey; label: string; raw: string[] }[] = [
  { key: "new",         label: "Applied",     raw: ["new"] },
  { key: "reviewing",   label: "Reviewing",   raw: ["reviewing"] },
  { key: "shortlisted", label: "Shortlisted", raw: ["shortlisted"] },
  { key: "interview",   label: "Interview",   raw: ["phone_screen", "interview_scheduled"] },
  { key: "final",       label: "Final round", raw: ["onsite", "interviewed"] },
  { key: "offer",       label: "Offer",       raw: ["offer"] },
  { key: "hired",       label: "Hired",       raw: ["hired"] },
];

/** Terminal "didn't progress" statuses — counted in totals + drop-off
 *  but not part of the linear funnel. */
export const REJECTED_RAW = ["rejected", "passed", "withdrawn", "closed"];

export const BAND_ORDER: FunnelBandKey[] = FUNNEL_BANDS.map((b) => b.key);
export const BAND_LABEL: Record<FunnelBandKey, string> =
  Object.fromEntries(FUNNEL_BANDS.map((b) => [b.key, b.label])) as Record<FunnelBandKey, string>;

const RAW_TO_BAND = new Map<string, FunnelBandKey>();
for (const b of FUNNEL_BANDS) for (const r of b.raw) RAW_TO_BAND.set(r, b.key);

export function bandIndex(key: FunnelBandKey): number {
  return BAND_ORDER.indexOf(key);
}

/** Map a raw status string → funnel band, "rejected", or null (unknown). */
export function bandOf(rawStatus: string | null | undefined): FunnelBandKey | "rejected" | null {
  if (!rawStatus) return null;
  const b = RAW_TO_BAND.get(rawStatus);
  if (b) return b;
  if (REJECTED_RAW.includes(rawStatus)) return "rejected";
  return null;
}

/** Is this raw status a "hired" outcome? */
export function isHired(rawStatus: string | null | undefined): boolean {
  return rawStatus === "hired";
}

/** Is this raw status an "offer extended" stage (offer or hired)? */
export function isOfferOrBeyond(rawStatus: string | null | undefined): boolean {
  return rawStatus === "offer" || rawStatus === "hired";
}
