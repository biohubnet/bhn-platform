/**
 * Topic-level mastery aggregator.
 *
 * Given a course + a user, parses the user's AssessmentAttempt rows,
 * joins to the assessment's questions, and groups question outcomes
 * by `Question.topic`. Returns a per-topic `{ correct, total, ratio }`
 * record for the heatmap UI.
 *
 * "Cheap MVP" path — no Bayesian Knowledge Tracing, no per-attempt
 * outcome rows. Trade: we re-parse `answers` JSON on every read.
 * Acceptable at BHN's current scale (a course's attempts comfortably
 * fit in memory). When BKT becomes worthwhile (≥50 attempts/question),
 * promote this to a precomputed `QuestionAttempt` table.
 */
import { prisma } from "@/lib/prisma";

export type MasteryTone = "good" | "ok" | "low";

export interface TopicMastery {
  topic: string;
  /** Questions with `topic = null` get their assessment's title here,
   *  so the heatmap still has labelled buckets. */
  derivedFromAssessmentTitle: boolean;
  correct: number;
  total: number;
  ratio: number;     // 0..1
  tone: MasteryTone; // good ≥ 0.85, ok ≥ 0.5, else low
  questionIds: string[];
}

/** WCAG-friendly cutoffs. Mirrors PostingMatchPanel's good/ok/low. */
export const MASTERY_THRESHOLD_GOOD = 0.85;
export const MASTERY_THRESHOLD_OK   = 0.5;

export function toneFor(ratio: number): MasteryTone {
  if (ratio >= MASTERY_THRESHOLD_GOOD) return "good";
  if (ratio >= MASTERY_THRESHOLD_OK)   return "ok";
  return "low";
}

/**
 * Compute per-topic mastery for one user in one course. Considers
 * only the LATEST submitted attempt per assessment — multiple
 * attempts shouldn't double-count toward "mastery", and the latest
 * is the best estimate of the trainee's current standing.
 */
export async function computeCourseMastery(opts: {
  userId: string;
  courseId: string;
}): Promise<TopicMastery[]> {
  const { userId, courseId } = opts;

  // Pull every assessment in the course with its questions and the
  // user's latest submitted attempt.
  const assessments = await prisma.assessment.findMany({
    where: { courseId },
    include: {
      questions: {
        select: { id: true, correctAnswer: true, topic: true },
      },
      attempts: {
        where: { userId, submittedAt: { not: null } },
        orderBy: { submittedAt: "desc" },
        take: 1,
        select: { answers: true },
      },
    },
  });

  // Bucket by topic. Map<topic, {correct, total, questionIds, derivedFromAssessmentTitle}>
  type Bucket = Omit<TopicMastery, "ratio" | "tone">;
  const buckets = new Map<string, Bucket>();

  function getBucket(label: string, derived: boolean): Bucket {
    let b = buckets.get(label);
    if (!b) {
      b = {
        topic: label,
        derivedFromAssessmentTitle: derived,
        correct: 0,
        total: 0,
        questionIds: [],
      };
      buckets.set(label, b);
    }
    return b;
  }

  for (const a of assessments) {
    const latest = a.attempts[0];
    if (!latest) continue;

    let answers: Record<string, string> = {};
    try {
      const parsed = JSON.parse(latest.answers);
      if (parsed && typeof parsed === "object") answers = parsed as Record<string, string>;
    } catch {
      continue;
    }

    for (const q of a.questions) {
      const label = q.topic?.trim() || a.title;
      const derived = !q.topic?.trim();
      const b = getBucket(label, derived);
      b.questionIds.push(q.id);
      const submitted = answers[q.id];
      if (submitted === undefined) continue; // skipped — don't count
      b.total += 1;
      if (q.correctAnswer != null && submitted === q.correctAnswer) {
        b.correct += 1;
      }
    }
  }

  return Array.from(buckets.values()).map((b): TopicMastery => {
    const ratio = b.total > 0 ? b.correct / b.total : 0;
    return { ...b, ratio, tone: toneFor(ratio) };
  }).sort((a, b) => {
    // Sort low-mastery first so the heatmap surfaces gaps at a glance.
    if (a.ratio !== b.ratio) return a.ratio - b.ratio;
    return a.topic.localeCompare(b.topic);
  });
}
