/**
 * Period resolution for the reporting suite.
 *
 * All period boundaries are computed at **America/Toronto** wall-clock
 * midnight (BHN is Toronto-based) and returned as UTC instants for
 * Prisma. A naive UTC boundary would mis-bucket late-evening Toronto
 * events around the edges of a quarter/month. No date library is on the
 * platform, so we derive the zone offset via Intl (DST-correct).
 */

import type { DateRange, ReportPeriodKey } from "./types";

const TZ = "America/Toronto";

/** The UTC instant corresponding to Toronto-local midnight on y-m-d
 *  (month is 1-based). DST-correct via an Intl offset probe. */
export function torontoMidnightUtc(year: number, month1: number, day: number): Date {
  const asUtc = Date.UTC(year, month1 - 1, day, 0, 0, 0, 0);
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ, hour12: false,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
  const p = dtf.formatToParts(new Date(asUtc)).reduce<Record<string, string>>(
    (a, x) => { a[x.type] = x.value; return a; }, {});
  // 24:xx happens at midnight in some locales — normalise to 0.
  const hour = p.hour === "24" ? 0 : Number(p.hour);
  const tzAsUtc = Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day), hour, Number(p.minute), Number(p.second));
  const offset = tzAsUtc - asUtc; // how far tz is ahead of UTC at that instant (negative for Toronto)
  return new Date(asUtc - offset);
}

/** The Toronto calendar parts (y, m1, d) for a UTC instant. */
function torontoYmd(date: Date): { y: number; m1: number; d: number } {
  const dtf = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit",
  });
  const p = dtf.formatToParts(date).reduce<Record<string, string>>(
    (a, x) => { a[x.type] = x.value; return a; }, {});
  return { y: Number(p.year), m1: Number(p.month), d: Number(p.day) };
}

const QUARTER_LABEL = (m1: number) => `Q${Math.floor((m1 - 1) / 3) + 1}`;
const quarterStartMonth = (m1: number) => Math.floor((m1 - 1) / 3) * 3 + 1;

/**
 * Resolve a period from search params into a concrete date range.
 * Default = quarter-to-date (a sensible leadership default).
 * `now` is injectable for testing.
 */
export function resolvePeriod(
  params: { period?: string; start?: string; end?: string } = {},
  now: Date = new Date(),
): DateRange {
  const key = (params.period ?? "qtd") as ReportPeriodKey;
  const { y, m1 } = torontoYmd(now);

  switch (key) {
    case "mtd":
      return { key, start: torontoMidnightUtc(y, m1, 1), end: now, label: `Month to date · ${monthName(m1)} ${y}` };

    case "ytd":
      return { key, start: torontoMidnightUtc(y, 1, 1), end: now, label: `Year to date · ${y}` };

    case "last_30":
      return { key, start: new Date(now.getTime() - 30 * 86_400_000), end: now, label: "Last 30 days" };

    case "last_90":
      return { key, start: new Date(now.getTime() - 90 * 86_400_000), end: now, label: "Last 90 days" };

    case "last_q": {
      const qStart = quarterStartMonth(m1);
      // This quarter's start (exclusive end of last quarter).
      const thisQ = torontoMidnightUtc(y, qStart, 1);
      // Previous quarter start.
      const prevY = qStart === 1 ? y - 1 : y;
      const prevQStart = qStart === 1 ? 10 : qStart - 3;
      const start = torontoMidnightUtc(prevY, prevQStart, 1);
      return { key, start, end: thisQ, label: `${QUARTER_LABEL(prevQStart)} ${prevY}` };
    }

    case "custom": {
      const s = parseYmd(params.start);
      const e = parseYmd(params.end);
      if (s && e) {
        const start = torontoMidnightUtc(s.y, s.m1, s.d);
        // Inclusive end date → exclusive boundary at the next midnight.
        const end = torontoMidnightUtc(e.y, e.m1, e.d + 1);
        return { key, start, end, label: `${params.start} → ${params.end}` };
      }
      // fall through to qtd if custom params are missing/invalid
    }
    // eslint-disable-next-line no-fallthrough
    case "qtd":
    default: {
      const qStart = quarterStartMonth(m1);
      return { key: "qtd", start: torontoMidnightUtc(y, qStart, 1), end: now, label: `Quarter to date · ${QUARTER_LABEL(qStart)} ${y}` };
    }
  }
}

function parseYmd(s: string | undefined): { y: number; m1: number; d: number } | null {
  if (!s) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s.trim());
  if (!m) return null;
  return { y: Number(m[1]), m1: Number(m[2]), d: Number(m[3]) };
}

function monthName(m1: number): string {
  return ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][m1 - 1] ?? "";
}

/** The selectable presets, for the period picker UI. */
export const PERIOD_PRESETS: { key: ReportPeriodKey; label: string }[] = [
  { key: "mtd",     label: "Month" },
  { key: "qtd",     label: "Quarter" },
  { key: "ytd",     label: "Year" },
  { key: "last_q",  label: "Last Q" },
  { key: "last_90", label: "90 days" },
  { key: "custom",  label: "Custom" },
];

/**
 * Split a range into N evenly-spaced sub-buckets (for sparklines).
 * Returns bucket boundaries with short labels in Toronto months/weeks.
 */
export function bucketRange(range: DateRange, count = 12): { start: Date; end: Date; label: string }[] {
  const span = range.end.getTime() - range.start.getTime();
  if (span <= 0) return [];
  const step = span / count;
  const out: { start: Date; end: Date; label: string }[] = [];
  for (let i = 0; i < count; i++) {
    const start = new Date(range.start.getTime() + i * step);
    const end = new Date(range.start.getTime() + (i + 1) * step);
    const { m1, d } = torontoYmd(start);
    out.push({ start, end, label: step >= 20 * 86_400_000 ? monthName(m1) : `${m1}/${d}` });
  }
  return out;
}
