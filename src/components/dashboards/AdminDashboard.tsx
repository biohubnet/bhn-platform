import Link from "next/link";
import {
  Users, BookOpen, GraduationCap, Award, Layers, Coins,
  ShieldCheck, Settings, FileText, AlertCircle, ArrowRight,
  Sparkles, ClipboardList, ChevronRight, UserCog, Building2,
  Activity, Clock,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { CREDIT_GRANT_TTL_DAYS } from "@/lib/credits/expiry";

/** Admin / superadmin dashboard. Platform overview + the queues
 *  needing action, with system-health extras shown only to superadmin. */
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
    prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 6,
      include: { actor: { select: { name: true, email: true } } },
    }).catch(() => []),
    isSuperAdmin
      ? prisma.aIInteraction.count({ where: { createdAt: { gt: since7d } } }).catch(() => 0)
      : Promise.resolve(0),
  ]);

  const totalPending = pendingCreditApps + pendingRoleRequests + pendingPathwayApps;

  // Credit-expiry awareness — three look-ahead windows. Sums up the
  // unspent remainder of every active credit grant (amount minus
  // expiredAmount) whose timer falls inside the window. Used to drive
  // the "Credits expiring" tile so admins can see when notifications
  // and sweeps are about to fire.
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

  return (
    <div className="space-y-8">
      {/* Hero — compact identity strip. Greeting + one-line status +
          CTAs on one row; the four headline stats sit in a slim
          numbers row right below the hero. ~1/3 of the previous
          hero's height, freeing the fold for the action queue. */}
      <section className="full-bleed relative overflow-hidden text-white -mt-8 mb-4 hero-mesh-brand">
        <div className="absolute inset-0 pointer-events-none">
          <div className="blob-shape blob-soft drift" style={{ width: 360, height: 360, top: -120, left: -100 }} />
          <div className="blob-shape blob-soft drift-slow" style={{ width: 420, height: 420, bottom: -200, right: -140, opacity: 0.55 }} />
        </div>
        <div className="relative max-w-7xl mx-auto px-6 pt-6 pb-5">
          <div className="flex items-end justify-between gap-5 flex-wrap">
            <div className="min-w-0">
              <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/80">
                <ShieldCheck size={11} /> {isSuperAdmin ? "Superadmin" : "Admin"} desk
              </span>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight leading-[1.1] mt-1">
                Hi, <span className="gradient-text">{firstName}</span>.
              </h1>
              <p className="mt-1.5 text-white/85 text-sm max-w-2xl leading-snug">
                {totalPending > 0
                  ? `${totalPending} item${totalPending === 1 ? "" : "s"} waiting on you across credits, role requests, and pathway approvals.`
                  : "Nothing in the action queue. Platform is humming."}
                {" "}
                {new7dUsers > 0 && (
                  <span className="text-white/70">{new7dUsers} new sign-up{new7dUsers === 1 ? "" : "s"} this week.</span>
                )}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <Link
                href="/admin"
                className="inline-flex items-center gap-1.5 bg-white text-brand-700 hover:bg-brand-50 font-semibold text-xs px-4 py-2 organic-card shadow-md shadow-brand-900/30 transition-all hover:-translate-y-0.5"
              >
                Admin overview <ArrowRight size={12} />
              </Link>
              <Link
                href="/admin/users"
                className="inline-flex items-center gap-1.5 bg-white/10 backdrop-blur border border-white/25 text-white hover:bg-white/20 text-xs font-semibold px-4 py-2 organic-card-alt transition-colors"
              >
                <Users size={12} /> Users
              </Link>
            </div>
          </div>
        </div>
        <div className="curve-down" />
      </section>

      {/* Headline stats moved out of the hero into a slim row so the
          hero stays focused on identity + status. Same four figures
          as before, just unstacked. */}
      <section>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { icon: Users,         label: "Active users",  value: totalUsers        },
            { icon: BookOpen,      label: "Published",     value: totalCourses      },
            { icon: GraduationCap, label: "Enrolments",    value: totalEnrollments  },
            { icon: Award,         label: "Certificates",  value: totalCertificates },
          ].map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="bg-card border border-line rounded-2xl px-4 py-3">
                <div className="flex items-center gap-2 text-subtle text-[10px] uppercase tracking-[0.18em] font-bold">
                  <Icon size={11} className="text-brand-600" /> {s.label}
                </div>
                <p className="text-2xl font-bold mt-0.5 font-mono tabular-nums leading-none">
                  {s.value.toLocaleString()}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Action queue */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <QueueTile
          icon={Coins}
          tone="amber"
          label="Credit applications"
          count={pendingCreditApps}
          href="/admin/credit-applications"
          empty="None waiting"
        />
        <QueueTile
          icon={UserCog}
          tone="violet"
          label="Role-change requests"
          count={pendingRoleRequests}
          href="/admin/role-requests"
          empty="No pending requests"
        />
        <QueueTile
          icon={Layers}
          tone="brand"
          label="Pathway enrolments"
          count={pendingPathwayApps}
          href="/admin/pathway-enrollments"
          empty="None to approve"
        />
      </div>

      {/* Credit expiry — awareness for the platform. ENGAGE policy
          expires credits {CREDIT_GRANT_TTL_DAYS} days from grant date;
          trainees receive 90/30/7-day-before warnings, then a sweep
          deducts the remainder. */}
      <section>
        <header className="flex items-end justify-between gap-3 flex-wrap mb-3">
          <div>
            <h2 className="text-lg font-bold text-fg tracking-tight inline-flex items-center gap-2">
              <Clock size={16} className="text-brand-600" />
              Credit expiry — {CREDIT_GRANT_TTL_DAYS}-day TTL
            </h2>
            <p className="text-xs text-muted mt-1 leading-snug">
              Live look-ahead at unspent credits across real trainees. The
              daily sweep deducts expired grants and sends 90/30/7-day
              warnings ahead of time. ENGAGE policy: credits also expire
              early if &lt; 2 500 used in the first 6 months — UI surfaces
              the warning, hard enforcement is a follow-up.
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

      {/* Quick links */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { href: "/admin/users",            label: "Users",        icon: Users,         tone: "brand" },
          { href: "/admin/announcements",    label: "Announcements", icon: Sparkles,      tone: "amber" },
          { href: "/admin/audit",            label: "Audit log",    icon: ShieldCheck,   tone: "emerald" },
          { href: isSuperAdmin ? "/admin/settings" : "/admin/reports",
            label: isSuperAdmin ? "Settings" : "Reports",
            icon: isSuperAdmin ? Settings : FileText,
            tone: "violet" },
        ].map((a) => {
          const Icon = a.icon;
          const tones: Record<string, string> = {
            brand:   "from-brand-500 to-brand-700 shadow-brand-600/20",
            violet:  "from-violet-500 to-violet-700 shadow-violet-600/20",
            amber:   "from-amber-400 to-amber-600 shadow-amber-500/20",
            emerald: "from-emerald-500 to-emerald-700 shadow-emerald-600/20",
          };
          return (
            <Link
              key={a.href}
              href={a.href}
              className="group bg-card border border-line rounded-2xl p-4 hover:-translate-y-0.5 hover:shadow-md hover:border-brand-200 transition-all flex items-center gap-3"
            >
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${tones[a.tone]} text-white flex items-center justify-center shadow-md shrink-0`}>
                <Icon size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-fg truncate">{a.label}</p>
                <p className="text-xs text-subtle mt-0.5 inline-flex items-center gap-0.5">Open <ChevronRight size={11} /></p>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Live counters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Counter
          icon={GraduationCap}
          label="Enrolments today"
          value={new24hEnrollments}
          help="Last 24 hours"
        />
        <Counter
          icon={Building2}
          label="Employer accounts"
          value={employerCount}
          help={`${employerInvitesPending} invite${employerInvitesPending === 1 ? "" : "s"} pending`}
          href="/admin/employer-invites"
        />
        {isSuperAdmin ? (
          <Counter
            icon={Activity}
            label="AI calls (7d)"
            value={aiCalls7d}
            help="Cloudflare + Gemini combined"
          />
        ) : (
          <Counter
            icon={Sparkles}
            label="New sign-ups (7d)"
            value={new7dUsers}
            help="Across all roles"
          />
        )}
      </div>

      {/* Recent activity */}
      <section className="bg-card border border-line rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-line flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-fg">Recent activity</h2>
            <p className="text-xs text-muted mt-0.5">Last six audit-log entries</p>
          </div>
          <Link href="/admin/audit" className="text-xs font-medium text-brand-700 hover:underline inline-flex items-center gap-1">
            See all <ArrowRight size={11} />
          </Link>
        </div>
        {recentAudit.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-muted">No audit entries yet.</div>
        ) : (
          <ul className="divide-y divide-line">
            {recentAudit.map((a) => (
              <li key={a.id} className="flex items-center gap-3 px-5 py-3">
                <div className="w-7 h-7 rounded-md bg-elevated text-subtle flex items-center justify-center shrink-0">
                  <ClipboardList size={13} />
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
        <div className="bg-elevated/50 border border-dashed border-line rounded-2xl p-5 flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-card-solid border border-line text-brand-600 flex items-center justify-center shrink-0">
            <ShieldCheck size={16} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-fg">Superadmin tools</p>
            <p className="text-xs text-muted mt-0.5 leading-relaxed">
              <Link href="/admin/settings" className="text-brand-700 hover:underline">Platform settings</Link> ·
              {" "}<Link href="/admin/lti" className="text-brand-700 hover:underline">LTI configuration</Link> ·
              {" "}<Link href="/admin/course-filters" className="text-brand-700 hover:underline">Course filter options</Link> ·
              {" "}<Link href="/admin/employer-invites" className="text-brand-700 hover:underline">Employer invites</Link>.
              The build SHA is shown at the bottom of the sidebar — paste it into bug reports.
            </p>
          </div>
          <AlertCircle size={14} className="text-subtle shrink-0 mt-1" />
        </div>
      )}
    </div>
  );
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
    rose:  "bg-rose-50 text-rose-700 ring-rose-200",
    amber: "bg-amber-50 text-amber-700 ring-amber-200",
    brand: "bg-brand-50 text-brand-700 ring-brand-200",
  };
  const heading =
    days === 7 ? "Last call (≤ 7 days)"
    : days === 30 ? "Expiring soon (≤ 30 days)"
    : "Within 90 days";
  return (
    <div className={`rounded-2xl bg-card border border-line p-5 ring-1 ring-inset ${colours[tone]}`}>
      <p className="text-[10px] uppercase tracking-[0.22em] font-semibold text-subtle">{heading}</p>
      <p className="text-2xl font-bold text-fg mt-2 font-mono tabular-nums">
        {credits.toLocaleString()}
        <span className="text-sm font-semibold text-muted ml-1">credits</span>
      </p>
      <p className="text-xs text-muted mt-1">
        Across {users.toLocaleString()} trainee{users === 1 ? "" : "s"}
      </p>
    </div>
  );
}

function QueueTile({
  icon: Icon, tone, label, count, href, empty,
}: {
  icon: React.ElementType;
  tone: "brand" | "amber" | "violet";
  label: string;
  count: number;
  href: string;
  empty: string;
}) {
  const colours: Record<string, string> = {
    brand:  "bg-brand-50 text-brand-700",
    amber:  "bg-amber-50 text-amber-700",
    violet: "bg-violet-50 text-violet-700",
  };
  return (
    <Link
      href={href}
      className="group bg-card border border-line rounded-2xl p-5 hover:border-brand-300 hover:shadow-md transition-all flex items-start gap-3"
    >
      <div className={`w-10 h-10 rounded-xl ${colours[tone]} flex items-center justify-center shrink-0`}>
        <Icon size={18} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] uppercase tracking-[0.22em] font-semibold text-subtle">Queue</p>
        <p className="text-base font-semibold text-fg leading-tight mt-0.5">{label}</p>
        <p className="text-2xl font-bold text-fg mt-2">{count > 0 ? count : <span className="text-subtle font-normal text-sm">{empty}</span>}</p>
      </div>
      <ArrowRight size={14} className="text-subtle group-hover:text-brand-700 mt-1 transition-colors" />
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
    <div className="bg-card border border-line rounded-2xl p-5 flex items-start gap-3 hover:border-brand-200 transition-colors h-full">
      <div className="w-9 h-9 rounded-xl bg-elevated text-brand-600 border border-line flex items-center justify-center shrink-0">
        <Icon size={16} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] uppercase tracking-[0.22em] font-semibold text-subtle">{label}</p>
        <p className="text-2xl font-bold text-fg mt-0.5">{value}</p>
        {help && <p className="text-xs text-muted mt-0.5">{help}</p>}
      </div>
    </div>
  );
  return href ? <Link href={href} className="block">{inner}</Link> : inner;
}
