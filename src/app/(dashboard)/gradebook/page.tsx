import { GraduationCap } from "lucide-react";
import { getSession, isStaff as checkIsStaff } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { cn, statusColor, formatScore } from "@/lib/utils";
import { PageHero } from "@/components/ui/PageHero";

interface EnrollmentGrade {
  id: string;
  courseId: string;
  status: string;
  progress: number;
  score: number | null;
  enrolledAt: Date;
  course: { id: string; title: string; category: string | null; passingScore: number };
}

interface ScormSessionGrade {
  id: string;
  attemptNumber: number;
  status: string;
  score: number | null;
  timeSpent: string | null;
  createdAt: Date;
  packageId: string;
  package: { course: { title: string } };
}

interface AssessmentAttemptGrade {
  id: string;
  score: number | null;
  passed: boolean | null;
  startedAt: Date;
  assessment: { title: string; passingScore: number; course: { title: string } };
}

export default async function GradebookPage() {
  const session = await getSession();
  const userId = (session!.user as { id?: string }).id!;
  const role = (session!.user as { role?: string }).role ?? "learner";
  const isStaff = checkIsStaff(role);

  const enrollments = await prisma.enrollment.findMany({
    where: { userId },
    include: {
      course: { select: { id: true, title: true, category: true, passingScore: true } },
    },
    orderBy: { enrolledAt: "desc" },
  }) as EnrollmentGrade[];

  const scormSessions = await prisma.scormSession.findMany({
    where: { userId },
    include: {
      package: { include: { course: { select: { title: true } } } },
    },
    orderBy: [{ packageId: "asc" }, { attemptNumber: "asc" }],
  }) as ScormSessionGrade[];

  const assessmentAttempts = await prisma.assessmentAttempt.findMany({
    where: { userId },
    include: {
      assessment: {
        select: { title: true, passingScore: true, course: { select: { title: true } } },
      },
    },
    orderBy: { startedAt: "desc" },
  }) as AssessmentAttemptGrade[];

  const avg =
    enrollments.filter((e) => e.score != null).length > 0
      ? enrollments
          .filter((e) => e.score != null)
          .reduce((sum, e) => sum + (e.score ?? 0), 0) /
        enrollments.filter((e) => e.score != null).length
      : null;

  return (
    <div>
      <PageHero
        eyebrow={<><GraduationCap size={11} /> Your performance</>}
        title="Gradebook"
        description={`${enrollments.filter((e) => e.score != null).length} scored · ${avg != null ? `${Math.round(avg)}% average` : "No scores yet"}`}
      />
      <div className="space-y-8">

      {/* Course summary */}
      <div className="bg-card rounded-xl border border-line overflow-hidden">
        <div className="px-5 py-4 border-b border-line">
          <h2 className="font-semibold text-fg">Course Grades</h2>
        </div>
        {enrollments.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-subtle">No enrollments</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs text-muted uppercase tracking-wide">
                <th className="px-5 py-3">Course</th>
                <th className="px-5 py-3">Category</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Score</th>
                <th className="px-5 py-3">Pass</th>
                <th className="px-5 py-3">Progress</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {enrollments.map((e: EnrollmentGrade) => {
                const passed = e.score != null && e.score >= e.course.passingScore;
                return (
                  <tr key={e.id} className="hover:bg-elevated">
                    <td className="px-5 py-3 font-medium text-fg">{e.course.title}</td>
                    <td className="px-5 py-3 text-muted">{e.course.category ?? "—"}</td>
                    <td className="px-5 py-3">
                      <span className={cn("text-xs px-2 py-0.5 rounded-full", statusColor(e.status))}>
                        {e.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 font-semibold text-fg">
                      {formatScore(e.score)}
                    </td>
                    <td className="px-5 py-3">
                      {e.score != null ? (
                        <span className={passed ? "text-green-600" : "text-red-500"}>
                          {passed ? "Pass" : "Fail"}
                        </span>
                      ) : (
                        <span className="text-subtle">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-1.5 bg-raised rounded-full">
                          <div
                            className="h-1.5 bg-brand-500 rounded-full"
                            style={{ width: `${e.progress}%` }}
                          />
                        </div>
                        <span className="text-xs text-subtle">{Math.round(e.progress)}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* SCORM attempt history */}
      {scormSessions.length > 0 && (
        <div className="bg-card rounded-xl border border-line overflow-hidden">
          <div className="px-5 py-4 border-b border-line">
            <h2 className="font-semibold text-fg">SCORM Attempt History</h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs text-muted uppercase tracking-wide">
                <th className="px-5 py-3">Course</th>
                <th className="px-5 py-3">Attempt</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Score</th>
                <th className="px-5 py-3">Time</th>
                <th className="px-5 py-3">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {scormSessions.map((s: ScormSessionGrade) => (
                <tr key={s.id} className="hover:bg-elevated">
                  <td className="px-5 py-3 text-fg">{s.package.course.title}</td>
                  <td className="px-5 py-3 text-muted">#{s.attemptNumber}</td>
                  <td className="px-5 py-3">
                    <span className={cn("text-xs px-2 py-0.5 rounded-full", statusColor(s.status))}>
                      {s.status}
                    </span>
                  </td>
                  <td className="px-5 py-3 font-semibold">{formatScore(s.score)}</td>
                  <td className="px-5 py-3 text-subtle text-xs">{s.timeSpent ?? "—"}</td>
                  <td className="px-5 py-3 text-subtle text-xs">
                    {new Date(s.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Assessment results */}
      {assessmentAttempts.length > 0 && (
        <div className="bg-card rounded-xl border border-line overflow-hidden">
          <div className="px-5 py-4 border-b border-line">
            <h2 className="font-semibold text-fg">Assessment Results</h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs text-muted uppercase tracking-wide">
                <th className="px-5 py-3">Assessment</th>
                <th className="px-5 py-3">Course</th>
                <th className="px-5 py-3">Score</th>
                <th className="px-5 py-3">Result</th>
                <th className="px-5 py-3">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {assessmentAttempts.map((a: AssessmentAttemptGrade) => (
                <tr key={a.id} className="hover:bg-elevated">
                  <td className="px-5 py-3 text-fg">{a.assessment.title}</td>
                  <td className="px-5 py-3 text-muted">{a.assessment.course.title}</td>
                  <td className="px-5 py-3 font-semibold">{formatScore(a.score)}</td>
                  <td className="px-5 py-3">
                    {a.passed != null ? (
                      <span className={a.passed ? "text-green-600" : "text-red-500"}>
                        {a.passed ? "Passed" : "Failed"}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-5 py-3 text-subtle text-xs">
                    {new Date(a.startedAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      </div>
    </div>
  );
}
