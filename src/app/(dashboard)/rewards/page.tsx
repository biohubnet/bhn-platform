import { requireSession, isStaff as checkIsStaff } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Gift, Lock, CheckCircle2, Truck, Package, Sparkles, MapPin, Info, Eye, ArrowRight, Trophy, Flame, Star, PartyPopper, Zap, Crown } from "lucide-react";
import {
  MERCH_TIERS,
  PICKUP_LOCATION,
  ensureMerchUnlocks,
  lifetimeSpent,
  nextTierFor,
} from "@/lib/rewards/merch";
import { MerchClaimDialog } from "@/components/rewards/MerchClaimDialog";
import { EditableText } from "@/components/cms/EditableText";
import { getCopyMap } from "@/lib/copy";
import { PageHero } from "@/components/ui/PageHero";

/**
 * /rewards — trainee-facing loyalty page.
 *
 * Trainee path: progress counter + tier cards + claim form.
 *
 * Non-trainee path (admins, superadmins, instructors, employers,
 * sandbox/demo accounts): rather than redirect — which is the
 * textbook role-gating UX anti-pattern (user clicked a link, ended
 * up somewhere else, no explanation) — we render an "informed empty
 * state". It confirms identity ("yes, this is Rewards"), explains
 * the mismatch (you don't earn merch yourself), and gives concrete
 * next-steps: the admin queue at /admin/merch, plus for superadmins
 * the existing "View as trainee" role switcher.
 *
 * Lazy backfill: ensureMerchUnlocks runs on the trainee path on
 * every load so a trainee who crosses a threshold via legacy data
 * (or whose enroll-time hook missed) still sees the unlock the next
 * time they visit.
 */
