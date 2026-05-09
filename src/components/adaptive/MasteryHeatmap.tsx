/**
 * Topic-mastery heatmap. Server component — server-renders the grid
 * from computeCourseMastery() at request time. Replaces "X% complete"
 * with a per-topic green/yellow/red read.
 *
 * Empty state: renders a minimal hint, not nothing — important for
 * fresh-trainee dashboards. If a course has no graded attempts yet,
 * the heatmap explains why instead of vanishing.
 */
import Link from "next/link";
import { Sparkles, ArrowRight, Check, AlertCircle } from "lucide-react";
import { computeCourseMastery, type TopicMastery } from "@/lib/adaptive/mastery";
import { cn } from "@/lib/utils";

const TONE_CLS: Record<TopicMastery["tone"], string> = {
  good: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  ok:   "bg-amber-50   text-amber-800   ring-amber-200",
  low:  "bg-rose-50    text-rose-800    ring-rose-200",
};

const TONE_DOT: Record<TopicMastery["tone"], string> = {
  good: "bg-emerald-500",
  ok:   "bg-amber-500",
  low:  "bg-rose-500",
};

const TONE_LABEL: Record<TopicMastery["tone"], string> = {
  good: "Strong",
  ok:   "Building",
  low:  "Needs review",
};

const TONE_ICON: Record<TopicMastery["tone"], React.ElementType> = {
  good: Check,
  ok:   Sparkles,
  low:  AlertCircle,
};

export async function MasteryHeatmap({
  userId, courseId, courseTitle,
}: {
  userId: string;
  courseId: string;
  courseTitle?: string;
}) {
  const topics = await computeCourseMastery({ userId, courseId });

  if (topics.length === 0) {
    return (
      <div className="rounded-2xl border border-line bg-card p-5">
        <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-subtle">Your mastery</p>
        <p className="text-sm text-muted mt-2">
          {courseTitle ? `Take an assessment in ${courseTitle}` : "Take an assessment"} to start
          your topic-mastery heatmap. Each topic gets its own card here once you&apos;ve answered
          questions on it.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-line bg-card p-5">
      <div className="flex items-center justify-between gap-3 mb-3">
        <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-subtle">Your mastery</p>
        <p className="text-xs text-muted">
          {topics.filter((t) => t.tone === "good").length} of {topics.length} topics strong
        </p>
      </div>

      <ul className="grid sm:grid-cols-2 gap-2">
        {topics.map((t) => {
          const Icon = TONE_ICON[t.tone];
          return (
            <li key={t.topic}>
              <div
                className={cn(
                  "rounded-xl px-3 py-3 ring-1 ring-inset flex items-start gap-3 transition-colors",
                  TONE_CLS[t.tone],
                )}
              >
                <span className={cn("mt-1 w-2 h-2 rounded-full shrink-0", TONE_DOT[t.tone])} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold leading-snug truncate">{t.topic}</p>
                  <p className="text-xs opacity-80 mt-0.5 inline-flex items-center gap-1">
                    <Icon size={11} /> {TONE_LABEL[t.tone]} · {t.correct} / {t.total} correct
                  </p>
                </div>
                <span className="text-xs font-semibold shrink-0 tabular-nums">
                  {Math.round(t.ratio * 100)}%
                </span>
              </div>
            </li>
          );
        })}
      </ul>

      <p className="text-xs text-muted mt-3">
        Topics surface from the questions in this course. Items without an explicit topic group
        under their assessment&apos;s title — course authors can refine the labels as the
        course evolves.{" "}
        <Link href={`/courses/${courseId}`} className="text-brand-700 underline hover:no-underline inline-flex items-center gap-0.5">
          Course detail <ArrowRight size={11} />
        </Link>
      </p>
    </div>
  );
}
