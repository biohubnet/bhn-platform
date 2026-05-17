import Link from "next/link";
import { redirect } from "next/navigation";
import { Gauge, ExternalLink, Clock, Inbox, Megaphone, Activity, ArrowUpRight } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHero } from "@/components/ui/PageHero";

/**
 * /admin/experience-metrics — UX KPI dashboard.
 *
 * Renders the four metrics named in docs/ux/charter.md as the
 * measurable side of the three user outcomes:
 *
 *   • Outcome 1 (trainee path): time from access request to handled;
 *                                pending-event-approval latency.
 *   • Outcome 2 (admin path):   queue depth (pending registrations,
 *                                workshop bookings, access requests,
 *                                role requests, credit apps).
 *   • Outcome 3 (transparency): ChangeLog cadence; ResearchInsight
 *                                cadence; days since the most recent
 *                                "What users told us" publish.
 *
 * Each metric is shown with its current value + the target from the
 * charter + a one-line interpretation. Where we already have time-
 * series data (audit-log timestamps, ChangeLog publishedAt), we
 * include a 30-day mini-trend. Where we don't, we say so explicitly
 * with a "not yet measured" badge rather than fabricating a number.
 *
 * Honesty over flattery: this page exists to make UX maturity
 * legible to anyone reading it, including a future contractor or
 * board member.
 */
