import Link from "next/link";
import {
  Users, BookOpen, GraduationCap, Award, Layers, Coins,
  ShieldCheck, AlertCircle, ArrowRight,
  Sparkles, ClipboardList, UserCog, Building2,
  Activity, Clock, Briefcase, Ghost, GitFork, CheckCircle2,
  Zap, Eye, Inbox, Cpu, Rocket, FilePlus,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { CREDIT_GRANT_TTL_DAYS } from "@/lib/credits/expiry";

/**
 * Admin / superadmin dashboard.
 *
 * Redesign principle (May 2026): the previous layout was a flat stack
 * of stat tiles + counters + queues + counters again, which buried
 * the actually-frequent operations under summary data. Admins on a
 * fresh install spend most of their time on a narrow set of bootstrap
 * tasks — spawn a demo workspace, invite an employer, create a
 * posting, view-as a trainee — and the dashboard should put those one
 * click away. Mature platforms have different priorities (action
 * queues, audit log), so the surface adapts:
 *
 *   1. SetupChecklist — auto-shown when the platform is fresh (few
 *      employers / no demo workspace / no postings / etc.); auto-
 *      hides once each milestone clears. Replaces the "0 of every
 *      stat" wall a fresh admin used to see.
 *   2. QuickActions — 8 large shortcuts, the bootstrap operations
 *      identified above. Same surface for mature platforms; the
 *      buttons just point to lists instead of "create your first".
 *   3. StatChips — slim one-row stat row (vs. four big tiles).
 *   4. ActionQueues — auto-collapse to a single "all clear" line
 *      when every queue is empty.
 *   5. Credit-expiry + recent activity — compacted versions of the
 *      previous sections.
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

  // Credit-expiry awareness — same data as before, just rendered in a
  // narrower strip. Auto-hides the whole section if no credits are
  // due to expire in any window (fresh install has zero grants).
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
  // The platform is "fresh" if at least 3 of these milestones are
  // unmet. We never hide more than one at a time so a partial setup
  // still sees the rest of the checklist. Once everything is met the
  // whole section auto-hides.
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
      detail: "Test the full platform end-to-end with throwaway accounts. Use it to walk a prospective partner through what their experience will look like.",
      href: "/admin/demo-workspaces",
      icon: Rocket,
    },
    {
      id: "invite-employer",
      done: employerCount > 0 || employerInvitesPending > 0,
      label: "Invite your first employer",
      detail: "Drop in their email, copy the generated link, send via your usual channel. They land in /employer with HR role assigned.",
      href: "/admin/employer-invites",
      icon: Building2,
    },
    {
      id: "first-posting",
      done: activePostings > 0,
      label: "Create the first internship posting",
      detail: "Paste a job description and the AI fills in the fields. Or click 'Seed demo postings' on /employer/postings to populate three samples.",
      href: "/admin/internships/new",
      icon: Briefcase,
    },
    {
      id: "first-course",
      done: totalCourses > 0,
      label: "Publish at least one course",
      detail: "The training catalog is the backbone of the platform — even one published course lets sign-ups try the LMS loop. Use the 'New course' button on the catalog page.",
      href: "/courses?from=instructor",
      icon: BookOpen,
    },
    {
      id: "talent-application",
      done: totalApplications > 0,
      label: "See talent flow through",
      detail: "Once a trainee signs up and submits the talent application, the cards appear on /employer/applicants with AI match scores.",
      href: "/employer/applicants",
      icon: Inbox,
    },
  ];
  const checklistOpen = checklist.filter((c) => !c.done).length;
  const showChecklist = checklistOpen > 0 && (totalUsers < 10 || activePostings === 0 || employerCount === 0);

  return (
    <div className="space-y-8">
      {/* ── Hero ─────────────────────────────────────────────────── */}
      <section className="full-bleed relative overflow-hidden text-white -mt-8 mb-4 hero-mesh-brand">
        <div className="absolute inset-0 pointer-events-none">
          <div className="blob-shape blob-soft drift" style={{ width: 360, height: 360, top: -120, left: -100 }} />
          <div className="blob-shape blob-soft drift-slow" style={{ width: 420, height: 420, bottom: -200, right: -140, opacity: 0.55 }} />
        </div>
        <div className="relative max-w-7xl mx-auto px-6 pt-7 pb-20">
          <div className="flex items-end justify-between gap-5 flex-wrap">
            <div className="min-w-0">
              <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-white drop-shadow-sm">
                <ShieldCheck size={11} /> {isSuperAdmin ? "Superadmin" : "Admin"} desk
              </span>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight leading-[1.1] mt-1 drop-shadow-sm">
                Hi, <span className="gradient-text">{firstName}</span>.
              </h1>
              <p className="mt-1.5 text-white text-sm max-w-2xl leading-snug drop-shadow">
                {totalPending > 0 ? (
                  <>
                    {totalPending} item{totalPending === 1 ? "" : "s"} waiting on you across credits, role requests, and pathway approvals.
                  </>
                ) : showChecklist ? (
                  <>
                    {checklistOpen} setup step{checklistOpen === 1 ? "" : "s"} left to get the platform humming.
                  </>
                ) : (
                  "Nothing in the action queue. Platform is humming."
                )}
                {" "}
                {new7dUsers > 0 && (
                  <span className="text-white/90">{new7dUsers} new sign-up{new7dUsers === 1 ? "" : "s"} this week.</span>
                )}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <Link
                href={totalPending > 0 ? "/admin/credit-applications" : showChecklist ? checklist.find((c) => !c.done)!.href : "/admin"}
                className="inline-flex items-center gap-1.5 bg-white text-brand-700 hover:bg-brand-50 font-semibold text-xs px-4 py-2 organic-card shadow-md shadow-brand-900/30 transition-all hover:-translate-y-0.5"
              >
                {totalPending > 0 ? "Review queue" : showChecklist ? "Continue setup" : "Admin overview"} <ArrowRight size={12} />
              </Link>
              <Link
                href="/admin/split-view"
                className="inline-flex items-center gap-1.5 bg-white/25 backdrop-blur ring-1 ring-inset ring-white/60 text-white hover:bg-white/35 text-xs font-semibold px-4 py-2 organic-card-alt transition-colors shadow-sm shadow-brand-900/20"
              >
                <Eye size={12} /> View as
              </Link>
            </div>
          </div>
        </div>
        <div className="curve-down" />
      </section>

      {/* ── Setup checklist (auto-hides when complete) ───────────── */}
      {showChecklist && (
        <section className="bg-card border border-brand-200 rounded-2xl p-5 surface-shadow">
          <header className="flex items-end justify-between gap-3 flex-wrap mb-3">
            <div>
              <h2 className="text-lg font-bold text-fg tracking-tight inline-flex items-center gap-2">
                <Rocket size={16} className="text-brand-600" />
                Get the platform off the ground
              </h2>
              <p className="text-xs text-muted mt-0.5 leading-snug">
                A short setup punch-list. These are the things every BHN deployment needs in place before real trainees + employers can self-serve.
                Each tile auto-checks off once it&apos;s done.
              </p>
            </div>
            <p className="text-[11px] text-subtle tabular-nums">
              {checklist.length - checklistOpen} / {checklist.length} done
            </p>
          </header>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {checklist.map((c) => (
              <Link
                key={c.id}
                href={c.href}
                className={`group rounded-xl border p-4 flex items-start gap-3 transition-all ${
                  c.done
                    ? "bg-emerald-50/60 border-emerald-200"
                    : "bg-elevated/40 border-line hover:border-brand-300 hover:-translate-y-0.5 hover:shadow-md"
                }`}
              >
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                  c.done
                    ? "bg-emerald-500 text-white"
                    : "bg-brand-50 text-brand-700 group-hover:bg-brand-600 group-hover:text-white transition-colors"
                }`}>
                  {c.done ? <CheckCircle2 size={16} /> : <c.icon size={16} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold leading-tight ${c.done ? "text-emerald-900 line-through decoration-emerald-400/40" : "text-fg"}`}>
                    {c.label}
                  </p>
                  <p className="text-[11px] text-muted mt-1 leading-snug">
                    {c.detail}
                  </p>
                </div>
                {!c.done && (
                  <ArrowRight size={13} className="text-subtle mt-1 group-hover:text-brand-700 transition-colors shrink-0" />
                )}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── Quick actions — the eight most-used admin shortcuts ──── */}
      <section>
        <header className="flex items-end justify-between gap-3 mb-3">
          <div>
            <h2 className="text-lg font-bold text-fg tracking-tight inline-flex items-center gap-2">
              <Zap size={16} className="text-brand-600" />
              Quick actions
            </h2>
            <p className="text-xs text-muted mt-0.5">
              The eight surfaces an admin opens most often. Bookmark whichever you reach for daily.
            </p>
          </div>
        </header>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {QUICK_ACTIONS(isSuperAdmin).map((a) => (
            <Link
              key={a.href}
              href={a.href}
              className="group relative bg-card border border-line rounded-2xl p-4 hover:-translate-y-0.5 hover:shadow-md hover:border-brand-200 transition-all"
            >
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${a.tone} text-white flex items-center justify-center shadow-md shrink-0`}>
                <a.icon size={18} />
              </div>
              <p className="text-sm font-semibold text-fg mt-3 leading-tight group-hover:text-brand-700 transition-colors">
                {a.label}
              </p>
              <p className="text-[11px] text-muted mt-0.5 leading-snug">{a.help}</p>
              {a.badge !== undefined && a.badge > 0 && (
                <span className="absolute top-3 right-3 inline-flex items-center justify-center min-w-[1.4rem] h-5 px-1.5 rounded-full bg-rose-500 text-white text-[10px] font-bold tabular-nums">
                  {a.badge}
                </span>
              )}
            </Link>
          ))}
        </div>
      </section>

      {/* ── Stat strip — slim, one row ───────────────────────────── */}
      <section>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
          {[
            { icon: Users,         label: "Users",        value: totalUsers },
            { icon: Building2,     label: "Employers",    value: employerCount },
            { icon: BookOpen,      label: "Published",    value: totalCourses },
            { icon: Briefcase,     label: "Postings",     value: activePostings },
            { icon: GraduationCap, label: "Enrolments",   value: totalEnrollments },
            { icon: Award,         label: "Certificates", value: totalCertificates },
          ].map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="bg-card border border-line rounded-xl px-3 py-2.5">
                <div className="flex items-center gap-1.5 text-subtle text-[9px] uppercase tracking-[0.18em] font-bold">
                  <Icon size={10} className="text-brand-600" /> {s.label}
                </div>
                <p className="text-xl font-bold mt-0.5 font-mono tabular-nums leading-none">
                  {s.value.toLocaleString()}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Action queues (compacted; collapses to one line when empty) ── */}
      {totalPending > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {pendingCreditApps > 0 && (
            <QueueTile icon={Coins} tone="amber" label="Credit applications" count={pendingCreditApps} href="/admin/credit-applications" />
          )}
          {pendingRoleRequests > 0 && (
            <QueueTile icon={UserCog} tone="violet" label="Role-change requests" count={pendingRoleRequests} href="/admin/role-requests" />
          )}
          {pendingPathwayApps > 0 && (
            <QueueTile icon={Layers} tone="brand" label="Pathway enrolments" count={pendingPathwayApps} href="/admin/pathway-enrollments" />
          )}
        </div>
      ) : (
        <div className="bg-emerald-50/60 border border-emerald-200 rounded-xl px-4 py-3 inline-flex items-center gap-2 text-sm">
          <CheckCircle2 size={14} className="text-emerald-700" />
          <span className="text-emerald-900 font-semibold">Approval queues are clear.</span>
          <span className="text-emerald-700/80 text-xs">Credit · Role · Pathway · 0 pending</span>
        </div>
      )}

      {/* ── Credit expiry — auto-hidden when nothing is expiring ─── */}
      {anyExpiry && (
        <section className="bg-card border border-line rounded-2xl p-5">
          <header className="flex items-end justify-between gap-3 flex-wrap mb-3">
            <div>
              <h2 className="text-base font-bold text-fg tracking-tight inline-flex items-center gap-2">
                <Clock size={14} className="text-brand-600" />
                Credit expiry — {CREDIT_GRANT_TTL_DAYS}-day TTL
              </h2>
              <p className="text-xs text-muted mt-0.5 leading-snug">
                Unspent credits across real trainees. Daily sweep + 90/30/7-day warnings handle this automatically.
              </p>
            </div>
            <Link
              href="/api/admin/credits/sweep"
              prefetch={false}
              className="text-xs font-semibold text-muted hover:text-fg inline-flex items-center gap-1"
              title="Trigger the sweep manually (cron does this daily anyway)"
            >
              Run sweep now <ArrowRight size={11} />
            </Link>
          </header>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <ExpiryTile tone="rose"  days={7}  credits={expiring7.credits}  users={expiring7.users} />
            <ExpiryTile tone="amber" days={30} credits={expiring30.credits} users={expiring30.users} />
            <ExpiryTile tone="brand" days={90} credits={expiring90.credits} users={expiring90.users} />
          </div>
        </section>
      )}

      {/* ── Live counters ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Counter icon={GraduationCap} label="Enrolments today"  value={new24hEnrollments} help="Last 24 hours" />
        <Counter icon={Sparkles}      label="New sign-ups (7d)" value={new7dUsers}       help="Real accounts only" />
        {isSuperAdmin ? (
          <Counter icon={Cpu}        label="AI calls (7d)"      value={aiCalls7d}        help="Cloudflare + Gemini combined" href="/admin/analytics" />
        ) : (
          <Counter icon={Ghost}      label="Phantom users"      value={phantomCount}     help="Throwaway test accounts" href="/admin/phantom-users" />
        )}
      </div>

      {/* ── Recent activity (compact) ────────────────────────────── */}
      <section className="bg-card border border-line rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-line flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-fg text-sm inline-flex items-center gap-1.5">
              <ClipboardList size={14} className="text-brand-600" />
              Recent activity
            </h2>
            <p className="text-[11px] text-muted">Last five audit-log entries</p>
          </div>
          <Link href="/admin/audit" className="text-xs font-medium text-brand-700 hover:underline inline-flex items-center gap-1">
            See all <ArrowRight size={11} />
          </Link>
        </div>
        {recentAudit.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-muted">No audit entries yet.</div>
        ) : (
          <ul className="divide-y divide-line">
            {recentAudit.map((a) => (
              <li key={a.id} className="flex items-center gap-3 px-4 py-2.5">
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
                <p className="text-[11px] text-subtle shrink-0">
                  {new Date(a.createdAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {isSuperAdmin && (
        <div className="bg-elevated/50 border border-dashed border-line rounded-xl px-4 py-3 flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-card-solid border border-line text-brand-600 flex items-center justify-center shrink-0">
            <ShieldCheck size={14} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-fg">Superadmin shortcuts</p>
            <p className="text-xs text-muted mt-0.5 leading-relaxed">
              <Link href="/admin/settings" className="text-brand-700 hover:underline">Platform settings</Link> ·
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

/** The eight admin shortcuts most-used during the initial state of
 *  the platform (and surprisingly, also during steady state — these
 *  are the navigation patterns a recruiter / ops admin opens daily).
 *  Order is deliberate: bootstrap operations first, day-to-day ops
 *  second. The badge slot is for live counts (e.g. talent applicants)
 *  so the chip nudges itself when something needs attention. */
function QUICK_ACTIONS(isSuperAdmin: boolean): Array<{
  href: string;
  label: string;
  help: string;
  icon: React.ElementType;
  tone: string;
  badge?: number;
}> {
  const list = [
    { href: "/admin/demo-workspaces", label: "Demo workspaces", help: "Spin up a throwaway end-to-end test", icon: Rocket,      tone: "from-violet-500 to-violet-700 shadow-violet-600/20" },
    { href: "/admin/employer-invites", label: "Invite employer", help: "Generate an HR-onboarding link",      icon: Building2,   tone: "from-amber-400 to-amber-600 shadow-amber-500/20" },
    { href: "/admin/internships/new", label: "New posting",     help: "AI-fills the fields from a JD paste",  icon: FilePlus,    tone: "from-brand-500 to-brand-700 shadow-brand-600/20" },
    { href: "/employer/applicants",   label: "Talent applicants", help: "Match scores + comments + previews", icon: Inbox,       tone: "from-emerald-500 to-emerald-700 shadow-emerald-600/20" },
    { href: "/admin/phantom-users",   label: "Phantom users",   help: "Throwaway accounts for batch testing", icon: Ghost,       tone: "from-fuchsia-500 to-fuchsia-700 shadow-fuchsia-600/20" },
    { href: "/admin/split-view",      label: "View as",         help: "Walk every role's experience",         icon: GitFork,     tone: "from-sky-500 to-sky-700 shadow-sky-600/20" },
    { href: "/admin/users",           label: "Users",           help: "Search, edit, deactivate",             icon: Users,       tone: "from-brand-500 to-brand-700 shadow-brand-600/20" },
    {
      href: isSuperAdmin ? "/admin/system-status" : "/admin/audit",
      label: isSuperAdmin ? "System status" : "Audit log",
      help:  isSuperAdmin ? "DB / AI / security at a glance" : "Every state change, every actor",
      icon:  isSuperAdmin ? Activity : ShieldCheck,
      tone:  "from-slate-500 to-slate-700 shadow-slate-600/20",
    },
  ];
  return list;
}

function ExpiryTile({
  tone, days, credits, users,
}: {
  tone: "rose" | "amber" | "brand";
  days: number;
  credits: number;
  users: number;
}) {
  const colours: Record<string, string> = {
    rose:  "ring-rose-200",
    amber: "ring-amber-200",
    brand: "ring-brand-200",
  };
  const heading =
    days === 7 ? "Last call (≤ 7 days)"
    : days === 30 ? "Expiring soon (≤ 30 days)"
    : "Within 90 days";
  return (
    <div className={`rounded-xl bg-elevated/40 border border-line p-4 ring-1 ring-inset ${colours[tone]}`}>
      <p className="text-[10px] uppercase tracking-[0.22em] font-semibold text-subtle">{heading}</p>
      <p className="text-xl font-bold text-fg mt-1.5 font-mono tabular-nums">
        {credits.toLocaleString()}
        <span className="text-xs font-semibold text-muted ml-1">credits</span>
      </p>
      <p className="text-[11px] text-muted mt-0.5">
        Across {users.toLocaleString()} trainee{users === 1 ? "" : "s"}
      </p>
    </div>
  );
}

function QueueTile({
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
      className="group bg-card border border-line rounded-2xl p-4 hover:border-brand-300 hover:shadow-md transition-all flex items-start gap-3"
    >
      <div className={`w-9 h-9 rounded-lg ${colours[tone]} flex items-center justify-center shrink-0`}>
        <Icon size={16} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] uppercase tracking-[0.22em] font-semibold text-subtle">Queue</p>
        <p className="text-sm font-semibold text-fg leading-tight mt-0.5">{label}</p>
        <p className="text-2xl font-bold text-fg mt-1.5 tabular-nums">{count}</p>
      </div>
      <ArrowRight size={13} className="text-subtle group-hover:text-brand-700 mt-1 transition-colors" />
    </Link>
  );
}

function Counter({
  icon: Icon, label, value, help, href,
}: {
  icon: React.ElementType;
  label: string;
  value: number | string;
  help?: string;
  href?: string;
}) {
  const inner = (
    <div className="bg-card border border-line rounded-xl p-4 flex items-start gap-3 hover:border-brand-200 transition-colors h-full">
      <div className="w-8 h-8 rounded-lg bg-elevated text-brand-600 border border-line flex items-center justify-center shrink-0">
        <Icon size={14} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] uppercase tracking-[0.22em] font-semibold text-subtle">{label}</p>
        <p className="text-xl font-bold text-fg mt-0.5">{value}</p>
        {help && <p className="text-[11px] text-muted mt-0.5">{help}</p>}
      </div>
    </div>
  );
  return href ? <Link href={href} className="block">{inner}</Link> : inner;
}
