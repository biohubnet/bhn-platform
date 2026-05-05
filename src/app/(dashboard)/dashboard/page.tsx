import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { BookOpen, Award, Clock, TrendingUp } from "lucide-react";

export default async function DashboardPage() {
  const session = await getSession();
  const userId = (session!.user as { id?: string }).id!;
  const role = (session!.user as { role?: string }).role;

  const [enrollments, certificates, recentActivity] = await Promise.all([
    prisma.enrollment.findMany({
      where: { userId },
      include: { course: { select: { id: true, title: true, category: true, thumbnail: true } } },
      orderBy: { enrolledAt: "desc" },
      take: 6,
    }),
    prisma.certificate.count({ where: { userId } }),
    prisma.scormSession.findMany({
      where: { userId },
      include: { package: { include: { course: { select: { id: true, title: true } } } } },
      orderBy: { updatedAt: "desc" },
      take: 5,
    }),
  ]);

  const completed = enrollments.filter((e) => e.status === "completed").length;
  const inProgress = enrollments.filter((e) => e.status === "active").length;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {session!.user?.name?.split(" ")[0] ?? "Learner"}
        </h1>
        <p className="text-gray-500 text-sm mt-1">Here&apos;s your learning progress</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Enrolled Courses", value: enrollments.length, icon: BookOpen, color: "blue" },
          { label: "In Progress", value: inProgress, icon: Clock, color: "amber" },
          { label: "Completed", value: completed, icon: TrendingUp, color: "green" },
          { label: "Certificates", value: certificates, icon: Award, color: "purple" },
        ].map((stat) => {
          const Icon = stat.icon;
          const colors: Record<string, string> = {
            blue: "bg-blue-50 text-blue-600",
            amber: "bg-amber-50 text-amber-600",
            green: "bg-green-50 text-green-600",
            purple: "bg-purple-50 text-purple-600",
          };
          return (
            <div key={stat.label} className="bg-white rounded-xl border border-gray-200 p-5">
              <div className={`inline-flex p-2 rounded-lg mb-3 ${colors[stat.color]}`}>
                <Icon size={18} />
              </div>
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              <p className="text-sm text-gray-500 mt-0.5">{stat.label}</p>
            </div>
          );
        })}
      </div>

      {/* Continue Learning */}
      {enrollments.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Continue Learning</h2>
            <Link href="/my-courses" className="text-sm text-blue-600 hover:underline">
              View all
            </Link>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {enrollments.filter((e) => e.status === "active").slice(0, 3).map((enrollment) => (
              <Link
                key={enrollment.id}
                href={`/courses/${enrollment.courseId}`}
                className="bg-white rounded-xl border border-gray-200 p-5 hover:border-blue-300 hover:shadow-sm transition-all"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <BookOpen size={18} className="text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 text-sm truncate">
                      {enrollment.course.title}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {enrollment.course.category ?? "General"}
                    </p>
                  </div>
                </div>
                <div className="mt-4">
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>Progress</span>
                    <span>{Math.round(enrollment.progress)}%</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full">
                    <div
                      className="h-1.5 bg-blue-500 rounded-full"
                      style={{ width: `${enrollment.progress}%` }}
                    />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Recent Activity */}
      {recentActivity.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h2>
          <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
            {recentActivity.map((s) => (
              <div key={s.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {s.package.course.title}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Attempt #{s.attemptNumber} · {s.status}
                  </p>
                </div>
                <div className="text-right">
                  {s.score != null && (
                    <span className="text-sm font-semibold text-gray-700">
                      {Math.round(s.score)}%
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {enrollments.length === 0 && (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <BookOpen size={40} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-600 font-medium">No courses yet</p>
          <p className="text-sm text-gray-400 mt-1">Browse the catalog to get started</p>
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