export default async function AdminExperienceMetricsPage() {
  const session = await requireRole("admin").catch(() => null);
  if (!session) redirect("/dashboard");

  // ── Outcome 1 — trainee arrival latency ─────────────────────────
  // Median time from AccessRequest creation to handledAt for the
  // last 30 days.
  const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const handledRequests = await prisma.accessRequest.findMany({
    where: { handledAt: { not: null, gte: since30d } },
    select: { createdAt: true, handledAt: true },
  });
  const accessRequestLatencyHours = medianHoursBetween(
    handledRequests.map((r) => [r.createdAt, r.handledAt!] as const),
  );

  // Approval latency on Registration rows — symposium events
  // specifically.
  const recentApprovals = await prisma.registration.findMany({
    where: {
      approvedAt: { not: null, gte: since30d },
      registrationStatus: "confirmed",
    },
    select: { createdAt: true, approvedAt: true },
  });
  const registrationApprovalHours = medianHoursBetween(
    recentApprovals.map((r) => [r.createdAt, r.approvedAt!] as const),
  );

  // ── Outcome 2 — admin queue health ──────────────────────────────
  const [
    pendingRegistrations,
    pendingBookings,
    pendingAccessRequests,
    pendingRoleRequests,
    pendingCreditApps,
  ] = await Promise.all([
    prisma.registration.count({ where: { registrationStatus: "pending" } }),
    prisma.workshopBooking.count({ where: { status: "pending" } }),
    prisma.accessRequest.count({ where: { status: "pending" } }),
    prisma.roleChangeRequest.count({ where: { status: "pending" } }).catch(() => 0),
    prisma.creditApplication.count({ where: { status: "pending" } }).catch(() => 0),
  ]);
  const queueDepth =
    pendingRegistrations +
    pendingBookings +
    pendingAccessRequests +
    pendingRoleRequests +
    pendingCreditApps;

  // ── Outcome 3 — transparency cadence ────────────────────────────
  const [lastChangelog, lastInsight, insightsLast90d, changelogLast30d] =
    await Promise.all([
      prisma.changeLog.findFirst({
        orderBy: { publishedAt: "desc" },
        select: { publishedAt: true, title: true },
      }),
      prisma.researchInsight.findFirst({
        where: { publishedToChangelogAt: { not: null } },
        orderBy: { publishedToChangelogAt: "desc" },
        select: { period: true, publishedToChangelogAt: true },
      }),
      prisma.researchInsight.count({
        where: { createdAt: { gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) } },
      }),
      prisma.changeLog.count({
        where: { publishedAt: { gte: since30d } },
      }),
    ]);

  const daysSinceChangelog = lastChangelog
    ? Math.floor(
        (Date.now() - lastChangelog.publishedAt.getTime()) / (24 * 60 * 60 * 1000),
      )
    : null;
  const daysSinceInsight = lastInsight?.publishedToChangelogAt
    ? Math.floor(
        (Date.now() - lastInsight.publishedToChangelogAt.getTime()) /
          (24 * 60 * 60 * 1000),
      )
    : null;

  return (
    <div>
      <PageHero
        eyebrow={<><Gauge size={11} /> Admin · Design &amp; Research</>}
        title="EXPERIENCE metrics"
        description={(
          <>
          The measurable side of the three UX-charter outcomes. Targets come from{" "}
          <Link
            href="https://github.com/sesamemua/bhn-training-platform/blob/main/docs/ux/charter.md"
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand-700 font-semibold hover:underline inline-flex items-center gap-1"
          >
            docs/ux/charter.md <ExternalLink size={11} />
          </Link>
          . Values reflect the last 30 days unless noted; &quot;not yet measured&quot; means the signal exists in the schema but the instrumentation hasn&apos;t been wired yet.
        </>
        )}
      />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-6">
      {/* Outcome 1 ─────────────────────────────────────────────── */}
      <section className="rounded-2xl border border-line bg-card p-6 surface-shadow">
        <header className="mb-4">
          <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-subtle">
            Outcome 1
          </p>
          <h2 className="text-lg font-bold text-fg tracking-tight mt-1 inline-flex items-center gap-2">
            <Clock size={16} className="text-brand-600" />
            Trainee arrival → enrollment under 5 minutes
          </h2>
        </header>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <MetricTile
            label="Access-request handling time"
            value={
              accessRequestLatencyHours === null
                ? "—"
                : `${formatHours(accessRequestLatencyHours)}`
            }
            sub={
              accessRequestLatencyHours === null
                ? "no requests handled in last 30 days"
                : "median, last 30 days"
            }
            target="≤ 24 hours"
            status={
              accessRequestLatencyHours === null
                ? "neutral"
                : accessRequestLatencyHours <= 24
                  ? "good"
                  : accessRequestLatencyHours <= 48
                    ? "warn"
                    : "bad"
            }
            link={{ href: "/admin/access-requests", label: "Open queue" }}
          />
          <MetricTile
            label="Event-registration approval latency"
            value={
              registrationApprovalHours === null
                ? "—"
                : formatHours(registrationApprovalHours)
            }
            sub={
              registrationApprovalHours === null
                ? "no approvals in last 30 days"
                : "median, last 30 days"
            }
            target="≤ 24 hours"
            status={
              registrationApprovalHours === null
                ? "neutral"
                : registrationApprovalHours <= 24
                  ? "good"
                  : registrationApprovalHours <= 48
                    ? "warn"
                    : "bad"
            }
            link={{
              href: "/admin/events",
              label: "Open events admin",
            }}
          />
          <MetricTile
            label="Trainee in-session arrival time"
            value="not yet measured"
            sub="needs page_view → first enrollment funnel instrumentation"
            target="P75 ≤ 5 minutes"
            status="unmeasured"
          />
          <MetricTile
            label="Activated-account dropoff"
            value="not yet measured"
            sub="needs signup → first dashboard interaction tracking"
            target="≤ 10%"
            status="unmeasured"
          />
        </div>
      </section>

      {/* Outcome 2 ─────────────────────────────────────────────── */}
      <section className="rounded-2xl border border-line bg-card p-6 surface-shadow">
        <header className="mb-4">
          <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-subtle">
            Outcome 2
          </p>
          <h2 className="text-lg font-bold text-fg tracking-tight mt-1 inline-flex items-center gap-2">
            <Inbox size={16} className="text-brand-600" />
            Admin clears every pending item in ≤ 60 seconds
          </h2>
        </header>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <QueueTile label="Registrations" count={pendingRegistrations} href="/admin/events" />
          <QueueTile label="Workshop bookings" count={pendingBookings} href="/admin/events" />
          <QueueTile label="Access requests" count={pendingAccessRequests} href="/admin/access-requests" />
          <QueueTile label="Role requests" count={pendingRoleRequests} href="/admin/role-requests" />
          <QueueTile label="Credit apps" count={pendingCreditApps} href="/admin/credit-applications" />
        </div>
        <div className="mt-5 rounded-xl bg-elevated p-4">
          <p className="text-sm text-fg">
            <span className="font-bold font-mono tabular-nums text-2xl">{queueDepth}</span>{" "}
            <span className="text-muted">pending across all queues</span>
          </p>
          <p className="text-[11px] text-muted mt-1">
            Charter target: keep this under 20 during business hours. Per-item time-to-clear is captured in audit-log timestamps — instrument median next.
          </p>
        </div>
      </section>

      {/* Outcome 3 ─────────────────────────────────────────────── */}
      <section className="rounded-2xl border border-line bg-card p-6 surface-shadow">
        <header className="mb-4">
          <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-subtle">
            Outcome 3
          </p>
          <h2 className="text-lg font-bold text-fg tracking-tight mt-1 inline-flex items-center gap-2">
            <Megaphone size={16} className="text-brand-600" />
            Every change is legible to users within 24 hours
          </h2>
        </header>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <MetricTile
            label="Days since last changelog entry"
            value={daysSinceChangelog === null ? "—" : `${daysSinceChangelog}`}
            sub={lastChangelog?.title ?? "no changelog entries yet"}
            target="≤ 7 days"
            status={
              daysSinceChangelog === null
                ? "neutral"
                : daysSinceChangelog <= 7
                  ? "good"
                  : daysSinceChangelog <= 14
                    ? "warn"
                    : "bad"
            }
            link={{ href: "/changelog", label: "Open changelog" }}
          />
          <MetricTile
            label="Changelog cadence — last 30 days"
            value={`${changelogLast30d}`}
            sub="entries published"
            target="≥ 8 / month"
            status={changelogLast30d >= 8 ? "good" : changelogLast30d >= 4 ? "warn" : "bad"}
          />
          <MetricTile
            label="Days since last 'What users told us'"
            value={daysSinceInsight === null ? "never" : `${daysSinceInsight}`}
            sub={
              lastInsight
                ? `period ${lastInsight.period}`
                : "publish from /admin/insights"
            }
            target="≤ 35 days"
            status={
              daysSinceInsight === null
                ? "bad"
                : daysSinceInsight <= 35
                  ? "good"
                  : daysSinceInsight <= 60
                    ? "warn"
                    : "bad"
            }
            link={{ href: "/admin/insights", label: "Open insights" }}
          />
        </div>
        <p className="text-[11px] text-muted mt-4 leading-relaxed">
          {insightsLast90d > 0
            ? `${insightsLast90d} research insight${insightsLast90d === 1 ? "" : "s"} written in the last 90 days.`
            : "No research insights written yet. Start one at /admin/insights — the synthesis loop is what moves the platform from level-2 to level-3 ER&D maturity."}
        </p>
      </section>

      {/* Footer note ─────────────────────────────────────────────── */}
      <section className="rounded-2xl border border-dashed border-line bg-card p-5 text-sm leading-relaxed">
        <h3 className="font-bold text-fg mb-2 inline-flex items-center gap-2">
          <Activity size={14} className="text-brand-600" />
          What's missing
        </h3>
        <ul className="space-y-1.5 text-muted">
          <li>
            <ArrowUpRight size={11} className="inline-block text-brand-600 mr-1" />
            Funnel: time-to-first-enrollment (page_view → enroll). Will need
            stitching across the <code className="font-mono text-fg bg-elevated px-1 rounded">Event</code> table.
          </li>
          <li>
            <ArrowUpRight size={11} className="inline-block text-brand-600 mr-1" />
            Admin per-queue time-to-clear medians. Audit-log timestamps support
            this; the aggregation isn't yet wired.
          </li>
          <li>
            <ArrowUpRight size={11} className="inline-block text-brand-600 mr-1" />
            30-day sparklines per metric. Add when the data series is consistent
            enough to be useful (currently most signals are sparse for the
            single-tenant platform).
          </li>
        </ul>
      </section>
      </div>
    </div>
  );
}

