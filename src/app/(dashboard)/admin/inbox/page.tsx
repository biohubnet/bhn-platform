import Link from "next/link";
import {
  Inbox, ArrowRight, UserCog, Coins, Layers, Building2,
  AlertCircle, CheckCircle2, Calendar,
} from "lucide-react";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHero } from "@/components/ui/PageHero";

export const dynamic = "force-dynamic";

/**
 * Admin "letter box" — one place to see everything waiting on an
 * admin's review. The four streams that funnel here are existing
 * pages (still individually accessible via the sidebar); this page
 * is a hub, not a replacement.
 */
export default async function AdminInboxPage() {
  await requireRole("admin");

  const [
    pendingRoleChanges,
    pendingCreditApps,
    pendingPathwayEnrolments,
    pendingAccessRequests,
    recentRoleChanges,
    recentCreditApps,
    recentPathway,
    recentAccess,
  ] = await Promise.all([
    prisma.roleChangeRequest.count({ where: { status: "pending" } }).catch(() => 0),
    prisma.creditApplication.count({ where: { status: "pending" } }).catch(() => 0),
    prisma.pathwayEnrollment.count({ where: { status: "pending" } }).catch(() => 0),
    prisma.accessRequest.count({ where: { status: "pending" } }).catch(() => 0),

    prisma.roleChangeRequest.findMany({
      where: { status: "pending" },
      orderBy: { createdAt: "desc" },
      take: 6,
      include: { user: { select: { name: true, email: true } } },
    }).catch(() => []),
    prisma.creditApplication.findMany({
      where: { status: "pending" },
      orderBy: { submittedAt: "desc" },
      take: 6,
      include: { user: { select: { name: true, email: true } } },
    }).catch(() => []),
    prisma.pathwayEnrollment.findMany({
      where: { status: "pending" },
      orderBy: { enrolledAt: "desc" },
      take: 6,
      include: { pathway: { select: { title: true } } },
    }).catch(() => []),
    prisma.accessRequest.findMany({
      where: { status: "pending" },
      orderBy: { createdAt: "desc" },
      take: 6,
    }).catch(() => []),
  ]);

  const total = pendingRoleChanges + pendingCreditApps + pendingPathwayEnrolments + pendingAccessRequests;

  // Combine everything into a single time-ordered feed for the
  // unified-view at the bottom.
  type Row = {
    kind: string;
    icon: React.ElementType;
    iconCls: string;
    title: string;
    subtitle: string;
    href: string;
    at: Date;
  };
  const rows: Row[] = [
    ...recentRoleChanges.map((r) => ({
      kind: "Role change",
      icon: UserCog,
      iconCls: "bg-amber-50 text-amber-700 border-amber-200",
      title: `${r.user?.name ?? r.user?.email ?? "user"} → ${r.toRole}`,
      subtitle: r.fromRole ? `from ${r.fromRole}` : "",
      href: "/admin/role-requests",
      at: r.createdAt,
    })),
    ...recentCreditApps.map((c) => ({
      kind: "Credit application",
      icon: Coins,
      iconCls: "bg-emerald-50 text-emerald-700 border-emerald-200",
      title: `${c.user?.name ?? c.user?.email ?? "user"} · ${Math.round(c.requestedAmount)} credits`,
      subtitle: c.organization ?? "",
      href: "/admin/credit-applications",
      at: c.submittedAt,
    })),
    ...recentPathway.map((p) => ({
      kind: "Pathway enrolment",
      icon: Layers,
      iconCls: "bg-violet-50 text-violet-700 border-violet-200",
      title: p.pathway.title,
      subtitle: p.requestReason ? p.requestReason.slice(0, 80) : "",
      href: "/admin/pathway-enrollments",
      at: p.enrolledAt,
    })),
    ...recentAccess.map((a) => ({
      kind: "Access request",
      icon: Building2,
      iconCls: "bg-brand-50 text-brand-700 border-brand-200",
      title: `${a.kind === "employer" ? "Employer" : "Trainee"} · ${a.name ?? a.email}`,
      subtitle: a.company ?? "",
      href: "/admin/access-requests",
      at: a.createdAt,
    })),
  ].sort((a, b) => b.at.getTime() - a.at.getTime()).slice(0, 12);

  return (
    <div className="space-y-6">
      <PageHero
        eyebrow={<><Inbox size={11} /> Admin</>}
        title="Admin inbox"
        description="Everything waiting on admin review, in one place. Each stream still has its own dedicated page in the sidebar — this is the hub for what needs my attention."
      />

      {total === 0 ? (
        <section className="bg-card border border-line rounded-2xl p-16 text-center">
          <CheckCircle2 size={32} className="mx-auto text-emerald-500 mb-3" />
          <p className="font-semibold text-fg">All caught up</p>
          <p className="text-sm text-muted mt-1">Nothing in any of the four queues. Treat yourself.</p>
        </section>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Lane
            href="/admin/role-requests"
            icon={UserCog}
            label="Role changes"
            count={pendingRoleChanges}
            tone="amber"
          />
          <Lane
            href="/admin/credit-applications"
            icon={Coins}
            label="Credit apps"
            count={pendingCreditApps}
            tone="emerald"
          />
          <Lane
            href="/admin/pathway-enrollments"
            icon={Layers}
            label="Pathway enrolments"
            count={pendingPathwayEnrolments}
            tone="violet"
          />
          <Lane
            href="/admin/access-requests"
            icon={Building2}
            label="Access requests"
            count={pendingAccessRequests}
            tone="brand"
          />
        </div>
      )}

      {rows.length > 0 && (
        <section className="bg-card border border-line rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-fg inline-flex items-center gap-2">
              <Calendar size={15} className="text-brand-600" /> Most recent
            </h2>
            <span className="text-[11px] text-subtle">{rows.length} of {total}</span>
          </div>
          <ul className="divide-y divide-line">
            {rows.map((r, i) => (
              <li key={i} className="flex items-center gap-3 py-2.5">
                <span className={`w-8 h-8 rounded-md border flex items-center justify-center shrink-0 ${r.iconCls}`}>
                  <r.icon size={14} />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] uppercase tracking-wider text-subtle font-semibold">{r.kind}</p>
                  <p className="text-sm text-fg truncate">{r.title}</p>
                  {r.subtitle && <p className="text-xs text-muted truncate">{r.subtitle}</p>}
                </div>
                <p className="text-[11px] text-subtle shrink-0">
                  {new Date(r.at).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                </p>
                <Link
                  href={r.href}
                  className="text-xs font-medium text-brand-600 hover:text-brand-700 inline-flex items-center gap-1 shrink-0"
                >
                  Review <ArrowRight size={11} />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function Lane({
  href, icon: Icon, label, count, tone,
}: {
  href: string;
  icon: React.ElementType;
  label: string;
  count: number;
  tone: "amber" | "emerald" | "violet" | "brand";
}) {
  const cls =
    tone === "amber"   ? "bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100"
  : tone === "emerald" ? "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100"
  : tone === "violet"  ? "bg-violet-50 border-violet-200 text-violet-700 hover:bg-violet-100"
                       : "bg-brand-50 border-brand-200 text-brand-700 hover:bg-brand-100";
  const empty = count === 0;
  return (
    <Link
      href={href}
      className={empty
        ? "rounded-xl border px-4 py-3 bg-card-solid border-line text-subtle"
        : `rounded-xl border px-4 py-3 transition-colors ${cls}`
      }
    >
      <div className="flex items-center justify-between mb-1">
        <Icon size={15} />
        {empty ? (
          <span className="text-[10px] uppercase tracking-wider">empty</span>
        ) : (
          <ArrowRight size={11} />
        )}
      </div>
      <p className="text-2xl font-bold leading-none tabular-nums mt-1">{count}</p>
      <p className="text-[11px] uppercase tracking-wider font-semibold mt-1.5 opacity-90">{label}</p>
    </Link>
  );
}
