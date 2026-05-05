"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircle, Circle, ChevronRight, ChevronLeft, BookOpen, ClipboardList, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

interface Question {
  id: string;
  text: string;
  type: string;
  options: string | null;
  correctAnswer: string | null;
  points: number;
  order: number;
  explanation: string | null;
}

interface Assessment {
  id: string;
  title: string;
  description: string | null;
  passingScore: number;
  timeLimit: number | null;
  questions: Question[];
  attempts: { score: number | null; passed: boolean | null }[];
}

interface Module {
  id: string;
  title: string;
  type: string;
  content: string | null;
  duration: number | null;
  order: number;
}

interface ProgressEntry {
  status: string;
  completedAt: Date | null;
}

interface ModuleReaderProps {
  course: {
    id: string;
    title: string;
    modules: Module[];
    assessments: Assessment[];
  };
  userId: string;
  activeModuleId: string | undefined;
  progressMap: Record<string, ProgressEntry>;
}

export function ModuleReader({ course, userId, activeModuleId, progressMap }: ModuleReaderProps) {
  const router = useRouter();
  const [currentId, setCurrentId] = useState(activeModuleId ?? course.modules[0]?.id);
  const [localProgress, setLocalProgress] = useState<Record<string, string>>(
    Object.fromEntries(Object.entries(progressMap).map(([k, v]) => [k, v.status]))
  );
  const [quizMode, setQuizMode] = useState<string | null>(null);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, string>>({});
  const [quizResult, setQuizResult] = useState<{ score: number; passed: boolean; maxScore: number } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const currentModule = course.modules.find((m) => m.id === currentId);
  const currentIndex = course.modules.findIndex((m) => m.id === currentId);
  const prevModule = currentIndex > 0 ? course.modules[currentIndex - 1] : null;
  const nextModule = currentIndex < course.modules.length - 1 ? course.modules[currentIndex + 1] : null;
  const completedCount = Object.values(localProgress).filter((s) => s === "completed").length;
  const totalItems = course.modules.length;

  async function markComplete(moduleId: string) {
    if (localProgress[moduleId] === "completed") return;
    setLocalProgress((p) => ({ ...p, [moduleId]: "completed" }));
    await fetch(`/api/modules/${moduleId}/progress`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "completed" }),
    });
    // Update enrollment progress
    const pct = Math.round(((completedCount + 1) / totalItems) * 100);
    await fetch(`/api/enrollments/${course.id}/progress`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ progress: pct }),
    });
  }

  async function submitQuiz(assessmentId: string) {
    setSubmitting(true);
    const res = await fetch(`/api/assessments/${assessmentId}/attempt`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers: quizAnswers }),
    });
    const result = await res.json();
    setQuizResult({ score: result.score, passed: result.passed, maxScore: result.maxScore });
    setSubmitting(false);
  }

  const activeAssessment = quizMode ? course.assessments.find((a) => a.id === quizMode) : null;

  return (
    <div className="flex gap-6 -mx-6 -my-8 h-[calc(100vh-0px)]">
      {/* Sidebar */}
      <div className="w-72 bg-white border-r border-gray-200 flex flex-col flex-shrink-0 overflow-y-auto">
        <div className="px-4 py-4 border-b border-gray-100">
          <Link href={`/courses/${course.id}`} className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 mb-2">
            <ArrowLeft size={12} /> Back to course
          </Link>
          <h2 className="font-semibold text-gray-900 text-sm leading-snug">{course.title}</h2>
          <div className="mt-2">
            <div className="flex justify-between text-xs text-gray-400 mb-1">
              <span>{completedCount}/{totalItems} complete</span>
              <span>{Math.round((completedCount / Math.max(totalItems, 1)) * 100)}%</span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full">
              <div className="h-1.5 bg-blue-500 rounded-full transition-all" style={{ width: `${(completedCount / Math.max(totalItems, 1)) * 100}%` }} />
            </div>
          </div>
        </div>

        <nav className="flex-1 p-2">
          <p className="px-2 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">Modules</p>
          {course.modules.map((mod) => {
            const done = localProgress[mod.id] === "completed";
            const active = mod.id === currentId && !quizMode;
            return (
              <button
                key={mod.id}
                onClick={() => { setCurrentId(mod.id); setQuizMode(null); setQuizResult(null); }}
                className={cn(
                  "flex items-start gap-2.5 w-full text-left px-2 py-2 rounded-lg text-sm transition-colors",
                  active ? "bg-blue-50 text-blue-700" : "text-gray-600 hover:bg-gray-50"
                )}
              >
                {done ? (
                  <CheckCircle size={16} className="text-green-500 mt-0.5 flex-shrink-0" />
                ) : (
                  <Circle size={16} className={cn("mt-0.5 flex-shrink-0", active ? "text-blue-400" : "text-gray-300")} />
                )}
                <span className="leading-snug">{mod.title}</span>
              </button>
            );
          })}

          {course.assessments.length > 0 && (
            <>
              <p className="px-2 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wide mt-2">Assessment</p>
              {course.assessments.map((a) => {
                const lastAttempt = a.attempts[0];
                const active = quizMode === a.id;
                return (
                  <button
                    key={a.id}
                    onClick={() => { setQuizMode(a.id); setQuizAnswers({}); setQuizResult(null); }}
                    className={cn(
                      "flex items-start gap-2.5 w-full text-left px-2 py-2 rounded-lg text-sm transition-colors",
                      active ? "bg-blue-50 text-blue-700" : "text-gray-600 hover:bg-gray-50"
                    )}
                  >
                    <ClipboardList size={16} className={cn("mt-0.5 flex-shrink-0", lastAttempt?.passed ? "text-green-500" : "text-gray-300")} />
                    <div>
                      <span className="leading-snug">{a.title}</span>
                      {lastAttempt?.score != null && (
                        <p className={cn("text-xs mt-0.5", lastAttempt.passed ? "text-green-600" : "text-red-500")}>
                          Last: {Math.round(lastAttempt.score)}% {lastAttempt.passed ? "✓" : "✗"}
                        </p>
                      )}
                    </div>
                  </button>
                );
              })}
            </>
          )}
        </nav>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto py-8 pr-6">
        {quizMode && activeAssessment ? (
          <div className="max-w-2xl">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900">{activeAssessment.title}</h1>
              {activeAssessment.description && <p className="text-gray-500 mt-1">{activeAssessment.description}</p>}
              <p className="text-sm text-gray-400 mt-1">Passing score: {activeAssessment.passingScore}% · {activeAssessment.questions.length} questions</p>
            </div>

            {quizResult ? (
              <div className={cn("rounded-xl p-6 mb-6 text-center", quizResult.passed ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200")}>
                <p className="text-4xl font-bold mb-2">{Math.round(quizResult.score)}%</p>
                <p className={cn("text-lg font-semibold", quizResult.passed ? "text-green-700" : "text-red-700")}>
                  {quizResult.passed ? "Passed!" : "Not passed"}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  {quizResult.passed ? "You've earned a certificate for this course." : `You need ${activeAssessment.passingScore}% to pass.`}
                </p>
                <button
                  onClick={() => { setQuizAnswers({}); setQuizResult(null); }}
                  className="mt-4 text-sm text-blue-600 hover:underline"
                >
                  Retake assessment
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {activeAssessment.questions.map((q, i) => {
                  const opts: string[] = q.options ? JSON.parse(q.options) : [];
                  return (
                    <div key={q.id} className="bg-white rounded-xl border border-gray-200 p-5">
                      <p className="font-medium text-gray-900 mb-3">
                        <span className="text-gray-400 mr-2">{i + 1}.</span>{q.text}
                      </p>
                      {q.type === "multiple_choice" && (
                        <div className="space-y-2">
                          {opts.map((opt) => (
                            <label
                              key={opt}
                              className={cn(
                                "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                                quizAnswers[q.id] === opt ? "border-blue-400 bg-blue-50" : "border-gray-200 hover:bg-gray-50"
                              )}
                            >
                              <input
                                type="radio"
                                name={q.id}
                                value={opt}
                                checked={quizAnswers[q.id] === opt}
                                onChange={() => setQuizAnswers((a) => ({ ...a, [q.id]: opt }))}
                                className="text-blue-600"
                              />
                              <span className="text-sm text-gray-700">{opt}</span>
                            </label>
                          ))}
                        </div>
                      )}
                      {q.type === "true_false" && (
                        <div className="flex gap-3">
                          {["True", "False"].map((opt) => (
                            <label
                              key={opt}
                              className={cn(
                                "flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer transition-colors",
                                quizAnswers[q.id] === opt ? "border-blue-400 bg-blue-50" : "border-gray-200 hover:bg-gray-50"
                              )}
                            >
                              <input
                                type="radio"
                                name={q.id}
                                value={opt}
                                checked={quizAnswers[q.id] === opt}
                                onChange={() => setQuizAnswers((a) => ({ ...a, [q.id]: opt }))}
                              />
                              <span className="text-sm">{opt}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
                <button
                  onClick={() => submitQuiz(activeAssessment.id)}
                  disabled={submitting || Object.keys(quizAnswers).length < activeAssessment.questions.length}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-medium py-3 rounded-xl transition-colors"
                >
                  {submitting ? "Grading…" : "Submit Assessment"}
                </button>
              </div>
            )}
          </div>
        ) : currentModule ? (
          <div className="max-w-3xl">
            <div className="flex items-center gap-2 text-xs text-gray-400 mb-2">
              <BookOpen size={12} />
              <span>Module {currentModule.order}</span>
              {currentModule.duration && <span>· {currentModule.duration} min read</span>}
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-6">{currentModule.title}</h1>

            {currentModule.content && (
              <div
                className="prose prose-gray max-w-none prose-headings:font-semibold prose-h2:text-xl prose-h3:text-lg prose-p:text-gray-600 prose-li:text-gray-600 prose-strong:text-gray-900"
                dangerouslySetInnerHTML={{ __html: currentModule.content }}
              />
            )}

            <div className="flex items-center justify-between mt-10 pt-6 border-t border-gray-200">
              <div>
                {prevModule && (
                  <button
                    onClick={() => { setCurrentId(prevModule.id); setQuizMode(null); }}
                    className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"
                  >
                    <ChevronLeft size={16} /> {prevModule.title}
                  </button>
                )}
              </div>
              <div className="flex items-center gap-3">
                {localProgress[currentModule.id] !== "completed" && (
                  <button
                    onClick={() => markComplete(currentModule.id)}
                    className="flex items-center gap-2 text-sm bg-green-50 text-green-700 border border-green-200 px-4 py-2 rounded-lg hover:bg-green-100 transition-colors"
                  >
                    <CheckCircle size={14} /> Mark Complete
                  </button>
                )}
                {nextModule && (
                  <button
                    onClick={() => { markComplete(currentModule.id); setCurrentId(nextModule.id); }}
                    className="flex items-center gap-2 text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Next <ChevronRight size={16} />
                  </button>
                )}
                {!nextModule && course.assessments.length > 0 && (
                  <button
                    onClick={() => { markComplete(currentModule.id); setQuizMode(course.assessments[0].id); setQuizAnswers({}); setQuizResult(null); }}
                    className="flex items-center gap-2 text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Take Assessment <ChevronRight size={16} />
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
