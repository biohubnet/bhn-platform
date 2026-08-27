import { NextRequest, NextResponse } from "next/server";
import { guardRole } from "@/lib/api/guard";
import { prisma } from "@/lib/prisma";
import { getSession, requireCourseOwner, isStaff as checkIsStaff } from "@/lib/auth";
import { canAccessCourseContent } from "@/lib/courses/enrollment-status";

/**
 * GET a course.
 *
 * Two tiers, because this route used to have none. It called
 * `getSession()` without a null check and gated only on course status,
 * so an ANONYMOUS caller received, for any published course: every
 * Module row including `content` (the lesson body itself), `videoUrl`
 * and `fileUrl`; the SCORM package record; and the instructor's email
 * address. Several published courses cost 1000-3500 credits. Nothing in
 * the app calls this endpoint — the course detail page is a server
 * component that reads Prisma directly — so it was pure exposure.
 *
 * Now: a session is required, and the lesson payload is released only
 * to someone entitled to it. Everyone else still gets the syllabus —
 * module titles, order, duration — because browsing what a course
 * contains before enrolling is a legitimate thing to want, and it is
 * what the catalogue already shows.
 */
export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  const userId = (session?.user as { id?: string })?.id;
  const userRole = (session?.user as { role?: string })?.role;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const course = await prisma.course.findUnique({
    where: { id },
    include: {
      instructor: { select: { id: true, name: true, email: true } },
      scormPackage: true,
      modules: { orderBy: { order: "asc" } },
      assessments: { include: { _count: { select: { questions: true } } } },
      _count: { select: { enrollments: true } },
    },
  });

  if (!course) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (course.status !== "published" && userRole !== "admin" && userRole !== "instructor") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const isStaff = checkIsStaff(userRole ?? "learner");
  if (!isStaff) {
    const enrollment = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId: id } },
      select: { status: true },
    });
    if (!canAccessCourseContent(enrollment?.status)) {
      // Syllabus only. Strip the three module fields that ARE the
      // course, drop the SCORM record (its paths are a map of the
      // package), and reduce the instructor to a public identity.
      const { scormPackage, instructor, modules, ...rest } = course;
      return NextResponse.json({
        ...rest,
        hasScormPackage: scormPackage !== null,
        instructor: instructor
          ? { id: instructor.id, name: instructor.name }
          : null,
        modules: modules.map((m) => ({
          id: m.id,
          title: m.title,
          description: m.description,
          order: m.order,
          type: m.type,
          duration: m.duration,
          isRequired: m.isRequired,
        })),
      });
    }
  }

  return NextResponse.json(course);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // requireCourseOwner: instructor must own this specific course; admins
  // and superadmins always pass (so platform staff can still moderate /
  // ghost-edit). Without this, any self-registered instructor could
  // PATCH every course on the platform — the IDOR class behind the
  // May-2026 Canvas / Instructure breach.
  try {
    await requireCourseOwner(id);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const data = await req.json();
  const course = await prisma.course.update({
    where: { id },
    data: {
      ...(data.title !== undefined ? { title: data.title } : {}),
      ...(data.description !== undefined ? { description: data.description } : {}),
      ...(data.status !== undefined ? { status: data.status } : {}),
      ...(data.category !== undefined ? { category: data.category } : {}),
      ...(data.passingScore !== undefined ? { passingScore: data.passingScore } : {}),
      ...(data.maxAttempts !== undefined ? { maxAttempts: data.maxAttempts } : {}),
      ...(data.duration !== undefined ? { duration: data.duration } : {}),
      ...(data.tags !== undefined ? { tags: typeof data.tags === "string" ? data.tags : JSON.stringify(data.tags) } : {}),
      ...(data.thumbnail !== undefined ? { thumbnail: data.thumbnail } : {}),
      ...(data.creditCost !== undefined ? { creditCost: data.creditCost } : {}),
      ...(data.topic !== undefined ? { topic: data.topic || null } : {}),
      ...(data.delivery !== undefined ? { delivery: data.delivery || null } : {}),
      ...(data.provider !== undefined ? { provider: data.provider || null } : {}),
      ...(data.isSpecial !== undefined ? { isSpecial: !!data.isSpecial } : {}),
      ...(data.requiresApproval !== undefined ? { requiresApproval: !!data.requiresApproval } : {}),
      // Catalog-card fields — short code + cohort window dates.
      // Each accepts either a string (parsed to Date / null) or an
      // explicit null to clear. Empty strings clear the field too.
      ...(data.code !== undefined ? { code: data.code || null } : {}),
      ...(data.enrollByDate !== undefined
        ? { enrollByDate: data.enrollByDate ? new Date(data.enrollByDate) : null }
        : {}),
      ...(data.cohortStartDate !== undefined
        ? { cohortStartDate: data.cohortStartDate ? new Date(data.cohortStartDate) : null }
        : {}),
      ...(data.cohortEndDate !== undefined
        ? { cohortEndDate: data.cohortEndDate ? new Date(data.cohortEndDate) : null }
        : {}),
    },
  });

  // Re-tag skills if title/description changed (fire-and-forget).
  if (data.title !== undefined || data.description !== undefined) {
    const text = [course.title, course.description, course.category].filter(Boolean).join("\n\n");
    if (text.length > 30) {
      import("@/lib/skills/ontology").then(({ tagCourse }) => tagCourse(course.id, text)).catch(() => undefined);
    }
  }

  return NextResponse.json(course);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const _guard = await guardRole("admin");
  if (_guard instanceof NextResponse) return _guard;
  await prisma.course.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
