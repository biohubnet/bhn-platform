/**
 * BHN merch loyalty rewards.
 *
 * What it is
 * ----------
 * Trainees who spend (debit) cumulative credits on coursework hit
 * thresholds that unlock physical-merch bundles. The unlock is
 * one-time per (user, tier) — the trainee then submits a shipping
 * address, an admin packs and ships, the record closes.
 *
 * Why "spent" not "balance"
 * -------------------------
 * Two reasons:
 *   1. Receiving free credits (admin grants, top-ups) shouldn't
 *      qualify for merch — engagement does, not endowment.
 *   2. Lifetime-spent monotonically increases. Current balance
 *      goes up and down, so a "credits ≥ 2500" threshold would
 *      flicker on and off as users enroll / top up.
 *
 * The hook
 * --------
 * `ensureMerchUnlocks(prisma, userId)` is the side-effect-only
 * idempotent function. Call it after any debit (course enrollment),
 * and on every page that surfaces merch progress (the trainee's
 * /rewards page, the dashboard). It computes lifetime spent, walks
 * the tier table, and creates UNCLAIMED MerchReward rows for any
 * tier the user has crossed but doesn't already have a record for.
 *
 * The unique (userId, tier) constraint is the idempotency lock —
 * we don't even need to read first; we just attempt the insert
 * inside a try/catch on duplicate-key.
 */

import type { PrismaClient } from "@prisma/client";

export interface MerchTier {
  /** Numeric tier — 1 (lower) → N (higher). Stable, never reused. */
  tier: number;
  /** Lifetime credits spent required to unlock. */
  threshold: number;
  /** User-facing bundle title. */
  title: string;
  /** One-line marketing blurb for cards. */
  blurb: string;
  /** Concrete items that ship in the bundle — listed on the claim
   *  page so trainees know what they're committing to a size for. */
  items: string[];
  /** Hex tint used as the card accent — picked per tier so the
   *  Apprentice and Champion bundles read as distinct moments. */
  accent: string;
}

export const MERCH_TIERS: readonly MerchTier[] = [
  {
    tier: 1,
    threshold: 2500,
    title: "BHN Swag Bag",
    blurb: "First milestone — a few essentials and a surprise. Picked up at the office or mailed if you're far.",
    items: [
      "BHN-branded notepad",
      "BHN stress ball",
      "Mystery item (rotates — past trainees got pins, sticker packs, micro-tools)",
    ],
    accent: "#10b981", // emerald — engage / learn
  },
  {
    tier: 2,
    threshold: 5000,
    title: "Insulated Bottle",
    blurb: "5,000 credits trained. The same insulated bottle our staff carry — built for long days, lab-friendly.",
    items: [
      "BHN insulated stainless bottle (16 oz, double-wall vacuum)",
    ],
    accent: "#0ea5e9", // sky — championship / signal
  },
] as const;

/** Pickup point for default-fulfillment rewards. Single source of
 *  truth — surfaced on the trainee /rewards page, in the claim
 *  dialog, in the admin queue, and in tour copy. */
export const PICKUP_LOCATION = {
  org: "BioHubNet office",
  building: "Leslie Dan Faculty of Pharmacy",
  university: "University of Toronto",
  /** Compact one-liner for tight spaces. */
  short: "BHN office · Leslie Dan Faculty of Pharmacy · U of T",
  /** Two-line address for cards. */
  lines: ["BioHubNet office", "Leslie Dan Faculty of Pharmacy, U of T"],
} as const;

/** Convenience lookup. Returns undefined for an unknown tier number. */
export function getTier(tier: number): MerchTier | undefined {
  return MERCH_TIERS.find((t) => t.tier === tier);
}

/**
 * Lifetime credits SPENT — sum of debit-type CreditTransactions for
 * the user. Decoupled from `User.credits` (which is current balance,
 * subject to grants / refunds).
 *
 * Refunds (which are credit-type transactions with reason="refund")
 * naturally don't subtract from lifetime spend, which is the right
 * behavior — a refund means the user reversed an enrollment, but
 * they still demonstrated engagement at the moment they enrolled.
 * For tier qualification we count only forward motion.
 */
export async function lifetimeSpent(
  prisma: Pick<PrismaClient, "creditTransaction">,
  userId: string,
): Promise<number> {
  const result = await prisma.creditTransaction.aggregate({
    where: { userId, type: "debit" },
    _sum: { amount: true },
  });
  // Debits stored as positive amounts in this codebase (the
  // enrollment route subtracts from balance and writes a positive
  // amount with type="debit"). If your convention differs, take
  // Math.abs of the sum.
  return Math.abs(result._sum.amount ?? 0);
}

/**
 * Ensure every threshold the user has crossed has a MerchReward
 * record. Idempotent: safe to call after every debit and on every
 * page that surfaces reward state. Returns the list of tiers
 * NEWLY-unlocked in this call (so the caller can flash a celebration
 * banner / fire analytics / send an email).
 *
 * Sandbox + demo accounts skip — we don't ship merch to play
 * accounts, and we don't want admins flooded with claim requests
 * from their own test pairs.
 */
export async function ensureMerchUnlocks(
  prisma: PrismaClient,
  userId: string,
): Promise<number[]> {
  // Sandbox/demo gate — merch is a real-account perk only.
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { accountKind: true },
  });
  if (!user || user.accountKind !== "real") return [];

  const spent = await lifetimeSpent(prisma, userId);

  const existing = await prisma.merchReward.findMany({
    where: { userId },
    select: { tier: true },
  });
  const have = new Set(existing.map((r) => r.tier));

  const newlyUnlocked: number[] = [];
  for (const t of MERCH_TIERS) {
    if (have.has(t.tier)) continue;
    if (spent < t.threshold) continue;
    try {
      await prisma.merchReward.create({
        data: {
          userId,
          tier: t.tier,
          threshold: t.threshold,
          status: "UNCLAIMED",
        },
      });
      newlyUnlocked.push(t.tier);
    } catch (err) {
      // Race: another request inserted the same (userId, tier) between
      // our check and our insert. The unique constraint catches it;
      // swallow and move on. Any other error we re-throw.
      const code = (err as { code?: string }).code;
      if (code !== "P2002") throw err;
    }
  }
  return newlyUnlocked;
}

/**
 * For progress UI — "you've spent X / Y credits" + "next unlock at Y".
 * Returns the next-still-locked tier and how close the user is. Once
 * all tiers are unlocked, returns nextTier = null.
 */
export function nextTierFor(spent: number): { nextTier: MerchTier | null; pctToNext: number } {
  for (const t of MERCH_TIERS) {
    if (spent < t.threshold) {
      const prevThreshold = MERCH_TIERS.find((p) => p.tier === t.tier - 1)?.threshold ?? 0;
      const span = t.threshold - prevThreshold;
      const into = spent - prevThreshold;
      return { nextTier: t, pctToNext: Math.max(0, Math.min(100, (into / span) * 100)) };
    }
  }
  return { nextTier: null, pctToNext: 100 };
}
