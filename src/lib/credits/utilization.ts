/**
 * Credit-utilisation milestones — the ENGAGE "Progress Tracker" rules.
 *
 * The current platform (app.biohubnet.ca) shows trainees:
 *   • "As of <date> you have used N out of 5000 Credits"
 *   • a utilisation bar
 *   • "Use 2500 Credits by <date> to avoid early expiry"
 *   • "Use 5000 Credits by <date>"
 *   • a policy callout: if utilisation at 6 months post-issuance is
 *     under 2500, the remaining credits expire immediately; at 2500 or
 *     more they stay valid until 1 year post-issuance.
 *
 * That policy is a SUPERSET of what lib/credits/expiry.ts enforces
 * today. The sweeper expires each grant CREDIT_GRANT_TTL_DAYS (365)
 * after its own grant date; it has no notion of a 6-month utilisation
 * checkpoint. So this module reports the milestones a trainee is
 * measured against — it does not (yet) enforce the early-expiry branch.
 *
 * Enforcing it would mean a new sweeper rule and a migration, which is
 * a policy decision rather than a parity fix. `earlyExpiryEnforced`
 * is exported as `false` so any surface that reads these numbers can
 * say so honestly rather than implying money will vanish on a date
 * nothing actually acts on.
 */
import { prisma } from "@/lib/prisma";
import { CREDIT_GRANT_TTL_DAYS } from "@/lib/credits/expiry";

/** Full award a trainee is measured against, per the ENGAGE policy. */
export const CREDIT_AWARD_TOTAL = 5_000;

/** Utilisation required by the 6-month checkpoint to keep the rest. */
export const CREDIT_HALFWAY_MILESTONE = 2_500;

/** Days from issuance to the utilisation checkpoint (6 months). */
export const CREDIT_CHECKPOINT_DAYS = 182;

/**
 * Whether the early-expiry branch is actually enforced anywhere.
 *
 * False today: the daily sweep only applies the 365-day per-grant TTL.
 * Flip this when a sweeper rule implements the 6-month checkpoint, and
 * the UI copy will stop hedging automatically.
 */
export const EARLY_EXPIRY_ENFORCED = false;

export interface CreditUtilization {
  /** Credits spent (sum of debits that are not expiry write-offs). */
  used: number;
  /** The award the trainee is measured against. */
  total: number;
  /** used / total, clamped to 0..1. */
  fraction: number;
  /** Current spendable balance. */
  balance: number;
  /** When the trainee's first grant landed — the clock's start. */
  issuedAt: Date | null;
  /** issuedAt + 182 days. Null when nothing has been granted. */
  checkpointAt: Date | null;
  /** issuedAt + 365 days. Null when nothing has been granted. */
  fullTermAt: Date | null;
  /** Has the trainee already cleared the 2,500 checkpoint? */
  halfwayMet: boolean;
  /** Has the trainee used the full award? */
  fullMet: boolean;
}

/**
 * Compute utilisation for one user.
 *
 * "Used" counts debit rows whose reason is NOT "expiry": credits that
 * evaporated unspent are not utilisation, and counting them would let
 * someone clear the checkpoint by doing nothing.
 */
export async function creditUtilization(userId: string): Promise<CreditUtilization> {
  const [user, debits, firstGrant] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { credits: true } }),
    prisma.creditTransaction.findMany({
      where: { userId, type: "debit", NOT: { reason: "expiry" } },
      select: { amount: true },
    }),
    prisma.creditTransaction.findFirst({
      where: { userId, type: "credit" },
      orderBy: { createdAt: "asc" },
      select: { createdAt: true },
    }),
  ]);

  const used = debits.reduce((sum, d) => sum + Math.abs(d.amount), 0);
  const issuedAt = firstGrant?.createdAt ?? null;
  const day = 24 * 60 * 60 * 1000;

  return {
    used,
    total: CREDIT_AWARD_TOTAL,
    fraction: Math.min(1, Math.max(0, used / CREDIT_AWARD_TOTAL)),
    balance: user?.credits ?? 0,
    issuedAt,
    checkpointAt: issuedAt
      ? new Date(issuedAt.getTime() + CREDIT_CHECKPOINT_DAYS * day)
      : null,
    fullTermAt: issuedAt
      ? new Date(issuedAt.getTime() + CREDIT_GRANT_TTL_DAYS * day)
      : null,
    halfwayMet: used >= CREDIT_HALFWAY_MILESTONE,
    fullMet: used >= CREDIT_AWARD_TOTAL,
  };
}
