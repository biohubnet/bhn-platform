import { getSession, isStaff as checkIsStaff } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { CourseCard } from "@/components/lms/CourseCard";
import { NewCourseButton } from "@/components/lms/NewCourseButton";

interface CourseListItem {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  thumbnail: string | null;
  status: string;
  courseType: string;
  duration: number | null;
  creditCost: number;
  createdAt: Date;
  instructor: { name: string | null } | null;
  _count: { enrollments: number; modules: number };
  scormPackage: { version: string } | null;
}

export default async function CoursesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string }>;
}) {
  const session = await getSession();
  const sp = await searchParams;
  const role = (session!.user as { role?: string }).role ?? "learner";
  const isStaff = checkIsStaff(role);

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
  }) as CourseListItem[];

  const categories = await prisma.course.findMany({
    where: { ...(isStaff ? {} : { status: "published" }), category: { not: null } },
    select: { category: true },
    distinct: ["category"],
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-fg">Course Catalog</h1>
          <p className="text-muted text-sm mt-1">{courses.length} courses available</p>
        </div>
        {isStaff && <NewCourseButton />}
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <Link
          href="/courses"
          className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
            !sp.category ? "bg-brand-600 text-white border-brand-600" : "bg-card text-muted border-line hover:border-line-strong"
          }`}
        >
          All
        </Link>
        {categories.map((c: { category: string | null }) => (
          <Link
            key={c.category}
            href={`/courses?category=${c.category}`}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
              sp.category === c.category
                ? "bg-brand-600 text-white border-brand-600"
                : "bg-card text-muted border-line hover:border-line-strong"
            }`}
          >
            {c.category}
          </Link>
        ))}
      </div>

      {courses.length === 0 ? (
        <div className="text-center py-16 bg-card rounded-xl border border-line">
          <p className="text-muted">No courses found</p>
          {isStaff && (
            <p className="text-sm text-subtle mt-1">Create your first course to get started</p>
          )}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {courses.map((course: CourseListItem) => (
            <CourseCard key={course.id} course={course} role={role} />
          ))}
        </div>
      )}
    </div>
  );
}
