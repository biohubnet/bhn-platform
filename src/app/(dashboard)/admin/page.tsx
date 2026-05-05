import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { cn, statusColor, formatScore } from "@/lib/utils";
import { Users, BookOpen, TrendingUp, Award } from "lucide-react";
import { UserRoleSelect } from "@/components/lms/UserRoleSelect";
import Link from "next/link";

export default async function AdminPage() {
  const session = await requireRole("admin").catch(() => null);
  if (!session) redirect("/dashboard");

  const [users, courses, stats] = await Promise.all([
    prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        _count: { select: { enrollments: true, certificates: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.course.findMany({
      include: {
        instructor: { select: { name: true } },
        _count: { select: { enrollments: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    Promise.all([
      prisma.user.count(),
      prisma.course.count({ where: { status: "published" } }),
      prisma.enrollment.count(),
      prisma.enrollment.count({ where: { status: "completed" } }),
      prisma.certificate.count(),
    ]),
  ]);

  const [totalUsers, publishedCourses, totalEnrollments, completedEnrollments, totalCerts] = stats;
  const completionRate = totalEnrollments > 0
    ? Math.round((completedEnrollments / totalEnrollments) * 100)
    : 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Platform overview and management</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Users", value: totalUsers, icon: Users, color: "blue" },
          { label: "Published Courses", value: publishedCourses, icon: BookOpen, color: "green" },
          { label: "Completion Rate", value: `${completionRate}%`, icon: TrendingUp, color: "amber" },
          { label: "Certificates", value: totalCerts, icon: Award, color: "purple" },
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

      {/* Users table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Users ({totalUsers})</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs text-gray-500 uppercase tracking-wide">
                <th className="px-5 py-3">Name / Email</th>
                <th className="px-5 py-3">Role</th>
                <th className="px-5 py-3">Enrollments</th>
                <th className="px-5 py-3">Certificates</th>
                <th className="px-5 py-3">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3">
                    <p className="font-medium text-gray-900">{user.name ?? "—"}</p>
                    <p className="text-xs text-gray-400">{user.email}</p>
                  </td>
                  <td className="px-5 py-3">
                    <UserRoleSelect userId={user.id} currentRole={user.role} />
                  </td>
                  <td className="px-5 py-3 text-gray-600">{user._count.enrollments}</td>
                  <td className="px-5 py-3 text-gray-600">{user._count.certificates}</td>
                  <td className="px-5 py-3 text-gray-400 text-xs">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Courses table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">All Courses ({courses.length})</h2>
          <Link href="/courses" className="text-sm text-blue-600 hover:underline">Manage</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs text-gray-500 uppercase tracking-wide">
                <th className="px-5 py-3">Course</th>
                <th className="px-5 py-3">Type</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Enrollments</th>
                <th className="px-5 py-3">Instructor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {courses.map((course) => (
                <tr key={course.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3">
                    <Link
                      href={`/courses/${course.id}`}
                      className="font-medium text-gray-900 hover:text-blue-600"
                    >
                      {course.title}
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-gray-500 uppercase text-xs">{course.courseType}</td>
                  <td className="px-5 py-3">
                    <span className={cn("text-xs px-2 py-0.5 rounded-full", statusColor(course.status))}>
                      {course.status}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-gray-600">{course._count.enrollments}</td>
                  <td className="px-5 py-3 text-gray-500">{course.instructor?.name ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
