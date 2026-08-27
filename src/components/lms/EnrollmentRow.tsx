/**
 * One enrolled course, as rendered on the Progress Tracker.
 *
 * Lifted out of the retired /my-courses page so the Progress Tracker
 * could absorb it without losing anything. What it carries that the
 * tracker's old inert list did not: a link to the course, the
 * launch / resume control, the progress bar, score, duration and the
 * admin fast-leave button.
 *
 * Two launch paths, mirroring the course detail page: SCORM courses go
 * to /player/[id]; module-based courses go to /courses/[id]/learn. A
 * course with neither gets no control rather than a dead button.
 */
import Link from "next/link";
import { Play, CheckCircle, Clock, XCircle, Hourglass, LogOut } from "lucide-react";
import { cn, formatDuration } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import { LeaveCourseButton } from "@/components/lms/LeaveCourseButton";
import { canAccessCourseContent, type EnrollmentBucket } from "@/lib/courses/enrollment-status";

export interface EnrollmentRowData {
  id: string;
  courseId: string;
  status: string;
  progress: number;
  score: number | null;
  completedAt: Date | null;
  course: {
    title: string;
    code: string | null;
    duration: number | null;
    scormPackage: { id: string } | null;
    _count: { modules: number };
  };
}

const ICONS: Record<EnrollmentBucket, typeof Clock> = {
  completed: CheckCircle,
  failed: XCircle,
  withdrawn: LogOut,
  pending: Hourglass,
  in_progress: Clock,
  not_started: Clock,
};

const DISCS: Record<EnrollmentBucket, string> = {
  completed: "bg-emerald-50 text-emerald-600",
  failed: "bg-rose-50 text-rose-600",
  withdrawn: "bg-raised text-subtle",
  pending: "bg-amber-50 text-amber-600",
  in_progress: "bg-brand-50 text-brand-600",
  not_started: "bg-brand-50 text-brand-600",
};

const BARS: Record<EnrollmentBucket, string> = {
  completed: "bg-emerald-500",
  failed: "bg-rose-500",
  withdrawn: "bg-subtle",
  pending: "bg-amber-500",
  in_progress: "bg-brand-500",
  not_started: "bg-brand-500",
};

function badgeTone(bucket: EnrollmentBucket) {
  if (bucket === "completed") return "success" as const;
  if (bucket === "failed") return "danger" as const;
  if (bucket === "in_progress") return "brand" as const;
  if (bucket === "pending") return "warning" as const;
  return "neutral" as const;
}

/** Human label for the launch control. "Review" for something finished,
 *  "Retry" for something failed, "Resume" once there is progress to
 *  return to, "Start" otherwise. */
function launchLabel(bucket: EnrollmentBucket, progress: number): string {
  if (bucket === "completed") return "Review";
  if (bucket === "failed") return "Retry";
  return progress > 0 ? "Resume" : "Start";
}

export function EnrollmentRow({
  e,
  bucket,
  isStaff,
}: {
  e: EnrollmentRowData;
  bucket: EnrollmentBucket;
  isStaff: boolean;
}) {
  const Icon = ICONS[bucket];
  // Same predicate the server gates on, fed the same raw status —
  // so the button shown and the door opened can never disagree.
  const launchable = canAccessCourseContent(e.status);
  const href = e.course.scormPackage
    ? `/player/${e.courseId}`
    : e.course._count.modules > 0
      ? `/courses/${e.courseId}/learn`
      : null;

  return (
    <div className="flex items-center gap-4 p-4 bg-card rounded-xl border border-line hover:border-brand-200 transition-colors">
      <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center shrink-0", DISCS[bucket])}>
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
          {e.course.code && <span className="text-xs text-subtle tabular-nums">{e.course.code}</span>}
          <Badge tone={badgeTone(bucket)}>{e.status}</Badge>
          {e.course.duration && (
            <span className="text-xs text-subtle">{formatDuration(e.course.duration)}</span>
          )}
          {e.score != null && (
            <span className="text-xs text-muted">Score: {Math.round(e.score)}%</span>
          )}
          {e.completedAt && (
            <span className="text-xs text-subtle">
              Completed {e.completedAt.toLocaleDateString("en-CA", {
                month: "short", day: "numeric", year: "numeric",
              })}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <div className="text-right hidden sm:block">
          <p className="text-xs text-subtle mb-1 tabular-nums">{Math.round(e.progress)}%</p>
          <div className="w-20 h-1.5 bg-raised rounded-full">
            <div
              className={cn("h-1.5 rounded-full", BARS[bucket])}
              style={{ width: `${Math.round(e.progress)}%` }}
            />
          </div>
        </div>
        {launchable && href && (
          <Link
            href={href}
            className="flex items-center gap-1.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
          >
            <Play size={12} />
            {launchLabel(bucket, e.progress)}
          </Link>
        )}
        {isStaff && (
          <LeaveCourseButton courseId={e.courseId} courseTitle={e.course.title} />
        )}
      </div>
    </div>
  );
}
