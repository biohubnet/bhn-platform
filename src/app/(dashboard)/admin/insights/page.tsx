import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Lightbulb, ExternalLink, MessageSquare, Palette, UserPlus, Activity, BookOpen,
} from "lucide-react";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { InsightEditor } from "@/components/admin/insights/InsightEditor";

/**
 * /admin/insights — research synthesis surface.
 *
 * The platform already captures plenty of user signal — theme votes,
 * theme proposals, exit-survey responses, access requests, audit-log
 * patterns. Signals without synthesis stay at level-2 ER&D maturity
 * (Forrester). This page exists to close that gap: one admin reads
 * the period's signals here, writes a 1–3 paragraph synthesis note,
 * and optionally publishes it as a ChangeLog entry so the loop
 * closes back to users.
 *
 * Layout
 *   • Top: the current period's note (editable; auto-saves).
 *   • Right column: signal feeds — theme votes, recent feedback,
 *     access requests, theme proposals — each with the freshest 5
 *     rows + a link to the full source.
 *   • Bottom: prior periods (immutable history).
 *
 * The synthesis row maps 1:1 to a `period` key (e.g. "2026-05",
 * "release-262f39c"). Picking the period is admin-editable but
 * defaults to the current calendar month.
 */
export default async function AdminInsightsPage() {
  const session = await requireRole("admin").catch(() => null);
  if (!session) redirect("/dashboard");

  const now = new Date();
  const currentPeriod = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;

  // Per-period synthesis row (may not exist yet).
  const current = await prisma.researchInsight.findUnique({
    where: { period: currentPeriod },
    select: {
      id: true,
      period: true,
      body: true,
      publishedToChangelogAt: true,
      publishedChangelogId: true,
      updatedAt: true,
    },
  });

  // Signal feeds — each query intentionally tiny so the page stays
  // fast. Admin clicks through to the full source for depth.
  const [
    topThemeVotes,
    pendingProposals,
    recentFeedback,
    pendingAccessReq,
    pendingRegistrations,
    pendingWorkshopBookings,
    priorInsights,
  ] = await Promise.all([
    prisma.themeVote.groupBy({
      by: ["themeId"],
      _count: { _all: true },
      orderBy: { _count: { themeId: "desc" } },
      take: 5,
    }),
    prisma.themeProposal.findMany({
      where: { status: { in: ["pending", "under_review"] } },
      select: { id: true, title: true, status: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.poolExitFeedback.findMany({
      select: {
        id: true,
        npsScore: true,
        reason: true,
        additionalComments: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    }).catch(() => []),
    prisma.accessRequest.findMany({
      where: { status: "pending" },
      select: { id: true, kind: true, email: true, company: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.registration.count({ where: { registrationStatus: "pending" } }),
    prisma.workshopBooking.count({ where: { status: "pending" } }),
    prisma.researchInsight.findMany({
      where: { period: { not: currentPeriod } },
      select: {
        id: true,
        period: true,
        body: true,
        publishedToChangelogAt: true,
        updatedAt: true,
      },
      orderBy: { period: "desc" },
      take: 6,
    }),
  ]);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <header>
        <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-subtle">
          Admin · Design &amp; Research
        </p>
        <h1 className="text-2xl sm:text-3xl font-bold text-fg mt-1 tracking-tight inline-flex items-center gap-2">
          <Lightbulb size={22} className="text-brand-600" />
          Insights
        </h1>
        <p className="text-sm text-muted mt-2 max-w-2xl leading-relaxed">
          Read the period's signals on the right, write a 1–3 paragraph
          "what users told us" note on the left, optionally publish to
          the changelog so the loop closes back to users. This is how
          we keep the research signal honest — see the UX charter,
          outcome 3.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Left column: editor + history ── */}
        <div className="lg:col-span-2 space-y-6">
          <InsightEditor
            initialPeriod={current?.period ?? currentPeriod}
            initialBody={current?.body ?? ""}
            initialUpdatedAt={current?.updatedAt.toISOString() ?? null}
            initialPublishedAt={current?.publishedToChangelogAt?.toISOString() ?? null}
          />

          {priorInsights.length > 0 && (
            <section className="rounded-2xl border border-line bg-card p-5 surface-shadow">
              <h2 className="text-sm font-bold text-fg mb-1 inline-flex items-center gap-2">
                <BookOpen size={14} className="text-brand-600" />
                Prior periods
              </h2>
              <p className="text-xs text-muted mb-4">
                Immutable history of past synthesis. Click any entry to
                view; editing requires reopening that period's row on
                the editor above.
              </p>
              <ul className="divide-y divide-line">
                {priorInsights.map((p) => (
                  <li key={p.id} className="py-3">
                    <p className="text-[10px] font-mono font-bold tracking-wider text-subtle">
                      {p.period}
                      {p.publishedToChangelogAt && (
                        <span className="ml-2 inline-flex items-center text-emerald-700 normal-case font-semibold tracking-normal">
                          · Published to changelog
                        </span>
                      )}
                    </p>
                    <p className="text-sm text-fg mt-1 line-clamp-3 leading-snug whitespace-pre-line">
                      {p.body}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        {/* ── Right column: signal feeds ── */}
        <aside className="space-y-4">
          <SignalCard
            icon={Palette}
            title="Top theme votes"
            href="/themes"
            empty="No votes yet."
          >
            {topThemeVotes.length === 0 ? null : (
              <ul className="space-y-1.5">
                {topThemeVotes.map((v) => (
                  <li key={v.themeId} className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-fg capitalize">{v.themeId}</span>
                    <span className="font-mono tabular-nums text-muted">{v._count._all}</span>
                  </li>
                ))}
              </ul>
            )}
          </SignalCard>

          <SignalCard
            icon={Palette}
            title="Theme proposals — open"
            href="/admin/theme-proposals"
            empty="No proposals waiting review."
          >
            {pendingProposals.length === 0 ? null : (
              <ul className="space-y-1.5">
                {pendingProposals.map((p) => (
                  <li key={p.id} className="text-xs">
                    <p className="font-semibold text-fg leading-tight">{p.title}</p>
                    <p className="text-[10px] text-subtle">
                      {p.status} · {timeAgo(p.createdAt)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </SignalCard>

          <SignalCard
            icon={MessageSquare}
            title="Recent exit-survey responses"
            href="/admin/feedback"
            empty="No exit-survey responses yet."
          >
            {recentFeedback.length === 0 ? null : (
              <ul className="space-y-2">
                {recentFeedback.map((f) => (
                  <li key={f.id} className="text-xs">
                    <p className="font-semibold text-fg">
                      NPS {f.npsScore ?? "—"} · {f.reason ?? "no reason given"}
                    </p>
                    {f.additionalComments && (
                      <p className="text-muted leading-snug line-clamp-2 mt-0.5">
                        {f.additionalComments}
                      </p>
                    )}
                    <p className="text-[10px] text-subtle mt-0.5">
                      {timeAgo(f.createdAt)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </SignalCard>

          <SignalCard
            icon={UserPlus}
            title="Access requests — pending"
            href="/admin/access-requests"
            empty="No pending access requests."
          >
            {pendingAccessReq.length === 0 ? null : (
              <ul className="space-y-1.5">
                {pendingAccessReq.map((r) => (
                  <li key={r.id} className="text-xs">
                    <p className="font-semibold text-fg leading-tight">
                      {r.email}
                      <span className="ml-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-subtle">
                        {r.kind}
                      </span>
                    </p>
                    {r.company && (
                      <p className="text-[10px] text-muted">{r.company}</p>
                    )}
                    <p className="text-[10px] text-subtle">{timeAgo(r.createdAt)}</p>
                  </li>
                ))}
              </ul>
            )}
          </SignalCard>

          <SignalCard
            icon={Activity}
            title="Event queue health"
            href="/admin/events"
            empty="Queue is empty."
          >
            <ul className="space-y-1.5 text-xs">
              <li className="flex items-center justify-between">
                <span className="text-fg font-semibold">Registrations pending</span>
                <span className="font-mono tabular-nums text-violet-700">
                  {pendingRegistrations}
                </span>
              </li>
              <li className="flex items-center justify-between">
                <span className="text-fg font-semibold">Workshop bookings pending</span>
                <span className="font-mono tabular-nums text-violet-700">
                  {pendingWorkshopBookings}
                </span>
              </li>
            </ul>
          </SignalCard>
        </aside>
      </div>
    </div>
  );
}

function SignalCard({
  icon: Icon, title, href, empty, children,
}: {
  icon: React.ElementType;
  title: string;
  href: string;
  empty: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-line bg-card p-4 surface-shadow">
      <header className="flex items-center justify-between gap-2 mb-3">
        <h3 className="text-[11px] font-bold uppercase tracking-[0.18em] text-subtle inline-flex items-center gap-1.5">
          <Icon size={11} className="text-brand-600" />
          {title}
        </h3>
        <Link
          href={href}
          className="text-[10px] text-muted hover:text-fg inline-flex items-center gap-0.5"
        >
          Open <ExternalLink size={9} />
        </Link>
      </header>
      {children ?? (
        <p className="text-xs text-subtle italic">{empty}</p>
      )}
    </section>
  );
}

function timeAgo(d: Date): string {
  const seconds = Math.floor((Date.now() - d.getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}
