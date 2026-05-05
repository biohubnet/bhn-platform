import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { cn, statusColor, formatDuration } from "@/lib/utils";
import { Play, CheckCircle, Clock } from "lucide-react";

interface MyEnrollment {
  id: string;
  courseId: string;
  status: string;
  progress: number;
  score: number | null;
  enrolledAt: Date;
  course: {
    id: string;
    title: string;
    duration: number | null;
    scormPackage: { id: string; version: string } | null;
    _count: { modules: number };
  };
}

export default async function MyCoursesPage() {
  const session = await getSession();
  const userId = (session!.user as { id?: string }).id!;

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

  const active = enrollments.filter((e) => e.status === "active");
  const completed = enrollments.filter((e) => e.status === "completed");

  function EnrollmentRow({ e }: { e: MyEnrollment }) {
    return (
      <div className="flex items-center gap-4 p-4 bg-white rounded-xl border border-gray-200 hover:border-blue-200 transition-colors">
        <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
          {e.status === "completed" ? (
            <CheckCircle size={18} className="text-green-600" />
          ) : (
            <Clock size={18} className="text-blue-600" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <Link
            href={`/courses/${e.courseId}`}
            className="font-medium text-gray-900 text-sm hover:text-blue-600 transition-colors"
          >
            {e.course.title}
          </Link>
          <div className="flex items-center gap-3 mt-1">
            <span className={cn("text-xs px-1.5 py-0.5 rounded", statusColor(e.status))}>
              {e.status}
            </span>
            {e.course.duration && (
              <span className="text-xs text-gray-400">{formatDuration(e.course.duration)}</span>
            )}
            {e.score != null && (
              <span className="text-xs text-gray-500">Score: {Math.round(e.score)}%</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="text-right hidden sm:block">
            <p className="text-xs text-gray-400 mb-1">{Math.round(e.progress)}%</p>
            <div className="w-20 h-1.5 bg-gray-100 rounded-full">
              <div
                className="h-1.5 bg-blue-500 rounded-full"
                style={{ width: `${e.progress}%` }}
              />
            </div>
          </div>
          {e.course.scormPackage && (
            <Link
              href={`/player/${e.courseId}`}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
            >
              <Play size={12} />
              {e.status === "completed" ? "Review" : "Launch"}
            </Link>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Courses</h1>
        <p className="text-gray-500 text-sm mt-1">
          {enrollments.length} total · {active.length} in progress · {completed.length} completed
        </p>
      </div>

      {active.length > 0 && (
        <div>
          <h2 className="text-base font-semibold text-gray-800 mb-3">In Progress</h2>
          <div className="space-y-2">
            {active.map((e) => (
              <EnrollmentRow key={e.id} e={e} />
            ))}
          </div>
        </div>
      )}

      {completed.length > 0 && (
        <div>
          <h2 className="text-base font-semibold text-gray-800 mb-3">Completed</h2>
          <div className="space-y-2">
            {completed.map((e) => (
              <EnrollmentRow key={e.id} e={e} />
            ))}
          </div>
        </div>
      )}

      {enrollments.length === 0 && (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <p className="text-gray-500">No enrollments yet</p>
          <Link
            href="/courses"
            className="inline-block mt-4 bg-blue-600 text-white text-sm font-medium px-5 py-2 rounded-lg hover:bg-blue-700"
          >
            Browse Courses
          </Link>
        </div>
      )}
    </div>
  );
}
