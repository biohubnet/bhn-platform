import { getSession, isStaff as checkIsStaff } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { cn, formatDuration } from "@/lib/utils";
import { Play, CheckCircle, Clock, XCircle, GraduationCap } from "lucide-react";
import { PageHero } from "@/components/ui/PageHero";
import { Badge } from "@/components/ui/Badge";
import { LeaveCourseButton } from "@/components/lms/LeaveCourseButton";

interface MyEnrollment {
  id: string;
  courseId: string;
  status: string;
  progress: number;
  score: number | null;
  enrolledAt: Date;
  completedAt: Date | null;
  course: {
    id: string;
    title: string;
    duration: number | null;
    scormPackage: { id: string; version: string } | null;
    _count: { modules: number };
  };
}

const COMPLETED_STATES = new Set(["completed", "passed", "complete"]);
const FAILED_STATES = new Set(["failed", "fail"]);
function classifyStatus(status: string, progress: number) {
  if (COMPLETED_STATES.has(status)) return "completed" as const;
  if (FAILED_STATES.has(status)) return "failed" as const;
  if (progress > 0) return "in_progress" as const;
  return "active" as const;
}

export default async function MyCoursesPage() {
  const session = await getSession();
  const userId = (session!.user as { id?: string }).id!;
  const role = (session!.user as { role?: string }).role ?? "user";
  // Admin / superadmin get an inline "Leave" affordance on every row.
  // Trainees use the regular completion / withdrawal path elsewhere.
  const isStaff = checkIsStaff(role);

  const enrollments = await prisma.enrollment.findMany({
    where: { userId },
    include: {
      course: {
        include: {
          scormPackage: { select: { id: true, version: true } },
          _count: { select: { modules: true } },
        },
      },
    },
    orderBy: { enrolledAt: "desc" },
  }) as MyEnrollment[];

  const buckets = {
    in_progress: [] as MyEnrollment[],
    active: [] as MyEnrollment[],
    completed: [] as MyEnrollment[],
    failed: [] as MyEnrollment[],
  };
  for (const e of enrollments) {
    buckets[classifyStatus(e.status, e.progress)].push(e);
  }

  return (
    <div>
      <PageHero
        eyebrow={<><GraduationCap size={11} /> Your enrollments</>}
        title="My Courses"
        description={
          enrollments.length === 0
            ? "Browse the catalog to start your first course."
            : `${enrollments.length} enrolled · ${buckets.in_progress.length} in progress · ${buckets.completed.length} completed${buckets.failed.length ? ` · ${buckets.failed.length} failed` : ""}`
        }
      />
      <div className="space-y-6">

      {enrollments.length === 0 ? (
        <div className="text-center py-12 px-6 bg-card rounded-2xl border border-dashed border-line space-y-3">
          <span className="inline-flex w-12 h-12 rounded-xl bg-brand-50 text-brand-700 items-center justify-center ring-1 ring-inset ring-brand-200">
            <GraduationCap size={20} />
          </span>
          <div className="space-y-1">
            <h2 className="text-base font-semibold text-fg">No courses yet</h2>
            <p className="text-sm text-fg-muted max-w-md mx-auto">
              Pick something from the catalog to start learning. Once you enrol, courses you have in progress will show up here.
            </p>
          </div>
          <Link
            href="/courses"
            className="inline-flex items-center gap-1.5 bg-brand-600 text-white text-sm font-bold px-4 py-2 rounded-md hover:bg-brand-700 transition-colors"
          >
            Browse the catalog
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          <Section title="In progress"     emptyHint="Courses you've started will show here." rows={buckets.in_progress} isStaff={isStaff} />
          <Section title="Not yet started" emptyHint={null}                                    rows={buckets.active}      isStaff={isStaff} />
          <Section title="Completed"       emptyHint={null}                                    rows={buckets.completed}   isStaff={isStaff} />
          {buckets.failed.length > 0 && (
            <Section title="Did not pass"  emptyHint={null}                                    rows={buckets.failed}      isStaff={isStaff} />
          )}
        </div>
      )}
      </div>
    </div>
  );
}

function Section({ title, rows, emptyHint, isStaff }: { title: string; rows: MyEnrollment[]; emptyHint: string | null; isStaff: boolean }) {
  if (rows.length === 0 && !emptyHint) return null;
  return (
    <div>
      <h2 className="text-base font-semibold text-fg mb-3">{title} <span className="text-subtle text-sm font-normal">· {rows.length}</span></h2>
      {rows.length === 0 ? (
        <p className="text-sm text-subtle px-4 py-3 bg-elevated/50 rounded-lg">{emptyHint}</p>
      ) : (
        <div className="space-y-2">
          {rows.map((e) => <Row key={e.id} e={e} isStaff={isStaff} />)}
        </div>
      )}
    </div>
  );
}

function Row({ e, isStaff }: { e: MyEnrollment; isStaff: boolean }) {
  const klass = classifyStatus(e.status, e.progress);
  const tone =
    klass === "completed" ? "success" as const :
    klass === "failed"    ? "danger"  as const :
    klass === "in_progress" ? "brand"  as const :
                              "neutral" as const;
  const Icon =
    klass === "completed" ? CheckCircle :
    klass === "failed"    ? XCircle :
                            Clock;

  return (
    <div className="flex items-center gap-4 p-4 bg-card rounded-xl border border-line hover:border-brand-200 transition-colors">
      <div className={cn(
        "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0",
        klass === "completed" ? "bg-emerald-50 text-emerald-600" :
        klass === "failed"    ? "bg-rose-50 text-rose-600" :
                                "bg-brand-50 text-brand-600",
      )}>
        <Icon size={18} />
      </div>
      <div className="flex-1 min-w-0">
        <Link
          href={`/courses/${e.courseId}`}
          className="font-medium text-fg text-sm hover:text-brand-600 transition-colors"
        >
          {e.course.title}
        </Link>
        <div className="flex items-center gap-3 mt-1 flex-wrap">
          <Badge tone={tone}>{e.status}</Badge>
          {e.course.duration && (
            <span className="text-xs text-subtle">{formatDuration(e.course.duration)}</span>
          )}
          {e.score != null && (
            <span className="text-xs text-muted">Score: {Math.round(e.score)}%</span>
          )}
          {e.completedAt && (
            <span className="text-xs text-subtle">Completed {new Date(e.completedAt).toLocaleDateString()}</span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3 flex-shrink-0">
        <div className="text-right hidden sm:block">
          <p className="text-xs text-subtle mb-1">{Math.round(e.progress)}%</p>
          <div className="w-20 h-1.5 bg-raised rounded-full">
            <div
              className={cn(
                "h-1.5 rounded-full transition-all",
                klass === "completed" ? "bg-emerald-500" :
                klass === "failed"    ? "bg-rose-500" :
                                        "bg-brand-500"
              )}
              style={{ width: `${e.progress}%` }}
            />
          </div>
        </div>
        {e.course.scormPackage && (
          <Link
            href={`/player/${e.courseId}`}
            className="flex items-center gap-1.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
          >
            <Play size={12} />
            {klass === "completed" ? "Review" : klass === "failed" ? "Retry" : "Launch"}
          </Link>
        )}
        {isStaff && (
          <LeaveCourseButton courseId={e.courseId} courseTitle={e.course.title} />
        )}
      </div>
    </div>
  );
}
