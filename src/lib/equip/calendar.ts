/**
 * Canonical published Equip schedule + U of T holiday overlay.
 *
 * Two parts:
 *
 *   • VL_ROUNDS — the actual VentureLift round schedule
 *     (Round 3-7) as published in BHN's internal key-dates
 *     spreadsheet. Each round has 8 stages (Launch, Pre-screening
 *     deadline, Consultations, Invite decision, Full app
 *     deadline, Review deadline, Adjudication window, Funding
 *     announcement). These are stored as constants in code
 *     rather than DB rows because:
 *       (a) the dates are admin-managed offline (Google Sheet);
 *       (b) the deadlines page only needs to *display* them, not
 *           let admins edit them inline yet;
 *       (c) checking them into source keeps the schedule in
 *           version control next to the rest of the program copy.
 *     The /admin/equip/deadlines page auto-syncs EquipDeadline
 *     rows for the pre-screening + full-application deadlines
 *     so the submit-gate (which reads EquipDeadline) honours
 *     each round.
 *
 *   • UOFT_HOLIDAYS — the official University of Toronto holiday
 *     + closure schedule for FY 2025-26 and 2026-27, from
 *     https://people.utoronto.ca/memos/holiday-schedule-2025-26-and-2026-27/.
 *     Surfaced on the calendar so reviewers can see at a glance
 *     which days they shouldn't expect work to happen on
 *     (consultations, reviews, etc.). U of T is BHN's primary
 *     host institution; partner institutions usually follow the
 *     same days but ad-hoc closures aren't tracked here.
 */
import type { EquipStream } from "@/lib/equip/types";

// ── VentureLift rounds ────────────────────────────────────────

export type EquipRoundStageKey =
  | "launch"
  | "launch_reminder"
  | "pre_screening_deadline"
  | "consultations"
  | "invite_decision"
  | "full_app_deadline"
  | "review_deadline"
  | "adjudication"
  | "funding_announcement";

export interface EquipRoundStage {
  key: EquipRoundStageKey;
  label: string;
  /** ISO yyyy-mm-dd. For ranges, this is the start date. */
  date: string;
  /** End date for multi-day stages (consultations, adjudication
   *  window, funding announcement window). */
  endDate?: string;
  /** True when the published source says something like
   *  "Early August" instead of a specific date — surfaced in the
   *  UI so reviewers know not to treat it as gospel. */
  approximate?: boolean;
  /** Tone for the chip — drives visual emphasis. */
  tone: "amber" | "violet" | "brand" | "emerald" | "neutral";
}

export interface EquipRound {
  stream: EquipStream;
  roundNumber: number;
  label: string;
  /** Calendar year the round mostly lives in — used for
   *  grouping. */
  year: number;
  stages: EquipRoundStage[];
}

/** Source of truth: VentureLift_Key_Dates_2025-2026 spreadsheet.
 *  Update this constant when a new round is published. */
