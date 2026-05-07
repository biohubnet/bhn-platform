import { getSession, isStaff as checkIsStaff } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { BookOpen } from "lucide-react";
import { CourseCard } from "@/components/lms/CourseCard";
import { NewCourseButton } from "@/components/lms/NewCourseButton";
import { CourseSearchBar } from "@/components/lms/CourseSearchBar";
import { CourseFilters } from "@/components/lms/CourseFilters";
import { PageHero } from "@/components/ui/PageHero";
import { parseFilters } from "@/lib/courses/filters";

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
  searchParams: Promise<{
    q?: string;
    topic?: string;
    delivery?: string;
    provider?: string;
    special?: string;
  }>;
}) {
  const session = await getSession();
  const sp = await searchParams;
  const role = (session!.user as { role?: string }).role ?? "learner";
  const isStaff = checkIsStaff(role);

  const filters = parseFilters(sp);

  const courses = await prisma.course.findMany({
    where: {
      ...(isStaff ? {} : { status: "published" }),
      ...(filters.topic.length    && { topic:    { in: filters.topic } }),
      ...(filters.delivery.length && { delivery: { in: filters.delivery } }),
      ...(filters.provider.length && { provider: { in: filters.provider } }),
      ...(filters.special         && { isSpecial: true }),
      ...(sp.q ? { title: { contains: sp.q, mode: "insensitive" as const } } : {}),
    },
    include: {
      instructor: { select: { name: true } },
      _count: { select: { enrollments: true, modules: true } },
      scormPackage: { select: { version: true } },
    },
    orderBy: { createdAt: "desc" },
  }) as CourseListItem[];

  return (
    <div>
      <PageHero
        eyebrow={<><BookOpen size={11} /> Course catalog</>}
        title={`${courses.length} courses to explore`}
        description="Self-paced modules, SCORM-backed simulations, and instructor-led series — all in one library. Filter by topic, delivery, provider, or run a search."
        tone="brand"
        actions={isStaff ? <NewCourseButton /> : null}
      />

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
        {/* Filter rail */}
        <CourseFilters />

        <div className="space-y-5">
          <CourseSearchBar />

          {courses.length === 0 ? (
            <div className="text-center py-16 bg-card rounded-xl border border-line">
              <p className="text-muted">No courses match these filters</p>
              {isStaff && (
                <p className="text-sm text-subtle mt-1">Try clearing some filters, or create a new course.</p>
              )}
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
              {courses.map((course: CourseListItem) => (
                <CourseCard key={course.id} course={course} role={role} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
