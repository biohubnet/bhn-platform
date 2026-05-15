"use client";
import Link from "next/link";
import { BookOpen, Users, Clock, Badge } from "lucide-react";
import { cn, formatDuration, statusColor } from "@/lib/utils";
import { parseOverlay, overlayStyle } from "@/lib/courses/thumbnail-overlay";

interface CourseCardProps {
  course: {
    id: string;
    title: string;
    description?: string | null;
    category?: string | null;
    status: string;
    courseType: string;
    duration?: number | null;
    thumbnail?: string | null;
    /** Optional JSON colour / gradient wash rendered above the
     *  thumbnail. Stamped by /admin/course-thumbnails. */
    thumbnailOverlay?: unknown;
    instructor?: { name: string | null } | null;
    scormPackage?: { version: string } | null;
    _count: { enrollments: number; modules: number };
  };
  role: string;
}

export function CourseCard({ course, role }: CourseCardProps) {
  const isStaff = role === "admin" || role === "superadmin" || role === "instructor";
  const isArchived = course.status === "archived";
  // Live thumbnails get the optional admin-stamped overlay. Archived
  // cards skip it — the grayscale treatment already does the visual
  // "not active" work and we don't want two filters competing.
  const overlay = isArchived ? null : parseOverlay(course.thumbnailOverlay);

  return (
    <Link
      href={`/courses/${course.id}`}
      className={cn(
        "bg-card backdrop-blur-md rounded-[var(--radius-lg)] border transition-all overflow-hidden group flex flex-col shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_30px_rgba(15,23,42,0.06)] hover:shadow-[0_2px_4px_rgba(15,23,42,0.06),0_16px_40px_rgba(15,23,42,0.10)] hover:-translate-y-0.5",
        isArchived ? "border-line opacity-75 hover:opacity-100" : "border-line hover:border-brand-300",
      )}
    >
      {/* Thumbnail */}
      <div className={cn(
        "relative h-36 flex items-center justify-center",
        isArchived
          ? "bg-gradient-to-br from-slate-400 to-slate-600 grayscale"
          : "bg-gradient-to-br from-brand-500 to-indigo-600",
      )}>
        {course.thumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={course.thumbnail} alt="" className={cn("w-full h-full object-cover", isArchived && "grayscale")} />
        ) : (
          <BookOpen size={32} className="text-white/60" />
        )}
        {overlay && (
          <div className="absolute inset-0" style={overlayStyle(overlay)} />
        )}
        {isArchived && (
          <span className="absolute top-2 right-2 inline-flex items-center text-[10px] uppercase tracking-[0.18em] font-bold px-2 py-0.5 rounded-full bg-slate-900/80 text-white ring-1 ring-inset ring-white/20">
            Not active
          </span>
        )}
      </div>

      <div className="p-4 flex flex-col flex-1">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-semibold text-fg text-sm leading-snug line-clamp-2 group-hover:text-brand-600 transition-colors">
            {course.title}
          </h3>
          {isStaff && (
            <span className={cn("text-xs px-2 py-0.5 rounded-full flex-shrink-0", statusColor(course.status))}>
              {course.status}
            </span>
          )}
        </div>

        {course.description && (
          <p className="text-xs text-muted line-clamp-2 mb-3">{course.description}</p>
        )}

        <div className="mt-auto flex items-center gap-3 text-xs text-subtle">
          <span className="flex items-center gap-1">
            <Users size={12} />
            {course._count.enrollments}
          </span>
          {course.duration && (
            <span className="flex items-center gap-1">
              <Clock size={12} />
              {formatDuration(course.duration)}
            </span>
          )}
          {course.scormPackage && (
            <span className="flex items-center gap-1 ml-auto">
              <Badge size={12} />
              {course.scormPackage.version === "SCORM_2004" ? "SCORM 2004" : "SCORM 1.2"}
            </span>
          )}
        </div>

        {course.category && (
          <div className="mt-2">
            <span className="text-xs bg-raised text-muted px-2 py-0.5 rounded">
              {course.category}
            </span>
          </div>
        )}
      </div>
    </Link>
  );
}
