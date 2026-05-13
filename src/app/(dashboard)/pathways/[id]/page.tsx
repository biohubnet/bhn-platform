import { getSession, isStaff as checkIsStaff } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, Circle, Award, Layers, BookOpen, Clock } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { PathwayEnrollButton } from "@/components/lms/PathwayEnrollButton";
import { LeavePathwayButton } from "@/components/lms/LeavePathwayButton";
import { PathwayManageButton } from "@/components/lms/PathwayManageButton";
import { PathwayEnrollmentSettings } from "@/components/admin/PathwayEnrollmentSettings";
import { PathwayCohortManager, type CohortRow } from "@/components/admin/PathwayCohortManager";
import { PathwayCohortPicker, type PublicCohort } from "@/components/lms/PathwayCohortPicker";
import { ThumbnailGenerator } from "@/components/lms/ThumbnailGenerator";
import { resolvePathwayWindow, waitlistPosition } from "@/lib/pathway-enrollment";
import { cohortAvailability } from "@/lib/pathways/cohorts";

interface PathwayCourseRow {
  id: string;
  order: number;
  required: boolean;
  course: {
    id: string;
    title: string;
    status: string;
    duration: number | null;
    category: string | null;
  };
}

export default async function PathwayDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  const role = (session!.user as { role?: string }).role ?? "user";
  const userId = (session!.user as { id?: string }).id!;
  const isStaff = checkIsStaff(role);

  const pathway = await prisma.pathway.findUnique({
    where: { id },
    include: {
      courses: {
        orderBy: { order: "asc" },
        include: { course: { select: { id: true, title: true, status: true, duration: true, category: true } } },
      },
      _count: { select: { enrollments: true, courses: true } },
    },
  });

  if (!pathway) notFound();
  if (!isStaff && pathway.status !== "published") notFound();

  const enrollment = await prisma.pathwayEnrollment.findUnique({
    where: { userId_pathwayId: { userId, pathwayId: id } },
  });
  const window = await resolvePathwayWindow(id);
  const queuePos = enrollment?.status === "waitlisted"
    ? await waitlistPosition(id, enrollment.id)
    : null;

  const courseIds = pathway.courses.map((pc) => pc.courseId);
  const myCourseEnrollments = await prisma.enrollment.findMany({
    where: { userId, courseId: { in: courseIds } },
    select: { courseId: true, status: true, score: true, progress: true },
  });
  const courseStateMap = new Map(myCourseEnrollments.map((e) => [e.courseId, e]));

  const completedCount = myCourseEnrollments.filter((e) => e.status === "completed").length;
  const progress = courseIds.length > 0 ? Math.round((completedCount / courseIds.length) * 100) : 0;

  const certificate = await prisma.certificate.findUnique({
    where: { userId_pathwayId: { userId, pathwayId: id } },
  });

  // Cohort-mode detection. If ≥ 1 cohort exists we surface them
  // (admin sees the manager; trainees see the picker + state badges).
  const cohorts = await cohortAvailability(id);
  const hasCohorts = cohorts.length > 0;
  const adminCohortRows: CohortRow[] = cohorts.map((c) => ({
    id: c.id,
    slug: c.slug,
    name: c.name,
    description: c.description,
    startDate: c.startDate.toISOString(),
    endDate: c.endDate?.toISOString() ?? null,
    capacity: c.capacity,
    allowWaitlist: c.allowWaitlist,
    waitlistCapacity: c.waitlistCapacity,
    enrollmentOpensAt: c.enrollmentOpensAt?.toISOString() ?? null,
    enrollmentClosesAt: c.enrollmentClosesAt?.toISOString() ?? null,
    status: c.status,
    displayOrder: c.displayOrder,
    confirmedCount: c.confirmedCount,
    waitlistCount: c.waitlistCount,
    state: c.state,
  }));
  const publicCohortRows: PublicCohort[] = cohorts.map((c) => ({
    id: c.id,
    slug: c.slug,
    name: c.name,
    description: c.description,
    startDate: c.startDate.toISOString(),
    endDate: c.endDate?.toISOString() ?? null,
    capacity: c.capacity,
    confirmedCount: c.confirmedCount,
    waitlistCount: c.waitlistCount,
    state: c.state,
    enrollmentClosesAt: c.enrollmentClosesAt?.toISOString() ?? null,
  }));

  const allCoursesForEdit = isStaff
    ? await prisma.course.findMany({
        select: { id: true, title: true, category: true },
        orderBy: { title: "asc" },
      })
    : [];

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="rounded-[var(--radius-xl)] bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 text-white shadow-xl shadow-brand-900/20 px-8 py-10 relative overflow-hidden">
        {/* AI thumbnail behind the gradient — opacity-controlled so the hero stays readable */}
        {pathway.thumbnail && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={pathway.thumbnail}
            alt=""
            className="absolute inset-0 w-full h-full object-cover opacity-40 mix-blend-overlay"
          />
        )}
        <div className="absolute top-0 right-0 w-72 h-72 bg-white/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-12 -left-12 w-64 h-64 bg-brand-300/10 rounded-full blur-3xl" />
        {isStaff && (
          <div className="absolute top-4 right-4 z-10">
            <ThumbnailGenerator
              endpoint={`/api/admin/pathways/${pathway.id}/thumbnail`}
              currentUrl={pathway.thumbnail}
              compact
            />
          </div>
        )}
        <div className="relative flex items-start justify-between gap-6">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-3">
              <span className="inline-flex items-center gap-1 text-xs font-medium uppercase tracking-wider text-brand-200">
                <Layers size={12} /> Training Pathway
              </span>
              {pathway.category && <span className="text-xs bg-white/15 px-2 py-0.5 rounded">{pathway.category}</span>}
              {pathway.status === "draft" && <Badge tone="warning">Draft</Badge>}
            </div>
            <h1 className="text-3xl font-bold tracking-tight">{pathway.title}</h1>
            {pathway.description && (
              <p className="mt-3 text-brand-100 leading-relaxed max-w-2xl">{pathway.description}</p>
            )}
            <div className="mt-5 flex items-center gap-6 text-sm text-brand-100">
              <span className="inline-flex items-center gap-1.5"><BookOpen size={14} />{pathway._count.courses} courses</span>
              <span className="inline-flex items-center gap-1.5"><Award size={14} />Pathway certificate</span>
            </div>
          </div>

          <div className="shrink-0 flex flex-col items-end gap-2">
            {isStaff && (
              <PathwayManageButton
                mode="edit"
                pathway={{
                  id: pathway.id,
                  title: pathway.title,
                  description: pathway.description,
                  category: pathway.category,
                  status: pathway.status,
                  courseIds: pathway.courses.map((pc) => pc.courseId),
                }}
                courses={allCoursesForEdit}
              />
            )}
            {!isStaff && !enrollment && pathway.status === "published" && !hasCohorts && (
              <PathwayEnrollButton
                pathwayId={pathway.id}
                windowState={window?.state ?? "closed"}
                windowReason={window?.reason ?? null}
                allowWaitlist={!!window?.config.allowWaitlist}
              />
            )}
            {!isStaff && !enrollment && pathway.status === "published" && hasCohorts && (
              <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl px-4 py-3 min-w-[220px]">
                <p className="text-xs uppercase tracking-wider text-brand-200 mb-1">Pick a cohort below</p>
                <p className="text-sm text-brand-50 leading-snug">
                  This pathway runs in cohorts — each has its own dates and capacity.
                </p>
              </div>
            )}
            {enrollment && enrollment.status === "pending" && (
              <div className="bg-white/10 backdrop-blur-md border border-amber-300/40 rounded-xl px-4 py-3 min-w-[220px]">
                <p className="text-xs uppercase tracking-wider text-amber-200 mb-1">Request submitted</p>
                <p className="text-base font-bold">Pending admin review</p>
                <p className="text-xs text-brand-100 mt-1.5">We&apos;ll let you know as soon as it&apos;s decided.</p>
              </div>
            )}
            {enrollment && enrollment.status === "waitlisted" && (
              <div className="bg-white/10 backdrop-blur-md border border-amber-300/40 rounded-xl px-4 py-3 min-w-[220px]">
                <p className="text-xs uppercase tracking-wider text-amber-200 mb-1">On the waitlist</p>
                <p className="text-2xl font-bold">{queuePos != null ? `#${queuePos}` : "—"}</p>
                <p className="text-xs text-brand-100 mt-1.5">
                  We&apos;ll move you in as seats open up.
                </p>
              </div>
            )}
            {enrollment && enrollment.status === "rejected" && (
              <div className="bg-white/10 backdrop-blur-md border border-rose-300/40 rounded-xl px-4 py-3 min-w-[220px]">
                <p className="text-xs uppercase tracking-wider text-rose-200 mb-1">Request not approved</p>
                {enrollment.reviewerNote && (
                  <p className="text-xs text-brand-100 leading-relaxed">{enrollment.reviewerNote}</p>
                )}
                <PathwayEnrollButton
                  pathwayId={pathway.id}
                  windowState={window?.state ?? "closed"}
                  windowReason={window?.reason ?? null}
                  allowWaitlist={!!window?.config.allowWaitlist}
                  reapply
                />
              </div>
            )}
            {enrollment && (enrollment.status === "approved" || enrollment.status === "completed") && (
              <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl px-4 py-3 min-w-[220px]">
                <p className="text-xs text-brand-200 mb-1">Your progress</p>
                <p className="text-2xl font-bold">{progress}%</p>
                <div className="mt-2 h-1.5 bg-white/20 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-400 transition-all" style={{ width: `${progress}%` }} />
                </div>
                <p className="text-xs text-brand-100 mt-2">{completedCount}/{courseIds.length} courses complete</p>
              </div>
            )}
            {/* Admin fast-leave. Shown for any non-withdrawn enrollment
                so admins can clean up after testing approval queues,
                waitlist promotion, the trainee dashboard, etc. The
                same DELETE endpoint also promotes the next cohort
                waitlist entry, so leaving doesn't strand a seat. */}
            {isStaff && enrollment && enrollment.status !== "withdrawn" && (
              <div className="self-start">
                <LeavePathwayButton pathwayId={pathway.id} pathwayTitle={pathway.title} tone="onDark" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Admin enrollment settings card — pathway-level fallback.
          Ignored at runtime when ≥ 1 cohort exists, but kept visible
          so admins can restore it by deleting all cohorts. */}
      {isStaff && (
        <PathwayEnrollmentSettings
          pathwayId={pathway.id}
          enrollmentStatus={pathway.enrollmentStatus}
          enrollmentClosesAt={pathway.enrollmentClosesAt?.toISOString() ?? null}
          capacity={pathway.capacity ?? null}
          allowWaitlist={pathway.allowWaitlist}
        />
      )}

      {/* Admin: cohort manager — staff-only. Adding the first
          cohort flips this pathway into cohort-mode. */}
      {isStaff && (
        <PathwayCohortManager
          pathwayId={pathway.id}
          initialCohorts={adminCohortRows}
        />
      )}

      {/* Public: cohort picker. Only renders when the pathway has
          cohorts AND the viewer is a trainee (staff see admin
          manager above instead). */}
      {!isStaff && hasCohorts && (
        <PathwayCohortPicker
          pathwayId={pathway.id}
          cohorts={publicCohortRows}
          alreadyEnrolledCohortId={enrollment?.cohortId ?? null}
        />
      )}

      {/* Certificate banner */}
      {certificate && (
        <div className="bg-gradient-to-r from-amber-50 to-amber-100 border border-amber-200 rounded-2xl px-6 py-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0">
            <Award size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-amber-900">Pathway certificate issued</p>
            <p className="text-sm text-amber-800">
              Awarded {new Date(certificate.issueDate).toLocaleDateString()} — view it under Certificates.
            </p>
          </div>
          <Link
            href="/certificates"
            className="text-sm font-medium text-amber-700 hover:text-amber-900 underline"
          >
            View →
          </Link>
        </div>
      )}

      {/* Courses checklist */}
      <Card className="overflow-hidden">
        <div className="px-5 py-4 border-b border-line flex items-center justify-between">
          <h2 className="font-semibold text-fg">Courses in this pathway</h2>
          <span className="text-xs text-muted">{completedCount}/{courseIds.length} complete</span>
        </div>
        {pathway.courses.length === 0 ? (
          <div className="p-12 text-center text-sm text-subtle">
            No courses in this pathway yet.
          </div>
        ) : (
          <ol className="divide-y divide-line">
            {(pathway.courses as PathwayCourseRow[]).map((pc, i) => {
              const e = courseStateMap.get(pc.course.id);
              const done = e?.status === "completed";
              const pct = e ? Math.round(e.progress ?? 0) : 0;
              return (
                <li key={pc.id} className="flex items-center gap-4 px-5 py-4 hover:bg-elevated/50">
                  <div className={
                    "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 " +
                    (done
                      ? "bg-emerald-500 text-white"
                      : e
                      ? "bg-brand-100 text-brand-700"
                      : "bg-raised text-muted")
                  }>
                    {done ? <CheckCircle2 size={16} /> : i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/courses/${pc.course.id}`}
                      className="font-medium text-fg hover:text-brand-700 transition-colors"
                    >
                      {pc.course.title}
                    </Link>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted">
                      {pc.course.category && <span>{pc.course.category}</span>}
                      {pc.course.duration && (
                        <span className="inline-flex items-center gap-1"><Clock size={11} />{pc.course.duration}m</span>
                      )}
                      {!pc.required && <Badge tone="neutral">Optional</Badge>}
                    </div>
                  </div>
                  <div className="text-right min-w-[80px]">
                    {done ? (
                      <Badge tone="success">Completed</Badge>
                    ) : e ? (
                      <div>
                        <p className="text-xs text-muted mb-1">{pct}%</p>
                        <div className="w-16 h-1.5 bg-raised rounded-full">
                          <div className="h-full bg-brand-500 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    ) : (
                      <Circle size={16} className="text-subtle ml-auto" />
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </Card>
    </div>
  );
}
