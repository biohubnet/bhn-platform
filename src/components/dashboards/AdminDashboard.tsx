import Link from "next/link";
import {
  Users, BookOpen, GraduationCap, Layers, Coins,
  ShieldCheck, AlertCircle, ArrowRight,
  Sparkles, ClipboardList, UserCog, Building2,
  Activity, Clock, Briefcase, Ghost, GitFork, CheckCircle2,
  Zap, Eye, Inbox, Cpu, Rocket, FilePlus,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { CREDIT_GRANT_TTL_DAYS } from "@/lib/credits/expiry";
import { PageHero } from "@/components/ui/PageHero";

/**
 * Admin / superadmin dashboard.
 *
 * Redesign v2 (May 2026): the previous version solved the "what is
 * the admin trying to do?" problem (setup checklist, quick actions,
 * adaptive empty states) but the visual language was still a quilt
 * of independently-bordered tiles — too fragmented. This pass keeps
 * the same information architecture and rebuilds the surface as a
 * smaller number of large panels, with hairline dividers inside each
 * panel instead of borders around every cell. Three rules now:
 *
 *   1. Bigger gradient sections, not many small boxes.
 *   2. Hairline dividers inside panels, not borders around every
 *      cell. The eye should travel across a panel as one unit.
 *   3. Asymmetric weight — the hero element gets dominance, supporting
 *      elements stay quiet. Numbers in the metrics strip use a much
 *      bigger type ramp than before so the platform pulse reads at a
 *      glance, command-center style.
 *
 * Same data-fetching shape as v1 so nothing downstream changes.
 */
export async function AdminDashboard({
  user, role,
}: {
  user: { id: string; name: string | null };
  role: string;
}) {
  const firstName = user.name?.split(" ")[0] ?? "there";
  const isSuperAdmin = role === "superadmin";
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const since7d  = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [
    totalUsers, totalCourses, totalEnrollments, totalCertificates,
    new7dUsers, new24hEnrollments,
    pendingCreditApps, pendingRoleRequests, pendingPathwayApps,
    employerCount, employerInvitesPending,
    activePostings, totalApplications,
    demoWorkspaceCount, phantomCount,
    recentAudit,
    aiCalls7d,
  ] = await Promise.all([
    prisma.user.count({ where: { isActive: true, accountKind: "real" } }),
    prisma.course.count({ where: { status: "published" } }),
    prisma.enrollment.count(),
    prisma.certificate.count({ where: { revokedAt: null } }),
    prisma.user.count({ where: { createdAt: { gt: since7d }, accountKind: "real" } }),
    prisma.enrollment.count({ where: { enrolledAt: { gt: since24h } } }),
    prisma.creditApplication.count({ where: { status: "pending" } }).catch(() => 0),
    prisma.roleChangeRequest.count({ where: { status: "pending" } }).catch(() => 0),
    prisma.pathwayEnrollment.count({ where: { status: "pending" } }).catch(() => 0),
    prisma.user.count({ where: { role: "employer", accountKind: "real" } }),
    prisma.employerInvite.count({ where: { usedAt: null, expiresAt: { gt: new Date() } } }).catch(() => 0),
    prisma.internshipPosting.count({ where: { status: "active" } }).catch(() => 0),
    prisma.applicationStatus.count().catch(() => 0),
    prisma.user.count({ where: { accountKind: "demo" } }).catch(() => 0),
    prisma.user.count({ where: { accountKind: "phantom" } }).catch(() => 0),
    prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { actor: { select: { name: true, email: true } } },
    }).catch(() => []),
    isSuperAdmin
      ? prisma.aIInteraction.count({ where: { createdAt: { gt: since7d } } }).catch(() => 0)
      : Promise.resolve(0),
  ]);

  const totalPending = pendingCreditApps + pendingRoleRequests + pendingPathwayApps;

  const now = new Date();
  const horizon = (days: number) => new Date(now.getTime() + days * 86_400_000);
  const expiringWindow = async (days: number) => {
    const rows = await prisma.creditTransaction.findMany({
      where: {
        type: "credit",
        expiresAt: { not: null, gt: now, lte: horizon(days) },
        expiredAt: null,
        user: { accountKind: "real" },
      },
      select: { amount: true, expiredAmount: true, userId: true },
    }).catch(() => []);
    const credits = rows.reduce((sum, r) => sum + Math.max(0, r.amount - r.expiredAmount), 0);
    const users = new Set(rows.map((r) => r.userId)).size;
    return { credits, users };
  };
  const [expiring7, expiring30, expiring90] = await Promise.all([
    expiringWindow(7), expiringWindow(30), expiringWindow(90),
  ]);
  const anyExpiry = expiring7.credits + expiring30.credits + expiring90.credits > 0;

  // ── Setup checklist heuristics ─────────────────────────────────
  const checklist: Array<{
    id: string;
    done: boolean;
    label: string;
    detail: string;
    href: string;
    icon: React.ElementType;
  }> = [
    {
      id: "demo-workspace",
      done: demoWorkspaceCount > 0,
      label: "Spawn a demo workspace",
      detail: "Throwaway accounts that walk a prospective partner through the full platform.",
      href: "/admin/demo-workspaces",
      icon: Rocket,
    },
    {
      id: "invite-employer",
      done: employerCount > 0 || employerInvitesPending > 0,
      label: "Invite your first employer",
      detail: "Drop in their email, copy the link, send via your usual channel.",
      href: "/admin/employer-invites",
      icon: Building2,
    },
    {
      id: "first-posting",
      done: activePostings > 0,
      label: "Create the first posting",
      detail: "Paste a JD; the AI fills in the fields. Or seed demo postings from /employer/postings.",
      href: "/admin/internships/new",
      icon: Briefcase,
    },
    {
      id: "first-course",
      done: totalCourses > 0,
      label: "Publish at least one course",
      detail: "The training catalog is the backbone — even one course lets sign-ups try the LMS loop.",
      href: "/courses?from=instructor",
      icon: BookOpen,
    },
    {
      id: "talent-application",
      done: totalApplications > 0,
      label: "See talent flow through",
      detail: "Once a trainee submits the talent application, cards appear on /employer/applicants with AI match scores.",
      href: "/employer/applicants",
      icon: Inbox,
    },
  ];
  const checklistDone = checklist.filter((c) => c.done).length;
  const checklistOpen = checklist.length - checklistDone;
  const setupPct = Math.round((checklistDone / checklist.length) * 100);
  const showChecklist = checklistOpen > 0 && (totalUsers < 10 || activePostings === 0 || employerCount === 0);
  const nextChecklistItem = checklist.find((c) => !c.done);

  // Stats for the command-deck metric strip. Six entries; the layout
  // renders all six as hairline-separated columns. The "primary"
  // pair (Users + Pending) gets dominance via type-ramp.
  const metrics: Array<{
    label: string;
    value: number;
    help: string;
    emphasis?: boolean;
    tone: "amber" | "brand" | "muted";
  }> = [
    { label: "Pending",     value: totalPending,      help: "Approval queues", emphasis: true,  tone: totalPending > 0 ? "amber" : "muted" },
    { label: "Users",       value: totalUsers,        help: "Real accounts",   emphasis: true,  tone: "brand" },
    { label: "Employers",   value: employerCount,     help: `${employerInvitesPending} pending invite${employerInvitesPending === 1 ? "" : "s"}`, tone: "muted" },
    { label: "Postings",    value: activePostings,    help: "Active",          tone: "muted" },
    { label: "Enrolments",  value: totalEnrollments,  help: `+${new24hEnrollments} today`, tone: "muted" },
    { label: "Certificates", value: totalCertificates, help: "Lifetime",       tone: "muted" },
  ];

  // ── Spotlight (the focal element) ──────────────────────────────
  // One thing on the page should be obviously The Hero. We pick it
  // from a priority cascade:
  //   1. Pending approvals — there's work waiting; that's the focus.
  //   2. Setup incomplete — push them through the next milestone.
  //   3. Otherwise — "all systems go" with a forward-looking nudge
  //      toward Talent applicants (the operational nerve centre).
  const spotlight: {
    eyebrow: string;
    headline: string;
    detail: string;
    primary: { href: string; label: string };
    secondary?: { href: string; label: string };
    icon: React.ElementType;
    bigNumber?: string;
    bigNumberLabel?: string;
    tone: "amber" | "brand" | "emerald";
  } = totalPending > 0
    ? {
        eyebrow: "Most pressing",
        headline: `${totalPending} approval${totalPending === 1 ? "" : "s"} waiting on you`,
        detail: `Trainees across credits, role-change requests, and pathway enrolments are blocked until you triage. Open the queue — most rows take less than a minute.`,
        primary:   { href: "/admin/credit-applications", label: "Open the queue" },
        secondary: { href: "/admin/audit", label: "What happened recently" },
        icon: ClipboardList,
        bigNumber: totalPending.toLocaleString(),
        bigNumberLabel: "pending",
        tone: "amber",
      }
    : showChecklist && nextChecklistItem
      ? {
          eyebrow: `Setup · step ${checklistDone + 1} of ${checklist.length}`,
          headline: nextChecklistItem.label,
          detail: nextChecklistItem.detail,
          primary:   { href: nextChecklistItem.href, label: "Do this now" },
          secondary: { href: "/admin/demo-workspaces", label: "Or spin up a demo workspace" },
          icon: nextChecklistItem.icon,
          bigNumber: `${setupPct}%`,
          bigNumberLabel: "setup complete",
          tone: "brand",
        }
      : {
          eyebrow: "All systems go",
          headline: "Eyes on the talent pipeline",
          detail: "Queues are clear. The highest-leverage surface day-to-day is /employer/applicants — AI match scores, inline previews, team-private comments per candidate.",
          primary:   { href: "/employer/applicants", label: "Open talent applicants" },
          secondary: { href: "/admin/split-view", label: "View as a trainee" },
          icon: Inbox,
          bigNumber: totalUsers.toLocaleString(),
          bigNumberLabel: "active users",
          tone: "emerald",
        };

  return (
    <div className="space-y-6">
      {/* HERO — converted 2026-05-17 from a bespoke hero-mesh-brand
          band to the canonical PageHero so every dashboard surface
          uses one cinematic-DS shape. */}
      <PageHero
        eyebrow={<><ShieldCheck size={11} /> {isSuperAdmin ? "Superadmin" : "Admin"} desk</>}
        title={<>Hi, {firstName}.</>}
        description={(
          <>
            {totalPending > 0 ? (
              <>{totalPending} item{totalPending === 1 ? "" : "s"} waiting on you across credits, role requests, and pathway approvals.</>
            ) : showChecklist ? (
              <>{checklistOpen} setup step{checklistOpen === 1 ? "" : "s"} left to get the platform humming.</>
            ) : (
              "Nothing in the action queue. Platform is humming."
            )}
            {" "}
            {new7dUsers > 0 && (
              <span className="text-fg/70">{new7dUsers} new sign-up{new7dUsers === 1 ? "" : "s"} this week.</span>
            )}
          </>
        )}
        actions={(
          <>
            <Link
              href={totalPending > 0 ? "/admin/credit-applications" : showChecklist && nextChecklistItem ? nextChecklistItem.href : "/admin"}
              className="inline-flex items-center gap-1.5 bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs px-4 py-2 rounded-lg shadow-sm transition-colors"
            >
              {totalPending > 0 ? "Review queue" : showChecklist ? "Continue setup" : "Admin overview"} <ArrowRight size={12} />
            </Link>
            <Link
              href="/admin/split-view"
              className="inline-flex items-center gap-1.5 bg-card hover:bg-elevated border border-line text-fg text-xs font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              <Eye size={12} /> View as
            </Link>
          </>
        )}
      />

      {/* ── Spotlight ────────────────────────────────────────────────
          The page's focal element. Heavy ambient shadow + a radial-
          gradient "spotlight" backlight from upper-left and a softer
          counter-light from lower-right. Everything below this panel
          is intentionally lighter (no shadows, hairline borders) so
          this is the unambiguous hero. */}
      <SpotlightPanel s={spotlight} />

      {/* ── At-a-glance metric strip ─────────────────────────────────
          One large panel with subtle brand-tinted gradient. Six
          stat columns separated by hairlines — no individual borders.
          De-weighted (no shadow) so the spotlight above keeps the
          attention. */}
      <section className="relative overflow-hidden rounded-2xl border border-line bg-gradient-to-br from-brand-50/40 via-card to-card">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 divide-y divide-x divide-line/70 md:divide-y-0">
          {metrics.map((m, idx) => {
            // Re-add the bottom border for the first md row on mobile +
            // hide it on lg via the grid's auto behavior. Tailwind's
            // `divide-y` already handles vertical divisions; we lean
            // on it.
            const tones: Record<string, string> = {
              amber: "text-amber-700",
              brand: "text-brand-700",
              muted: "text-fg",
            };
            return (
              <div
                key={m.label}
                className={`px-5 py-4 ${idx >= 3 ? "lg:border-l lg:border-line/70" : ""}`}
              >
                <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-subtle">
                  {m.label}
                </p>
                <p className={`mt-1 font-bold tabular-nums leading-none ${m.emphasis ? "text-4xl" : "text-2xl"} ${tones[m.tone]}`}>
                  {m.value.toLocaleString()}
                </p>
                <p className="text-[11px] text-muted mt-1.5 truncate">{m.help}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Command Deck — Setup + Quick Actions inside ONE panel ───
          Lighter than the spotlight by design. */}
      <section className="rounded-2xl border border-line bg-gradient-to-br from-card via-card to-brand-50/30 overflow-hidden">
        <header className="flex items-end justify-between gap-3 flex-wrap px-6 pt-5 pb-4 border-b border-line/70">
          <div>
            <h2 className="text-lg font-bold text-fg tracking-tight inline-flex items-center gap-2">
              <Zap size={16} className="text-brand-600" />
              Command deck
            </h2>
            <p className="text-xs text-muted mt-0.5">
              {showChecklist
                ? "Bootstrap first, then the surfaces you'll reach for daily."
                : "The surfaces an admin opens most. Bookmark whichever you reach for daily."}
            </p>
          </div>
          {showChecklist && (
            <div className="flex items-center gap-3 shrink-0">
              <div className="w-32 h-1.5 bg-elevated rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-brand-500 to-brand-600 rounded-full transition-all"
                  style={{ width: `${setupPct}%` }}
                />
              </div>
              <p className="text-[11px] text-muted tabular-nums whitespace-nowrap">
                Setup {setupPct}% — {checklistDone} / {checklist.length}
              </p>
            </div>
          )}
        </header>

        <div className={`grid ${showChecklist ? "lg:grid-cols-[1.05fr_1.5fr]" : "grid-cols-1"} divide-y lg:divide-y-0 lg:divide-x divide-line/70`}>
          {showChecklist && (
            <SetupColumn checklist={checklist} />
          )}
          <QuickActionsList isSuperAdmin={isSuperAdmin} pending={totalPending} />
        </div>
      </section>

      {/* ── Approval queues ─────────────────────────────────────────
          Single panel with hairline-separated columns when non-zero;
          compact emerald-zen badge when fully clear. */}
      {totalPending > 0 ? (
        <section className="rounded-2xl border border-line bg-card surface-shadow overflow-hidden">
          <header className="px-5 pt-4 pb-3 border-b border-line/70 flex items-center justify-between gap-3">
            <h2 className="text-sm font-bold text-fg inline-flex items-center gap-2">
              <ClipboardList size={14} className="text-amber-600" />
              Approval queues
              <span className="text-[11px] font-bold text-amber-700 bg-amber-50 ring-1 ring-amber-200 rounded-full px-2 py-0.5 tabular-nums">
                {totalPending} pending
              </span>
            </h2>
            <p className="text-[11px] text-subtle">Tap any column to triage.</p>
          </header>
          <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-line/70">
            <QueueRow icon={Coins}   tone="amber"  label="Credit applications"  count={pendingCreditApps}   href="/admin/credit-applications" />
            <QueueRow icon={UserCog} tone="violet" label="Role-change requests" count={pendingRoleRequests} href="/admin/role-requests" />
            <QueueRow icon={Layers}  tone="brand"  label="Pathway enrolments"   count={pendingPathwayApps}  href="/admin/pathway-enrollments" />
          </div>
        </section>
      ) : (
        <div className="bg-emerald-50/60 border border-emerald-200 rounded-xl px-4 py-3 inline-flex items-center gap-2 text-sm">
          <CheckCircle2 size={14} className="text-emerald-700" />
          <span className="text-emerald-900 font-semibold">Approval queues are clear.</span>
          <span className="text-emerald-700/80 text-xs">Credit · Role · Pathway · 0 pending</span>
        </div>
      )}

      {/* ── Credit expiry (auto-hidden when nothing is expiring) ─── */}
      {anyExpiry && (
        <section className="rounded-2xl border border-line bg-gradient-to-br from-amber-50/30 via-card to-card overflow-hidden">
          <header className="px-5 pt-4 pb-3 border-b border-line/70 flex items-end justify-between gap-3 flex-wrap">
            <div>
              <h2 className="text-sm font-bold text-fg tracking-tight inline-flex items-center gap-2">
                <Clock size={14} className="text-amber-600" />
                Credit expiry · {CREDIT_GRANT_TTL_DAYS}-day TTL
              </h2>
              <p className="text-[11px] text-muted mt-0.5 leading-snug max-w-2xl">
                Daily sweep + 90/30/7-day warnings handle the runs automatically. This strip is the live look-ahead.
              </p>
            </div>
            <Link
              href="/api/admin/credits/sweep"
              prefetch={false}
              className="text-[11px] font-semibold text-muted hover:text-fg inline-flex items-center gap-1"
              title="Trigger the sweep manually (cron does this daily anyway)"
            >
              Run sweep now <ArrowRight size={11} />
            </Link>
          </header>
          <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-line/70">
            <ExpiryColumn tone="rose"  days={7}  credits={expiring7.credits}  users={expiring7.users} />
            <ExpiryColumn tone="amber" days={30} credits={expiring30.credits} users={expiring30.users} />
            <ExpiryColumn tone="brand" days={90} credits={expiring90.credits} users={expiring90.users} />
          </div>
        </section>
      )}

      {/* ── Pulse + Activity ───────────────────────────────────────
          Two-up: live pulse (left) + recent activity feed (right) in
          a single 2-column grid panel. Hairline divider between.
          The asymmetry — pulse takes 1 col, activity takes 2 — keeps
          the eye on the audit feed which is the more-scanned surface. */}
      <section className="grid lg:grid-cols-[1fr_2fr] gap-3">
        <div className="rounded-2xl border border-line bg-gradient-to-br from-brand-50/30 via-card to-card overflow-hidden">
          <header className="px-5 pt-4 pb-3 border-b border-line/70">
            <h2 className="text-sm font-bold text-fg inline-flex items-center gap-2">
              <Activity size={14} className="text-brand-600" />
              Live pulse
            </h2>
            <p className="text-[11px] text-muted mt-0.5">Beats from the last day / week.</p>
          </header>
          <ul className="divide-y divide-line/70">
            <PulseRow icon={GraduationCap} label="Enrolments today"   value={new24hEnrollments} help="Last 24 hours" />
            <PulseRow icon={Sparkles}      label="New sign-ups (7d)"  value={new7dUsers}        help="Real accounts only" />
            {isSuperAdmin ? (
              <PulseRow icon={Cpu}   label="AI calls (7d)"     value={aiCalls7d} help="Cloudflare + Gemini combined" href="/admin/analytics" />
            ) : (
              <PulseRow icon={Ghost} label="Phantom users"     value={phantomCount} help="Throwaway test accounts"     href="/admin/phantom-users" />
            )}
          </ul>
        </div>

        <div className="rounded-2xl border border-line bg-card overflow-hidden">
          <header className="px-5 pt-4 pb-3 border-b border-line/70 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-fg inline-flex items-center gap-2">
                <ClipboardList size={14} className="text-brand-600" />
                Recent activity
              </h2>
              <p className="text-[11px] text-muted mt-0.5">Last five audit-log entries</p>
            </div>
            <Link href="/admin/audit" className="text-xs font-medium text-brand-700 hover:underline inline-flex items-center gap-1">
              See all <ArrowRight size={11} />
            </Link>
          </header>
          {recentAudit.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-muted">No audit entries yet.</div>
          ) : (
            <ul className="divide-y divide-line/70">
              {recentAudit.map((a) => (
                <li key={a.id} className="flex items-center gap-3 px-5 py-3 hover:bg-elevated/30 transition-colors">
                  <div className="w-6 h-6 rounded-md bg-elevated text-subtle flex items-center justify-center shrink-0">
                    <ClipboardList size={12} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-fg truncate">{a.action}</p>
                    <p className="text-xs text-muted truncate">
                      {a.actor?.name ?? a.actor?.email ?? "system"}
                      {a.targetType && ` · ${a.targetType}`}
                    </p>
                  </div>
                  <p className="text-[11px] text-subtle shrink-0 tabular-nums">
                    {new Date(a.createdAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {isSuperAdmin && (
        <div className="bg-elevated/40 border border-dashed border-line rounded-xl px-4 py-3 flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-card-solid border border-line text-brand-600 flex items-center justify-center shrink-0">
            <ShieldCheck size={14} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-fg">Superadmin shortcuts</p>
            <p className="text-xs text-muted mt-0.5 leading-relaxed">
              <Link href="/admin/settings" className="text-brand-700 hover:underline">Platform settings</Link> ·
              {" "}<Link href="/admin/matching-config" className="text-brand-700 hover:underline">AI matching engine</Link> ·
              {" "}<Link href="/admin/lti" className="text-brand-700 hover:underline">LTI</Link> ·
              {" "}<Link href="/admin/course-filters" className="text-brand-700 hover:underline">Course filter options</Link> ·
              {" "}<Link href="/admin/security" className="text-brand-700 hover:underline">Security policies</Link> ·
              {" "}<Link href="/admin/system-status" className="text-brand-700 hover:underline">System status (build SHA)</Link>.
            </p>
          </div>
          <AlertCircle size={13} className="text-subtle shrink-0 mt-1" />
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────

/** The page's single focal element.
 *
 *  Stagecraft this panel uses:
 *    • Two layered radial-gradient "spotlights" — a brand-tinted key
 *      light from the upper-left, a softer counter-light from lower-
 *      right. They sit absolute-positioned over a near-white card so
 *      the panel reads as if light is falling on it.
 *    • Large ambient drop shadow — wide blur + far offset so the panel
 *      lifts off the page (no other panel has this much shadow).
 *    • A big tone-coloured number on the right side mirroring whatever
 *      the spotlight is telling the admin to act on (count of pending
 *      approvals, % setup complete, active-user count).
 *    • An accent ring on the icon plus a subtle glow halo behind it to
 *      reinforce the "this is the thing" hierarchy.
 *
 *  Use sparingly: only one SpotlightPanel per page. Anything else
 *  reading at the same visual weight defeats the focal hierarchy.
 */
function SpotlightPanel({
  s,
}: {
  s: {
    eyebrow: string;
    headline: string;
    detail: string;
    primary: { href: string; label: string };
    secondary?: { href: string; label: string };
    icon: React.ElementType;
    bigNumber?: string;
    bigNumberLabel?: string;
    tone: "amber" | "brand" | "emerald";
  };
}) {
  // Tone drives the icon chip, the eyebrow colour, the big number,
  // and the key-light tint. Centralised here so the cascade is
  // visually coherent.
  const toneCfg: Record<
    typeof s.tone,
    {
      eyebrow: string;
      chip: string;
      bigNumber: string;
      keyLight: string; // CSS for the upper-left radial gradient
      iconHalo: string;  // glow ring behind the icon
    }
  > = {
    amber: {
      eyebrow: "text-amber-700",
      chip: "from-amber-400 to-amber-600 shadow-amber-500/40",
      bigNumber: "text-amber-700",
      keyLight: "radial-gradient(ellipse 80% 70% at 18% 22%, rgba(245, 158, 11, 0.22), transparent 60%)",
      iconHalo: "bg-amber-400/40",
    },
    brand: {
      eyebrow: "text-brand-700",
      chip: "from-brand-500 to-brand-700 shadow-brand-600/40",
      bigNumber: "text-brand-700",
      keyLight: "radial-gradient(ellipse 80% 70% at 18% 22%, rgba(94, 143, 247, 0.22), transparent 60%)",
      iconHalo: "bg-brand-500/40",
    },
    emerald: {
      eyebrow: "text-emerald-700",
      chip: "from-emerald-500 to-emerald-700 shadow-emerald-600/40",
      bigNumber: "text-emerald-700",
      keyLight: "radial-gradient(ellipse 80% 70% at 18% 22%, rgba(16, 185, 129, 0.22), transparent 60%)",
      iconHalo: "bg-emerald-400/40",
    },
  };
  const tc = toneCfg[s.tone];
  const Icon = s.icon;
  return (
    <section
      className="relative overflow-hidden rounded-3xl border border-line bg-card"
      style={{
        boxShadow:
          "0 40px 80px -28px rgba(15, 23, 42, 0.28), 0 18px 36px -12px rgba(15, 23, 42, 0.12)",
      }}
    >
      {/* Layered spotlight gradients. Pointer-events-none so clicks
          fall through to the content beneath. */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: tc.keyLight }}
        aria-hidden
      />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 60% 80% at 92% 92%, rgba(168, 85, 247, 0.12), transparent 65%)",
        }}
        aria-hidden
      />
      {/* Subtle vignette around the edges so the centre reads as
          "lit" relative to the panel border. */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 100% 100% at 50% 50%, transparent 55%, rgba(15, 23, 42, 0.05) 100%)",
        }}
        aria-hidden
      />

      <div className="relative px-7 py-8 md:px-10 md:py-9">
        <div className="flex items-start gap-6 md:gap-8 flex-wrap">
          {/* Icon block — bigger than anywhere else on the page, with
              a halo glow behind it so the lit-by-spotlight reading
              holds even on the lighter themes. */}
          <div className="relative shrink-0">
            <div
              className={`absolute -inset-2 rounded-3xl ${tc.iconHalo} blur-2xl opacity-70`}
              aria-hidden
            />
            <div
              className={`relative w-16 h-16 md:w-20 md:h-20 rounded-3xl bg-gradient-to-br ${tc.chip} text-white flex items-center justify-center shadow-2xl ring-1 ring-white/40`}
            >
              <Icon size={32} strokeWidth={2} />
            </div>
          </div>

          {/* Headline + body + CTAs */}
          <div className="flex-1 min-w-0">
            <p className={`text-[10px] uppercase tracking-[0.28em] font-bold ${tc.eyebrow}`}>
              {s.eyebrow}
            </p>
            <h2 className="text-2xl md:text-3xl font-bold text-fg mt-1.5 tracking-tight leading-tight">
              {s.headline}
            </h2>
            <p className="text-sm text-muted mt-2 max-w-2xl leading-relaxed">
              {s.detail}
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2">
              <Link
                href={s.primary.href}
                className={`inline-flex items-center gap-2 bg-gradient-to-br ${tc.chip} text-white font-semibold text-sm px-5 py-2.5 rounded-xl shadow-lg ring-1 ring-white/30 transition-all hover:-translate-y-0.5 hover:shadow-xl`}
              >
                {s.primary.label} <ArrowRight size={14} />
              </Link>
              {s.secondary && (
                <Link
                  href={s.secondary.href}
                  className="text-sm font-medium text-muted hover:text-fg inline-flex items-center gap-1"
                >
                  {s.secondary.label} <ArrowRight size={12} className="opacity-60" />
                </Link>
              )}
            </div>
          </div>

          {/* Big tone-coloured KPI on the right — visually echoes
              the headline so the eye lands in two places: copy on
              the left, scale on the right. Drops to the bottom on
              narrow viewports via flex-wrap above. */}
          {s.bigNumber && (
            <div className="ml-auto text-right shrink-0 self-stretch flex flex-col justify-center">
              <p className={`text-5xl md:text-6xl font-black tabular-nums leading-none tracking-tight ${tc.bigNumber}`}>
                {s.bigNumber}
              </p>
              <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-subtle mt-2">
                {s.bigNumberLabel}
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}


/** Vertical setup list — numbered steps, hairline-divided rows, all
 *  inside the Command Deck. No individual borders per row — the panel
 *  border is the only one. */
function SetupColumn({
  checklist,
}: {
  checklist: Array<{
    id: string;
    done: boolean;
    label: string;
    detail: string;
    href: string;
    icon: React.ElementType;
  }>;
}) {
  return (
    <div>
      <div className="px-6 pt-5 pb-2">
        <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-subtle">
          <Rocket size={10} className="inline -mt-0.5 mr-1 text-brand-600" />
          Get airborne
        </p>
        <p className="text-[11px] text-muted mt-1">
          Five milestones every BHN deployment needs in place before real trainees + employers can self-serve.
        </p>
      </div>
      <ul className="divide-y divide-line/70 border-t border-line/70">
        {checklist.map((c, idx) => {
          const Icon = c.icon;
          return (
            <li key={c.id}>
              <Link
                href={c.href}
                className={`flex items-start gap-3 px-6 py-3.5 group transition-colors ${
                  c.done ? "bg-emerald-50/30" : "hover:bg-elevated/40"
                }`}
              >
                <span className={`mt-0.5 w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-[11px] font-bold tabular-nums ${
                  c.done
                    ? "bg-emerald-500 text-white"
                    : "bg-elevated text-fg ring-1 ring-line group-hover:bg-brand-50 group-hover:text-brand-700 group-hover:ring-brand-200 transition-colors"
                }`}>
                  {c.done ? <CheckCircle2 size={14} /> : idx + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold leading-tight inline-flex items-center gap-1.5 ${
                    c.done ? "text-emerald-900 line-through decoration-emerald-400/40" : "text-fg"
                  }`}>
                    <Icon size={12} className={c.done ? "text-emerald-700" : "text-subtle"} />
                    {c.label}
                  </p>
                  <p className="text-[11px] text-muted leading-snug mt-0.5">{c.detail}</p>
                </div>
                {!c.done && (
                  <ArrowRight size={13} className="text-subtle group-hover:text-brand-700 transition-colors mt-1 shrink-0" />
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Quick-actions list — single panel column, hairline-divided rows.
 *  Two columns at desktop, single column on mobile. Replaces the
 *  8-tile grid that read as fragmented. */
function QuickActionsList({
  isSuperAdmin, pending,
}: {
  isSuperAdmin: boolean;
  pending: number;
}) {
  const actions = QUICK_ACTIONS(isSuperAdmin, pending);
  return (
    <div>
      <div className="px-6 pt-5 pb-2">
        <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-subtle">
          <Zap size={10} className="inline -mt-0.5 mr-1 text-brand-600" />
          Daily reach
        </p>
        <p className="text-[11px] text-muted mt-1">
          Eight surfaces an admin opens most. Pinned here so they&apos;re always one click away.
        </p>
      </div>
      <ul className="grid md:grid-cols-2 border-t border-line/70 divide-y md:divide-y-0 divide-line/70">
        {actions.map((a, idx) => {
          const Icon = a.icon;
          // Add a vertical divider between the two columns at md+.
          // Bottom border on every row up to (but not) the last row of
          // each column for the mobile collapsed layout.
          const isRightCol = idx % 2 === 1;
          const isLastRowLeft = idx === actions.length - 2;
          const isLastRowRight = idx === actions.length - 1;
          return (
            <li
              key={a.href}
              className={`${isRightCol ? "md:border-l md:border-line/70" : ""} ${
                !isLastRowLeft && !isLastRowRight ? "md:border-b md:border-line/70" : ""
              }`}
            >
              <Link
                href={a.href}
                className="flex items-center gap-3 px-6 py-4 group hover:bg-elevated/40 transition-colors relative"
              >
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${a.tone} text-white flex items-center justify-center shadow-md shrink-0 transition-transform group-hover:scale-105`}>
                  <Icon size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-fg leading-tight group-hover:text-brand-700 transition-colors">
                    {a.label}
                  </p>
                  <p className="text-[11px] text-muted mt-0.5 leading-snug truncate">{a.help}</p>
                </div>
                {a.badge !== undefined && a.badge > 0 && (
                  <span className="inline-flex items-center justify-center min-w-[1.4rem] h-5 px-1.5 rounded-full bg-rose-500 text-white text-[10px] font-bold tabular-nums shrink-0">
                    {a.badge}
                  </span>
                )}
                <ArrowRight size={13} className="text-subtle group-hover:text-brand-700 group-hover:translate-x-0.5 transition-all shrink-0" />
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function QUICK_ACTIONS(isSuperAdmin: boolean, pending: number): Array<{
  href: string;
  label: string;
  help: string;
  icon: React.ElementType;
  tone: string;
  badge?: number;
}> {
  return [
    { href: "/admin/demo-workspaces",  label: "Demo workspaces", help: "Spin up a throwaway end-to-end test",  icon: Rocket,    tone: "from-violet-500 to-violet-700 shadow-violet-600/20" },
    { href: "/admin/employer-invites", label: "Invite employer", help: "Generate an HR-onboarding link",        icon: Building2, tone: "from-amber-400 to-amber-600 shadow-amber-500/20" },
    { href: "/admin/internships/new",  label: "New posting",     help: "AI fills the fields from a JD paste",   icon: FilePlus,  tone: "from-brand-500 to-brand-700 shadow-brand-600/20" },
    { href: "/employer/applicants",    label: "Talent applicants", help: "Match scores · previews · comments",  icon: Inbox,     tone: "from-emerald-500 to-emerald-700 shadow-emerald-600/20" },
    { href: "/admin/phantom-users",    label: "Phantom users",   help: "Throwaway accounts for batch testing",  icon: Ghost,     tone: "from-fuchsia-500 to-fuchsia-700 shadow-fuchsia-600/20" },
    { href: "/admin/split-view",       label: "View as",         help: "Walk every role's experience",          icon: GitFork,   tone: "from-sky-500 to-sky-700 shadow-sky-600/20" },
    { href: "/admin/users",            label: "Users",           help: "Search, edit, deactivate",              icon: Users,     tone: "from-brand-500 to-brand-700 shadow-brand-600/20" },
    {
      href:  isSuperAdmin ? "/admin/system-status" : "/admin/audit",
      label: isSuperAdmin ? "System status"        : "Audit log",
      help:  isSuperAdmin ? "DB · AI · security · build SHA" : "Every state change, every actor",
      icon:  isSuperAdmin ? Activity : ShieldCheck,
      tone:  "from-slate-500 to-slate-700 shadow-slate-600/20",
      badge: pending > 0 ? pending : undefined,
    },
  ];
}

/** Hairline-separated row for the live pulse panel. No individual
 *  border per cell — the parent panel owns the frame. */
function PulseRow({
  icon: Icon, label, value, help, href,
}: {
  icon: React.ElementType;
  label: string;
  value: number | string;
  help?: string;
  href?: string;
}) {
  const inner = (
    <div className="flex items-center gap-3 px-5 py-3.5 group hover:bg-elevated/30 transition-colors">
      <div className="w-9 h-9 rounded-lg bg-elevated text-brand-600 border border-line flex items-center justify-center shrink-0">
        <Icon size={15} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] uppercase tracking-[0.22em] font-semibold text-subtle">{label}</p>
        {help && <p className="text-[11px] text-muted mt-0.5">{help}</p>}
      </div>
      <p className="text-2xl font-bold text-fg tabular-nums leading-none shrink-0">{value}</p>
    </div>
  );
  return href ? <li><Link href={href} className="block">{inner}</Link></li> : <li>{inner}</li>;
}

/** Column inside the Credit-expiry panel. Hairline-separated, no
 *  individual border per cell. */
function ExpiryColumn({
  tone, days, credits, users,
}: {
  tone: "rose" | "amber" | "brand";
  days: number;
  credits: number;
  users: number;
}) {
  const toneCls: Record<string, string> = {
    rose:  "text-rose-700",
    amber: "text-amber-700",
    brand: "text-brand-700",
  };
  const heading =
    days === 7 ? "Last call (≤ 7 days)"
    : days === 30 ? "Expiring soon (≤ 30 days)"
    : "Within 90 days";
  return (
    <div className="px-5 py-4">
      <p className={`text-[10px] uppercase tracking-[0.22em] font-bold ${toneCls[tone]}`}>{heading}</p>
      <p className="text-3xl font-bold text-fg mt-1.5 tabular-nums leading-none">
        {credits.toLocaleString()}
        <span className="text-xs font-semibold text-muted ml-1.5">credits</span>
      </p>
      <p className="text-[11px] text-muted mt-2">
        Across {users.toLocaleString()} trainee{users === 1 ? "" : "s"}
      </p>
    </div>
  );
}

/** Column inside the Approval-queues panel. Same hairline-divided
 *  pattern; the icon-coloured chip is the only colour cue. */
function QueueRow({
  icon: Icon, tone, label, count, href,
}: {
  icon: React.ElementType;
  tone: "brand" | "amber" | "violet";
  label: string;
  count: number;
  href: string;
}) {
  const colours: Record<string, string> = {
    brand:  "bg-brand-50 text-brand-700",
    amber:  "bg-amber-50 text-amber-700",
    violet: "bg-violet-50 text-violet-700",
  };
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 px-5 py-4 hover:bg-elevated/30 transition-colors"
    >
      <div className={`w-10 h-10 rounded-lg ${colours[tone]} flex items-center justify-center shrink-0`}>
        <Icon size={17} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] uppercase tracking-[0.22em] font-semibold text-subtle">Pending</p>
        <p className="text-sm font-semibold text-fg leading-tight mt-0.5">{label}</p>
      </div>
      <p className="text-2xl font-bold text-fg tabular-nums leading-none shrink-0">{count}</p>
      <ArrowRight size={13} className="text-subtle group-hover:text-brand-700 group-hover:translate-x-0.5 transition-all shrink-0" />
    </Link>
  );
}
