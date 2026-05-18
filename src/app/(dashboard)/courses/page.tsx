import Link from "next/link";
import { getSession, isStaff as checkIsStaff, isAdmin as checkIsAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { BookOpen, Heart } from "lucide-react";
import { cn } from "@/lib/utils";
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
    /** `1` to restrict the catalog to courses the signed-in user
     *  has hearted (the "Favorites only" filter chip on the page). */
    fav?: string;
  }>;
}) {
  const session = await getSession();
  const sp = await searchParams;
  const role = (session!.user as { role?: string }).role ?? "learner";
  const userId = (session!.user as { id?: string }).id ?? null;
  const isStaff = checkIsStaff(role);
  const isAdmin = checkIsAdmin(role);

  const filters = parseFilters(sp);
  const favOnly = sp.fav === "1";

  // Idempotent first-deploy seed of the option lists.
  await ensureCourseFilterOptions();
  const options = await getCourseFilterOptions();

  // Signed-in user's favorite course IDs — fetched first so we
  // can both (a) restrict the catalog query when the user has
  // toggled `?fav=1`, and (b) tag every card with `isFavorite`
  // so the heart icon renders in the right state.
  const favoriteIds = userId
    ? new Set(
        (
          await prisma.courseFavorite.findMany({
            where: { userId },
            select: { courseId: true },
          })
        ).map((f) => f.courseId),
      )
    : new Set<string>();

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
      // Favorites-only filter — empty set ⇒ matches nothing
      // (intentional: an unauthenticated user with `?fav=1` sees
      // an empty catalog, not the full list).
      ...(favOnly ? { id: { in: Array.from(favoriteIds) } } : {}),
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
    isFavorite: favoriteIds.has(c.id),
    instructor: c.instructor,
    _count: c._count,
    scormPackage: c.scormPackage,
  }));

  // Total count of favorites — used by the favorites-filter chip
  // so users can see "Favorites · 12" without scrolling.
  const favoriteCount = favoriteIds.size;

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

      {/* Favorites filter chip — toggles `?fav=1` on the URL.
          Shows the user's total favorite count so they know how
          many cards they'll see when toggled on. Hidden for users
          who have nothing favorited yet to avoid a noisy 0-count
          chip on first visit. */}
      {(favoriteCount > 0 || favOnly) && (
        <div className="mb-3 flex items-center gap-2 flex-wrap">
          <Link
            href={favOnly ? "/courses" : "/courses?fav=1"}
            className={cn(
              "inline-flex items-center gap-1.5 text-[12px] font-semibold",
              "px-3 py-1.5 rounded-full ring-1 ring-inset transition-colors",
              favOnly
                ? "bg-rose-500 text-white ring-rose-500"
                : "bg-card text-fg-muted ring-line hover:ring-rose-300 hover:text-rose-600",
            )}
          >
            <Heart
              size={13}
              strokeWidth={1.8}
              className={favOnly ? "fill-white text-white" : "text-rose-500 fill-rose-500"}
            />
            Favorites
            <span className={cn("text-[11px] font-bold", favOnly ? "text-white/85" : "text-fg-subtle")}>
              · {favoriteCount}
            </span>
          </Link>
          {favOnly && (
            <Link
              href="/courses"
              className="text-[11px] text-muted hover:text-fg underline-offset-2 hover:underline"
            >
              Show all courses
            </Link>
          )}
        </div>
      )}

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
