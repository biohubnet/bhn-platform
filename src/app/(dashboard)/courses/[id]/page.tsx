import { getSession, isStaff as checkIsStaff } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { EnrollButton } from "@/components/lms/EnrollButton";
import { ScormUploadButton } from "@/components/lms/ScormUploadButton";
import { PublishToggle } from "@/components/lms/PublishToggle";
import { CourseEditButton } from "@/components/lms/CourseEditButton";
import { ThumbnailGenerator } from "@/components/lms/ThumbnailGenerator";
import { CourseAISummary } from "@/components/lms/CourseAISummary";
import { CourseTutorWidget } from "@/components/lms/CourseTutorWidget";
import { MasteryHeatmap } from "@/components/adaptive/MasteryHeatmap";
import { formatDuration, statusColor, cn } from "@/lib/utils";
import { BookOpen, Clock, Users, Award, Play, Upload, Coins } from "lucide-react";
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

  if (!course || (!isStaff && course.status !== "published")) notFound();

  const enrollment = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId, courseId: id } },
  });

  const scormSession = course.scormPackage
    ? await prisma.scormSession.findFirst({
        where: { userId, packageId: course.scormPackage.id },
        orderBy: { attemptNumber: "desc" },
      })
    : null;

  return (
    <div className="space-y-6 max-w-4xl">
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
              {course.scormPackage && (
                <span className="text-xs bg-raised text-muted px-2 py-0.5 rounded">
                  {course.scormPackage.version === "SCORM_2004" ? "SCORM 2004" : "SCORM 1.2"}
                </span>
              )}
            </div>
            <h1 className="text-2xl font-bold text-fg">{course.title}</h1>
            {course.description && (
              <p className="text-muted mt-2 text-sm">{course.description}</p>
            )}
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

      {/* SCORM Upload (instructors) */}
      {isStaff && (
        <div className="bg-card rounded-xl border border-line p-6">
          <h2 className="text-base font-semibold text-fg mb-4 flex items-center gap-2">
            <Upload size={16} />
            SCORM Package
          </h2>
          {course.scormPackage ? (
            <div className="text-sm text-muted space-y-1">
              <p>
                <span className="font-medium">Version:</span>{" "}
                {course.scormPackage.version === "SCORM_2004" ? "SCORM 2004" : "SCORM 1.2"}
              </p>
              <p>
                <span className="font-medium">Entry:</span> {course.scormPackage.entryPoint}
              </p>
              <p className="text-xs text-subtle">
                Uploaded {new Date(course.scormPackage.uploadedAt).toLocaleDateString()}
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted mb-3">No SCORM package uploaded yet.</p>
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
