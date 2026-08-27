import { getSession, isStaff as checkIsStaff } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ModuleReader } from "@/components/lms/ModuleReader";
import { ArrowLeft, BookOpen } from "lucide-react";

export default async function LearnPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ module?: string }>;
}) {
  const { id: courseId } = await params;
  const sp = await searchParams;
  const session = await getSession();
  if (!session) redirect("/login");

  const userId = (session.user as { id?: string }).id!;
  const role = (session.user as { role?: string }).role ?? "learner";
  const isStaff = checkIsStaff(role);

  const enrollment = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId, courseId } },
  });
  if (!enrollment && !isStaff) redirect(`/courses/${courseId}`);

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: {
      modules: { orderBy: { order: "asc" } },
      assessments: {
        include: {
          questions: { orderBy: { order: "asc" } },
          attempts: { where: { userId }, orderBy: { startedAt: "desc" }, take: 1 },
        },
      },
    },
  });
  if (!course) notFound();

  // No modules + no assessments — the course is enrolled-but-empty
  // (instructor created it, never added content; or the content was
  // deleted). Without a guard, ModuleReader runs `course.modules[0]`
  // (undefined) → currentIndex math goes negative → an unrenderable
  // shell. Show an explicit empty state instead.
  if (course.modules.length === 0 && course.assessments.length === 0) {
    return (
      <div className="max-w-2xl mx-auto py-16 px-6 text-center">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center mb-4">
          <BookOpen size={24} />
        </div>
        <h1 className="text-xl font-semibold text-fg">{course.title}</h1>
        <p className="text-muted mt-2">
          This course doesn&apos;t have any modules or assessments yet.
          {isStaff
            ? " As staff, you can add content from the course detail page."
            : " The instructor is still building it — check back soon."}
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <Link
            href={`/courses/${courseId}`}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium border border-line hover:border-brand-300 hover:text-brand-700"
          >
            <ArrowLeft size={14} /> Back to course
          </Link>
          <Link
            href="/progress"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium bg-brand-600 text-white hover:bg-brand-700"
          >
            Progress Tracker
          </Link>
        </div>
      </div>
    );
  }

  const progress = await prisma.moduleProgress.findMany({
    where: { userId, moduleId: { in: course.modules.map((m: { id: string }) => m.id) } },
  });
  const progressMap = Object.fromEntries(progress.map((p) => [p.moduleId, p]));

  // Fetch the trainee's bookmarked question IDs once, server-side, so
  // every question header can render its star icon in the right
  // initial state without N+1 client calls.
  const courseQuestionIds = course.assessments.flatMap((a) => a.questions.map((q) => q.id));
  const bookmarks = courseQuestionIds.length > 0
    ? await prisma.reviewBookmark.findMany({
        where: { userId, questionId: { in: courseQuestionIds } },
        select: { questionId: true },
      })
    : [];
  const bookmarkedQuestionIds = bookmarks.map((b) => b.questionId);

  const activeModuleId = sp.module ?? course.modules[0]?.id;

  return (
    <ModuleReader
      course={course}
      userId={userId}
      activeModuleId={activeModuleId}
      progressMap={progressMap}
      bookmarkedQuestionIds={bookmarkedQuestionIds}
    />
  );
}
