/**
 * RewardsDistanceCard — compact "how far from the next merch
 * unlock" surface for the trainee dashboard. Server component.
 *
 * Reads the same `lifetimeSpent()` + `nextTierFor()` helpers the
 * /rewards page uses, so the source of truth stays single.
 * Renders:
 *
 *   • The current credits-trained number
 *   • A mini progress bar with markers per credit-threshold tier
 *   • The next tier name + remaining credits to unlock it
 *
 * Auto-hides when the trainee has spent zero credits (clean slate
 * users see the dedicated `/rewards` page in its "everything
 * locked" state instead).
 */
import Link from "next/link";
import { ArrowRight, Gift, Flame, Crown } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { MERCH_TIERS, lifetimeSpent, nextTierFor } from "@/lib/rewards/merch";

interface Props {
  userId: string;
}

export async function RewardsDistanceCard({ userId }: Props) {
  const spent = await lifetimeSpent(prisma, userId);
  const { nextTier } = nextTierFor(spent);

  // Credit-threshold tiers only — admin-issued tiers don't have a
  // meaningful "distance" the trainee can close on their own.
  const journeyTiers = MERCH_TIERS.filter((t) => t.triggeredBy === "credit_threshold")
    .slice()
    .sort((a, b) => a.threshold - b.threshold);
  const journeyMax = journeyTiers[journeyTiers.length - 1]?.threshold ?? 5000;
  const journeyPct = Math.min(100, (spent / journeyMax) * 100);

  return (
    <Link
      href="/rewards"
      className="block group relative overflow-hidden rounded-3xl text-white px-5 sm:px-6 py-5 sm:py-6 shadow-[0_18px_48px_-18px_rgba(0,0,0,0.45)] surface-shadow transition-transform hover:-translate-y-0.5"
      style={{
        backgroundImage:
          "linear-gradient(135deg, #1e3a8a 0%, #6d28d9 35%, #be185d 65%, #f97316 100%)",
      }}
    >
      {/* Decorative halo + sparkle motifs */}
      <div aria-hidden className="pointer-events-none absolute -top-16 -right-10 w-64 h-64 rounded-full bg-amber-300/35 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -bottom-20 -left-12 w-56 h-56 rounded-full bg-fuchsia-500/30 blur-3xl" />

      <div className="relative flex items-center gap-4 mb-4">
        <span className="shrink-0 w-11 h-11 rounded-2xl bg-white/15 ring-1 ring-inset ring-white/30 backdrop-blur-sm flex items-center justify-center text-amber-200">
          <Gift size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] uppercase tracking-[0.28em] font-black text-white/85">
            Loot vault
          </p>
          <h2 className="text-base sm:text-lg font-black tracking-tight">
            {nextTier ? `${nextTier.title} drops next` : "Maxed out · Hall-of-Fame status"}
          </h2>
        </div>
        <ArrowRight size={16} className="opacity-70 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
      </div>

      {/* Stat headline */}
      <div className="relative flex items-baseline gap-3 mb-3">
        <p className="text-3xl sm:text-4xl font-black font-mono tabular-nums drop-shadow-[0_2px_8px_rgba(0,0,0,0.25)]">
          {spent.toLocaleString()}
        </p>
        <p className="text-xs sm:text-sm text-white/80">
          credits trained
        </p>
      </div>

      {/* Progress bar with tier markers */}
      <div className="relative h-2.5 rounded-full bg-white/15 mb-3 overflow-visible">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-amber-200 via-amber-300 to-amber-400 shadow-[0_0_14px_rgba(251,191,36,0.7)] transition-all"
          style={{ width: `${journeyPct}%` }}
        />
        {journeyTiers.map((t) => {
          const pct = Math.min(100, (t.threshold / journeyMax) * 100);
          const reached = spent >= t.threshold;
          return (
            <span
              key={t.tier}
              aria-hidden
              className={
                "absolute -top-1 -translate-x-1/2 w-4 h-4 rounded-full border-2 " +
                (reached
                  ? "bg-amber-200 border-white shadow-md"
                  : "bg-white/20 border-white/50")
              }
              style={{ left: `${pct}%` }}
              title={`Tier ${t.tier} · ${t.threshold.toLocaleString()} credits`}
            />
          );
        })}
      </div>

      <p className="relative text-xs text-white/95 inline-flex items-center gap-1.5">
        {nextTier ? (
          <>
            <Flame size={12} className="text-amber-200 shrink-0" />
            <span>
              <span className="font-black text-amber-200">{(nextTier.threshold - spent).toLocaleString()}</span>{" "}
              more credits to unlock{" "}
              <span className="font-bold underline decoration-amber-200/70 decoration-2 underline-offset-2">{nextTier.title}</span>
            </span>
          </>
        ) : (
          <>
            <Crown size={12} className="text-amber-200 shrink-0" />
            <span className="font-bold">You&apos;ve cleared every credit tier.</span>
          </>
        )}
      </p>
    </Link>
  );
}
