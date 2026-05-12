import Link from "next/link";
import { redirect } from "next/navigation";
import {
  BookOpen, Layers, ArrowRight, Plus, TrendingUp, CheckCircle2,
  Clock, AlertCircle, Users, Calendar,
} from "lucide-react";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * /admin/enrollments — overview dashboard for ALL enrollment activity.
 *
 * Two equally-weighted panels (Courses / Pathways) showing the
 * numbers admins actually need at a glance: published item counts,
 * total enrollments, status breakdown, today's new enrollments,
 * pending-review queue depth, and the top items by enrollment.
 *
 * Action bar at the top routes to:
 *   • /admin/enrollments/new            — proper "create enrollment" page
 *   • /admin/enrollments/courses        — full course-enrollment list
 *   • /admin/pathway-enrollments        — pathway-enrollment review queue
 *
 * Replaces the previous page where everything (table + popup-modal
 * action) was crammed onto a single screen.
 */
export default async function AdminEnrollmentsOverviewPage() {
  const session = await requireRole("admin").catch(() => null);
  if (!session) redirect("/dashboard");

  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const since7d  = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [
    publishedCourses, totalCourseEnrollments,
    courseStatusGroups, newCourseEnrollments24h, newCourseEnrollments7d,
    publishedPathways, totalPathwayEnrollments,
    pathwayStatusGroups, newPathwayEnrollments24h,
    topCourses, topPathways,
  ] = await Promise.all([
    prisma.course.count({ where: { status: "published" } }),
    prisma.enrollment.count(),
    prisma.enrollment.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.enrollment.count({ where: { enrolledAt: { gte: since24h } } }),
    prisma.enrollment.count({ where: { enrolledAt: { gte: since7d } } }),

    prisma.pathway.count({ where: { status: "published" } }),
    prisma.pathwayEnrollment.count(),
    prisma.pathwayEnrollment.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.pathwayEnrollment.count({ where: { enrolledAt: { gte: since24h } } }),

    // Top 5 courses by enrollment count.
    prisma.course.findMany({
      where: { status: "published" },
      select: { id: true, title: true, _count: { select: { enrollments: true } } },
      orderBy: { enrollments: { _count: "desc" } },
      take: 5,
    }),
    prisma.pathway.findMany({
      where: { status: "published" },
      select: { id: true, title: true, _count: { select: { enrollments: true } } },
      orderBy: { enrollments: { _count: "desc" } },
      take: 5,
    }),
  ]);

  const courseStatus = mapStatusCounts(courseStatusGroups);
  const pathwayStatus = mapStatusCounts(pathwayStatusGroups);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <header>
        <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-subtle">
          Admin · Engage
        </p>
        <h1 className="text-2xl sm:text-3xl font-bold text-fg mt-1 tracking-tight">
          Enrollment Management
        </h1>
        <p className="text-sm text-muted mt-2 leading-snug max-w-3xl">
          Overview of course and pathway enrollment health. Use the actions
          below to create new enrollments, drill into a per-row list, or
          handle pending pathway requests.
        </p>
      </header>

      {/* Action bar */}
      <div className="flex flex-wrap items-center gap-2">
        <Link
          href="/admin/enrollments/new"
          className="inline-flex items-center gap-1.5 rounded-xl bg-brand-600 text-white px-4 py-2 text-sm font-bold hover:bg-brand-700 surface-shadow"
        >
          <Plus size={14} /> New enrollment
        </Link>
        <Link
          href="/admin/enrollments/courses"
          className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-card text-fg px-4 py-2 text-sm font-bold hover:border-brand-300"
        >
          <BookOpen size={14} /> Course enrollments list
        </Link>
        <Link
          href="/admin/pathway-enrollments"
          className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-card text-fg px-4 py-2 text-sm font-bold hover:border-brand-300"
        >
          <Layers size={14} /> Pathway enrollment queue
        </Link>
      </div>

      {/* Two equally-weighted panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* ── COURSES ─────────────────────────────────────────── */}
        <section className="rounded-2xl border border-line bg-card p-5 surface-shadow space-y-4">
          <header className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-fg tracking-tight inline-flex items-center gap-2">
              <BookOpen size={18} className="text-brand-600" />
              Courses
            </h2>
            <Link
              href="/admin/enrollments/courses"
              className="text-xs font-semibold text-brand-700 hover:underline inline-flex items-center gap-1"
            >
              Manage <ArrowRight size={11} />
            </Link>
          </header>

          <div className="grid grid-cols-3 gap-3">
            <StatTile
              icon={BookOpen}
              label="Published"
              value={publishedCourses}
              hint="Live in catalog"
            />
            <StatTile
              icon={Users}
              label="Enrollments"
              value={totalCourseEnrollments}
              hint="All time"
              big
            />
            <StatTile
              icon={TrendingUp}
              label="New (24h)"
              value={newCourseEnrollments24h}
              hint={`${newCourseEnrollments7d} this week`}
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <MiniStat icon={Clock}        label="Active"     value={courseStatus.active}     tone="brand"  />
            <MiniStat icon={CheckCircle2} label="Completed"  value={courseStatus.completed}  tone="emerald" />
            <MiniStat icon={AlertCircle}  label="Withdrawn"  value={courseStatus.withdrawn}  tone="slate" />
            <MiniStat icon={AlertCircle}  label="Other"      value={
              totalCourseEnrollments - courseStatus.active - courseStatus.completed - courseStatus.withdrawn
            } tone="amber" />
          </div>

          <div className="pt-2 border-t border-line">
            <p className="text-[10px] uppercase tracking-[0.18em] font-bold text-subtle mb-2">
              Top courses by enrollment
            </p>
            {topCourses.length === 0 ? (
              <p className="text-xs text-muted italic">No published courses yet.</p>
            ) : (
              <ul className="space-y-1.5">
                {topCourses.map((c) => (
                  <li key={c.id} className="flex items-center justify-between text-sm">
                    <Link
                      href={`/courses/${c.id}`}
                      className="text-fg hover:text-brand-700 truncate"
                    >
                      {c.title}
                    </Link>
                    <span className="text-xs font-mono tabular-nums text-muted">
                      {c._count.enrollments}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* ── PATHWAYS ────────────────────────────────────────── */}
        <section className="rounded-2xl border border-line bg-card p-5 surface-shadow space-y-4">
          <header className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-fg tracking-tight inline-flex items-center gap-2">
              <Layers size={18} className="text-brand-600" />
              Learning pathways
            </h2>
            <Link
              href="/admin/pathway-enrollments"
              className="text-xs font-semibold text-brand-700 hover:underline inline-flex items-center gap-1"
            >
              Manage <ArrowRight size={11} />
            </Link>
          </header>

          <div className="grid grid-cols-3 gap-3">
            <StatTile
              icon={Layers}
              label="Published"
              value={publishedPathways}
              hint="Live pathways"
            />
            <StatTile
              icon={Users}
              label="Enrollments"
              value={totalPathwayEnrollments}
              hint="All time"
              big
            />
            <StatTile
              icon={TrendingUp}
              label="New (24h)"
              value={newPathwayEnrollments24h}
              hint=""
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <MiniStat icon={Clock}        label="Pending"    value={pathwayStatus.pending}    tone="amber" />
            <MiniStat icon={CheckCircle2} label="Approved"   value={pathwayStatus.approved}   tone="brand" />
            <MiniStat icon={Calendar}     label="Waitlist"   value={pathwayStatus.waitlisted} tone="amber" />
            <MiniStat icon={CheckCircle2} label="Completed"  value={pathwayStatus.completed}  tone="emerald" />
          </div>

          {pathwayStatus.pending > 0 && (
            <div className="rounded-xl bg-amber-50 ring-1 ring-inset ring-amber-200 px-3 py-2 text-xs text-amber-900 inline-flex items-start gap-2">
              <AlertCircle size={11} className="text-amber-700 shrink-0 mt-0.5" />
              <span>
                <strong>{pathwayStatus.pending} pending request{pathwayStatus.pending === 1 ? "" : "s"}</strong> waiting on admin review.{" "}
                <Link href="/admin/pathway-enrollments" className="font-semibold underline hover:no-underline">
                  Review now →
                </Link>
              </span>
            </div>
          )}

          <div className="pt-2 border-t border-line">
            <p className="text-[10px] uppercase tracking-[0.18em] font-bold text-subtle mb-2">
              Top pathways by enrollment
            </p>
            {topPathways.length === 0 ? (
              <p className="text-xs text-muted italic">No published pathways yet.</p>
            ) : (
              <ul className="space-y-1.5">
                {topPathways.map((p) => (
                  <li key={p.id} className="flex items-center justify-between text-sm">
                    <Link
                      href={`/pathways/${p.id}`}
                      className="text-fg hover:text-brand-700 truncate"
                    >
                      {p.title}
                    </Link>
                    <span className="text-xs font-mono tabular-nums text-muted">
                      {p._count.enrollments}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

interface StatusCounts {
  active: number;
  completed: number;
  withdrawn: number;
  pending: number;
  approved: number;
  waitlisted: number;
  rejected: number;
}

function mapStatusCounts(rows: { status: string; _count: { _all: number } }[]): StatusCounts {
  const base: StatusCounts = {
    active: 0, completed: 0, withdrawn: 0,
    pending: 0, approved: 0, waitlisted: 0, rejected: 0,
  };
  for (const r of rows) {
    if (r.status in base) (base as unknown as Record<string, number>)[r.status] = r._count._all;
  }
  return base;
}

function StatTile({
  icon: Icon, label, value, hint, big,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  hint: string;
  big?: boolean;
}) {
  return (
    <div className="rounded-xl border border-line bg-bg p-3">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.16em] font-bold text-subtle">
        <Icon size={11} />
        {label}
      </div>
      <p className={`font-bold font-mono tabular-nums text-fg mt-1 ${big ? "text-3xl" : "text-2xl"}`}>
        {value.toLocaleString()}
      </p>
      {hint && <p className="text-[11px] text-muted mt-0.5">{hint}</p>}
    </div>
  );
}

function MiniStat({
  icon: Icon, label, value, tone,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  tone: "brand" | "emerald" | "amber" | "slate";
}) {
  const colours: Record<string, string> = {
    brand:   "text-brand-700",
    emerald: "text-emerald-700",
    amber:   "text-amber-700",
    slate:   "text-slate-600",
  };
  return (
    <div className="rounded-lg bg-bg border border-line px-2.5 py-1.5">
      <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-subtle">
        <Icon size={9} />
        {label}
      </div>
      <p className={`text-base font-bold font-mono tabular-nums ${colours[tone]}`}>
        {value.toLocaleString()}
      </p>
    </div>
  );
}