export const VL_ROUNDS: EquipRound[] = [
  {
    stream: "venture_lift",
    roundNumber: 3,
    label: "Round 3",
    year: 2025,
    stages: [
      { key: "launch",                 label: "Launch",                       date: "2025-08-25", tone: "brand"   },
      { key: "pre_screening_deadline", label: "Pre-screening deadline",       date: "2025-09-19", tone: "amber"   },
      { key: "consultations",          label: "Pre-screening consultations",  date: "2025-09-22", endDate: "2025-09-26", tone: "violet" },
      { key: "invite_decision",        label: "Invite decision",              date: "2025-10-01", tone: "brand"   },
      { key: "full_app_deadline",      label: "Full application deadline",    date: "2025-10-22", tone: "amber"   },
      { key: "review_deadline",        label: "Review deadline",              date: "2025-11-14", tone: "violet"  },
      { key: "adjudication",           label: "Adjudication window",          date: "2025-11-17", endDate: "2025-11-21", tone: "violet" },
      { key: "funding_announcement",   label: "Funding announcement",         date: "2025-12-05", approximate: true, tone: "emerald" },
    ],
  },
  {
    stream: "venture_lift",
    roundNumber: 4,
    label: "Round 4",
    year: 2026,
    stages: [
      { key: "launch",                 label: "Launch",                       date: "2025-12-15", tone: "brand"   },
      { key: "launch_reminder",        label: "Launch reminder",              date: "2026-01-06", tone: "neutral" },
      { key: "pre_screening_deadline", label: "Pre-screening deadline",       date: "2026-01-23", tone: "amber"   },
      { key: "consultations",          label: "Pre-screening consultations",  date: "2026-01-26", endDate: "2026-01-30", tone: "violet" },
      { key: "invite_decision",        label: "Invite decision",              date: "2026-02-04", tone: "brand"   },
      { key: "full_app_deadline",      label: "Full application deadline",    date: "2026-02-25", tone: "amber"   },
      { key: "review_deadline",        label: "Review deadline",              date: "2026-03-17", tone: "violet"  },
      { key: "adjudication",           label: "Adjudication window",          date: "2026-03-19", endDate: "2026-03-25", tone: "violet" },
      { key: "funding_announcement",   label: "Funding announcement",         date: "2026-03-31", approximate: true, tone: "emerald" },
    ],
  },
  {
    stream: "venture_lift",
    roundNumber: 5,
    label: "Round 5",
    year: 2026,
    stages: [
      { key: "launch",                 label: "Launch",                       date: "2026-04-27", tone: "brand"   },
      { key: "pre_screening_deadline", label: "Pre-screening deadline",       date: "2026-05-22", tone: "amber"   },
      { key: "consultations",          label: "Pre-screening consultations",  date: "2026-05-25", endDate: "2026-05-29", tone: "violet" },
      { key: "invite_decision",        label: "Invite decision",              date: "2026-06-01", tone: "brand"   },
      { key: "full_app_deadline",      label: "Full application deadline",    date: "2026-06-05", tone: "amber"   },
      { key: "review_deadline",        label: "Review deadline",              date: "2026-06-30", tone: "violet"  },
      { key: "adjudication",           label: "Adjudication window",          date: "2026-07-22", endDate: "2026-07-30", tone: "violet" },
      { key: "funding_announcement",   label: "Funding announcement",         date: "2026-08-05", approximate: true, tone: "emerald" },
    ],
  },
  {
    stream: "venture_lift",
    roundNumber: 6,
    label: "Round 6",
    year: 2026,
    stages: [
      { key: "launch",                 label: "Launch",                       date: "2026-07-07", tone: "brand"   },
      { key: "pre_screening_deadline", label: "Pre-screening deadline",       date: "2026-08-01", tone: "amber"   },
      { key: "consultations",          label: "Pre-screening consultations",  date: "2026-08-04", endDate: "2026-08-08", tone: "violet" },
      { key: "invite_decision",        label: "Invite decision",              date: "2026-08-13", tone: "brand"   },
      { key: "full_app_deadline",      label: "Full application deadline",    date: "2026-09-05", tone: "amber"   },
      { key: "review_deadline",        label: "Review deadline",              date: "2026-09-24", tone: "violet"  },
      { key: "adjudication",           label: "Adjudication window",          date: "2026-09-25", endDate: "2026-09-29", tone: "violet" },
      { key: "funding_announcement",   label: "Funding announcement",         date: "2026-09-29", endDate: "2026-09-30", tone: "emerald" },
    ],
  },
  {
    stream: "venture_lift",
    roundNumber: 7,
    label: "Round 7",
    year: 2026,
    stages: [
      { key: "launch",                 label: "Launch",                       date: "2026-09-14", tone: "brand"   },
      { key: "pre_screening_deadline", label: "Pre-screening deadline",       date: "2026-10-05", tone: "amber"   },
      { key: "consultations",          label: "Pre-screening consultations",  date: "2026-10-08", endDate: "2026-10-14", tone: "violet" },
      { key: "invite_decision",        label: "Invite decision",              date: "2026-10-19", tone: "brand"   },
      { key: "full_app_deadline",      label: "Full application deadline",    date: "2026-11-08", tone: "amber"   },
      { key: "review_deadline",        label: "Review deadline",              date: "2026-11-25", tone: "violet"  },
      { key: "adjudication",           label: "Adjudication window",          date: "2026-11-27", endDate: "2026-12-03", tone: "violet" },
      { key: "funding_announcement",   label: "Funding announcement",         date: "2026-12-03", endDate: "2026-12-10", tone: "emerald" },
    ],
  },
];

/** Return only stages with a hard deadline (pre-screening + full
 *  application). These are the rows that get synced into
 *  EquipDeadline for submit-gate use. */
export function deadlineStagesFromRound(r: EquipRound): EquipRoundStage[] {
  return r.stages.filter(
    (s) => s.key === "pre_screening_deadline" || s.key === "full_app_deadline",
  );
}

/** Convert a stage's ISO yyyy-mm-dd date string into a UTC Date
 *  representing noon Eastern on that calendar day, accounting
 *  for DST. Mirrors the noonEastern helper that used to live in
 *  schedule.ts (since deleted with the bulk-seed feature) — kept
 *  here scoped to the auto-sync workflow. */
export function noonEasternOn(yyyymmdd: string): Date {
  const [y, m, d] = yyyymmdd.split("-").map((s) => parseInt(s, 10));
  // 17:00 UTC = noon EST (UTC-5). Adjust ±1h if Toronto is
  // currently on EDT.
  let candidate = new Date(Date.UTC(y, m - 1, d, 17, 0, 0));
  const torontoHour = parseInt(
    candidate.toLocaleString("en-US", { timeZone: "America/Toronto", hour: "numeric", hourCycle: "h23" }),
    10,
  );
  if (torontoHour === 13) candidate = new Date(candidate.getTime() - 60 * 60 * 1000);
  else if (torontoHour === 11) candidate = new Date(candidate.getTime() + 60 * 60 * 1000);
  return candidate;
}

