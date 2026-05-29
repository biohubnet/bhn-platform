/**
 * Shared types for the HR/Talent reporting suite (/employer/reports).
 * The metrics library (this directory) is the single source of truth:
 * pure, server-only functions consumed by report pages, CSV exports,
 * and the print view.
 */

export type ReportPeriodKey =
  | "mtd"      // month-to-date
  | "qtd"      // quarter-to-date
  | "ytd"      // year-to-date
  | "last_q"   // the previous full quarter
  | "last_30"  // rolling last 30 days
  | "last_90"  // rolling last 90 days
  | "custom";  // explicit start/end

export interface DateRange {
  /** Inclusive lower bound (UTC instant of a Toronto-local boundary). */
  start: Date;
  /** Exclusive upper bound. */
  end: Date;
  key: ReportPeriodKey;
  /** Human label, e.g. "Quarter to date · Q2 2026". */
  label: string;
}

/** Red-amber-green status of an actual against a target. */
export type Rag = "on_track" | "at_risk" | "off_track" | "no_target" | "no_data";

/** Direction that "good" points for a metric. */
export type Comparator = "gte" | "lte"; // gte: higher is better; lte: lower is better

export interface SeriesPoint {
  /** Bucket label (e.g. "Mar", "W12"). */
  t: string;
  v: number | null;
}

export type MetricUnit = "days" | "percent" | "currency" | "count" | "ratio";

/**
 * The canonical shape every metric returns. `value` is the raw number
 * (null = no data → render "—"); `formatted` is the display string.
 * `n` is the sample size behind the value, used by the UI to suppress
 * misleading low-n stats.
 */
export interface MetricResult {
  value: number | null;
  formatted: string;
  n?: number;
  rag?: Rag;
  target?: number | null;
  pctToGoal?: number | null;
  series?: SeriesPoint[];
  unit?: MetricUnit;
  /** Optional one-line caveat shown under the value (e.g. low-n note). */
  note?: string;
}
