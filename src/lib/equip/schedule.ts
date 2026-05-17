/**
 * Equip-deadline schedule generator.
 *
 * Encodes the two cadences BHN publishes on the EQUIP web page:
 *
 *   • VentureConnect — monthly, 25th of each month at 12:00 PM ET.
 *     Cycle label = "<Month> <YYYY> cycle".
 *
 *   • VentureLift — quarterly, 22nd of Feb / May / Aug / Nov at
 *     12:00 PM ET. Round numbering anchors at Round 1 = May 2025
 *     (program launch), so May 2026 is Round 5, Aug 2026 is
 *     Round 6, and so on. Cycle label = "Round N".
 *
 * The schedule generator is pure — it doesn't touch the DB. The
 * bulk-seed API handler calls this, checks each row against
 * existing deadlines (same stream, same Toronto calendar date),
 * and inserts only what's missing. That makes the endpoint
 * idempotent — calling it twice is the same as calling it once.
 */
import type { EquipStream } from "@/lib/equip/types";

export interface DeadlineSpec {
  stream: EquipStream;
  /** UTC instant — Toronto local 12:00 PM rolled back to UTC,
   *  with DST handled by the helper below. */
  deadlineAt: Date;
  cycleLabel: string;
}

/** Anchor for VL round numbering — May 2025 was Round 1 (program
 *  launch). The quarter index from that anchor gives the round
 *  number. */
const VL_ROUND_ANCHOR = { year: 2025, monthZeroIndexed: 4 /* May */, day: 22 };

/** Return the Toronto-noon UTC instant for the given calendar
 *  date. DST is handled by reading back what Toronto sees and
 *  shifting by ±1 hour if needed. Mirrors the client-side helper
 *  in DeadlineManager.tsx so server + client produce identical
 *  instants. */
export function noonEastern(year: number, monthZeroIndexed: number, day: number): Date {
  // Start with noon EST (UTC-5) — equivalent to 17:00 UTC.
  let candidate = new Date(Date.UTC(year, monthZeroIndexed, day, 17, 0, 0));
  // What hour does Toronto see at that UTC instant?
  const torontoHour = parseInt(
    candidate.toLocaleString("en-US", { timeZone: "America/Toronto", hour: "numeric", hourCycle: "h23" }),
    10,
  );
  // DST adjustments — if Toronto reads 13, we're an hour late
  // (DST on); if it reads 11, we're an hour early.
  if (torontoHour === 13) candidate = new Date(candidate.getTime() - 60 * 60 * 1000);
  else if (torontoHour === 11) candidate = new Date(candidate.getTime() + 60 * 60 * 1000);
  return candidate;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** Generate the full standard schedule from `fromDate` through
 *  the end of `endYear`. Deadlines strictly later than `fromDate`
 *  are included — deadlines on or before are skipped, since
 *  they're already in the past or right now. */
export function generateStandardSchedule({
  fromDate,
  endYear,
}: {
  fromDate: Date;
  endYear: number;
}): DeadlineSpec[] {
  const specs: DeadlineSpec[] = [];

  // ── VentureConnect — monthly on the 25th ──────────────
  for (let year = fromDate.getFullYear(); year <= endYear; year++) {
    for (let m = 0; m < 12; m++) {
      const at = noonEastern(year, m, 25);
      if (at.getTime() <= fromDate.getTime()) continue;
      specs.push({
        stream: "venture_connect",
        deadlineAt: at,
        cycleLabel: `${MONTH_NAMES[m]} ${year} cycle`,
      });
    }
  }

  // ── VentureLift — quarterly on Feb / May / Aug / Nov 22 ─
  const VL_MONTHS = [1, 4, 7, 10]; // Feb, May, Aug, Nov (0-indexed)
  for (let year = fromDate.getFullYear(); year <= endYear; year++) {
    for (const m of VL_MONTHS) {
      const at = noonEastern(year, m, 22);
      if (at.getTime() <= fromDate.getTime()) continue;
      specs.push({
        stream: "venture_lift",
        deadlineAt: at,
        cycleLabel: `Round ${roundNumberFor(year, m)}`,
      });
    }
  }

  // Sort by date for predictable insertion order.
  specs.sort((a, b) => a.deadlineAt.getTime() - b.deadlineAt.getTime());
  return specs;
}

/** Compute the VentureLift round number for a given quarterly
 *  cycle (Feb/May/Aug/Nov of any year). Round 1 = May 2025. */
function roundNumberFor(year: number, monthZeroIndexed: number): number {
  // Quarter index where Feb is quarter 0 of the year.
  const VL_MONTHS = [1, 4, 7, 10];
  const idx = VL_MONTHS.indexOf(monthZeroIndexed);
  if (idx < 0) throw new Error(`Not a VL cycle month: ${monthZeroIndexed}`);
  // Round 1 anchor: May 2025 = (year=2025, idx=1).
  // From there, each additional quarter increments the round.
  const yearOffset = year - VL_ROUND_ANCHOR.year;
  const quarterOffset = idx - 1; // anchor is idx=1 (May)
  return 1 + yearOffset * 4 + quarterOffset;
}

/** Format a Toronto calendar date as "YYYY-MM-DD" for dedup keys.
 *  We dedupe by (stream, Toronto calendar date) so a manually-
 *  scheduled deadline anywhere within the same day in Toronto
 *  blocks a duplicate from the standard schedule. */
export function torontoDateKey(d: Date): string {
  return d.toLocaleDateString("en-CA", { timeZone: "America/Toronto" });
}
