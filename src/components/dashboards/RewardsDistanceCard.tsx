/**
 * RewardsDistanceCard — the trainee dashboard's Loot Vault.
 *
 * Now wears the FULL playful "/rewards page" style (rainbow
 * gradient, blurred blobs, floating gift glyphs, fat glowing
 * milestone bar with circular tier markers, frosted stat tiles)
 * at dashboard scale — a compact preview that pops the same
 * arcade-leaderboard energy the rewards page leads with. The
 * whole panel is a Link → `/rewards`, so trainees can poke any
 * tier marker / Stat tile / CTA and land in the full vault.
 *
 * Reads the same `lifetimeSpent()` + `nextTierFor()` helpers as
 * /rewards so the source of truth stays single.
 */
import Link from "next/link";
import {
  ArrowRight, Flame, Crown, Gift, Sparkles, PartyPopper, Trophy, Zap, CheckCircle2,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { MERCH_TIERS, lifetimeSpent, nextTierFor } from "@/lib/rewards/merch";

interface Props {
  userId: string;
}

export async function RewardsDistanceCard({ userId }: Props) {
  const [spent, rewards] = await Promise.all([
    lifetimeSpent(prisma, userId),
    prisma.merchReward.findMany({
      where: { userId },
      select: { id: true, tier: true, status: true },
      orderBy: { tier: "asc" },
    }),
  ]);
  const { nextTier } = nextTierFor(spent);

  const journeyTiers = MERCH_TIERS.filter((t) => t.triggeredBy === "credit_threshold")
    .slice()
    .sort((a, b) => a.threshold - b.threshold);
  const journeyMax = journeyTiers[journeyTiers.length - 1]?.threshold ?? 5000;
  const journeyPct = Math.min(100, (spent / journeyMax) * 100);

  const unlockedCount = rewards.length;
  const claimedCount = rewards.filter((r) => r.status !== "UNCLAIMED").length;

  return (
    <Link
      href="/rewards"
      className="loot-scoreboard group relative block overflow-hidden rounded-3xl text-white px-6 sm:px-9 py-7 sm:py-9 shadow-[0_18px_50px_-18px_rgba(109,40,217,0.5)]"
      // Refined 3-stop ramp — keeps the arcade energy of the
      // /rewards page but drops the orange + amber stops that
      // made the dashboard panel feel tonally jarring against the
      // band wash above. The fuchsia + amber blob accents below
      // still hint at the wider rainbow palette without
      // overloading the gradient itself.
      style={{
        background:
          "linear-gradient(135deg, #4338ca 0%, #6d28d9 50%, #be185d 100%)",
      }}
    >
      {/* Soft blurred blob accents — adds depth + a hint of the
          warm spectrum without the gradient itself going rainbow */}
      <div aria-hidden className="pointer-events-none absolute -top-16 -right-10 w-56 h-56 rounded-full bg-amber-300/30 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -bottom-20 -left-10 w-60 h-60 rounded-full bg-fuchsia-500/30 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute top-1/3 left-1/2 w-44 h-44 -translate-x-1/2 rounded-full bg-sky-400/20 blur-3xl" />

      {/* Floating glyphs — the playful arcade energy */}
      <div aria-hidden className="pointer-events-none absolute top-5 right-6 hidden sm:block loot-float text-amber-200">
        <Gift size={28} strokeWidth={1.5} />
      </div>
      <div aria-hidden className="pointer-events-none absolute top-9 left-8 hidden md:block loot-float-slow text-pink-200">
        <Sparkles size={20} strokeWidth={1.5} />
      </div>
      <div aria-hidden className="pointer-events-none absolute bottom-5 right-[28%] hidden md:block loot-float text-white">
        <PartyPopper size={22} strokeWidth={1.5} />
      </div>

      <div className="relative">
        <div className="flex items-baseline justify-between gap-3 mb-1">
          <p className="text-[10px] uppercase tracking-[0.28em] font-bold text-white/85 inline-flex items-center gap-2">
            <Zap size={12} className="loot-glow text-amber-200" />
            Credits trained
          </p>
          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.22em] text-white/85 opacity-80 group-hover:opacity-100 transition-opacity">
            Open the vault
            <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
          </span>
        </div>

        <p className="text-5xl sm:text-6xl font-black leading-[0.95] font-mono tabular-nums mt-1 drop-shadow-[0_3px_18px_rgba(0,0,0,0.32)]">
          {spent.toLocaleString()}
          <span className="ml-2 text-xl sm:text-2xl align-top text-amber-200">★</span>
        </p>

        {/* Frosted stat tiles — compact 3-up row */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3 mt-5">
          <Stat
            label="Tiers unlocked"
            value={`${unlockedCount}/${journeyTiers.length}`}
            icon={Trophy}
          />
          <Stat
            label="Claimed"
            value={String(claimedCount)}
            icon={CheckCircle2}
          />
          <Stat
            label={nextTier ? "To next loot" : "Status"}
            value={nextTier ? (nextTier.threshold - spent).toLocaleString() : "MAXED"}
            icon={nextTier ? Flame : Crown}
            accent={!nextTier}
          />
        </div>

        {/* Milestone bar — glowing track + circular tier markers */}
        <div className="mt-8">
          <div className="relative h-3 rounded-full bg-white/15 overflow-visible">
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-amber-200 via-amber-300 to-amber-400 shadow-[0_0_18px_rgba(251,191,36,0.8)] transition-all"
              style={{ width: `${journeyPct}%` }}
            />
            {journeyTiers.map((t) => {
              const pct = Math.min(100, (t.threshold / journeyMax) * 100);
              const reached = spent >= t.threshold;
              return (
                <div
                  key={t.tier}
                  className="absolute -top-2.5 -translate-x-1/2"
                  style={{ left: `${pct}%` }}
                >
                  <div
                    className={
                      "w-8 h-8 rounded-full flex items-center justify-center text-sm font-black shadow-lg border-2 transition-transform group-hover:scale-105 " +
                      (reached
                        ? "bg-amber-200 border-white text-amber-900 loot-glow"
                        : "bg-white/15 border-white/40 text-white/70 backdrop-blur")
                    }
                    title={`Tier ${t.tier} · ${t.threshold.toLocaleString()} credits — ${t.title}`}
                  >
                    {reached ? "★" : t.tier}
                  </div>
                </div>
              );
            })}
            {/* You-are-here marker */}
            <div
              aria-hidden
              className="absolute -top-2.5 -translate-x-1/2 pointer-events-none"
              style={{ left: `${journeyPct}%` }}
            >
              <div className="w-2 h-8 rounded-full bg-white shadow-[0_0_14px_rgba(255,255,255,0.95)]" />
            </div>
          </div>

          <p className="text-sm text-white/95 mt-7 inline-flex items-start gap-2">
            {nextTier ? (
              <>
                <Flame size={15} className="text-amber-200 shrink-0 mt-0.5 loot-glow" />
                <span>
                  <span className="text-amber-200 font-black text-base">{(nextTier.threshold - spent).toLocaleString()}</span>{" "}
                  more credits and{" "}
                  <span className="font-bold underline decoration-amber-200/70 decoration-2 underline-offset-4">
                    {nextTier.title}
                  </span>{" "}
                  drops.
                </span>
              </>
            ) : (
              <>
                <Crown size={15} className="text-amber-200 shrink-0 mt-0.5 loot-glow" />
                <span className="font-bold">You&apos;ve cleared every tier. Hall-of-Fame energy.</span>
              </>
            )}
          </p>
        </div>
      </div>
    </Link>
  );
}

/**
 * Frosted stat tile used in the scoreboard. Translucent white wash
 * + crisp inset border on the vibrant gradient so it reads as an
 * embedded chip rather than flat text. `accent=true` tilts the tile
 * to amber (used when there's no next tier — i.e. all milestones
 * already cleared).
 */
function Stat({
  label, value, icon: Icon, accent = false,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
  accent?: boolean;
}) {
  return (
    <div
      className={
        "rounded-2xl px-2.5 sm:px-3 py-2 sm:py-2.5 backdrop-blur-sm ring-1 ring-inset " +
        (accent
          ? "bg-amber-200/25 ring-amber-200/60"
          : "bg-white/15 ring-white/25")
      }
    >
      <p className="text-[9px] sm:text-[10px] uppercase tracking-[0.18em] font-black text-white/85 inline-flex items-center gap-1">
        <Icon size={10} />
        {label}
      </p>
      <p className="text-lg sm:text-xl font-black text-white leading-tight font-mono tabular-nums mt-0.5">
        {value}
      </p>
    </div>
  );
}
