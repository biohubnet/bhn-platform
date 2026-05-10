import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Gift, Lock, CheckCircle2, Truck, Package, Sparkles, MapPin } from "lucide-react";
import {
  MERCH_TIERS,
  PICKUP_LOCATION,
  ensureMerchUnlocks,
  lifetimeSpent,
  nextTierFor,
} from "@/lib/rewards/merch";
import { MerchClaimDialog } from "@/components/rewards/MerchClaimDialog";

/**
 * /rewards — trainee-facing loyalty page.
 *
 * Three things on this page:
 *   1. A lifetime-spend counter + progress bar to the next tier.
 *   2. One card per tier — Apprentice (2500), Champion (5000) — each
 *      in one of four states: locked, unlocked-needs-claim, claimed-
 *      shipping-pending, shipped (terminal happy state).
 *   3. The claim modal, mounted globally and triggered per card.
 *
 * The page calls `ensureMerchUnlocks` on every load so a trainee who
 * crosses a threshold via legacy data (or whose enroll-time hook
 * missed) still sees the unlock the next time they visit.
 */
export default async function RewardsPage() {
  const session = await requireSession().catch(() => null);
  if (!session) redirect("/login");

  const userId = (session.user as { id?: string }).id!;
  const role = (session.user as { role?: string }).role ?? "trainee";

  // Page is for trainees. Staff and employers don't earn merch — bounce.
  if (role !== "trainee" && role !== "evaluating") {
    redirect("/dashboard");
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

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Hero — lifetime spend + progress to the next tier. */}
      <section className="rounded-2xl border border-line bg-card p-6 sm:p-8 surface-shadow">
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-subtle">Loyalty rewards</p>
            <h1 className="text-2xl sm:text-3xl font-bold text-fg mt-1 tracking-tight">
              BHN merch — earned, not bought
            </h1>
            <p className="text-sm text-muted mt-2 max-w-2xl">
              Train hard, get the gear. Every credit you spend on coursework
              counts toward two milestone rewards. When a tier unlocks, swing
              by the BHN office at <span className="font-medium text-fg">Leslie Dan Faculty of Pharmacy, U of T</span> to
              pick it up — or request mailing if you're far from Toronto.
            </p>
          </div>
          <Gift size={40} className="text-brand-600 shrink-0 hidden sm:block" />
        </div>

        <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2 mb-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-subtle leading-none">Credits trained</p>
            <p className="text-3xl font-bold text-fg leading-tight font-mono tabular-nums">
              {spent.toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-subtle leading-none">Tiers unlocked</p>
            <p className="text-2xl font-bold text-fg leading-tight font-mono tabular-nums">
              {unlockedCount} / {MERCH_TIERS.length}
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-subtle leading-none">Claimed</p>
            <p className="text-2xl font-bold text-fg leading-tight font-mono tabular-nums">
              {claimedCount}
            </p>
          </div>
        </div>

        {/* Progress bar — even when at the top tier, render a full
            green bar so the page reads as a finished journey rather
            than an empty unconfigured state. */}
        <div className="mt-2">
          <div className="h-2 bg-elevated rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-brand-400 to-brand-600 transition-all"
              style={{ width: `${pctToNext}%` }}
            />
          </div>
          <p className="text-xs text-muted mt-2">
            {nextTier ? (
              <>
                <span className="font-semibold text-fg">{(nextTier.threshold - spent).toLocaleString()}</span>{" "}
                more credits trained until{" "}
                <span className="font-semibold text-fg">{nextTier.title}</span> unlocks.
              </>
            ) : (
              <>
                <Sparkles size={12} className="inline -mt-0.5 mr-1 text-amber-500" />
                You've unlocked every tier. Future tiers will appear here as we add them.
              </>
            )}
          </p>
        </div>
      </section>

      {/* Tier cards — one per registry entry. Each is in one of four
          states; <MerchTierCard /> picks the right rendering. */}
      <section className="grid sm:grid-cols-2 gap-4">
        {MERCH_TIERS.map((t) => {
          const reward = rewards.find((r) => r.tier === t.tier) ?? null;
          const locked = !reward; // no row = haven't crossed threshold yet
          const remaining = Math.max(0, t.threshold - spent);
          return (
            <article
              key={t.tier}
              className="rounded-2xl border border-line bg-card p-5 surface-shadow flex flex-col"
              style={{
                borderLeft: `4px solid ${locked ? "rgba(120,120,120,0.25)" : t.accent}`,
              }}
            >
              <header className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-subtle">
                    Tier {t.tier} · {t.threshold.toLocaleString()} credits
                  </p>
                  <h2 className="text-lg font-bold text-fg mt-1 tracking-tight">{t.title}</h2>
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
