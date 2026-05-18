/**
 * RewardsDistanceCard — compact "how far from the next merch
 * unlock" surface for the trainee dashboard. Server component.
 *
 * Renders flat (no outer rounded box) — its host section provides
 * the loot-coloured gradient wash. This component supplies just
 * the type + a slim progress bar so it sits cleanly inside a
 * line-and-gradient layout. Reads the same lifetimeSpent() +
 * nextTierFor() helpers /rewards uses so the source of truth
 * stays single.
 */
import Link from "next/link";
import { ArrowRight, Flame, Crown } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { MERCH_TIERS, lifetimeSpent, nextTierFor } from "@/lib/rewards/merch";

interface Props {
  userId: string;
}

export async function RewardsDistanceCard({ userId }: Props) {
  const spent = await lifetimeSpent(prisma, userId);
  const { nextTier } = nextTierFor(spent);

  const journeyTiers = MERCH_TIERS.filter((t) => t.triggeredBy === "credit_threshold")
    .slice()
    .sort((a, b) => a.threshold - b.threshold);
  const journeyMax = journeyTiers[journeyTiers.length - 1]?.threshold ?? 5000;
  const journeyPct = Math.min(100, (spent / journeyMax) * 100);

  return (
    <Link
      href="/rewards"
      className="group block text-fg"
    >
      <div className="flex items-baseline justify-between gap-3 mb-1">
        <p className="text-xs uppercase tracking-[0.22em] font-bold text-fg-muted">
          Credits trained
        </p>
        <ArrowRight
          size={14}
          className="text-fg-muted opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all"
        />
      </div>

      <p
        className="text-4xl sm:text-5xl font-black font-mono tabular-nums leading-none"
        style={{
          backgroundImage:
            "linear-gradient(120deg, var(--brand-700, #1d4f8b) 0%, #6d28d9 60%, #be185d 100%)",
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          color: "transparent",
        }}
      >
        {spent.toLocaleString()}
      </p>

      {/* Slim progress bar with tier-threshold ticks. Lives on a
          hairline track — no rounded card around it. */}
      <div className="relative h-1.5 bg-line mt-5 mb-3">
        <div
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-amber-300 via-amber-400 to-rose-400 shadow-[0_0_10px_rgba(251,191,36,0.5)] transition-all"
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
                "absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 " +
                (reached
                  ? "bg-amber-300 ring-2 ring-bg shadow-md"
                  : "bg-fg-subtle ring-2 ring-bg")
              }
              style={{ left: `${pct}%` }}
              title={`Tier ${t.tier} · ${t.threshold.toLocaleString()} credits — ${t.title}`}
            />
          );
        })}
      </div>

      <p className="text-xs text-fg-muted inline-flex items-center gap-1.5">
        {nextTier ? (
          <>
            <Flame size={12} className="text-amber-500 shrink-0" />
            <span>
              <span className="font-black text-fg">
                {(nextTier.threshold - spent).toLocaleString()}
              </span>{" "}
              more credits to unlock{" "}
              <span className="font-bold text-fg underline decoration-amber-500/60 decoration-2 underline-offset-2">
                {nextTier.title}
              </span>
            </span>
          </>
        ) : (
          <>
            <Crown size={12} className="text-amber-500 shrink-0" />
            <span className="font-bold text-fg">
              You&apos;ve cleared every tier. Hall-of-Fame status.
            </span>
          </>
        )}
      </p>
    </Link>
  );
}
