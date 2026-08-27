/**
 * Keeps EquipDeadline row statuses in step with the published
 * schedule in lib/equip/calendar.ts.
 *
 * Split out of /admin/equip/deadlines because the page could only ever
 * do this as a side effect of somebody rendering it. That is fine for
 * CREATING rows — creation needs a signed-in admin for `createdById` —
 * but it is the wrong trigger for status, which changes on a clock, not
 * on a page view. A round closes at noon Eastern whether or not an
 * admin happens to open a browser tab; the next one has to open at the
 * same instant, or applicants meet "there's no open funding window".
 *
 * So statuses reconcile here, and the daily-maintenance cron calls it.
 * Row creation stays on the admin page.
 *
 * Only auto-synced rows are touched. A window an admin created by hand
 * is theirs, and this function must never quietly overrule it.
 */
import { prisma } from "@/lib/prisma";
import { derivedDeadlineSpecs } from "@/lib/equip/calendar";
import type { DeadlineStatus } from "@/lib/equip/deadlines";

const HALF_DAY_MS = 12 * 60 * 60 * 1000;

/** What the published schedule says a window's status should be now. */
export function specStatusAt(
  spec: { deadlineAt: Date; opensAt: Date },
  now: Date = new Date(),
): DeadlineStatus {
  if (spec.deadlineAt < now) return "closed";
  if (spec.opensAt <= now) return "open";
  return "scheduled";
}

export interface DeadlineReconcileResult {
  opened: number;
  scheduled: number;
  closed: number;
}

/**
 * Move every auto-synced row to the status its published dates imply.
 *
 * Runs in all three directions, which the original one-way pass did
 * not: scheduled → open when the opening moment arrives, open →
 * scheduled if a date moves back, and either → closed once the deadline
 * passes. A row that was only ever demoted and never promoted is a
 * round that can never open.
 */
export async function reconcileDeadlineStatuses(
  now: Date = new Date(),
): Promise<DeadlineReconcileResult> {
  const specs = derivedDeadlineSpecs();
  const result: DeadlineReconcileResult = { opened: 0, scheduled: 0, closed: 0 };

  await Promise.all(
    specs.map(async (s) => {
      const want = specStatusAt(s, now);
      // `extended` is an admin's deliberate act on a specific row and is
      // never reconciled away — only the three schedule-derived states
      // move, and only between each other.
      const from: DeadlineStatus[] =
        want === "open" ? ["scheduled"]
        : want === "scheduled" ? ["open"]
        : ["open", "scheduled"];

      const res = await prisma.equipDeadline.updateMany({
        where: {
          stream: s.stream,
          deadlineAt: {
            gte: new Date(s.deadlineAt.getTime() - HALF_DAY_MS),
            lte: new Date(s.deadlineAt.getTime() + HALF_DAY_MS),
          },
          status: { in: from },
          note: { startsWith: "Auto-synced" },
        },
        data: { status: want },
      });

      if (want === "open") result.opened += res.count;
      else if (want === "scheduled") result.scheduled += res.count;
      else result.closed += res.count;
    }),
  );

  return result;
}
