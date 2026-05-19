import { getSession, isStaff as checkIsStaff } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { EnrollButton } from "@/components/lms/EnrollButton";
import { getTraineeCourseLimit } from "@/lib/settings";
import { ScormUploadButton } from "@/components/lms/ScormUploadButton";
import { PublishToggle } from "@/components/lms/PublishToggle";
import { CourseEditButton } from "@/components/lms/CourseEditButton";
import { ThumbnailGenerator } from "@/components/lms/ThumbnailGenerator";
import { CourseAISummary } from "@/components/lms/CourseAISummary";
import { CourseTutorWidget } from "@/components/lms/CourseTutorWidget";
import { MasteryHeatmap } from "@/components/adaptive/MasteryHeatmap";
import { formatDuration, statusColor, cn } from "@/lib/utils";
import { displayCourseDescription } from "@/lib/courses/displayDescription";
import { BookOpen, Clock, Users, Award, Play, Upload, Coins, Archive, AlertCircle } from "lucide-react";
import Link from "next/link";

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSession();
  const userId = (session!.user as { id?: string }).id!;
  const role = (session!.user as { role?: string }).role ?? "user";
  const isStaff = checkIsStaff(role);
  const userCredits = !isStaff
    ? (await prisma.user.findUnique({ where: { id: userId }, select: { credits: true } }))?.credits ?? 0
    : Infinity;

  const course = await prisma.course.findUnique({
    where: { id },
    include: {
      instructor: { select: { name: true, email: true } },
      scormPackage: true,
      modules: { orderBy: { order: "asc" } },
      assessments: { include: { _count: { select: { questions: true } } } },
      _count: { select: { enrollments: true } },
    },
  });

  // Visibility: staff see everything (draft / published / archived);
  // trainees see published + archived (archived stays viewable so they
  // can read about past offerings; the enroll button is disabled
  // below). Only draft is hidden from trainees.
  if (!course || (!isStaff && course.status === "draft")) notFound();
  const isArchived = course.status === "archived";

  const enrollment = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId, courseId: id } },
  });

  // For staff: how many active courses do they hold right now, and
  // what's the current trainee-facing cap? The enrol button uses these
  // to show a "you're bypassing the cap" warning so admins don't
  // forget the rule still applies to learners.
  const [staffActiveCount, traineeLimit] = isStaff
    ? await Promise.all([
        prisma.enrollment.count({ where: { userId, status: "active" } }),
        getTraineeCourseLimit(),
      ])
    : [0, 3];

  const scormSession = course.scormPackage
    ? await prisma.scormSession.findFirst({
        where: { userId, packageId: course.scormPackage.id },
        orderBy: { attemptNumber: "desc" },
      })
    : null;

  // Trainees who don't have enough credits to enroll get a clear,
  // upstream nudge to /credits/apply BEFORE they hit the enroll button
  // and discover the gap. Skips when: already enrolled, or staff (who
  // bypass credit gates), or course is archived (enroll is closed
  // anyway), or the course is free.
  const showCreditApplyBanner =
    !isStaff &&
    !enrollment &&
    !isArchived &&
    course.creditCost > 0 &&
    userCredits < course.creditCost;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Archived banner — explains why enrolment is closed. */}
      {isArchived && !isStaff && (
        <div className="rounded-2xl bg-elevated ring-1 ring-inset ring-line-strong px-4 py-3 flex items-start gap-2">
          <Archive size={14} className="text-fg-muted shrink-0 mt-0.5" />
          <p className="text-sm text-fg leading-snug">
            <span className="font-bold">This course is archived.</span>{" "}
            New enrolments are closed, but you can still read the course
            details below. If you're already enrolled, your access continues.
          </p>
        </div>
      )}

      {/* Credit-application nudge — proactive guidance before they
          discover the credit gap mid-enroll. */}
      {showCreditApplyBanner && (
        <div className="rounded-2xl bg-amber-50 ring-1 ring-inset ring-amber-200 px-4 py-3 flex items-start gap-2">
          <AlertCircle size={14} className="text-amber-700 shrink-0 mt-0.5" />
          <div className="flex-1 text-sm text-amber-900 leading-snug">
            <p className="font-bold">
              You'll need {(course.creditCost - userCredits).toLocaleString()} more credits to enroll.
            </p>
            <p className="text-xs mt-1">
              Eligible HQP (graduate students with 2+ semesters, postdocs,
              research associates, lab technicians) at one of the 14 partner
              Ontario institutions can apply for 5 000 training credits at
              no cost.{" "}
              <Link href="/credits/apply" className="font-semibold underline hover:no-underline">
                Apply for credits →
              </Link>
            </p>
          </div>
        </div>
      )}

      {/* Thumbnail hero — only when present, or when staff for the generator */}
      {(course.thumbnail || isStaff) && (
        <div className="relative aspect-[16/6] w-full rounded-[var(--radius-xl)] overflow-hidden bg-gradient-to-br from-brand-500 via-brand-600 to-brand-800 group">
          {course.thumbnail && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={course.thumbnail} alt="" className="w-full h-full object-cover" />
          )}
          {isStaff && (
            <div className="absolute top-3 right-3 opacity-90 hover:opacity-100">
              <ThumbnailGenerator
                endpoint={`/api/courses/${id}/thumbnail`}
                currentUrl={course.thumbnail}
                compact
              />
            </div>
          )}
        </div>
      )}

      {/* Header */}
      <div className="bg-card backdrop-blur-md rounded-[var(--radius-lg)] border border-line p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              {course.category && (
                <span className="text-xs bg-brand-50 text-brand-600 px-2 py-0.5 rounded font-medium">
                  {course.category}
                </span>
              )}
              <span className={cn("text-xs px-2 py-0.5 rounded-full", statusColor(course.status))}>
                {course.status}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-fg">{course.title}</h1>
            {(() => {
              const blurb = displayCourseDescription(course.description);
              return blurb ? (
                <p className="text-muted mt-2 text-sm">{blurb}</p>
              ) : null;
            })()}
            <div className="flex items-center gap-4 mt-4 text-sm text-muted">
              <span className="flex items-center gap-1.5">
                <Users size={14} />
                {course._count.enrollments} enrolled
              </span>
              {course.duration && (
                <span className="flex items-center gap-1.5">
                  <Clock size={14} />
                  {formatDuration(course.duration)}
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <Award size={14} />
                Pass: {course.passingScore}%
              </span>
              {course.instructor && (
                <span className="flex items-center gap-1.5">
                  <BookOpen size={14} />
                  {course.instructor.name}
                </span>
              )}
              {course.creditCost > 0 && (
                <span className={cn(
                  "flex items-center gap-1.5 font-medium",
                  !isStaff && userCredits < course.creditCost ? "text-red-500" : "text-amber-600"
                )}>
                  <Coins size={14} />
                  {course.creditCost.toLocaleString()} BHN Credits
                  {!isStaff && userCredits < course.creditCost && " (insufficient)"}
                </span>
              )}
              {course.creditCost === 0 && (
                <span className="flex items-center gap-1.5 text-green-600">
                  <Coins size={14} />
                  Free
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2 flex-shrink-0">
            {isStaff && (
              <CourseEditButton
                course={{
                  id: course.id,
                  title: course.title,
                  description: course.description,
                  category: course.category,
                  status: course.status,
                  passingScore: course.passingScore,
                  maxAttempts: course.maxAttempts,
                  duration: course.duration,
                  creditCost: course.creditCost,
                  thumbnail: course.thumbnail,
                }}
              />
            )}
            {isStaff && <PublishToggle courseId={id} status={course.status} />}
            {!enrollment && !isStaff && course.status === "published" && (
              <EnrollButton courseId={id} />
            )}
            {!enrollment && isStaff && course.status === "published" && (
              // Staff bypass the cap silently in the API, but the
              // button shows a one-time warning popup if they're at /
              // past the trainee limit, so they don't forget the rule
              // still applies to learners.
              <EnrollButton
                courseId={id}
                staffRole
                activeCount={staffActiveCount}
                limit={traineeLimit}
              />
            )}
            {!enrollment && !isStaff && isArchived && (
              <button
                type="button"
                disabled
                title="This course is archived — enrolment is closed. You can still read the course details."
                className="flex items-center gap-2 bg-elevated text-subtle text-sm font-medium px-4 py-2 rounded-lg cursor-not-allowed ring-1 ring-inset ring-line"
              >
                Enrolment closed (archived)
              </button>
            )}
            {enrollment && course.scormPackage && (
              <Link
                href={`/player/${id}`}
                className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
              >
                <Play size={14} />
                {scormSession ? "Continue" : "Start Course"}
              </Link>
            )}
            {enrollment && !course.scormPackage && course.modules.length > 0 && (
              <Link
                href={`/courses/${id}/learn`}
                className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
              >
                <Play size={14} />
                {enrollment.progress > 0 ? "Continue Learning" : "Start Learning"}
              </Link>
            )}
          </div>
        </div>

        {/* Enrollment status */}
        {enrollment && (
          <div className="mt-4 pt-4 border-t border-line">
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-muted">Your progress</span>
              <span className="font-medium text-fg">{Math.round(enrollment.progress)}%</span>
            </div>
            <div className="h-2 bg-raised rounded-full">
              <div
                className="h-2 bg-brand-500 rounded-full transition-all"
                style={{ width: `${enrollment.progress}%` }}
              />
            </div>
            {enrollment.score != null && (
              <p className="text-xs text-muted mt-1">Last score: {Math.round(enrollment.score)}%</p>
            )}
          </div>
        )}
      </div>

      {/* AI summary — visible to learners; staff can (re)generate */}
      <CourseAISummary
        courseId={id}
        initialSummary={course.aiSummary}
        canManage={isStaff}
      />

      {/* Course-package upload (instructors). The SCORM-specific
          labelling has been retired from the trainee-facing chrome
          per user request — the underlying upload + player flow
          still works the same, the version label just isn't shown
          anywhere visible. Section heading is now generic and the
          metadata is reduced to the entry point + upload date. */}
      {isStaff && (
        <div className="bg-card rounded-xl border border-line p-6">
          <h2 className="text-base font-semibold text-fg mb-4 flex items-center gap-2">
            <Upload size={16} />
            Course package
          </h2>
          {course.scormPackage ? (
            <div className="text-sm text-muted space-y-1">
              <p>
                <span className="font-medium">Entry:</span> {course.scormPackage.entryPoint}
              </p>
              <p className="text-xs text-subtle">
                Uploaded {new Date(course.scormPackage.uploadedAt).toLocaleDateString()}
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted mb-3">No package uploaded yet.</p>
          )}
          <div className="mt-3">
            <ScormUploadButton courseId={id} />
          </div>
        </div>
      )}

      {/* Modules */}
      {course.modules.length > 0 && (
        <div className="bg-card rounded-xl border border-line p-6">
          <h2 className="text-base font-semibold text-fg mb-4">Course Content</h2>
          <div className="space-y-2">
            {course.modules.map((mod, i) => (
              <div
                key={mod.id}
                className="flex items-center gap-3 p-3 rounded-lg border border-line text-sm"
              >
                <div className="w-6 h-6 rounded-full bg-raised text-muted flex items-center justify-center text-xs font-medium flex-shrink-0">
                  {i + 1}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-fg">{mod.title}</p>
                  {mod.duration && (
                    <p className="text-xs text-subtle">{formatDuration(mod.duration)}</p>
                  )}
                </div>
                <span className="text-xs text-subtle capitalize">{mod.type}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Assessments */}
      {course.assessments.length > 0 && (
        <div className="bg-card rounded-xl border border-line p-6">
          <h2 className="text-base font-semibold text-fg mb-4">Assessments</h2>
          <div className="space-y-2">
            {course.assessments.map((a) => (
              <div
                key={a.id}
                className="flex items-center justify-between p-3 rounded-lg border border-line"
              >
                <div>
                  <p className="text-sm font-medium text-fg">{a.title}</p>
                  <p className="text-xs text-subtle mt-0.5">
                    {a._count.questions} questions · Pass: {a.passingScore}%
                  </p>
                </div>
                {enrollment && (
                  <Link
                    href={`/assessments/${a.id}`}
                    className="text-sm text-brand-600 hover:underline font-medium"
                  >
                    Take
                  </Link>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Topic-mastery heatmap — only renders meaningful content
          once the trainee has at least one graded attempt. Enrolled
          learners + staff (so course authors can see the same view). */}
      {(enrollment || isStaff) && (
        <div className="mt-6">
          <MasteryHeatmap userId={userId} courseId={id} courseTitle={course.title} />
        </div>
      )}

      {/* AI tutor — only for enrolled learners and staff */}
      {(enrollment || isStaff) && <CourseTutorWidget courseId={id} />}
    </div>
  );
}
