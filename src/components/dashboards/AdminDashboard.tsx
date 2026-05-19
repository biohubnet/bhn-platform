import Link from "next/link";
import {
  Users, BookOpen, GraduationCap, Layers, Coins,
  ShieldCheck, ArrowRight,
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
  user, role, committeeBadge,
}: {
  user: { id: string; name: string | null };
  role: string;
  /** Optional content rendered immediately AFTER the hero — used by
   *  the dashboard page to inject CommitteeBadgeStrip without
   *  pushing the editorial hero off the top of the page. */
  committeeBadge?: React.ReactNode;
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

      {/* Committee badge — slotted in by the page wrapper. Renders
          immediately after the hero so the platform "hero is at the
          top" rule is preserved. */}
      {committeeBadge}

      {/* ── Spotlight ────────────────────────────────────────────────
          The page's focal element. Heavy ambient shadow + a radial-
          gradient "spotlight" backlight from upper-left and a softer
          counter-light from lower-right. Everything below this panel
          is intentionally lighter (no shadows, hairline borders) so
          this is the unambiguous hero. */}
      <SpotlightPanel s={spotlight} />

      {/* ────────────────────────────────────────────────────────────
          MID-LINE EDITORIAL LAYOUT.
          Below the SpotlightPanel, a continuous vertical hairline
          runs down the centre of the dashboard. Sections sit on
          alternating sides of the line; rows are separated by
          horizontal hairlines. The line is the spine, content
          branches off it. Rounded corners only on the spotlight
          above — everything here is line + gradient. */}
      <div className="relative mt-7">
        {/* Vertical midline — continuous, full-height. Hidden
            below lg where the grid collapses to a single column
            and the midline metaphor no longer applies. */}
        <div
          aria-hidden
          className="absolute top-0 bottom-0 left-1/2 w-px bg-line/60 -translate-x-1/2 hidden lg:block"
        />

        <div className="divide-y divide-line/70">

          {/* Row 1: At-a-glance (LEFT) | Setup checklist (RIGHT) */}
          <MidlineRow
            left={(
              <div>
                <SectionEyebrow icon={Activity}>At-a-glance</SectionEyebrow>
                <SectionAccent />
                <div className="mt-4 grid grid-cols-2 gap-y-4 gap-x-5">
                  {metrics.map((m) => {
                    const tones: Record<string, string> = {
                      amber: "text-amber-700",
                      brand: "text-brand-700",
                      muted: "text-fg",
                    };
                    return (
                      <div key={m.label}>
                        <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-subtle">
                          {m.label}
                        </p>
                        <p className={`mt-1 font-bold tabular-nums leading-none ${m.emphasis ? "text-3xl" : "text-2xl"} ${tones[m.tone]}`}>
                          {m.value.toLocaleString()}
                        </p>
                        <p className="text-[11px] text-muted mt-1.5 truncate">{m.help}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            right={showChecklist ? (
              <div>
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <SectionEyebrow icon={Rocket}>Get airborne</SectionEyebrow>
                    <SectionAccent />
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="w-24 h-1.5 bg-elevated rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-brand-500 to-brand-600 rounded-full transition-all"
                        style={{ width: `${setupPct}%` }}
                      />
                    </div>
                    <p className="text-[11px] text-muted tabular-nums whitespace-nowrap">
                      {setupPct}% · {checklistDone}/{checklist.length}
                    </p>
                  </div>
                </div>
                <p className="text-[11px] text-muted mt-2 leading-snug">
                  Five milestones every BHN deployment needs in place before real trainees + employers can self-serve.
                </p>
                <SetupColumn checklist={checklist} />
              </div>
            ) : null}
          />

          {/* Row 2: Daily reach (LEFT) | Approval queues (RIGHT) */}
          <MidlineRow
            left={(
              <div>
                <SectionEyebrow icon={Zap}>Daily reach</SectionEyebrow>
                <SectionAccent />
                <p className="text-[11px] text-muted mt-2 leading-snug">
                  Surfaces an admin opens most. Pinned here so they&apos;re always one click away.
                </p>
                <QuickActionsList isSuperAdmin={isSuperAdmin} pending={totalPending} />
              </div>
            )}
            right={(
              <div>
                {totalPending > 0 ? (
                  <>
                    <SectionEyebrow icon={ClipboardList} tone="amber">
                      Approval queues · {totalPending} pending
                    </SectionEyebrow>
                    <SectionAccent tone="amber" />
                    <p className="text-[11px] text-muted mt-2">Tap any row to triage.</p>
                    {/* `<div>` not `<ul>` — QueueRow returns a
                        bare `<Link>`, not an `<li>`. */}
                    <div className="divide-y divide-line/50 mt-3">
                      <QueueRow icon={Coins}   tone="amber"  label="Credit applications"  count={pendingCreditApps}   href="/admin/credit-applications" />
                      <QueueRow icon={UserCog} tone="violet" label="Role-change requests" count={pendingRoleRequests} href="/admin/role-requests" />
                      <QueueRow icon={Layers}  tone="brand"  label="Pathway enrolments"   count={pendingPathwayApps}  href="/admin/pathway-enrollments" />
                    </div>
                  </>
                ) : (
                  <>
                    <SectionEyebrow icon={CheckCircle2} tone="emerald">
                      Approval queues — clear
                    </SectionEyebrow>
                    <SectionAccent tone="emerald" />
                    <p className="text-[11px] text-muted mt-2">Credit · Role · Pathway · 0 pending</p>
                  </>
                )}
              </div>
            )}
          />

          {/* Row 3: Credit expiry (LEFT, conditional) | Live pulse (RIGHT) */}
          <MidlineRow
            left={anyExpiry ? (
              <div>
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <SectionEyebrow icon={Clock} tone="amber">
                      Credit expiry · {CREDIT_GRANT_TTL_DAYS}-day TTL
                    </SectionEyebrow>
                    <SectionAccent tone="amber" />
                  </div>
                  <Link
                    href="/api/admin/credits/sweep"
                    prefetch={false}
                    className="text-[11px] font-semibold text-muted hover:text-fg inline-flex items-center gap-1"
                    title="Trigger the sweep manually (cron does this daily anyway)"
                  >
                    Run sweep now <ArrowRight size={11} />
                  </Link>
                </div>
                <p className="text-[11px] text-muted mt-2 leading-snug max-w-md">
                  Daily sweep + 90/30/7-day warnings handle the runs automatically. This strip is the live look-ahead.
                </p>
                {/* `<div>` not `<ul>` — ExpiryColumn returns a
                    `<div>`, not an `<li>`. */}
                <div className="divide-y divide-line/50 mt-3">
                  <ExpiryColumn tone="rose"  days={7}  credits={expiring7.credits}  users={expiring7.users} />
                  <ExpiryColumn tone="amber" days={30} credits={expiring30.credits} users={expiring30.users} />
                  <ExpiryColumn tone="brand" days={90} credits={expiring90.credits} users={expiring90.users} />
                </div>
              </div>
            ) : null}
            right={(
              <div>
                <SectionEyebrow icon={Activity}>Live pulse</SectionEyebrow>
                <SectionAccent />
                <p className="text-[11px] text-muted mt-2">Beats from the last day / week.</p>
                <ul className="divide-y divide-line/50 mt-3">
                  <PulseRow icon={GraduationCap} label="Enrolments today"   value={new24hEnrollments} help="Last 24 hours" />
                  <PulseRow icon={Sparkles}      label="New sign-ups (7d)"  value={new7dUsers}        help="Real accounts only" />
                  {isSuperAdmin ? (
                    <PulseRow icon={Cpu}   label="AI calls (7d)"     value={aiCalls7d} help="Cloudflare + Gemini combined" href="/admin/analytics" />
                  ) : (
                    <PulseRow icon={Ghost} label="Phantom users"     value={phantomCount} help="Throwaway test accounts"     href="/admin/phantom-users" />
                  )}
                </ul>
              </div>
            )}
          />

          {/* Row 4: Recent activity (LEFT) | Superadmin shortcuts (RIGHT, conditional) */}
          <MidlineRow
            left={(
              <div>
                <div className="flex items-baseline justify-between gap-3 flex-wrap">
                  <div>
                    <SectionEyebrow icon={ClipboardList}>Recent activity</SectionEyebrow>
                    <SectionAccent />
                  </div>
                  <Link href="/admin/audit" className="text-xs font-medium text-brand-700 hover:underline inline-flex items-center gap-1">
                    See all <ArrowRight size={11} />
                  </Link>
                </div>
                <p className="text-[11px] text-muted mt-2">Last five audit-log entries.</p>
                {recentAudit.length === 0 ? (
                  <div className="py-10 text-center text-sm text-muted">No audit entries yet.</div>
                ) : (
                  <ul className="divide-y divide-line/50 mt-3">
                    {recentAudit.map((a) => (
                      <li key={a.id} className="flex items-center gap-3 py-3 hover:bg-elevated/30 transition-colors">
                        {/* Pastel chip — text-subtle/60 so activity
                            rows read as continuous text. */}
                        <div className="w-6 h-6 rounded-md bg-elevated text-subtle/60 flex items-center justify-center shrink-0">
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
            )}
            right={isSuperAdmin ? (
              <div>
                <SectionEyebrow icon={ShieldCheck}>Superadmin shortcuts</SectionEyebrow>
                <SectionAccent />
                <p className="text-xs text-muted mt-3 leading-relaxed">
                  <Link href="/admin/settings" className="text-brand-700 hover:underline">Platform settings</Link> ·
                  {" "}<Link href="/admin/matching-config" className="text-brand-700 hover:underline">AI matching engine</Link> ·
                  {" "}<Link href="/admin/lti" className="text-brand-700 hover:underline">LTI</Link> ·
                  {" "}<Link href="/admin/course-filters" className="text-brand-700 hover:underline">Course filter options</Link> ·
                  {" "}<Link href="/admin/security" className="text-brand-700 hover:underline">Security policies</Link> ·
                  {" "}<Link href="/admin/system-status" className="text-brand-700 hover:underline">System status (build SHA)</Link>.
                </p>
              </div>
            ) : null}
          />
        </div>
      </div>
    </div>
  );
}

/** One row of the midline grid. Two columns separated by the
 *  continuous vertical midline (drawn by the parent as an absolutely-
 *  positioned hairline). Either side can be null — the row still
 *  renders with the populated side aligned correctly, the empty side
 *  becomes breathing space. On mobile (< lg) the grid collapses to
 *  a single column and the cells stack vertically. */
function MidlineRow({ left, right }: { left: React.ReactNode; right: React.ReactNode }) {
  if (!left && !right) return null;
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2">
      <div className="py-7 lg:pr-8">{left}</div>
      <div className="py-7 lg:pl-8 mt-7 lg:mt-0 border-t border-line/70 lg:border-t-0">{right}</div>
    </div>
  );
}

// ─── Editorial section helpers ─────────────────────────────────────

type SectionTone = "brand" | "amber" | "emerald" | "violet";

/** Three values per tone:
 *    text     — eyebrow text colour (stays saturated, ~-700 step,
 *               needs to be legible against page bg)
 *    icon     — lucide-icon colour (PASTEL, ~-400 step at 70%
 *               opacity, so the icon supports the text rather than
 *               competing with it)
 *    accentRgb — the gradient accent bar's tone in `r, g, b` form */
const SECTION_TONE_CLS: Record<
  SectionTone,
  { text: string; icon: string; accentRgb: string }
> = {
  brand:   { text: "text-brand-700",   icon: "text-brand-400/70",   accentRgb: "94, 143, 247"  }, // brand-500
  amber:   { text: "text-amber-700",   icon: "text-amber-400/70",   accentRgb: "245, 158, 11"  }, // amber-500
  emerald: { text: "text-emerald-700", icon: "text-emerald-400/70", accentRgb: "16, 185, 129"  }, // emerald-500
  violet:  { text: "text-violet-700",  icon: "text-violet-400/70",  accentRgb: "139, 92, 246"  }, // violet-500
};

/** Uppercase tracked eyebrow with optional leading icon. The eyebrow
 *  text uses the saturated `text` class (-700 step) for legibility;
 *  the icon uses the pastel `icon` class (-400/70) so it supports
 *  the text rather than competing with it. */
function SectionEyebrow({
  icon: Icon,
  tone = "brand",
  children,
}: {
  icon?: React.ElementType;
  tone?: SectionTone;
  children: React.ReactNode;
}) {
  const cls = SECTION_TONE_CLS[tone];
  return (
    <h2 className={`text-[11px] uppercase tracking-[0.24em] font-bold inline-flex items-center gap-2 ${cls.text}`}>
      {Icon && <Icon size={12} className={cls.icon} />}
      <span>{children}</span>
    </h2>
  );
}

/** Short gradient accent bar that fades from the section's tone
 *  colour into transparent. This is the "gradient" half of the
 *  line+gradient design system — the gradient line itself is the
 *  ornament; no bounded boxes carry the visual hierarchy. */
function SectionAccent({ tone = "brand" }: { tone?: SectionTone }) {
  const { accentRgb } = SECTION_TONE_CLS[tone];
  return (
    <div
      className="h-px w-20 mt-2"
      style={{
        background: `linear-gradient(90deg, rgba(${accentRgb}, 0.8) 0%, rgba(${accentRgb}, 0) 100%)`,
      }}
      aria-hidden
    />
  );
}

// ─── Sub-components ─────────────────────────────────────────────

/** The page's single focal strip — converted from a rounded
 *  card to a flat line + gradient row to match the rest of the
 *  admin dashboard (v4 mid-line layout).
 *
 *  Stagecraft this strip still uses:
 *    • A SOFT tonal radial wash (≈0.10 alpha) behind the content —
 *      no longer a dramatic "spotlight" since the strip isn't a
 *      bounded card, just enough tone to read as "look here first".
 *    • Top + bottom hairlines bracketing the strip from the
 *      PageHero above and the editorial mid-line layout below.
 *    • Same uppercase tracked eyebrow + small gradient accent bar
 *      as every other section — visual rhythm continuous now.
 *    • Pastel inline icon (no more big white-on-saturated chip
 *      with halo glow).
 *    • A big tone-coloured number on the right mirroring whatever
 *      the strip is telling the admin to act on (pending count,
 *      setup-percent, active-user count). Same KPI semantics, just
 *      smaller (4xl/5xl instead of 5xl/6xl) to fit the slimmer row.
 *
 *  Use sparingly: only one SpotlightPanel per page. The dashboard
 *  below is intentionally quieter so this strip remains the eye's
 *  first landing.
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
  // Tone drives the eyebrow text, the accent gradient bar's RGB,
  // the soft full-strip radial wash, the inline icon colour, and
  // the big number on the right. No more rounded card / shadow /
  // halo'd icon chip — everything's flat now to match the rest of
  // the line + gradient layout below. The radial wash is still
  // here as the focal cue (the "gradient" half), just much softer
  // (≈0.10 alpha vs the old 0.22) since it's no longer bounded by
  // a card edge.
  const toneCfg: Record<
    typeof s.tone,
    {
      eyebrow: string;
      icon: string;
      bigNumber: string;
      accentRgb: string;
      cta: string;
      wash: string;
    }
  > = {
    amber: {
      eyebrow: "text-amber-700",
      icon: "text-amber-400/70",
      bigNumber: "text-amber-700",
      accentRgb: "245, 158, 11",
      cta: "bg-amber-600 hover:bg-amber-700",
      wash: "radial-gradient(ellipse 80% 100% at 20% 50%, rgba(245, 158, 11, 0.10), transparent 70%)",
    },
    brand: {
      eyebrow: "text-brand-700",
      icon: "text-brand-400/70",
      bigNumber: "text-brand-700",
      accentRgb: "94, 143, 247",
      cta: "bg-brand-600 hover:bg-brand-700",
      wash: "radial-gradient(ellipse 80% 100% at 20% 50%, rgba(94, 143, 247, 0.10), transparent 70%)",
    },
    emerald: {
      eyebrow: "text-emerald-700",
      icon: "text-emerald-400/70",
      bigNumber: "text-emerald-700",
      accentRgb: "16, 185, 129",
      cta: "bg-emerald-600 hover:bg-emerald-700",
      wash: "radial-gradient(ellipse 80% 100% at 20% 50%, rgba(16, 185, 129, 0.10), transparent 70%)",
    },
  };
  const tc = toneCfg[s.tone];
  const Icon = s.icon;
  return (
    <section className="relative overflow-hidden border-y border-line/70">
      {/* Soft tonal wash — replaces the previous big drop shadow +
          two layered spotlights as the focal cue. Pointer-events-
          none so clicks fall through to the content. */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: tc.wash }}
        aria-hidden
      />

      <div className="relative px-5 md:px-6 py-5">
        {/* Eyebrow + accent — same pattern as every other section
            below. The pastel inline icon supports the eyebrow text
            rather than punching out of it. */}
        <h2 className={`text-[11px] uppercase tracking-[0.24em] font-bold inline-flex items-center gap-2 ${tc.eyebrow}`}>
          <Icon size={12} className={tc.icon} />
          <span>{s.eyebrow}</span>
        </h2>
        <div
          className="h-px w-20 mt-2"
          style={{
            background: `linear-gradient(90deg, rgba(${tc.accentRgb}, 0.8) 0%, rgba(${tc.accentRgb}, 0) 100%)`,
          }}
          aria-hidden
        />

        {/* Main row — headline + body + CTAs on the left, big
            tone-coloured KPI on the right. Single row on lg+,
            wraps on smaller viewports. */}
        <div className="mt-3 flex items-center gap-x-6 gap-y-3 flex-wrap">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg md:text-xl font-bold text-fg tracking-tight leading-snug">
              {s.headline}
            </h3>
            <p className="text-xs text-muted mt-1 leading-snug max-w-2xl">
              {s.detail}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
              <Link
                href={s.primary.href}
                className={`inline-flex items-center gap-1.5 ${tc.cta} text-white font-semibold text-xs px-4 py-2 rounded-md shadow-sm transition-colors`}
              >
                {s.primary.label} <ArrowRight size={13} />
              </Link>
              {s.secondary && (
                <Link
                  href={s.secondary.href}
                  className="text-xs font-medium text-muted hover:text-fg inline-flex items-center gap-1"
                >
                  {s.secondary.label} <ArrowRight size={11} className="opacity-60" />
                </Link>
              )}
            </div>
          </div>

          {/* Big tone-coloured KPI — smaller than the old version
              (text-4xl / text-5xl instead of 5xl/6xl) and aligned
              centre-vertically with the headline + body block. */}
          {s.bigNumber && (
            <div className="ml-auto text-right shrink-0">
              <p className={`text-4xl md:text-5xl font-black tabular-nums leading-none tracking-tight ${tc.bigNumber}`}>
                {s.bigNumber}
              </p>
              <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-subtle mt-1.5">
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
      {/* Pastel icon — brand-400/70 instead of brand-600 so the
          chip recedes into the row rather than punching out of it. */}
      <div className="w-9 h-9 rounded-lg bg-elevated text-brand-400/70 border border-line flex items-center justify-center shrink-0">
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
  // Pastel icon chips — softer tints so the chip reads as a calm
  // tone marker, not a saturated colour callout.
  const colours: Record<string, string> = {
    brand:  "bg-brand-50/60 text-brand-400",
    amber:  "bg-amber-50/60 text-amber-400",
    violet: "bg-violet-50/60 text-violet-400",
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
