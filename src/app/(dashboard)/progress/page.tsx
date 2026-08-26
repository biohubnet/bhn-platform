/**
 * /progress — ENGAGE Progress Tracker.
 *
 * Parity surface for the current platform's "Progress Tracker", which
 * carries four things: a Training Credits utilisation panel, the credit
 * policy, the courses you have completed (exportable as a PDF) and the
 * ones still in flight.
 *
 * The utilisation maths lives in lib/credits/utilization.ts. The one
 * deliberate difference from the current platform: it states the
 * 6-month early-expiry rule as POLICY rather than as a countdown,
 * because nothing in this build enforces it yet (the sweeper applies a
 * per-grant 365-day TTL and has no utilisation checkpoint). Saying
 * "credits expire on this date" when no job acts on that date would be
 * a lie the UI tells confidently — see EARLY_EXPIRY_ENFORCED.
 */
import { redirect } from "next/navigation";
import Link from "next/link";
import { CircleCheck, Clock, Coins, GraduationCap } from "lucide-react";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHero } from "@/components/ui/PageHero";
import { DSSection } from "@/components/design-system/DSSection";
import { CREDIT_GRANT_TTL_DAYS } from "@/lib/credits/expiry";
import {
  creditUtilization,
  CREDIT_AWARD_TOTAL,
  CREDIT_HALFWAY_MILESTONE,
  EARLY_EXPIRY_ENFORCED,
} from "@/lib/credits/utilization";
import { CompletedCoursesExport } from "@/components/engage/CompletedCoursesExport";

export const dynamic = "force-dynamic";

function fmt(d: Date | null): string {
  return d
    ? d.toLocaleDateString("en-CA", { month: "long", day: "numeric", year: "numeric" })
    : "—";
}

