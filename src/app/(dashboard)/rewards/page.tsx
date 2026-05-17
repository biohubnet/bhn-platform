import { requireSession, isStaff as checkIsStaff } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Gift, Lock, CheckCircle2, Truck, Package, Sparkles, MapPin, Info, Eye, ArrowRight, Trophy, Flame, Star } from "lucide-react";
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

  const heroTitleDefault = "Train hard. Earn the gear.";
  const heroBodyDefault = "Every credit you spend on coursework counts toward milestone rewards. Pickup at Leslie Dan Faculty of Pharmacy, U of T — or request mailing in the claim form.";
  const heroCopy = await getCopyMap(["rewards.heroTitle", "rewards.heroBody"]);
  const heroTitle = heroCopy["rewards.heroTitle"] ?? heroTitleDefault;
  const heroBody = heroCopy["rewards.heroBody"] ?? heroBodyDefault;
  // Real role gates the pencil — an admin viewing-as-trainee should
  // still be able to edit the hero copy without flipping seats first.
  const editableIsStaff = checkIsStaff(realRole);

  return (
    <div>
      {/* Hero — added 2026-05-17 so /rewards opens with the same
          cinematic full-bleed band as every other surface. The
          existing dark brand-gradient credits + journey panel stays
          beneath it (it's a complete visualization on its own and a
          full conversion to light-mode would be a separate redesign). */}
      {/* Title rendered as a plain string — the PageHero h1 applies a
          bg-clip:text gradient that makes an EditableText wrapper's
          pencil button invisible. Staff can still edit the body copy
          via the pencil on the description below. */}
      <PageHero
        eyebrow={<><Trophy size={12} /> Loyalty rewards</>}
        title={heroTitle}
        description={
          <EditableText copyKey="rewards.heroBody" defaultText={heroBody} isStaff={editableIsStaff} />
        }
      />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 space-y-6">
      {/* Credits + journey panel — full lifetime-credits headline,
          stat tiles, progress bar with tier markers. Kept on its own
          dark brand-gradient surface (the "wall display" treatment)
          beneath the cinematic hero. */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-700 via-brand-800 to-brand-900 text-white px-6 sm:px-10 py-9 sm:py-12 surface-shadow">
        {/* Decorative blobs */}
        <div className="pointer-events-none absolute -top-20 -right-16 w-64 h-64 rounded-full bg-amber-400/25 blur-3xl" aria-hidden />
        <div className="pointer-events-none absolute -bottom-24 -left-10 w-72 h-72 rounded-full bg-brand-400/30 blur-3xl" aria-hidden />
        <div className="pointer-events-none absolute top-8 right-10 hidden sm:block text-amber-300/80" aria-hidden>
          <Sparkles size={28} />
        </div>

        <div className="relative">
          {/* Big lifetime-credits headline */}
          <div className="flex flex-wrap items-end gap-x-8 gap-y-4">
            <div>
              <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-white/70">Credits trained</p>
              <p className="text-5xl sm:text-6xl font-bold leading-none font-mono tabular-nums mt-1">
                {spent.toLocaleString()}
              </p>
            </div>
            <div className="flex gap-6">
              <Stat label="Tiers unlocked" value={`${unlockedCount} / ${journeyTiers.length}`} icon={Star} />
              <Stat label="Claimed" value={String(claimedCount)} icon={CheckCircle2} />
              {nextTier && (
                <Stat
                  label="To next reward"
                  value={(nextTier.threshold - spent).toLocaleString()}
                  icon={Flame}
                />
              )}
            </div>
          </div>

          {/* Journey progress bar — marker per tier. Reads as a
              physical journey: every milestone is dot-anchored at its
              threshold-percentage; the trainee's current position is a
              taller glowing marker. */}
          <div className="mt-7">
            <div className="relative h-3 rounded-full bg-white/15 overflow-visible">
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-amber-300 via-amber-400 to-amber-500 shadow-[0_0_18px_rgba(251,191,36,0.6)] transition-all"
                style={{ width: `${journeyPct}%` }}
              />
              {/* Tier markers */}
              {journeyTiers.map((t) => {
                const pct = Math.min(100, (t.threshold / journeyMax) * 100);
                const reached = spent >= t.threshold;
                return (
                  <div
                    key={t.tier}
                    className="absolute -top-1.5 -translate-x-1/2"
                    style={{ left: `${pct}%` }}
                  >
                    <div
                      className={
                        "w-6 h-6 rounded-full border-2 flex items-center justify-center text-[10px] font-bold " +
                        (reached
                          ? "bg-amber-300 border-white text-brand-900 shadow-md"
                          : "bg-brand-900 border-white/60 text-white/70")
                      }
                      title={`Tier ${t.tier} · ${t.threshold.toLocaleString()} credits`}
                    >
                      {reached ? "★" : t.tier}
                    </div>
                  </div>
                );
              })}
              {/* You-are-here marker */}
              <div
                className="absolute -top-2 -translate-x-1/2 pointer-events-none"
                style={{ left: `${journeyPct}%` }}
                aria-hidden
              >
                <div className="w-2 h-7 rounded-full bg-white shadow-[0_0_12px_rgba(255,255,255,0.9)]" />
              </div>
            </div>
            <div className="mt-5 flex flex-wrap justify-between gap-2 text-[11px] text-white/85">
              <span>
                Start
                <span className="block font-bold text-white text-sm font-mono tabular-nums">0</span>
              </span>
              {journeyTiers.map((t) => (
                <span key={t.tier} className="text-center">
                  {t.title}
                  <span className="block font-bold text-white text-sm font-mono tabular-nums">
                    {t.threshold.toLocaleString()}
                  </span>
                </span>
              ))}
            </div>
            <p className="text-xs text-white/85 mt-4">
              {nextTier ? (
                <>
                  <Flame size={12} className="inline -mt-0.5 mr-1 text-amber-300" />
                  <span className="font-semibold text-white">{(nextTier.threshold - spent).toLocaleString()}</span>{" "}
                  more credits trained until{" "}
                  <span className="font-semibold text-white">{nextTier.title}</span> unlocks.
                </>
              ) : (
                <>
                  <Sparkles size={12} className="inline -mt-0.5 mr-1 text-amber-300" />
                  You&apos;ve unlocked every tier. Future tiers will appear here as we add them.
                </>
              )}
            </p>
          </div>
        </div>
      </section>

      {/* Tier cards — one per registry entry. Each is in one of four
          states; the state chip + accent treatment vary so a single
          glance tells you which tier you're standing on, which is
          mid-claim, and which is still ahead. The dramatic tone shift
          between locked and unlocked is intentional — unlocked cards
          should feel like a moment, not a checkbox. */}
      <section className="grid sm:grid-cols-2 gap-4">
        {MERCH_TIERS.map((t) => {
          const reward = rewards.find((r) => r.tier === t.tier) ?? null;
          const locked = !reward; // no row = haven't crossed threshold yet
          const remaining = Math.max(0, t.threshold - spent);
          return (
            <article
              key={t.tier}
              className={
                "relative overflow-hidden rounded-2xl border bg-card p-5 surface-shadow flex flex-col transition-transform hover:-translate-y-0.5 " +
                (locked ? "border-line" : "border-transparent")
              }
              style={
                locked
                  ? { borderLeft: `4px solid rgba(120,120,120,0.25)` }
                  : {
                      // Painted accent strip + faint glow halo behind
                      // the title for unlocked tiers, anchored on the
                      // tier's accent colour so each tier still reads
                      // as distinct.
                      borderLeft: `4px solid ${t.accent}`,
                      boxShadow: `0 0 0 1px ${t.accent}33, 0 8px 24px -12px ${t.accent}66`,
                    }
              }
            >
              {!locked && (
                <div
                  className="pointer-events-none absolute -top-12 -right-12 w-40 h-40 rounded-full blur-3xl opacity-25"
                  style={{ background: t.accent }}
                  aria-hidden
                />
              )}
              <header className="relative flex items-start justify-between gap-3 mb-3">
                <div className="flex items-start gap-3 min-w-0">
                  <span
                    className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-white"
                    style={{ background: locked ? "rgba(120,120,120,0.35)" : t.accent }}
                  >
                    {locked ? <Lock size={16} /> : <Gift size={16} />}
                  </span>
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-subtle">
                      Tier {t.tier} · {t.threshold.toLocaleString()} credits
                    </p>
                    <h2 className="text-lg font-bold text-fg mt-0.5 tracking-tight">{t.title}</h2>
                  </div>
                </div>
                <StateChip state={locked ? "LOCKED" : reward!.status} />
              </header>

              <p className="text-sm text-muted leading-snug mb-3">{t.blurb}</p>

              <ul className="space-y-1.5 mb-4">
                {t.items.map((item) => (
                  <li key={item} className="text-xs text-fg flex items-start gap-2 leading-snug">
                    <Package size={11} className="text-subtle shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-auto">
                {locked ? (
                  <div className="text-xs text-muted bg-elevated rounded-lg px-3 py-2">
                    <Lock size={11} className="inline -mt-0.5 mr-1 text-subtle" />
                    {remaining.toLocaleString()} more credits to unlock.
                  </div>
                ) : reward!.status === "UNCLAIMED" ? (
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
                ) : reward!.status === "CLAIMED" ? (
                  <div className="text-xs bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-200 rounded-lg px-3 py-2 leading-snug">
                    {reward!.fulfillmentMethod === "PICKUP" ? (
                      <>
                        <MapPin size={11} className="inline -mt-0.5 mr-1" />
                        We're prepping your bundle. You'll get an email when it's
                        ready to pick up at {PICKUP_LOCATION.short}.
                      </>
                    ) : (
                      <>
                        <Truck size={11} className="inline -mt-0.5 mr-1" />
                        Mailing request received — an admin is reviewing postage.
                        We'll email a confirmation (or quote) before sending.
                      </>
                    )}
                  </div>
                ) : reward!.status === "SHIPPED" ? (
                  <div className="text-xs bg-emerald-50 text-emerald-800 ring-1 ring-inset ring-emerald-200 rounded-lg px-3 py-2 leading-snug space-y-1">
                    {reward!.fulfillmentMethod === "PICKUP" ? (
                      <>
                        <p>
                          <MapPin size={11} className="inline -mt-0.5 mr-1" />
                          <span className="font-semibold">Ready to pick up.</span>{" "}
                          Drop by the BHN office at Leslie Dan Faculty of
                          Pharmacy, U of T — bring this page or your name.
                        </p>
                      </>
                    ) : (
                      <>
                        <p>
                          <CheckCircle2 size={11} className="inline -mt-0.5 mr-1" />
                          Shipped {reward!.shippedAt ? new Date(reward!.shippedAt).toLocaleDateString() : ""}
                          {reward!.carrier && <> via {reward!.carrier}</>}.
                        </p>
                        {reward!.trackingUrl ? (
                          <a
                            href={reward!.trackingUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-emerald-900 underline font-medium break-all"
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
                  <div className="text-xs bg-emerald-50 text-emerald-800 ring-1 ring-inset ring-emerald-200 rounded-lg px-3 py-2 leading-snug">
                    <CheckCircle2 size={11} className="inline -mt-0.5 mr-1" />
                    {reward!.fulfillmentMethod === "PICKUP" ? "Picked up. Wear it well." : "Delivered. Enjoy."}
                  </div>
                ) : reward!.status === "CANCELLED" ? (
                  <div className="text-xs bg-rose-50 text-rose-800 ring-1 ring-inset ring-rose-200 rounded-lg px-3 py-2 leading-snug">
                    Cancelled.
                    {reward!.cancelledReason && <> {reward!.cancelledReason}</>}
                    <br />
                    Reach out to support@biohubnet.com to re-issue.
                  </div>
                ) : null}
              </div>
            </article>
          );
        })}
      </section>

      {/* Pickup-location card — surfaces the address as a separate
          static block so it's findable even when no reward is in the
          claimed state, and so trainees can copy-paste it. */}
      <section className="rounded-2xl border border-line bg-card p-5 surface-shadow flex items-start gap-3">
        <MapPin size={18} className="text-brand-600 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-subtle">Pickup location</p>
          <p className="text-sm font-semibold text-fg mt-1">{PICKUP_LOCATION.org}</p>
          <p className="text-sm text-fg">
            {PICKUP_LOCATION.building}, {PICKUP_LOCATION.university}
          </p>
          <p className="text-xs text-muted mt-2 leading-snug">
            Default for all rewards. Trainees outside the GTA can request
            mailing inside the claim form — admin reviews each request and
            confirms postage (Canada at-cost; international quoted first).
          </p>
        </div>
      </section>
      </div>
    </div>
  );
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
 * Compact stat tile used in the hero. Renders an icon-label-value
 * vertical column matching the dark-hero typography.
 */
function Stat({ label, value, icon: Icon }: { label: string; value: string; icon: React.ElementType }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-white/70 inline-flex items-center gap-1">
        <Icon size={11} />
        {label}
      </p>
      <p className="text-2xl font-bold text-white leading-tight font-mono tabular-nums mt-1">
        {value}
      </p>
    </div>
  );
}

/** Compact status pill matching the card's lifecycle state. */
function StateChip({ state }: { state: string }) {
  const styles: Record<string, string> = {
    LOCKED:    "bg-elevated text-subtle ring-line",
    UNCLAIMED: "bg-brand-50 text-brand-700 ring-brand-200",
    CLAIMED:   "bg-amber-100 text-amber-800 ring-amber-200",
    SHIPPED:   "bg-emerald-100 text-emerald-800 ring-emerald-200",
    DELIVERED: "bg-emerald-100 text-emerald-800 ring-emerald-200",
    CANCELLED: "bg-rose-100 text-rose-800 ring-rose-200",
  };
  const label: Record<string, string> = {
    LOCKED:    "Locked",
    UNCLAIMED: "Unlocked",
    CLAIMED:   "Packing",
    SHIPPED:   "Shipped",
    DELIVERED: "Delivered",
    CANCELLED: "Cancelled",
  };
  return (
    <span
      className={`inline-flex items-center text-[10px] font-bold uppercase tracking-[0.16em] px-2 py-0.5 rounded-full ring-1 ring-inset shrink-0 ${styles[state] ?? styles.LOCKED}`}
    >
      {label[state] ?? state}
    </span>
  );
}
