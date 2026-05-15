/**
 * Trainee queue-count fetcher.
 *
 * Mirror of src/lib/admin/queue-counts.ts but per-user-scoped: counts
 * items where someone else is waiting on THIS trainee's response. The
 * Sidebar reads the resulting map and stamps the existing queue-badge
 * chip next to the matching nav row.
 *
 * Three items get badged today:
 *   • interview-requests — proposed interviews the trainee hasn't
 *     accepted yet (Interview.status = "proposed").
 *   • offer-requests     — offers the employer has sent and the
 *     trainee hasn't accepted / declined yet.
 *   • buddy-invites      — incoming learning-buddy invites the
 *     trainee hasn't responded to.
 *
 * All three share the same "someone's waiting on you" semantic — a
 * positive count means there's a thing the trainee should act on.
 *
 * Performance
 *   Three counts in parallel via Promise.all. All three queries hit
 *   indexed columns. Per-row failures swallow to 0 so a missing table
 *   can't cascade into a sidebar render failure.
 */
import { prisma } from "@/lib/prisma";

export type TraineeQueueBadgeKey =
  | "interview-requests"
  | "offer-requests"
  | "buddy-invites";

export type TraineeQueueCounts = Partial<Record<TraineeQueueBadgeKey, number>>;

export async function getTraineeQueueCounts(userId: string): Promise<TraineeQueueCounts> {
  const [interviews, offers, buddies] = await Promise.all([
    prisma.interview.count({
      where: { applicantId: userId, status: "proposed" },
    }).catch(() => 0),
    prisma.offer.count({
      where: { applicantId: userId, status: "sent" },
    }).catch(() => 0),
    prisma.buddyPair.count({
      where: { partnerId: userId, status: "invited" },
    }).catch(() => 0),
  ]);
  return {
    "interview-requests": interviews,
    "offer-requests":     offers,
    "buddy-invites":      buddies,
  };
}
