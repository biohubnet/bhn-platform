"use client";
import Link from "next/link";
import { BookOpen, Users, Clock, Badge } from "lucide-react";
import { cn, formatDuration, statusColor } from "@/lib/utils";

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
    instructor?: { name: string | null } | null;
    scormPackage?: { version: string } | null;
    _count: { enrollments: number; modules: number };
  };
  role: string;
}

export function CourseCard({ course, role }: CourseCardProps) {
  const isStaff = role === "admin" || role === "superadmin" || role === "instructor";

  return (
    <Link
      href={`/courses/${course.id}`}
      className="bg-card rounded-xl border border-line hover:border-brand-300 hover:shadow-md transition-all overflow-hidden group flex flex-col"
    >
      {/* Thumbnail */}
      <div className="h-36 bg-gradient-to-br from-brand-500 to-indigo-600 flex items-center justify-center">
        {course.thumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={course.thumbnail} alt="" className="w-full h-full object-cover" />
        ) : (
          <BookOpen size={32} className="text-white/60" />
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
