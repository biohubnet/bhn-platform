/**
 * Canadian (federal + Ontario) + University of Toronto holiday +
 * academic-break dates, computed on demand for the current year.
 *
 * Used by the events calendar to tint holiday cells, mark the date
 * with a small badge, and surface the holiday name as a tooltip.
 *
 * Why compute on demand rather than table-lookup? Most Canadian
 * holidays slide (Family Day = 3rd Mon Feb, Thanksgiving = 2nd Mon
 * Oct, etc.) and Easter-derived dates need a real algorithm. A
 * static table would have to be maintained year-over-year. The
 * functions here are well under a hundred lines and survive
 * indefinitely without edits.
 */

export type HolidayKind =
  | "fed"   // Canadian federal statutory
  | "prov"  // Ontario provincial
  | "uoft"; // University of Toronto academic-break

export interface HolidayInfo {
  name: string;
  kind: HolidayKind;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function ymd(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** N-th occurrence of `weekday` (0 = Sun … 6 = Sat) in `month` (0-indexed) of `year`. */
function nthWeekday(year: number, month: number, weekday: number, n: number): Date {
  const d = new Date(year, month, 1);
  let count = 0;
  while (d.getMonth() === month) {
    if (d.getDay() === weekday) {
      count++;
      if (count === n) return new Date(d);
    }
    d.setDate(d.getDate() + 1);
  }
  throw new Error(`No ${n}-th weekday ${weekday} in ${year}-${month + 1}`);
}

/** Last occurrence of `weekday` on or before the given day-of-month. */
function lastWeekdayOnOrBefore(year: number, month: number, day: number, weekday: number): Date {
  const d = new Date(year, month, day);
  while (d.getDay() !== weekday) d.setDate(d.getDate() - 1);
  return d;
}

/** Anonymous Gregorian computus — Easter Sunday for any year. */
function easterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31); // 3 or 4
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

function offset(base: Date, days: number): Date {
  const d = new Date(base);
  d.setDate(base.getDate() + days);
  return d;
}

/**
 * Returns a Map of YYYY-MM-DD → HolidayInfo for one civic year.
 * Cached per-year by the public `getHolidayInfo` helper below.
 */
function buildHolidayMap(year: number): Map<string, HolidayInfo> {
  const m = new Map<string, HolidayInfo>();

  // Fixed-date federal holidays.
  m.set(`${year}-01-01`, { name: "New Year's Day",                       kind: "fed" });
  m.set(`${year}-07-01`, { name: "Canada Day",                           kind: "fed" });
  m.set(`${year}-09-30`, { name: "Truth & Reconciliation Day",           kind: "fed" });
  m.set(`${year}-11-11`, { name: "Remembrance Day",                      kind: "fed" });
  m.set(`${year}-12-25`, { name: "Christmas Day",                        kind: "fed" });
  m.set(`${year}-12-26`, { name: "Boxing Day",                           kind: "fed" });

  // Easter-derived (Good Friday + Easter Monday — both observed by
  // U of T as days off; Good Friday is the federal statutory).
  const easter = easterSunday(year);
  m.set(ymd(offset(easter, -2)), { name: "Good Friday",                  kind: "fed" });
  m.set(ymd(offset(easter,  1)), { name: "Easter Monday",                kind: "uoft" });

  // Sliding holidays.
  m.set(ymd(nthWeekday(year, 1, 1, 3)),  { name: "Family Day (Ontario)", kind: "prov" });
  m.set(ymd(lastWeekdayOnOrBefore(year, 4, 24, 1)), { name: "Victoria Day", kind: "fed" });
  m.set(ymd(nthWeekday(year, 7, 1, 1)),  { name: "Civic Holiday (Simcoe Day)", kind: "prov" });
  m.set(ymd(nthWeekday(year, 8, 1, 1)),  { name: "Labour Day",           kind: "fed" });
  m.set(ymd(nthWeekday(year, 9, 1, 2)),  { name: "Thanksgiving Day",     kind: "fed" });

  // U of T Reading Week — runs the week containing Family Day.
  // Five business days; Family Day itself is already marked (prov).
  const familyDay = nthWeekday(year, 1, 1, 3);
  for (let dx = 1; dx <= 4; dx++) {
    const d = offset(familyDay, dx);
    // Skip if it lands on a weekend, just in case.
    if (d.getDay() === 0 || d.getDay() === 6) continue;
    // Don't overwrite a higher-priority holiday entry.
    const key = ymd(d);
    if (!m.has(key)) m.set(key, { name: "U of T Reading Week", kind: "uoft" });
  }

  // U of T Fall Break — first Monday + Tuesday of November (Faculty
  // of Arts & Science observes; matches the November break common
  // across most U of T faculties).
  const fallBreakMon = nthWeekday(year, 10, 1, 1);
  m.set(ymd(fallBreakMon),     { name: "U of T Fall Break", kind: "uoft" });
  m.set(ymd(offset(fallBreakMon, 1)), { name: "U of T Fall Break", kind: "uoft" });

  return m;
}

// ── Public API ──────────────────────────────────────────────────

const cache = new Map<number, Map<string, HolidayInfo>>();

/** YYYY-MM-DD lookup. Returns null when the date isn't a holiday. */
export function getHolidayInfo(date: Date): HolidayInfo | null {
  const year = date.getFullYear();
  let yearMap = cache.get(year);
  if (!yearMap) {
    yearMap = buildHolidayMap(year);
    cache.set(year, yearMap);
  }
  return yearMap.get(ymd(date)) ?? null;
}