/** Specs for the EquipDeadline rows that should exist for the
 *  given rounds. One row per round for each of (pre-screening,
 *  full application) — the two stages with hard submission
 *  cut-offs that the platform's submit-gate honours. */
export interface DerivedDeadlineSpec {
  stream: EquipStream;
  deadlineAt: Date;
  cycleLabel: string;
  /** Stage key — useful for surfaceful labelling and future
   *  filtering. Stored in the `note` column for now since
   *  EquipDeadline has no dedicated stage column. */
  stageKey: EquipRoundStageKey;
  stageLabel: string;
}

/** Compute the full set of derived EquipDeadline specs for every
 *  round in VL_ROUNDS. The deadlines page calls this on render
 *  and inserts any missing rows. */
export function derivedDeadlineSpecs(): DerivedDeadlineSpec[] {
  const out: DerivedDeadlineSpec[] = [];
  for (const r of VL_ROUNDS) {
    for (const s of deadlineStagesFromRound(r)) {
      out.push({
        stream: r.stream,
        deadlineAt: noonEasternOn(s.date),
        cycleLabel: `${r.label} · ${s.label}`,
        stageKey: s.key,
        stageLabel: s.label,
      });
    }
  }
  return out;
}

// ── U of T holiday schedule ────────────────────────────────────

export interface UofTHoliday {
  name: string;
  /** ISO yyyy-mm-dd. */
  date: string;
  /** End date for multi-day closures (winter break). */
  endDate?: string;
  /** True for university-internal closures (Presidential Days)
   *  that aren't statutory holidays. Surfaces in the UI with a
   *  slightly different tone. */
  presidential?: boolean;
}

/** Source: https://people.utoronto.ca/memos/holiday-schedule-2025-26-and-2026-27/
 *  Combined for both fiscal years. */
export const UOFT_HOLIDAYS: UofTHoliday[] = [
  // FY 2025-26 — verified against the official memo
  // https://people.utoronto.ca/memos/holiday-schedule-2025-26-and-2026-27/
  { name: "Presidential Day",      date: "2025-06-30", presidential: true },
  { name: "Canada Day",            date: "2025-07-01" },
  { name: "Presidential Day",      date: "2025-08-01", presidential: true },
  { name: "Civic Holiday",         date: "2025-08-04" },
  { name: "Labour Day",            date: "2025-09-01" },
  { name: "Thanksgiving Day",      date: "2025-10-13" },
  { name: "December Holiday Break", date: "2025-12-24", endDate: "2026-01-02" },
  { name: "Family Day",            date: "2026-02-16" },
  { name: "Good Friday",           date: "2026-04-03" },
  { name: "Presidential Day",      date: "2026-05-15", presidential: true }, // Friday May 15 2026 — verified
  { name: "Victoria Day",          date: "2026-05-18" },
  // FY 2026-27 — verified against the official memo
  // Split into two entries (Mon 6/29 + Tue 6/30) to match the memo's
  // own treatment rather than collapsing into a single multi-day range.
  { name: "Presidential Day",      date: "2026-06-29", presidential: true },
  { name: "Presidential Day",      date: "2026-06-30", presidential: true },
  { name: "Canada Day",            date: "2026-07-01" },
  { name: "Civic Holiday",         date: "2026-08-03" },
  { name: "Labour Day",            date: "2026-09-07" },
  { name: "Thanksgiving Day",      date: "2026-10-12" },
  { name: "December Holiday Break", date: "2026-12-24", endDate: "2027-01-05" },
  { name: "Family Day",            date: "2027-02-15" },
  { name: "Good Friday",           date: "2027-03-26" },
  { name: "Victoria Day",          date: "2027-05-24" },
];

/** Return true if a given Toronto calendar date (yyyy-mm-dd)
 *  falls inside a holiday or closure window. */
export function isUofTHoliday(yyyymmdd: string): UofTHoliday | null {
  for (const h of UOFT_HOLIDAYS) {
    if (h.endDate) {
      if (yyyymmdd >= h.date && yyyymmdd <= h.endDate) return h;
    } else {
      if (yyyymmdd === h.date) return h;
    }
  }
  return null;
}

/** Flatten every holiday date into a Set of yyyy-mm-dd strings
 *  for cheap calendar-cell lookups. */
export function holidayDateSet(): Map<string, UofTHoliday> {
  const m = new Map<string, UofTHoliday>();
  for (const h of UOFT_HOLIDAYS) {
    if (h.endDate) {
      const start = new Date(h.date);
      const end = new Date(h.endDate);
      for (let d = new Date(start); d.getTime() <= end.getTime(); d.setDate(d.getDate() + 1)) {
        m.set(d.toISOString().slice(0, 10), h);
      }
    } else {
      m.set(h.date, h);
    }
  }
  return m;
}
