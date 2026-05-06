import { getSession, isStaff as checkIsStaff } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { cn, statusColor, formatScore } from "@/lib/utils";

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
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Gradebook</h1>
        <p className="text-gray-500 text-sm mt-1">
          {enrollments.filter((e) => e.score != null).length} scored ·{" "}
          {avg != null ? `Avg: ${Math.round(avg)}%` : "No scores yet"}
        </p>
      </div>

      {/* Course summary */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Course Grades</h2>
        </div>
        {enrollments.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-gray-400">No enrollments</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs text-gray-500 uppercase tracking-wide">
                <th className="px-5 py-3">Course</th>
                <th className="px-5 py-3">Category</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Score</th>
                <th className="px-5 py-3">Pass</th>
                <th className="px-5 py-3">Progress</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {enrollments.map((e: EnrollmentGrade) => {
                const passed = e.score != null && e.score >= e.course.passingScore;
                return (
                  <tr key={e.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3 font-medium text-gray-900">{e.course.title}</td>
                    <td className="px-5 py-3 text-gray-500">{e.course.category ?? "—"}</td>
                    <td className="px-5 py-3">
                      <span className={cn("text-xs px-2 py-0.5 rounded-full", statusColor(e.status))}>
                        {e.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 font-semibold text-gray-900">
                      {formatScore(e.score)}
                    </td>
                    <td className="px-5 py-3">
                      {e.score != null ? (
                        <span className={passed ? "text-green-600" : "text-red-500"}>
                          {passed ? "Pass" : "Fail"}
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-1.5 bg-gray-100 rounded-full">
                          <div
                            className="h-1.5 bg-brand-500 rounded-full"
                            style={{ width: `${e.progress}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-400">{Math.round(e.progress)}%</span>
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
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">SCORM Attempt History</h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs text-gray-500 uppercase tracking-wide">
                <th className="px-5 py-3">Course</th>
                <th className="px-5 py-3">Attempt</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Score</th>
                <th className="px-5 py-3">Time</th>
                <th className="px-5 py-3">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {scormSessions.map((s: ScormSessionGrade) => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 text-gray-900">{s.package.course.title}</td>
                  <td className="px-5 py-3 text-gray-500">#{s.attemptNumber}</td>
                  <td className="px-5 py-3">
                    <span className={cn("text-xs px-2 py-0.5 rounded-full", statusColor(s.status))}>
                      {s.status}
                    </span>
                  </td>
                  <td className="px-5 py-3 font-semibold">{formatScore(s.score)}</td>
                  <td className="px-5 py-3 text-gray-400 text-xs">{s.timeSpent ?? "—"}</td>
                  <td className="px-5 py-3 text-gray-400 text-xs">
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
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Assessment Results</h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs text-gray-500 uppercase tracking-wide">
                <th className="px-5 py-3">Assessment</th>
                <th className="px-5 py-3">Course</th>
                <th className="px-5 py-3">Score</th>
                <th className="px-5 py-3">Result</th>
                <th className="px-5 py-3">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {assessmentAttempts.map((a: AssessmentAttemptGrade) => (
                <tr key={a.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 text-gray-900">{a.assessment.title}</td>
                  <td className="px-5 py-3 text-gray-500">{a.assessment.course.title}</td>
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
                  <td className="px-5 py-3 text-gray-400 text-xs">
                    {new Date(a.startedAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