export default async function ProgressTrackerPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const userId = (session.user as { id?: string }).id!;
  const displayName = session.user?.name ?? session.user?.email ?? "Trainee";

  const [util, completed, inProgress] = await Promise.all([
    creditUtilization(userId),
    prisma.enrollment.findMany({
      where: { userId, status: "completed" },
      include: { course: { select: { title: true, code: true, duration: true } } },
      orderBy: { completedAt: "desc" },
    }),
    prisma.enrollment.findMany({
      where: { userId, status: "active" },
      include: { course: { select: { title: true, code: true, duration: true } } },
      orderBy: { enrolledAt: "desc" },
    }),
  ]);

  const pct = Math.round(util.fraction * 100);
  // Where the six-month milestone sits along the bar, as a percentage of
  // the full award. Derived, not hard-coded, so changing either constant
  // moves the marker with it.
  const thresholdPct = (CREDIT_HALFWAY_MILESTONE / CREDIT_AWARD_TOTAL) * 100;

  return (
    <div>
      <PageHero
        eyebrow={<><GraduationCap size={11} /> ENGAGE</>}
        title="Progress Tracker"
        description="Your training credits, the courses you've finished, and the ones still in flight."
      />

      <div className="max-w-5xl mx-auto space-y-8">
        {/* ── Training credits ─────────────────────────────────── */}
        <DSSection title="Training Credits" eyebrow="Utilisation" icon={<Coins size={15} />}>
          <p className="text-sm text-muted">
            As of <strong className="text-fg">{fmt(new Date())}</strong> you have used{" "}
            <strong className="text-fg">{util.used.toLocaleString()}</strong> out of{" "}
            <strong className="text-fg">{CREDIT_AWARD_TOTAL.toLocaleString()}</strong> credits.
            {util.balance > 0 && (
              <> Your current balance is <strong className="text-fg">{util.balance.toLocaleString()}</strong>.</>
            )}
          </p>

          {/* Utilisation bar. aria attributes make the value available
              to a screen reader — the bar is otherwise pure colour. */}
          <div className="mt-4">
            <div className="flex items-baseline justify-between mb-1.5">
              <p className="text-[11px] uppercase tracking-[0.18em] font-semibold text-subtle">
                Credit utilisation
              </p>
              <p className="text-xs font-semibold text-fg tabular-nums">{pct}%</p>
            </div>
            {/* The bar carries a marker at the halfway milestone. Without it
                the policy below is an abstract number; with it a trainee can
                see at a glance which side of the six-month threshold they are
                on. `overflow-hidden` stays on the inner fill only, so the
                marker and its label are free to sit above the track. */}
            <div className="relative">
              <div
                role="progressbar"
                aria-valuenow={util.used}
                aria-valuemin={0}
                aria-valuemax={CREDIT_AWARD_TOTAL}
                aria-label="Credit utilisation"
                className="h-2.5 w-full rounded-full bg-elevated overflow-hidden"
              >
                <div
                  className="h-full rounded-full bg-brand-600 transition-all"
                  style={{ width: `${Math.max(pct, util.used > 0 ? 2 : 0)}%` }}
                />
              </div>
              <div
                aria-hidden="true"
                className="absolute top-0 h-2.5 w-px bg-fg/45"
                style={{ left: `${thresholdPct}%` }}
              />
            </div>
            <div className="relative mt-1 h-4">
              <p
                className="absolute -translate-x-1/2 whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.14em] text-subtle tabular-nums"
                style={{ left: `${thresholdPct}%` }}
              >
                {CREDIT_HALFWAY_MILESTONE.toLocaleString()} policy threshold
              </p>
              <p className="absolute right-0 text-[10px] font-semibold text-subtle tabular-nums">
                {CREDIT_AWARD_TOTAL.toLocaleString()}
              </p>
            </div>
          </div>

          {/* Milestones */}
          <div className="mt-5">
            <p className="text-sm font-semibold text-fg mb-2">Make sure to…</p>
            <ul className="space-y-1.5 text-sm">
              <li className="flex items-start gap-2">
                <CircleCheck
                  size={15}
                  className={util.halfwayMet ? "text-emerald-600 mt-0.5 shrink-0" : "text-subtle mt-0.5 shrink-0"}
                />
                <span className={util.halfwayMet ? "text-muted line-through" : "text-fg"}>
                  Use {CREDIT_HALFWAY_MILESTONE.toLocaleString()} credits by{" "}
                  <strong>{fmt(util.checkpointAt)}</strong> to avoid early expiry
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CircleCheck
                  size={15}
                  className={util.fullMet ? "text-emerald-600 mt-0.5 shrink-0" : "text-subtle mt-0.5 shrink-0"}
                />
                <span className={util.fullMet ? "text-muted line-through" : "text-fg"}>
                  Use {CREDIT_AWARD_TOTAL.toLocaleString()} credits by{" "}
                  <strong>{fmt(util.fullTermAt)}</strong>
                </span>
              </li>
            </ul>
            {util.issuedAt === null && (
              <p className="text-xs text-subtle mt-2">
                Dates appear once your first credits are granted.
              </p>
            )}
          </div>

          {/* Policy */}
          <div className="mt-5 rounded-xl border border-line bg-elevated p-4">
            <p className="text-sm font-semibold text-fg mb-2">Credit policy</p>
            <p className="text-sm text-muted">
              If credit utilisation at six months post-issuance is{" "}
              <strong className="text-rose-700">under {CREDIT_HALFWAY_MILESTONE.toLocaleString()}</strong>,
              remaining credits expire immediately. At{" "}
              <strong className="text-emerald-700">{CREDIT_HALFWAY_MILESTONE.toLocaleString()} or more</strong>,
              they stay valid until one year post-issuance.
            </p>
            {!EARLY_EXPIRY_ENFORCED && (
              <p className="text-xs text-subtle mt-2">
                Today this build only applies the {CREDIT_GRANT_TTL_DAYS}-day per-grant
                expiry; the six-month checkpoint is policy, not yet automated.
              </p>
            )}
          </div>
        </DSSection>

        {/* ── Completed ────────────────────────────────────────── */}
        <DSSection title="Courses completed" eyebrow={`${completed.length} finished`} icon={<CircleCheck size={15} />}>
          {completed.length === 0 ? (
            <p className="text-sm text-muted">
              Nothing finished yet.{" "}
              <Link href="/courses" className="text-brand-700 hover:underline">Browse the catalogue</Link>.
            </p>
          ) : (
            <>
              <CompletedCoursesExport
                traineeName={displayName}
                rows={completed.map((e) => ({
                  title: e.course.title,
                  code: e.course.code ?? null,
                  completedAt: e.completedAt ? e.completedAt.toISOString() : null,
                }))}
              />
              <ul className="mt-3 divide-y divide-line">
                {completed.map((e) => (
                  <li key={e.id} className="py-2.5 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-fg truncate">{e.course.title}</p>
                      {e.course.code && <p className="text-xs text-subtle">{e.course.code}</p>}
                    </div>
                    <p className="text-xs text-muted shrink-0">{fmt(e.completedAt)}</p>
                  </li>
                ))}
              </ul>
            </>
          )}
        </DSSection>

        {/* ── In progress ──────────────────────────────────────── */}
        <DSSection title="Courses in progress" eyebrow={`${inProgress.length} in flight`} icon={<Clock size={15} />}>
          {inProgress.length === 0 ? (
            <p className="text-sm text-muted">Nothing in flight right now.</p>
          ) : (
            <ul className="divide-y divide-line">
              {inProgress.map((e) => (
                <li key={e.id} className="py-2.5 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-fg truncate">{e.course.title}</p>
                    {e.course.code && <p className="text-xs text-subtle">{e.course.code}</p>}
                  </div>
                  <p className="text-xs text-muted shrink-0 tabular-nums">{e.progress}%</p>
                </li>
              ))}
            </ul>
          )}
        </DSSection>
      </div>
    </div>
  );
}
