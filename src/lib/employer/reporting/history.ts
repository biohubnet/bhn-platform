/**
 * Stage-transition event loader — the typed analytics stream written by
 * the transition service (and seeded for demo data). Powers cohort
 * funnel + per-stage cycle time.
 */
import { prisma } from "@/lib/prisma";
import type { DateRange } from "./types";

export interface StageEvent {
  applicationStatusId: string;
  postingId: string;
  fromStage: string | null;
  toStage: string;
  changedAt: Date;
}

/** All transition events for a company's postings. When `range` is
 *  given, scoped to events whose changedAt falls in it; otherwise the
 *  full history (used for complete per-application chains). */
export async function loadStageEvents(companyId: string, range?: DateRange): Promise<StageEvent[]> {
  return prisma.applicationStatusHistory
    .findMany({
      where: {
        posting: { companyId },
        ...(range ? { changedAt: { gte: range.start, lt: range.end } } : {}),
      },
      select: {
        applicationStatusId: true,
        postingId: true,
        fromStage: true,
        toStage: true,
        changedAt: true,
      },
      orderBy: { changedAt: "asc" },
    })
    .catch(() => [] as StageEvent[]);
}
