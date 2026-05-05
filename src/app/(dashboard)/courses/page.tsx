import { getSession, isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { CourseCard } from "@/components/lms/CourseCard";
import { NewCourseButton } from "@/components/lms/NewCourseButton";

export default async function CoursesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string }>;
}) {
  const session = await getSession();
  const sp = await searchParams;
  const role = (session!.user as { role?: string }).role ?? "learner";
  const isStaff = isAdmin(role);

  const courses = await prisma.course.findMany({
    where: {
      ...(isStaff ? {} : { status: "published" }),
      ...(sp.category ? { category: sp.category } : {}),
      ...(sp.q ? { title: { contains: sp.q } } : {}),
    },
    include: {
      instructor: { select: { name: true } },
      _count: { select: { enrollments: true, modules: true } },
      scormPackage: { select: { version: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const categories = await prisma.course.findMany({
    where: { ...(isStaff ? {} : { status: "published" }), category: { not: null } },
    select: { category: true },
    distinct: ["category"],
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Course Catalog</h1>
          <p className="text-gray-500 text-sm mt-1">{courses.length} courses available</p>
        </div>
        {isStaff && <NewCourseButton />}
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <Link
          href="/courses"
          className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
            !sp.category ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
          }`}
        >
          All
        </Link>
        {categories.map((c) => (
          <Link
            key={c.category}
            href={`/courses?category=${c.category}`}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
              sp.category === c.category
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
            }`}
          >
            {c.category}
          </Link>
        ))}
      </div>

      {courses.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <p className="text-gray-500">No courses found</p>
          {isStaff && (
            <p className="text-sm text-gray-400 mt-1">Create your first course to get started</p>
          )}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {courses.map((course) => (
            <CourseCard key={course.id} course={course} role={role} />
          ))}
        </div>
      )}
    </div>
  );
}
