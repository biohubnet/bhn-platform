import { getSession, isStaff as checkIsStaff, isAdmin as checkIsAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { BookOpen } from "lucide-react";
import { NewCourseButton } from "@/components/lms/NewCourseButton";
import { CourseSearchBar } from "@/components/lms/CourseSearchBar";
import { CourseFilters } from "@/components/lms/CourseFilters";
import { CatalogGrid, type CatalogCourse } from "@/components/lms/CatalogGrid";
import { PageHero } from "@/components/ui/PageHero";
import { EditableText } from "@/components/cms/EditableText";
import { getCopy } from "@/lib/copy";
import { parseFilters } from "@/lib/courses/filters";
import {
  ensureCourseFilterOptions, getCourseFilterOptions,
} from "@/lib/courses/filter-options";

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
  const isAdmin = checkIsAdmin(role);

  const filters = parseFilters(sp);

  // Idempotent first-deploy seed of the option lists.
  await ensureCourseFilterOptions();
  const options = await getCourseFilterOptions();

  // Non-staff see published AND archived courses (archived stay in
  // the catalog so trainees can read about courses that ran in the
  // past — the detail page disables the enroll button). Staff see
  // everything including drafts so they can edit unreleased work.
  const courses = await prisma.course.findMany({
    where: {
      ...(isStaff ? {} : { status: { in: ["published", "archived"] } }),
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
    // Admin-controlled order first, recency as tiebreaker. Every
    // pre-displayOrder course sits at 0 and falls back to the
    // historical createdAt ordering; admins drag tiles on the page
    // to set new positions.
    orderBy: [{ displayOrder: "asc" }, { createdAt: "desc" }],
  });

  const catalogCourses: CatalogCourse[] = courses.map((c) => ({
    id: c.id,
    code: c.code,
    title: c.title,
    description: c.description,
    category: c.category,
    thumbnail: c.thumbnail,
    thumbnailOverlay: c.thumbnailOverlay,
    status: c.status,
    courseType: c.courseType,
    duration: c.duration,
    creditCost: c.creditCost,
    createdAt: c.createdAt.toISOString(),
    topic: c.topic,
    delivery: c.delivery,
    provider: c.provider,
    isSpecial: c.isSpecial,
    requiresApproval: c.requiresApproval,
    enrollByDate: c.enrollByDate?.toISOString() ?? null,
    cohortStartDate: c.cohortStartDate?.toISOString() ?? null,
    cohortEndDate: c.cohortEndDate?.toISOString() ?? null,
    instructor: c.instructor,
    _count: c._count,
    scormPackage: c.scormPackage,
  }));

  const subtitleDefault = "Self-paced modules, SCORM-backed simulations, and instructor-led series — all in one library. Filter by topic, delivery, provider, or run a search.";
  const subtitle = await getCopy("courses.subtitle", subtitleDefault);

  return (
    <div>
      <PageHero
        eyebrow={<><BookOpen size={11} /> Course catalog</>}
        title={`${courses.length} courses to explore`}
        description={
          <EditableText
            copyKey="courses.subtitle"
            defaultText={subtitle}
            isStaff={isStaff}
          />
        }
        tone="brand"
        actions={isStaff ? <NewCourseButton /> : null}
      />

      {/* Search sits ABOVE the filter panel — short text query is
          the most natural first interaction; clicking chips is a
          refinement of whatever the search returned. */}
      <div className="mb-4">
        <CourseSearchBar />
      </div>

      {/* Filter panel — full-width, prominent, expanded by default. */}
      <CourseFilters options={options} />

      {courses.length === 0 ? (
        <div className="text-center py-16 bg-card rounded-xl border border-line">
          <p className="text-muted">No courses match these filters</p>
          {isStaff && (
            <p className="text-sm text-subtle mt-1">Try clearing some filters, or create a new course.</p>
          )}
        </div>
      ) : (
        <CatalogGrid
          courses={catalogCourses}
          role={role}
          options={options}
          isAdmin={isAdmin}
        />
      )}
    </div>
  );
}
