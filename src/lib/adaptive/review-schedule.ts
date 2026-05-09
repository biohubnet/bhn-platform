/**
 * Lightweight review-scheduling primitive — pure functions, no I/O.
 *
 * Replaces full SM-2 (which needs a 0..5 self-grade scale and a
 * floating-point ease factor that takes 30 years of community
 * argument to interpret) with a simple binary "got it / still tricky"
 * + an expanding-interval ladder.
 *
 * Ladder: 1d → 3d → 7d → 14d → 30d → 60d (cap).
 *   "got it"      → advance to next rung
 *   "still tricky" → reset to first rung (so the trainee sees it
 *                   tomorrow, learns the lesson)
 *
 * This keeps the SuperMemo / Ebbinghaus benefits — the testing
 * effect, expanding-interval retention — without burdening the
 * trainee with a vocabulary they don't have. We can promote to full
 * SM-2 later if data shows the binary scale is too coarse.
 */

const LADDER_DAYS = [1, 3, 7, 14, 30, 60] as const;

export type ReviewQuality = "got_it" | "still_tricky";

export interface ScheduleInput {
  intervalDays: number;
  quality: ReviewQuality;
  /** Optional override for "now" — useful for tests, otherwise Date.now(). */
  now?: Date;
}

export interface ScheduleResult {
  nextIntervalDays: number;
  nextReviewAt: Date;
}

/** Pure scheduler. Takes the current interval + a self-grade and
 *  returns the next interval + due date. */
export function nextReview({ intervalDays, quality, now }: ScheduleInput): ScheduleResult {
  const ref = now ?? new Date();
  const next = quality === "got_it"
    ? advance(intervalDays)
    : LADDER_DAYS[0];
  const due = new Date(ref);
  due.setDate(due.getDate() + next);
  return { nextIntervalDays: next, nextReviewAt: due };
}

function advance(current: number): number {
  // Find current rung; pick next; cap at the last rung.
  const idx = LADDER_DAYS.findIndex((d) => d >= current);
  if (idx === -1) return LADDER_DAYS[LADDER_DAYS.length - 1];
  if (idx === LADDER_DAYS.length - 1) return LADDER_DAYS[idx];
  return LADDER_DAYS[idx + 1];
}

/** Used by /api/adaptive/bookmarks toggle to set the initial due
 *  date (tomorrow, so the trainee sees the bookmark in their first
 *  Today's Reviews after they create it). */
export function initialNextReviewAt(now?: Date): Date {
  const ref = now ?? new Date();
  const due = new Date(ref);
  due.setDate(due.getDate() + LADDER_DAYS[0]);
  return due;
}
