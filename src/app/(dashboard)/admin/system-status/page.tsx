import {
  ShieldCheck, Database, Activity, AlertTriangle, CheckCircle2, KeyRound,
  Users, Sparkles, Clock, GitCommit, Cpu, ServerCrash, UserCog, Building2,
  ScrollText, Zap, Eye, Beaker,
} from "lucide-react";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

interface RowCount { table: string; count: number; }
interface KindStat { kind: string; total: number; failed: number; avgMs: number; }

export default async function SystemStatusPage() {
  await requireRole("superadmin");

  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const since7d  = new Date(Date.now() - 7  * 24 * 60 * 60 * 1000);
  const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const since90d = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

  // -- DB ping (latency = round-trip on a trivial query) ---------------
  const pingStart = Date.now();
  let dbOk = true;
  let dbLatencyMs = 0;
  try {
    await prisma.$queryRawUnsafe("SELECT 1");
    dbLatencyMs = Date.now() - pingStart;
  } catch {
    dbOk = false;
  }

  // -- Core counts in parallel ----------------------------------------
  const [
    userCount, activeUserCount, deactivatedCount, inactive90dCount,
    superadminCount, adminCount, instructorCount, employerCount,
    sessionCount,
    courseCount, publishedCount,
    enrollCount, enroll24h,
    aiTotal, ai24h, ai7d, aiFailed7d,
    auditTotal, audit24h, recentAudit,
    pendingRoleChanges, pendingCreditApps, pendingPathwayApps,
    pendingInvites, expiredInvites,
    submissionCount, internshipCount,
    translationCount,
    aiByKind,
    avgAiLatency,
    recentRoleAudits,
    recentLogins,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { isActive: true } }),
    prisma.user.count({ where: { isActive: false } }),
    prisma.user.count({
      where: {
        OR: [
          { lastLoginAt: { lt: since90d } },
          { lastLoginAt: null, createdAt: { lt: since90d } },
        ],
      },
    }),
    prisma.user.count({ where: { role: "superadmin" } }),
    prisma.user.count({ where: { role: "admin" } }),
    prisma.user.count({ where: { role: "instructor" } }),
    prisma.user.count({ where: { role: "employer" } }),
    prisma.session.count().catch(() => 0),
    prisma.course.count(),
    prisma.course.count({ where: { status: "published" } }),
    prisma.enrollment.count(),
    prisma.enrollment.count({ where: { enrolledAt: { gt: since24h } } }),
    prisma.aIInteraction.count(),
    prisma.aIInteraction.count({ where: { createdAt: { gt: since24h } } }),
    prisma.aIInteraction.count({ where: { createdAt: { gt: since7d } } }),
    prisma.aIInteraction.count({ where: { createdAt: { gt: since7d }, success: false } }),
    prisma.auditLog.count(),
    prisma.auditLog.count({ where: { createdAt: { gt: since24h } } }),
    prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { actor: { select: { name: true, email: true, role: true } } },
    }).catch(() => []),
    prisma.roleChangeRequest.count({ where: { status: "pending" } }).catch(() => 0),
    prisma.creditApplication.count({ where: { status: "pending" } }).catch(() => 0),
    prisma.pathwayEnrollment.count({ where: { status: "pending" } }).catch(() => 0),
    prisma.employerInvite.count({ where: { usedAt: null, expiresAt: { gt: new Date() } } }).catch(() => 0),
    prisma.employerInvite.count({ where: { usedAt: null, expiresAt: { lt: new Date() } } }).catch(() => 0),
    prisma.eventFormSubmission.count(),
    prisma.internshipPosting.count(),
    prisma.translation.count().catch(() => 0),
    // AI usage by kind in last 30 days
    prisma.aIInteraction.groupBy({
      by: ["kind"],
      where: { createdAt: { gt: since30d } },
      _count: { _all: true },
      _sum: { latencyMs: true },
    }).catch(() => [] as { kind: string; _count: { _all: number }; _sum: { latencyMs: number | null } }[]),
    prisma.aIInteraction.aggregate({
      where: { createdAt: { gt: since7d }, latencyMs: { not: null } },
      _avg: { latencyMs: true },
    }).catch(() => ({ _avg: { latencyMs: null } as { latencyMs: number | null } })),
    prisma.auditLog.findMany({
      where: { action: { contains: "role" }, createdAt: { gt: since30d } },
      include: { actor: { select: { name: true, email: true } } },
      orderBy: { createdAt: "desc" },
      take: 5,
    }).catch(() => []),
    prisma.user.findMany({
      where: { lastLoginAt: { gt: since24h } },
      select: { id: true, name: true, email: true, role: true, lastLoginAt: true },
      orderBy: { lastLoginAt: "desc" },
      take: 8,
    }).catch(() => []),
  ]);

  // Failure-by-kind for the AI table needs a second tiny query each.
  // Cap to 6 kinds — we currently have around 6 in the codebase.
  const kindNames = aiByKind.map((k) => k.kind).slice(0, 6);
  const failedPerKind = await Promise.all(
    kindNames.map((k) =>
      prisma.aIInteraction.count({
        where: { kind: k, success: false, createdAt: { gt: since30d } },
      }).catch(() => 0)
    )
  );

  const aiKindStats: KindStat[] = aiByKind.slice(0, 6).map((k, i) => ({
    kind: k.kind,
    total: k._count._all,
    failed: failedPerKind[i] ?? 0,
    avgMs: k._count._all > 0 && k._sum.latencyMs
      ? Math.round((k._sum.latencyMs as number) / k._count._all)
      : 0,
  }));

  const aiFailureRate7d = ai7d > 0 ? Math.round((aiFailed7d / ai7d) * 100) : 0;

  const tables: RowCount[] = [
    { table: "User",                count: userCount },
    { table: "Course",              count: courseCount },
    { table: "Enrollment",          count: enrollCount },
    { table: "AIInteraction",       count: aiTotal },
    { table: "AuditLog",            count: auditTotal },
    { table: "EventFormSubmission", count: submissionCount },
    { table: "InternshipPosting",   count: internshipCount },
    { table: "Translation",         count: translationCount },
    { table: "Session",             count: sessionCount },
  ];

  // Roll-up overall health
  const healthFlags: { tone: "ok" | "warn" | "crit"; label: string; reason?: string }[] = [];
  healthFlags.push(dbOk
    ? { tone: dbLatencyMs < 250 ? "ok" : "warn", label: "Database", reason: `${dbLatencyMs}ms ping` }
    : { tone: "crit", label: "Database", reason: "Ping failed" });
  healthFlags.push({
    tone: aiFailureRate7d > 10 ? "warn" : "ok",
    label: "AI provider",
    reason: ai7d > 0 ? `${aiFailureRate7d}% failure (7d)` : "no calls",
  });
  healthFlags.push({
    tone: superadminCount === 1 ? "warn" : "ok",
    label: "Superadmins",
    reason: `${superadminCount} on file${superadminCount === 1 ? " — single point of failure" : ""}`,
  });
  healthFlags.push({
    tone: pendingRoleChanges + pendingCreditApps + pendingPathwayApps > 20 ? "warn" : "ok",
    label: "Action queue",
    reason: `${pendingRoleChanges + pendingCreditApps + pendingPathwayApps} pending`,
  });
  const worst = healthFlags.some((f) => f.tone === "crit")
    ? "crit"
    : healthFlags.some((f) => f.tone === "warn") ? "warn" : "ok";
  const overallTone = worst;

  const sha = process.env.NEXT_PUBLIC_COMMIT_SHA || "(local)";

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-fg flex items-center gap-2">
          <ShieldCheck size={20} className="text-brand-600" />
          System status
        </h1>
        <p className="text-sm text-muted mt-1">
          Read-only diagnostics for the platform — DB health, AI usage, and security signals at a glance.
        </p>
      </header>

      {/* Overall health summary */}
      <section className={`rounded-2xl p-5 border ${
        overallTone === "ok"
          ? "bg-emerald-50 border-emerald-200"
          : overallTone === "warn"
            ? "bg-amber-50 border-amber-200"
            : "bg-rose-50 border-rose-200"
      }`}>
        <div className="flex items-start gap-3 mb-3">
          {overallTone === "ok" ? <CheckCircle2 size={22} className="text-emerald-700 mt-0.5" />
            : overallTone === "warn" ? <AlertTriangle size={22} className="text-amber-700 mt-0.5" />
            : <ServerCrash size={22} className="text-rose-700 mt-0.5" />}
          <div>
            <p className="font-semibold text-fg">
              {overallTone === "ok" ? "All systems nominal" : overallTone === "warn" ? "One or more warnings" : "Critical issue"}
            </p>
            <p className="text-sm text-muted mt-0.5">
              Build <code className="font-mono text-xs bg-card-solid border border-line rounded px-1.5 py-0.5">{sha}</code>
              {" "}· DB ping {dbLatencyMs}ms · {superadminCount} superadmin{superadminCount === 1 ? "" : "s"}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {healthFlags.map((f) => (
            <Pill key={f.label} tone={f.tone} label={f.label} reason={f.reason} />
          ))}
        </div>
      </section>

      {/* Vitals — 4 hero stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Vital icon={Users}     label="Active users"   value={activeUserCount} sub={`${userCount} total · ${deactivatedCount} disabled`} />
        <Vital icon={Sparkles}  label="AI calls (24h)" value={ai24h}           sub={`${aiFailureRate7d}% failure 7d`} />
        <Vital icon={Database}  label="DB ping"        value={`${dbLatencyMs}ms`} sub={dbOk ? "Healthy" : "Failed"} />
        <Vital icon={GitCommit} label="Build commit"   value={sha}             sub="Inlined at build time" mono />
      </div>

      {/* Sandboxes moved to their own page — link out so admins can find it. */}
      <Section icon={Beaker} title="Sandbox accounts" aside="Moved to its own page">
        <a
          href="/admin/sandboxes"
          className="block bg-elevated/40 border border-line rounded-lg p-3 hover:border-brand-300 transition-colors group"
        >
          <p className="text-sm font-medium text-fg group-hover:text-brand-700 transition-colors">
            Open sandbox accounts →
          </p>
          <p className="text-xs text-muted mt-0.5">
            Spawn / reset / delete your dummy Employer HR + Trainee pair. See other admins&apos; sandboxes too.
          </p>
        </a>
      </Section>

      {/* Database section */}
      <Section icon={Database} title="Database">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
          {tables.map((t) => (
            <div key={t.table} className="bg-elevated/40 border border-line rounded-lg px-3 py-2 flex items-center justify-between">
              <span className="text-xs text-muted font-mono">{t.table}</span>
              <span className="text-sm font-semibold text-fg">{t.count.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </Section>

      {/* AI usage section */}
      <Section icon={Activity} title={`AI usage (last 30d)`} aside={`${aiTotal.toLocaleString()} all-time · avg latency ${Math.round(avgAiLatency._avg.latencyMs ?? 0)}ms 7d`}>
        {aiKindStats.length === 0 ? (
          <p className="text-sm text-muted">No AI calls in the last 30 days.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-[10px] uppercase tracking-wider text-subtle">
              <tr>
                <th className="text-left py-1 pr-2">Feature</th>
                <th className="text-right py-1 px-2">Calls</th>
                <th className="text-right py-1 px-2">Failed</th>
                <th className="text-right py-1 px-2">Failure %</th>
                <th className="text-right py-1 pl-2">Avg latency</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {aiKindStats.map((s) => {
                const failPct = s.total ? Math.round((s.failed / s.total) * 100) : 0;
                return (
                  <tr key={s.kind}>
                    <td className="py-2 pr-2 font-mono text-xs text-fg">{s.kind}</td>
                    <td className="py-2 px-2 text-right">{s.total.toLocaleString()}</td>
                    <td className="py-2 px-2 text-right">{s.failed.toLocaleString()}</td>
                    <td className={`py-2 px-2 text-right font-medium ${failPct >= 10 ? "text-rose-700" : failPct >= 1 ? "text-amber-700" : "text-emerald-700"}`}>
                      {failPct}%
                    </td>
                    <td className="py-2 pl-2 text-right text-subtle">{s.avgMs}ms</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Section>

      {/* Security signals section */}
      <Section icon={ShieldCheck} title="Security signals">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Signal
            tone={superadminCount === 1 ? "warn" : "ok"}
            icon={KeyRound}
            label="Privileged accounts"
            metric={`${superadminCount} superadmin · ${adminCount} admin`}
            note={superadminCount === 1 ? "Single superadmin — add a backup so a lock-out doesn't strand you." : "Healthy redundancy."}
          />
          <Signal
            tone={pendingRoleChanges > 0 ? "warn" : "ok"}
            icon={UserCog}
            label="Role-change requests"
            metric={`${pendingRoleChanges} pending`}
            note={pendingRoleChanges > 0 ? "Review at /admin/role-requests." : "Nothing waiting."}
          />
          <Signal
            tone={inactive90dCount > userCount * 0.4 ? "warn" : "ok"}
            icon={Clock}
            label="Inactive accounts"
            metric={`${inactive90dCount} idle 90+ days`}
            note="Idle accounts are more likely to be compromised. Consider deactivating."
          />
          <Signal
            tone={expiredInvites > 0 ? "warn" : "ok"}
            icon={Building2}
            label="Employer invites"
            metric={`${pendingInvites} pending · ${expiredInvites} expired unused`}
            note={expiredInvites > 0 ? "Expired invites stay around for the audit trail; revoke if obsolete." : "Tidy."}
          />
          <Signal
            tone={deactivatedCount > 0 ? "ok" : "ok"}
            icon={Eye}
            label="Deactivated accounts"
            metric={`${deactivatedCount} disabled`}
            note="Visible in /admin/users but cannot sign in."
          />
          <Signal
            tone="ok"
            icon={Cpu}
            label="Sessions"
            metric={`${sessionCount} active in NextAuth`}
            note="Approximate — JWT sessions don't all get a row here."
          />
        </div>
      </Section>

      {/* Recent role-related audit entries — escalation hot list */}
      <Section icon={Zap} title="Recent role-related audit entries (30d)">
        {recentRoleAudits.length === 0 ? (
          <p className="text-sm text-muted">No role-related events in the last 30 days.</p>
        ) : (
          <ul className="divide-y divide-line">
            {recentRoleAudits.map((a) => (
              <li key={a.id} className="flex items-center gap-3 py-2.5">
                <div className="w-7 h-7 rounded-md bg-elevated text-amber-700 flex items-center justify-center shrink-0">
                  <UserCog size={13} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-fg truncate">{a.action}</p>
                  <p className="text-xs text-muted truncate">
                    {a.actor?.name ?? a.actor?.email ?? "system"}
                    {a.targetType && ` · ${a.targetType}${a.targetId ? ` ${a.targetId.slice(0, 8)}…` : ""}`}
                  </p>
                </div>
                <p className="text-[11px] text-subtle shrink-0">
                  {new Date(a.createdAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {/* Recent logins (24h) */}
      <Section icon={Users} title="Recent logins (24h)">
        {recentLogins.length === 0 ? (
          <p className="text-sm text-muted">No logins in the last 24 hours.</p>
        ) : (
          <ul className="divide-y divide-line">
            {recentLogins.map((u) => (
              <li key={u.id} className="flex items-center gap-3 py-2.5">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-white text-[10px] flex items-center justify-center shrink-0 font-bold">
                  {(u.name?.[0] ?? u.email?.[0] ?? "?").toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-fg truncate">{u.name ?? u.email}</p>
                  <p className="text-xs text-muted truncate">{u.role}</p>
                </div>
                <p className="text-[11px] text-subtle shrink-0">
                  {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {/* Audit-log feed */}
      <Section icon={ScrollText} title={`Audit log feed (${audit24h} new in 24h)`}>
        {recentAudit.length === 0 ? (
          <p className="text-sm text-muted">No audit entries yet.</p>
        ) : (
          <ul className="divide-y divide-line">
            {recentAudit.map((a) => (
              <li key={a.id} className="flex items-center gap-3 py-2.5">
                <div className="w-7 h-7 rounded-md bg-elevated text-subtle flex items-center justify-center shrink-0">
                  <ScrollText size={13} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-fg truncate">{a.action}</p>
                  <p className="text-xs text-muted truncate">
                    {a.actor?.name ?? a.actor?.email ?? "system"}
                    {a.actor?.role && ` (${a.actor.role})`}
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
      </Section>
    </div>
  );
}

// ── Small components ───────────────────────────────────────────────

function Pill({
  tone, label, reason,
}: {
  tone: "ok" | "warn" | "crit";
  label: string;
  reason?: string;
}) {
  const cls =
    tone === "ok"   ? "bg-card-solid border-emerald-200 text-emerald-700"
  : tone === "warn" ? "bg-card-solid border-amber-200 text-amber-700"
                    : "bg-card-solid border-rose-200 text-rose-700";
  const dotCls =
    tone === "ok"   ? "bg-emerald-500"
  : tone === "warn" ? "bg-amber-500"
                    : "bg-rose-500";
  return (
    <div className={`rounded-lg border px-3 py-2 ${cls}`}>
      <div className="flex items-center gap-2">
        <span className={`inline-block w-2 h-2 rounded-full ${dotCls}`} />
        <span className="text-xs font-semibold uppercase tracking-wider">{label}</span>
      </div>
      {reason && <p className="text-[11px] mt-1 opacity-80">{reason}</p>}
    </div>
  );
}

function Vital({
  icon: Icon, label, value, sub, mono,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  mono?: boolean;
}) {
  return (
    <div className="bg-card border border-line rounded-2xl p-4">
      <div className="text-[10px] uppercase tracking-[0.22em] font-semibold text-subtle inline-flex items-center gap-1.5">
        <Icon size={11} /> {label}
      </div>
      <p className={`text-2xl font-bold text-fg mt-1.5 truncate ${mono ? "font-mono text-base" : ""}`}>{value}</p>
      {sub && <p className="text-[11px] text-muted mt-0.5">{sub}</p>}
    </div>
  );
}

function Section({
  icon: Icon, title, aside, children,
}: {
  icon: React.ElementType;
  title: string;
  aside?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-card border border-line rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4 gap-3">
        <h2 className="font-semibold text-fg inline-flex items-center gap-2">
          <Icon size={15} className="text-brand-600" /> {title}
        </h2>
        {aside && <p className="text-xs text-subtle truncate">{aside}</p>}
      </div>
      {children}
    </section>
  );
}

function Signal({
  tone, icon: Icon, label, metric, note,
}: {
  tone: "ok" | "warn" | "crit";
  icon: React.ElementType;
  label: string;
  metric: string;
  note?: string;
}) {
  const cls =
    tone === "ok"   ? "border-line"
  : tone === "warn" ? "border-amber-200 bg-amber-50/40"
                    : "border-rose-200 bg-rose-50/40";
  const iconCls =
    tone === "ok"   ? "bg-elevated text-brand-600"
  : tone === "warn" ? "bg-amber-100 text-amber-700"
                    : "bg-rose-100 text-rose-700";
  return (
    <div className={`border rounded-xl p-3 flex items-start gap-3 ${cls}`}>
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${iconCls}`}>
        <Icon size={15} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] uppercase tracking-[0.22em] font-semibold text-subtle">{label}</p>
        <p className="text-sm font-semibold text-fg leading-tight mt-0.5">{metric}</p>
        {note && <p className="text-xs text-muted mt-1 leading-snug">{note}</p>}
      </div>
    </div>
  );
}
