// The three named tiers of every certification framework, in order. This is
// the Foundation → Practitioner → Advanced ladder — designed from scratch to
// give the platform a genuine multi-level certification structure.

export const TIERS = ["foundation", "practitioner", "advanced"] as const;
export type Tier = (typeof TIERS)[number];

export const TIER_META: Record<Tier, { order: number; label: string; blurb: string; passingScore: number }> = {
  foundation: {
    order: 1,
    label: "Foundation",
    blurb: "Core concepts and vocabulary — the entry tier anyone can start.",
    passingScore: 70,
  },
  practitioner: {
    order: 2,
    label: "Practitioner",
    blurb: "Applied, hands-on competency. Requires the Foundation credential.",
    passingScore: 80,
  },
  advanced: {
    order: 3,
    label: "Advanced",
    blurb: "Specialised mastery and independent practice. Requires Practitioner.",
    passingScore: 90,
  },
};

export function tierLabel(tier: string): string {
  return TIER_META[tier as Tier]?.label ?? tier;
}
