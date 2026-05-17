import Link from "next/link";
import { redirect } from "next/navigation";
import {
  BookOpen, Layers, ArrowRight, TrendingUp, CheckCircle2,
  Clock, AlertCircle, Users, Calendar,
} from "lucide-react";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PendingEnrollmentRequests, type PendingRequest } from "@/components/admin/PendingEnrollmentRequests";
import { DemoPhantomTray, type DemoScenario } from "@/components/admin/DemoPhantomTray";
import { GraduationCap } from "lucide-react";
import { PageHero } from "@/components/ui/PageHero";

/**
 * /admin/enrollments — overview dashboard for ALL enrollment activity.
 *
 * Three vertical sections:
 *   1. Two equally-weighted stat panels (Courses + Pathways) — same
 *      shape as before, no top action bar; each panel still has its
 *      own "Manage →" link to the deeper page.
 *   2. Pending enrollment requests pool — grouped by which course /
 *      pathway each requester is trying to enrol in. Approve / reject
 *      inline.
 *   3. Demo controls — spawn pre-seeded phantom requesters with one
 *      click; clear all phantoms with another.
 *
 * The Courses panel shows status="pending" alongside the other
 * statuses now that some courses can require admin approval.
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
    pendingCourseRows, pendingPathwayRows,
    approvalCourses, allPathways,
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

    // Pending enrollment pool — course requests
    prisma.enrollment.findMany({
      where: { status: "pending" },
      include: {
        course: { select: { id: true, title: true } },
        user:   { select: { id: true, name: true, email: true, accountKind: true } },
      },
      orderBy: { enrolledAt: "asc" },
      take: 200,
    }),
    // Pending enrollment pool — pathway requests
    prisma.pathwayEnrollment.findMany({
      where: { status: "pending" },
      include: {
        pathway: { select: { id: true, title: true } },
      },
      orderBy: { enrolledAt: "asc" },
      take: 200,
    }),

    // Demo-tray pickers — only approval-required courses + every
    // published pathway can be the demo target.
    prisma.course.findMany({
      where: { status: "published", requiresApproval: true },
      select: { id: true, title: true },
      orderBy: { title: "asc" },
    }),
    prisma.pathway.findMany({
      where: { status: "published" },
      select: { id: true, title: true },
      orderBy: { title: "asc" },
    }),
  ]);

  // Pathway requests need user lookups since they don't include user
  // by relation — fetch separately and join.
  const pathwayUserIds = pendingPathwayRows.map((r) => r.userId);
  const pathwayUsers = pathwayUserIds.length
    ? await prisma.user.findMany({
        where: { id: { in: pathwayUserIds } },
        select: { id: true, name: true, email: true, accountKind: true },
      })
    : [];
  const pathwayUserMap = new Map(pathwayUsers.map((u) => [u.id, u]));

  const pendingRequests: PendingRequest[] = [
    ...pendingCourseRows.map((r) => ({
      id: r.id,
      kind: "course" as const,
      targetId: r.course.id,
      targetTitle: r.course.title,
      requestedAt: r.enrolledAt.toISOString(),
      requestReason: null,
      user: {
        id: r.user.id,
        name: r.user.name,
        email: r.user.email,
        accountKind: r.user.accountKind,
      },
    })),
    ...pendingPathwayRows.map((r) => {
      const u = pathwayUserMap.get(r.userId);
      return {
        id: r.id,
        kind: "pathway" as const,
        targetId: r.pathway.id,
        targetTitle: r.pathway.title,
        requestedAt: r.enrolledAt.toISOString(),
        requestReason: r.requestReason,
        user: {
          id: r.userId,
          name: u?.name ?? null,
          email: u?.email ?? "—",
          accountKind: u?.accountKind ?? "real",
        },
      };
    }),
  ];

  const courseStatus = mapStatusCounts(courseStatusGroups);
  const pathwayStatus = mapStatusCounts(pathwayStatusGroups);

  const demoScenarios: DemoScenario[] = [
    {
      kind: "course_enrollment_request",
      label: approvalCourses.length === 0
        ? "Pending course request (no approval-required courses yet)"
        : "Pending course request",
      options: approvalCourses.map((c) => ({ id: c.id, label: c.title })),
    },
    {
      kind: "pathway_enrollment_request",
      label: allPathways.length === 0
        ? "Pending pathway request (no published pathways yet)"
        : "Pending pathway request",
      options: allPathways.map((p) => ({ id: p.id, label: p.title })),
    },
  ];

  return (
    <div>
      <PageHero
        eyebrow={<><GraduationCap size={11} /> Admin · ENGAGE</>}
        title="Enrollment Management"
        description="Overview of course and pathway enrollment health. Use the panel links to drill into the full per-row lists, or work through the pending-request pool below to approve / reject incoming requests."
      />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-6">

      {/* Two equally-weighted panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
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
            <StatTile icon={BookOpen}     label="Published"   value={publishedCourses}        hint="Live in catalog" />
            <StatTile icon={Users}        label="Enrollments" value={totalCourseEnrollments}  hint="All time" big />
            <StatTile icon={TrendingUp}   label="New (24h)"   value={newCourseEnrollments24h} hint={`${newCourseEnrollments7d} this week`} />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
            <MiniStat icon={Clock}        label="Pending"    value={courseStatus.pending}    tone="amber" />
            <MiniStat icon={Clock}        label="Active"     value={courseStatus.active}     tone="brand"  />
            <MiniStat icon={CheckCircle2} label="Completed"  value={courseStatus.completed}  tone="emerald" />
            <MiniStat icon={AlertCircle}  label="Withdrawn"  value={courseStatus.withdrawn}  tone="slate" />
            <MiniStat icon={AlertCircle}  label="Other"      value={
              totalCourseEnrollments - courseStatus.active - courseStatus.completed - courseStatus.withdrawn - courseStatus.pending
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
                    <Link href={`/courses/${c.id}`} className="text-fg hover:text-brand-700 truncate">
                      {c.title}
                    </Link>
                    <span className="text-xs font-mono tabular-nums text-muted">{c._count.enrollments}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

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
            <StatTile icon={Layers}     label="Published"   value={publishedPathways}        hint="Live pathways" />
            <StatTile icon={Users}      label="Enrollments" value={totalPathwayEnrollments}  hint="All time" big />
            <StatTile icon={TrendingUp} label="New (24h)"   value={newPathwayEnrollments24h} hint="" />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <MiniStat icon={Clock}        label="Pending"    value={pathwayStatus.pending}    tone="amber" />
            <MiniStat icon={CheckCircle2} label="Approved"   value={pathwayStatus.approved}   tone="brand" />
            <MiniStat icon={Calendar}     label="Waitlist"   value={pathwayStatus.waitlisted} tone="amber" />
            <MiniStat icon={CheckCircle2} label="Completed"  value={pathwayStatus.completed}  tone="emerald" />
          </div>

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
                    <Link href={`/pathways/${p.id}`} className="text-fg hover:text-brand-700 truncate">
                      {p.title}
                    </Link>
                    <span className="text-xs font-mono tabular-nums text-muted">{p._count.enrollments}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>

      {/* Pending request pool, grouped by target */}
      <PendingEnrollmentRequests initialRequests={pendingRequests} />

      {/* Demo controls */}
      <DemoPhantomTray
        scenarios={demoScenarios}
        contextLabel="enrollment requests"
      />
      </div>
    </div>
  );
}

interface StatusCounts {
  active: number; completed: number; withdrawn: number;
  pending: number; approved: number; waitlisted: number; rejected: number;
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
        <Icon size={11} /> {label}
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
        <Icon size={9} /> {label}
      </div>
      <p className={`text-base font-bold font-mono tabular-nums ${colours[tone]}`}>
        {value.toLocaleString()}
      </p>
    </div>
  );
}