/* ─── atoms ──────────────────────────────────────────────────── */

type MetricStatus = "good" | "warn" | "bad" | "neutral" | "unmeasured";

function MetricTile({
  label,
  value,
  sub,
  target,
  status,
  link,
}: {
  label: string;
  value: string;
  sub: string;
  target: string;
  status: MetricStatus;
  link?: { href: string; label: string };
}) {
  const tints: Record<MetricStatus, string> = {
    good: "ring-emerald-200 bg-emerald-50",
    warn: "ring-amber-200 bg-amber-50",
    bad: "ring-rose-200 bg-rose-50",
    neutral: "ring-line bg-card",
    unmeasured: "ring-line bg-elevated",
  };
  const dot: Record<MetricStatus, string> = {
    good: "bg-emerald-500",
    warn: "bg-amber-500",
    bad: "bg-rose-500",
    neutral: "bg-slate-300",
    unmeasured: "bg-slate-300",
  };
  return (
    <div className={`rounded-xl ring-1 ring-inset p-4 ${tints[status]}`}>
      <div className="flex items-center gap-2">
        <span className={`w-1.5 h-1.5 rounded-full ${dot[status]}`} />
        <p className="text-[10px] uppercase tracking-[0.18em] font-bold text-subtle">
          {label}
        </p>
      </div>
      <p className="text-2xl font-bold text-fg font-mono tabular-nums mt-1">
        {value}
      </p>
      <p className="text-[11px] text-muted mt-0.5">{sub}</p>
      <p className="text-[10px] text-subtle mt-2">
        Target: <span className="font-semibold">{target}</span>
      </p>
      {link && (
        <Link
          href={link.href}
          className="inline-flex items-center gap-1 text-[10px] font-semibold text-brand-700 hover:underline mt-2"
        >
          {link.label} <ExternalLink size={9} />
        </Link>
      )}
    </div>
  );
}

function QueueTile({
  label,
  count,
  href,
}: {
  label: string;
  count: number;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-xl border border-line bg-card p-4 hover:bg-elevated transition-colors block"
    >
      <p className="text-[10px] uppercase tracking-[0.18em] font-bold text-subtle">
        {label}
      </p>
      <p
        className={`text-2xl font-bold font-mono tabular-nums mt-1 ${count > 0 ? "text-violet-700" : "text-fg"}`}
      >
        {count}
      </p>
    </Link>
  );
}

function medianHoursBetween(pairs: ReadonlyArray<readonly [Date, Date]>): number | null {
  if (pairs.length === 0) return null;
  const hours = pairs
    .map(([a, b]) => (b.getTime() - a.getTime()) / (1000 * 60 * 60))
    .filter((h) => h >= 0)
    .sort((a, b) => a - b);
  if (hours.length === 0) return null;
  const mid = Math.floor(hours.length / 2);
  return hours.length % 2 === 0 ? (hours[mid - 1] + hours[mid]) / 2 : hours[mid];
}

function formatHours(h: number): string {
  if (h < 1) return `${Math.round(h * 60)} min`;
  if (h < 48) return `${h.toFixed(1)} hr`;
  return `${(h / 24).toFixed(1)} days`;
}