export default async function RewardsPage() {
  const session = await requireSession().catch(() => null);
  if (!session) redirect("/login");

  const userId = (session.user as { id?: string }).id!;
  const role = (session.user as { role?: string }).role ?? "trainee";
  const realRole = (session.user as { realRole?: string }).realRole ?? role;
  const isTrainee = role === "trainee" || role === "evaluating";
  const isAdmin = role === "admin" || role === "superadmin";

  // Non-trainee path renders an explanatory landing instead of redirecting.
  if (!isTrainee) {
    return <NonTraineeLanding role={role} realRole={realRole} isAdmin={isAdmin} />;
  }

  // Lazy backfill — covers any debit that happened before the hook
  // landed, plus self-heals if a previous request errored mid-write.
  await ensureMerchUnlocks(prisma, userId);

  const [user, rewards, spent] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        name: true,
        email: true,
        country: true,
        phone: true,
      },
    }),
    prisma.merchReward.findMany({
      where: { userId },
      orderBy: { tier: "asc" },
    }),
    lifetimeSpent(prisma, userId),
  ]);

  const { nextTier, pctToNext } = nextTierFor(spent);
  const unlockedCount = rewards.length;
  const claimedCount = rewards.filter((r) => r.status !== "UNCLAIMED").length;

  // Build the "journey" — a sorted list of credit-threshold tiers so
  // the progress bar can render milestone markers at each one. The
  // bar's overall width represents lifetime credits trained, capped
  // at the top tier so the marker never falls off the right edge.
  const journeyTiers = MERCH_TIERS.filter((t) => t.triggeredBy === "credit_threshold")
    .slice()
    .sort((a, b) => a.threshold - b.threshold);
  const journeyMax = journeyTiers[journeyTiers.length - 1]?.threshold ?? 5000;
  const journeyPct = Math.min(100, (spent / journeyMax) * 100);

  const heroTitleDefault = "Train hard. Earn the loot.";
  const heroBodyDefault = "Every credit you spend on coursework drops you closer to the next reward bundle. Pick up your spoils at Leslie Dan Faculty of Pharmacy, U of T — or ask for mailing in the claim form.";
  const heroCopy = await getCopyMap(["rewards.heroTitle", "rewards.heroBody"]);
  const heroTitle = heroCopy["rewards.heroTitle"] ?? heroTitleDefault;
  const heroBody = heroCopy["rewards.heroBody"] ?? heroBodyDefault;
  // Real role gates the pencil — an admin viewing-as-trainee should
  // still be able to edit the hero copy without flipping seats first.
  const editableIsStaff = checkIsStaff(realRole);

  return (
    <div>
      <PageHero
        eyebrow={<><Gift size={12} /> Loot vault</>}
        title={heroTitle}
        description={
          <EditableText copyKey="rewards.heroBody" defaultText={heroBody} isStaff={editableIsStaff} />
        }
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-8">
        {/* ───────────────────────── SCOREBOARD ─────────────────────────
            Big celebratory headline panel — rainbow gradient, floating
            gift glyphs around the edges, gigantic credits counter, three
            stat tiles, and the milestone quest line at the bottom. The
            tone is meant to read as a wall-mounted leaderboard at an
            arcade, not a corporate "your loyalty status" tile. */}
        <section
          className="loot-scoreboard relative overflow-hidden rounded-[2rem] text-white px-6 sm:px-10 py-10 sm:py-12 surface-shadow"
          style={{
            background:
              "linear-gradient(135deg, #4338ca 0%, #6d28d9 22%, #be185d 50%, #f97316 78%, #fbbf24 100%)",
          }}
        >
          {/* Soft blob accents to add depth on top of the gradient */}
          <div aria-hidden className="pointer-events-none absolute -top-20 -right-12 w-72 h-72 rounded-full bg-amber-300/40 blur-3xl" />
          <div aria-hidden className="pointer-events-none absolute -bottom-24 -left-12 w-80 h-80 rounded-full bg-fuchsia-500/35 blur-3xl" />
          <div aria-hidden className="pointer-events-none absolute top-1/3 left-1/2 w-64 h-64 -translate-x-1/2 rounded-full bg-sky-400/25 blur-3xl" />

          {/* Floating gift / sparkle glyphs around the corners */}
          <div aria-hidden className="pointer-events-none absolute top-6 right-8 hidden sm:block loot-float text-amber-200">
            <Gift size={36} strokeWidth={1.5} />
          </div>
          <div aria-hidden className="pointer-events-none absolute top-12 left-10 hidden md:block loot-float-slow text-pink-200">
            <Sparkles size={26} strokeWidth={1.5} />
          </div>
          <div aria-hidden className="pointer-events-none absolute bottom-8 right-1/4 hidden md:block loot-float text-white">
            <PartyPopper size={28} strokeWidth={1.5} />
          </div>

          <div className="relative">
            <p className="text-[10px] uppercase tracking-[0.28em] font-bold text-white/80 inline-flex items-center gap-2">
              <Zap size={12} className="loot-glow text-amber-200" />
              Credits trained
            </p>
            <p className="text-6xl sm:text-7xl lg:text-8xl font-black leading-[0.95] font-mono tabular-nums mt-2 drop-shadow-[0_4px_24px_rgba(0,0,0,0.35)]">
              {spent.toLocaleString()}
              <span className="ml-3 text-2xl sm:text-3xl align-top text-amber-200">★</span>
            </p>

            {/* Stat tiles — frosted glass on the vibrant gradient */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-7">
              <Stat label="Tiers unlocked" value={`${unlockedCount} / ${journeyTiers.length}`} icon={Trophy} />
              <Stat label="Claimed & on the way" value={String(claimedCount)} icon={CheckCircle2} />
              <Stat
                label={nextTier ? "Credits to next loot" : "Status"}
                value={nextTier ? (nextTier.threshold - spent).toLocaleString() : "Maxed out!"}
                icon={nextTier ? Flame : Crown}
                accent={!nextTier}
              />
            </div>

            {/* Milestone bar — fat, glowing, with playful tier markers */}
            <div className="mt-9">
              <div className="relative h-4 rounded-full bg-white/15 overflow-visible">
                <div
                  className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-amber-200 via-amber-300 to-amber-400 shadow-[0_0_22px_rgba(251,191,36,0.85)] transition-all"
                  style={{ width: `${journeyPct}%` }}
                />
                {journeyTiers.map((t) => {
                  const pct = Math.min(100, (t.threshold / journeyMax) * 100);
                  const reached = spent >= t.threshold;
                  return (
                    <div
                      key={t.tier}
                      className="absolute -top-3 -translate-x-1/2"
                      style={{ left: `${pct}%` }}
                    >
                      <div
                        className={
                          "w-10 h-10 rounded-full flex items-center justify-center text-lg shadow-lg border-2 transition-transform " +
                          (reached
                            ? "bg-amber-200 border-white text-amber-900 hover:scale-110 loot-glow"
                            : "bg-white/15 border-white/40 text-white/70 backdrop-blur")
                        }
                        title={`Tier ${t.tier} · ${t.threshold.toLocaleString()} credits — ${t.title}`}
                      >
                        {reached ? "★" : t.tier}
                      </div>
                    </div>
                  );
                })}
                {/* You-are-here marker — taller pin */}
                <div
                  aria-hidden
                  className="absolute -top-3 -translate-x-1/2 pointer-events-none"
                  style={{ left: `${journeyPct}%` }}
                >
                  <div className="w-2.5 h-10 rounded-full bg-white shadow-[0_0_16px_rgba(255,255,255,0.95)]" />
                </div>
              </div>

              <p className="text-sm text-white/95 mt-8 inline-flex items-start gap-2">
                {nextTier ? (
                  <>
                    <Flame size={16} className="text-amber-200 shrink-0 mt-0.5 loot-glow" />
                    <span>
                      <span className="text-amber-200 font-black text-base">{(nextTier.threshold - spent).toLocaleString()}</span>{" "}
                      more credits and <span className="font-bold underline decoration-amber-200/70 decoration-2 underline-offset-4">{nextTier.title}</span> drops.
                    </span>
                  </>
                ) : (
                  <>
                    <Crown size={16} className="text-amber-200 shrink-0 mt-0.5 loot-glow" />
                    <span className="font-bold">You&apos;ve cleared every tier. Hall-of-Fame energy.</span>
                  </>
                )}
              </p>
            </div>
          </div>
        </section>

        {/* ─────────────────── COLLECTIBLE LOOT CARDS ───────────────────
            Each tier renders as a rounded loot card with a foil
            shimmer band, a big emoji, a rarity badge, and a state-
            specific footer. Unlocked-but-unclaimed cards have a
            pulsing CLAIM button; the rest pivot to their lifecycle
            state (packing / on the way / picked up / delivered /
            cancelled). */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {MERCH_TIERS.map((t) => {
            const reward = rewards.find((r) => r.tier === t.tier) ?? null;
            const locked = !reward;
            const remaining = Math.max(0, t.threshold - spent);
            const unclaimed = !locked && reward!.status === "UNCLAIMED";
            const rarity = tierRarity(t.tier);
            const emoji = tierEmoji(t.tier);

            return (
              <article
                key={t.tier}
                className={
                  "loot-card relative overflow-hidden rounded-3xl flex flex-col surface-shadow " +
                  (locked
                    ? "bg-card border border-line"
                    : "bg-card border-2")
                }
                style={
                  locked
                    ? undefined
                    : {
                        borderColor: t.accent,
                        boxShadow: `0 0 0 1px ${t.accent}33, 0 18px 40px -16px ${t.accent}88`,
                      }
                }
              >
                {/* Top accent strip — solid hex for unlocked, muted
                    for locked. Gives the card silhouette per-tier
                    identity. */}
                <div
                  className="h-2 w-full"
                  style={{ background: locked ? "var(--line-strong)" : t.accent }}
                  aria-hidden
                />

                {/* Foil shimmer band — only on unlocked tiers, runs
                    horizontally across the upper third on a loop. */}
                {!locked && (
                  <div
                    aria-hidden
                    className="loot-shimmer absolute top-2 left-0 right-0 h-32 pointer-events-none opacity-50"
                  />
                )}

                {/* Decorative blurred halo, theme-coloured */}
                {!locked && (
                  <div
                    aria-hidden
                    className="pointer-events-none absolute -top-14 -right-14 w-44 h-44 rounded-full blur-3xl opacity-30"
                    style={{ background: t.accent }}
                  />
                )}

                <div className="relative p-5 sm:p-6 flex flex-col flex-1">
                  {/* Header — emoji tile + rarity + state */}
                  <header className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-start gap-3 min-w-0">
                      <span
                        className={
                          "shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shadow-md " +
                          (locked ? "bg-elevated grayscale opacity-70" : "")
                        }
                        style={
                          locked
                            ? undefined
                            : {
                                background: `linear-gradient(135deg, ${t.accent}, ${t.accent}cc)`,
                                color: "white",
                              }
                        }
                      >
                        {emoji}
                      </span>
                      <div className="min-w-0">
                        <p
                          className="text-[10px] uppercase tracking-[0.22em] font-black"
                          style={{ color: locked ? "var(--fg-subtle)" : t.accent }}
                        >
                          Tier {t.tier} · {rarity}
                        </p>
                        <h2 className="text-lg sm:text-xl font-black text-fg mt-0.5 tracking-tight leading-tight">
                          {t.title}
                        </h2>
                      </div>
                    </div>
                    <StateChip state={locked ? "LOCKED" : reward!.status} />
                  </header>

                  <p className="text-sm text-muted leading-snug mb-4">{t.blurb}</p>

                  <ul className="space-y-1.5 mb-5">
                    {t.items.map((item) => (
                      <li key={item} className="text-xs text-fg flex items-start gap-2 leading-snug">
                        <Sparkles
                          size={12}
                          className="shrink-0 mt-0.5"
                          style={{ color: locked ? "var(--fg-subtle)" : t.accent }}
                        />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>

                  {/* Footer — state-driven action / status block */}
                  <div className="mt-auto">
                    {locked ? (
                      <div
                        className="rounded-2xl px-4 py-3 text-xs font-semibold flex items-center justify-between gap-2"
                        style={{
                          background: "var(--elevated)",
                          color: "var(--fg-muted)",
                        }}
                      >
                        <span className="inline-flex items-center gap-2">
                          <Lock size={12} />
                          {remaining.toLocaleString()} credits to crack open
                        </span>
                        <span className="font-mono text-fg-subtle">
                          {Math.min(99, Math.round((spent / t.threshold) * 100))}%
                        </span>
                      </div>
                    ) : unclaimed ? (
                      <div className="space-y-2">
                        <div
                          className="rounded-2xl px-4 py-2.5 text-xs font-black uppercase tracking-[0.18em] inline-flex items-center gap-2 loot-pulse"
                          style={{
                            background: `linear-gradient(135deg, ${t.accent}, ${t.accent}dd)`,
                            color: "white",
                          }}
                        >
                          <PartyPopper size={12} />
                          Unlocked — claim it!
                        </div>
                        <MerchClaimDialog
                          rewardId={reward!.id}
                          tierTitle={t.title}
                          items={t.items}
                          defaults={{
                            recipientName: user?.name ?? "",
                            country: user?.country ?? "",
                            phone: user?.phone ?? "",
                          }}
                        />
                      </div>
                    ) : reward!.status === "CLAIMED" ? (
                      <div className="text-xs bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-200 rounded-2xl px-4 py-3 leading-snug">
                        {reward!.fulfillmentMethod === "PICKUP" ? (
                          <>
                            <MapPin size={12} className="inline -mt-0.5 mr-1" />
                            We&apos;re packing your loot. You&apos;ll get an email when it&apos;s
                            ready to pick up at {PICKUP_LOCATION.short}.
                          </>
                        ) : (
                          <>
                            <Truck size={12} className="inline -mt-0.5 mr-1" />
                            Mailing requested — an admin&apos;s lining up postage.
                            We&apos;ll email a confirmation (or quote) before sending.
                          </>
                        )}
                      </div>
                    ) : reward!.status === "SHIPPED" ? (
                      <div className="text-xs bg-emerald-50 text-emerald-800 ring-1 ring-inset ring-emerald-200 rounded-2xl px-4 py-3 leading-snug space-y-1">
                        {reward!.fulfillmentMethod === "PICKUP" ? (
                          <p>
                            <MapPin size={12} className="inline -mt-0.5 mr-1" />
                            <span className="font-bold">Ready for pickup!</span>{" "}
                            Swing by Leslie Dan Faculty of Pharmacy, U of T —
                            bring this page or your name.
                          </p>
                        ) : (
                          <>
                            <p>
                              <Truck size={12} className="inline -mt-0.5 mr-1" />
                              Shipped {reward!.shippedAt ? new Date(reward!.shippedAt).toLocaleDateString() : ""}
                              {reward!.carrier && <> via {reward!.carrier}</>}.
                            </p>
                            {reward!.trackingUrl ? (
                              <a
                                href={reward!.trackingUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-emerald-900 underline font-bold break-all"
                              >
                                Track: {reward!.trackingNumber}
                              </a>
                            ) : reward!.trackingNumber ? (
                              <p className="font-mono">Tracking: {reward!.trackingNumber}</p>
                            ) : null}
                          </>
                        )}
                      </div>
                    ) : reward!.status === "DELIVERED" ? (
                      <div className="text-xs bg-emerald-50 text-emerald-800 ring-1 ring-inset ring-emerald-200 rounded-2xl px-4 py-3 font-bold inline-flex items-center gap-2">
                        <CheckCircle2 size={14} />
                        {reward!.fulfillmentMethod === "PICKUP"
                          ? "Picked up. Wear it loud!"
                          : "Delivered. Enjoy the spoils!"}
                      </div>
                    ) : reward!.status === "CANCELLED" ? (
                      <div className="text-xs bg-rose-50 text-rose-800 ring-1 ring-inset ring-rose-200 rounded-2xl px-4 py-3 leading-snug">
                        Cancelled.
                        {reward!.cancelledReason && <> {reward!.cancelledReason}</>}
                        <br />
                        Reach out to support@biohubnet.com to re-issue.
                      </div>
                    ) : null}
                  </div>
                </div>
              </article>
            );
          })}
        </section>

        {/* ─────────────────────── PICKUP CARD ───────────────────────
            A small playful sign-post for where to grab the loot in
            person. Lives on a tinted brand wash so it reads as part of
            the same arcade page rather than a tax receipt. */}
        <section
          className="relative overflow-hidden rounded-3xl px-5 sm:px-8 py-6 surface-shadow flex items-start gap-4"
          style={{
            background:
              "linear-gradient(135deg, color-mix(in srgb, var(--brand-500) 18%, var(--card)) 0%, var(--card) 60%)",
          }}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute -top-10 -right-10 w-40 h-40 rounded-full blur-3xl opacity-40"
            style={{ background: "var(--brand-400)" }}
          />
          <div
            className="relative shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-md loot-float-slow"
            style={{ background: "var(--brand-600)" }}
          >
            <MapPin size={20} />
          </div>
          <div className="relative flex-1 min-w-0">
            <p className="text-[10px] uppercase tracking-[0.22em] font-black text-brand-700">
              Where to grab your loot
            </p>
            <p className="text-base sm:text-lg font-bold text-fg mt-1 tracking-tight">
              {PICKUP_LOCATION.org}
            </p>
            <p className="text-sm text-fg">
              {PICKUP_LOCATION.building}, {PICKUP_LOCATION.university}
            </p>
            <p className="text-xs text-muted mt-2 leading-snug">
              Default for every reward. Outside the GTA? Tick the mailing
              option inside the claim form — an admin reviews each request
              and confirms postage (Canada at-cost; international quoted
              first).
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}

/** Pick a "rarity" label per tier — gives each loot card collectible-
 *  game energy without inventing a new schema field. */
function tierRarity(tier: number): string {
  if (tier <= 1) return "Common drop";
  if (tier === 2) return "Rare drop";
  return "Legendary drop";
}

/** Per-tier emoji used as the big card glyph. Falls back to a gift box
 *  for any future tier we haven't mapped yet. */
function tierEmoji(tier: number): string {
  const map: Record<number, string> = {
    1: "🎒",
    2: "💧",
    3: "🎨",
  };
  return map[tier] ?? "🎁";
}

/**
 * Informed empty state for non-trainee viewers (admins, instructors,
 * employers, anyone whose role can't claim merch). The page still
 * renders under the "Rewards" identity so the user knows they
 * landed where they clicked, but the body explains why their account
 * has nothing to claim and offers two concrete next-steps:
 *
 *   • Open the admin queue at /admin/merch (only for admin/superadmin)
 *   • Use "View as trainee" via the role switcher (superadmin only —
 *     plain admins don't have act-as).
 *
 * The tier registry renders read-only at the bottom so non-trainees
 * can see what trainees see, without us faking per-user data.
 */
function NonTraineeLanding({
  role, realRole, isAdmin,
}: {
  role: string;
  realRole: string;
  isAdmin: boolean;
}) {
  const isSuperadmin = realRole === "superadmin";
  const friendlyRole = role.charAt(0).toUpperCase() + role.slice(1);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Same hero header as the trainee page so the user knows they
          landed on the right page. The body just changes underneath. */}
      <section className="rounded-2xl border border-line bg-card p-6 sm:p-8 surface-shadow">
        <div className="flex items-start justify-between gap-4 mb-2">
          <div>
            <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-subtle">Loyalty rewards</p>
            <h1 className="text-2xl sm:text-3xl font-bold text-fg mt-1 tracking-tight">
              BHN merch — earned, not bought
            </h1>
          </div>
          <Gift size={40} className="text-brand-600 shrink-0 hidden sm:block" />
        </div>

        {/* Informed empty state. Tone: factual, no scolding. The
            admin landed here on purpose; explain why their account
            has nothing to claim and what to do next. */}
        <div className="mt-5 rounded-xl bg-amber-50 ring-1 ring-inset ring-amber-200 p-4 sm:p-5 flex items-start gap-3">
          <Info size={18} className="text-amber-700 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-900">
              You're viewing the trainee Rewards page as <span className="font-mono text-xs uppercase tracking-[0.14em]">{friendlyRole}</span>.
            </p>
            <p className="text-sm text-amber-800 mt-1 leading-snug">
              Rewards are earned by trainees as they spend credits on
              coursework. Your account doesn't earn merch directly — but
              you have two ways to see what trainees see, depending on
              what you need.
            </p>
          </div>
        </div>
      </section>

      {/* Concrete next-steps as side-by-side action cards. */}
      <section className="grid sm:grid-cols-2 gap-4">
        {isAdmin && (
          <Link
            href="/admin/merch"
            className="group rounded-2xl border border-line bg-card p-5 surface-shadow hover:border-brand-300 transition-colors flex flex-col"
          >
            <div className="flex items-start gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center shrink-0">
                <Package size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-subtle">For admins</p>
                <h2 className="text-base font-semibold text-fg mt-0.5 tracking-tight">
                  Open Merch fulfillment
                </h2>
              </div>
            </div>
            <p className="text-sm text-muted leading-snug flex-1">
              The admin-side queue. Pack pickup bundles, attach tracking to
              mailing requests, mark delivered. Where you actually do work on
              rewards.
            </p>
            <p className="text-xs font-semibold text-brand-700 mt-3 inline-flex items-center gap-1 group-hover:gap-2 transition-all">
              Go to /admin/merch <ArrowRight size={12} />
            </p>
          </Link>
        )}

        {isSuperadmin ? (
          <div className="rounded-2xl border border-line bg-card p-5 surface-shadow flex flex-col">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                <Eye size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-subtle">For superadmins</p>
                <h2 className="text-base font-semibold text-fg mt-0.5 tracking-tight">
                  View as a trainee
                </h2>
              </div>
            </div>
            <p className="text-sm text-muted leading-snug flex-1">
              Use the <span className="font-semibold text-fg">View as</span>{" "}
              switcher in the sidebar (under your profile) to act as Trainee
              or Evaluating. The whole platform — including this page — will
              render as that role would see it. Switch back anytime; sessions
              auto-revert after 1 hour.
            </p>
            <p className="text-xs text-subtle mt-3 leading-snug">
              Note: a superadmin acting as Trainee sees the actual data of
              that view (which is your superadmin account's transaction
              history). Use a sandbox trainee account if you want a clean
              demo state.
            </p>
          </div>
        ) : isAdmin ? (
          // Plain admins (not superadmin) don't have act-as. Tell them why
          // they're missing the second card so it doesn't feel like the
          // page is broken.
          <div className="rounded-2xl border border-line bg-card p-5 surface-shadow flex flex-col">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-elevated text-subtle flex items-center justify-center shrink-0">
                <Eye size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-subtle">Want to see the trainee view?</p>
                <h2 className="text-base font-semibold text-fg mt-0.5 tracking-tight">
                  Use a sandbox trainee account
                </h2>
              </div>
            </div>
            <p className="text-sm text-muted leading-snug flex-1">
              "Act as another role" is a superadmin-only tool. To see the
              trainee experience yourself, sign in to a sandbox trainee
              account from <span className="font-semibold text-fg">Sandbox accounts</span> in
              the admin nav, or ask a superadmin to grant you act-as access.
            </p>
          </div>
        ) : (
          // Instructors / employers / others — just point at the trainee-
          // facing nature of the page; no action card to offer.
          <div className="rounded-2xl border border-line bg-card p-5 surface-shadow flex items-center text-sm text-muted leading-snug">
            <p>
              Rewards is a trainee-facing surface. If you're working with a
              specific trainee on credit applications or fulfillment, ask an
              admin to walk through their Rewards page with you.
            </p>
          </div>
        )}
      </section>

      {/* Read-only tier reference. Lets non-trainees see what the
          rewards actually are, without us inventing fake data on
          their behalf. */}
      <section>
        <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-subtle mb-3">
          What trainees see
        </p>
        <div className="grid sm:grid-cols-2 gap-4">
          {MERCH_TIERS.map((t) => (
            <article
              key={t.tier}
              className="rounded-2xl border border-line bg-card p-5 surface-shadow"
              style={{ borderLeft: `4px solid ${t.accent}` }}
            >
              <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-subtle">
                Tier {t.tier} · {t.threshold.toLocaleString()} credits trained
              </p>
              <h3 className="text-lg font-bold text-fg mt-1 tracking-tight">{t.title}</h3>
              <p className="text-sm text-muted leading-snug mt-2 mb-3">{t.blurb}</p>
              <ul className="space-y-1">
                {t.items.map((item) => (
                  <li key={item} className="text-xs text-fg flex items-start gap-2 leading-snug">
                    <Package size={11} className="text-subtle shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      {/* Pickup location — same card as the trainee page, repeated
          here so admins can copy the address into emails. */}
      <section className="rounded-2xl border border-line bg-card p-5 surface-shadow flex items-start gap-3">
        <MapPin size={18} className="text-brand-600 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-subtle">Pickup location</p>
          <p className="text-sm font-semibold text-fg mt-1">{PICKUP_LOCATION.org}</p>
          <p className="text-sm text-fg">
            {PICKUP_LOCATION.building}, {PICKUP_LOCATION.university}
          </p>
        </div>
      </section>
    </div>
  );
}

/**
 * Frosted stat tile used in the scoreboard. Sits on the vibrant
 * gradient via a translucent white wash + crisp inner border so it
 * reads as a 3D embedded chip rather than flat text. `accent=true`
 * tilts the tile toward the celebratory amber (used when there's no
 * "next tier" — i.e. the trainee has cleared every milestone).
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
        "rounded-2xl px-4 py-3 backdrop-blur-sm ring-1 ring-inset " +
        (accent
          ? "bg-amber-200/25 ring-amber-200/60"
          : "bg-white/15 ring-white/25")
      }
    >
      <p className="text-[10px] uppercase tracking-[0.22em] font-black text-white/80 inline-flex items-center gap-1.5">
        <Icon size={12} />
        {label}
      </p>
      <p className="text-2xl sm:text-3xl font-black text-white leading-tight font-mono tabular-nums mt-1">
        {value}
      </p>
    </div>
  );
}

/** Compact status pill matching the card's lifecycle state. */
function StateChip({ state }: { state: string }) {
  const styles: Record<string, string> = {
    LOCKED:    "bg-elevated text-subtle ring-line",
    UNCLAIMED: "bg-amber-200 text-amber-900 ring-amber-300",
    CLAIMED:   "bg-amber-100 text-amber-800 ring-amber-200",
    SHIPPED:   "bg-emerald-100 text-emerald-800 ring-emerald-200",
    DELIVERED: "bg-emerald-100 text-emerald-800 ring-emerald-200",
    CANCELLED: "bg-rose-100 text-rose-800 ring-rose-200",
  };
  const label: Record<string, string> = {
    LOCKED:    "Locked",
    UNCLAIMED: "★ Drop ready",
    CLAIMED:   "Packing",
    SHIPPED:   "On the way",
    DELIVERED: "Got it!",
    CANCELLED: "Cancelled",
  };
  return (
    <span
      className={`inline-flex items-center text-[10px] font-black uppercase tracking-[0.16em] px-2.5 py-1 rounded-full ring-1 ring-inset shrink-0 ${styles[state] ?? styles.LOCKED}`}
    >
      {label[state] ?? state}
    </span>
  );
}
