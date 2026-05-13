"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { getHolidayInfo, type HolidayInfo } from "@/lib/holidays";

/**
 * Multi-month calendar surface. Renders the anchor month plus
 * `monthsAhead` additional months in a responsive grid so a single
 * glance shows what's coming up over the next quarter. Default
 * configuration is 3 months total (anchor + 2 ahead) — the volume
 * BHN typically schedules.
 *
 * Each day cell is a rectangle (min-h-20) instead of aspect-square,
 * so event titles get room to wrap to two lines instead of being
 * truncated to the first 4 characters as they were on the previous
 * aspect-square grid.
 *
 * Deliberately not a full FullCalendar/Big Calendar integration —
 * BHN has at most a handful of multi-day events per year, so a
 * custom grid keeps the bundle small and the styling aligned with
 * the rest of the events surface. Drag, drop, week view, multi-tz
 * are explicit non-goals.
 *
 * The shared nav bar at the top shifts the anchor month by 1 — every
 * rendered month shifts together. Today snaps back to the current
 * month as the anchor.
 */
export interface EventDot {
  id: string;
  slug: string;
  title: string;
  start: string; // ISO
  end:   string; // ISO
  /** 'brand' for emphasised events (the next one up), 'neutral' otherwise. */
  tone?: "brand" | "neutral";
}

interface Props {
  events: EventDot[];
  /**
   * How many extra months past the anchor to render. Default 1 (so
   * 2 months show in total, stacked vertically — each month takes
   * the full canvas width so every cell is roomy enough for two
   * lines of event copy). Pass 0 for a single month.
   */
  monthsAhead?: number;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function addMonths(d: Date, n: number) {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

function ymd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function EventCalendar({ events: _events, monthsAhead = 1 }: Props) {
  // Always anchor on the current month at first paint. Earlier
  // versions auto-skipped to the earliest upcoming event's month,
  // but that surprised readers who expected "today" by default.
  // The shared nav still lets them flip forward when they want.
  // (events param kept on the signature but only consumed below
  // via the byDay map; the initial-anchor logic doesn't depend on
  // it any more.)
  const events = _events;
  const [anchor, setAnchor] = useState<Date>(() => startOfMonth(new Date()));

  // Pre-compute a map: day-key (YYYY-MM-DD) → list of events covering
  // that day. Each multi-day event lands on every day in its inclusive
  // range, so the calendar shows a band the whole way through.
  const byDay = useMemo(() => {
    const m = new Map<string, EventDot[]>();
    for (const e of events) {
      const s = new Date(e.start);
      const en = new Date(e.end);
      const cur = new Date(s.getFullYear(), s.getMonth(), s.getDate());
      const last = new Date(en.getFullYear(), en.getMonth(), en.getDate());
      while (cur <= last) {
        const k = ymd(cur);
        if (!m.has(k)) m.set(k, []);
        m.get(k)!.push(e);
        cur.setDate(cur.getDate() + 1);
      }
    }
    return m;
  }, [events]);

  // Range label — "May – Jul 2026" or "Dec 2025 – Feb 2026" depending
  // on whether the months cross a year boundary.
  const lastMonth = addMonths(anchor, monthsAhead);
  const sameYear = anchor.getFullYear() === lastMonth.getFullYear();
  const rangeLabel = sameYear
    ? `${anchor.toLocaleDateString("en-CA", { month: "short" })} – ${lastMonth.toLocaleDateString("en-CA", { month: "short" })} ${anchor.getFullYear()}`
    : `${anchor.toLocaleDateString("en-CA", { month: "short", year: "numeric" })} – ${lastMonth.toLocaleDateString("en-CA", { month: "short", year: "numeric" })}`;

  const months = Array.from({ length: monthsAhead + 1 }, (_, i) => addMonths(anchor, i));

  // Always stack months vertically — every rendered month uses the
  // full canvas width so each day cell stays roomy. Putting two
  // months side-by-side halves the per-cell width, which forced
  // event labels to truncate to a few characters. Single column =
  // ~150px+ per cell on a max-w-6xl page = full event titles
  // comfortably visible on two lines.
  const monthGridClass = "grid grid-cols-1 gap-4";

  return (
    <div className="rounded-2xl border border-line bg-card surface-shadow overflow-hidden">
      {/* Shared header — range label + nav + legend. Shifts every
          rendered month by 1 step at a time. The legend pips decode
          the cell-corner dots: red for federal, amber for Ontario,
          violet for U of T academic breaks. */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-line">
        <span className="inline-flex w-6 h-6 rounded-lg bg-brand-50 text-brand-700 items-center justify-center">
          <CalendarIcon size={12} />
        </span>
        <h3 className="text-sm font-semibold text-fg flex-1 truncate">
          {rangeLabel}
        </h3>
        <div className="hidden md:inline-flex items-center gap-2 text-[10px] text-muted">
          <span className="inline-flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-rose-500" />Fed</span>
          <span className="inline-flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-amber-500" />ON</span>
          <span className="inline-flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-violet-500" />U of T</span>
        </div>
        <button
          type="button"
          onClick={() => setAnchor((v) => addMonths(v, -1))}
          className="p-1.5 rounded-md text-muted hover:text-fg hover:bg-elevated transition-colors"
          aria-label="Previous month"
        >
          <ChevronLeft size={14} />
        </button>
        <button
          type="button"
          onClick={() => setAnchor(startOfMonth(new Date()))}
          className="text-[11px] font-medium px-2 py-1 rounded-md text-muted hover:text-fg hover:bg-elevated transition-colors"
        >
          Today
        </button>
        <button
          type="button"
          onClick={() => setAnchor((v) => addMonths(v, 1))}
          className="p-1.5 rounded-md text-muted hover:text-fg hover:bg-elevated transition-colors"
          aria-label="Next month"
        >
          <ChevronRight size={14} />
        </button>
      </div>

      <div className={cn(monthGridClass, "p-3")}>
        {months.map((m) => (
          <MonthGrid key={ymd(m)} month={m} byDay={byDay} />
        ))}
      </div>
    </div>
  );
}

function MonthGrid({ month, byDay }: { month: Date; byDay: Map<string, EventDot[]> }) {
  const firstDay = month.getDay(); // 0 = Sun
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const today = new Date();
  const todayKey = ymd(today);
  const monthLabel = month.toLocaleDateString("en-CA", { month: "long", year: "numeric" });

  // Count events that touch this month so the per-month header can
  // hint at activity. Quick scan against keys with the same YYYY-MM.
  const prefix = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}`;
  let monthEventCount = 0;
  const seen = new Set<string>();
  for (const [k, list] of byDay) {
    if (!k.startsWith(prefix)) continue;
    for (const e of list) {
      if (!seen.has(e.id)) { seen.add(e.id); monthEventCount++; }
    }
  }

  return (
    <div className="bg-card ring-1 ring-inset ring-line/60 overflow-hidden flex flex-col">
      {/* Per-month label + count — tightened vertical padding so an
          empty month uses well under half the height of one event row. */}
      <div className="flex items-center justify-between gap-2 px-3 py-1.5 border-b border-line bg-elevated/40">
        <h4 className="text-sm font-semibold text-fg tracking-tight">
          {monthLabel}
        </h4>
        {monthEventCount > 0 && (
          <span className="text-[10px] uppercase tracking-[0.16em] font-bold text-brand-700 bg-brand-50 ring-1 ring-inset ring-brand-200 rounded-full px-2 py-0.5">
            {monthEventCount} event{monthEventCount === 1 ? "" : "s"}
          </span>
        )}
      </div>

      {/* Weekday row */}
      <div className="grid grid-cols-7 px-2 pt-1 text-[10px] uppercase tracking-[0.12em] font-bold text-subtle">
        {WEEKDAYS.map((w) => (
          <div key={w} className="px-1 py-0.5 text-center">
            {w}
          </div>
        ))}
      </div>

      {/* Day grid — split into one row per week so each week can
          claim its own min-height. Weeks with at least one event
          inflate to give cells room for two-line event chips; empty
          weeks collapse to a thin date-only strip, saving vertical
          real estate without dropping any dates. */}
      <WeekRows
        cells={cells}
        month={month}
        byDay={byDay}
        todayKey={todayKey}
      />
    </div>
  );
}

/**
 * Splits the flat cells array into 7-cell rows and renders each
 * row in its own grid. Rows with events get min-h-24 so event chips
 * have room to breathe; empty rows get min-h-10 (≈ 40 px), which is
 * tall enough to show the date number plainly but ⅓ the height of a
 * full row. Net effect: a month with two scattered events takes
 * about half the vertical space the old uniform-height grid did.
 */
function WeekRows({
  cells, month, byDay, todayKey,
}: {
  cells: (number | null)[];
  month: Date;
  byDay: Map<string, EventDot[]>;
  todayKey: string;
}) {
  const weeks: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  return (
    <div className="flex flex-col gap-px bg-line/40 border-t border-line/40">
      {weeks.map((week, wi) => {
        const weekHasEvent = week.some((d) => {
          if (d === null) return false;
          const k = ymd(new Date(month.getFullYear(), month.getMonth(), d));
          return (byDay.get(k)?.length ?? 0) > 0;
        });
        return (
          <div key={wi} className="grid grid-cols-7 gap-px">
            {week.map((d, ci) => (
              <DayCell
                key={`${wi}-${ci}`}
                d={d}
                month={month}
                byDay={byDay}
                todayKey={todayKey}
                rowExpanded={weekHasEvent}
              />
            ))}
          </div>
        );
      })}
    </div>
  );
}

function DayCell({
  d, month, byDay, todayKey, rowExpanded,
}: {
  d: number | null;
  month: Date;
  byDay: Map<string, EventDot[]>;
  todayKey: string;
  rowExpanded: boolean;
}) {
  // Per-row min-height. Event rows still get vertical room for two
  // lines of chip text; empty rows collapse aggressively (20 px) so
  // a quiet month barely takes any vertical space at all.
  const minHEmpty = "min-h-5";
  const minHEvent = "min-h-20";

  if (d === null) {
    return <div className={`${rowExpanded ? minHEvent : minHEmpty} bg-card`} />;
  }
  const date = new Date(month.getFullYear(), month.getMonth(), d);
  const key = ymd(date);
  const dayEvents = byDay.get(key) ?? [];
  const isToday = key === todayKey;
  const hasEvents = dayEvents.length > 0;
  const firstEvent = dayEvents[0];
  const dow = date.getDay(); // 0 Sun … 6 Sat
  const isWeekend = dow === 0 || dow === 6;
  const holiday: HolidayInfo | null = getHolidayInfo(date);

  // Background priority: event > today-ring > holiday tint > weekend
  // tint > default card. Event styling pulls bolder colours so an
  // event day stands out unambiguously even on a busy week.
  const baseBg = hasEvents
    ? firstEvent.tone === "brand"
      ? "bg-brand-200/70 ring-1 ring-inset ring-brand-300 hover:bg-brand-200"
      : "bg-sky-100/80 ring-1 ring-inset ring-sky-300 hover:bg-sky-100"
    : holiday?.kind === "fed"
      ? "bg-rose-50/70"
      : holiday?.kind === "prov"
        ? "bg-amber-50/70"
        : holiday?.kind === "uoft"
          ? "bg-violet-50/70"
          : isWeekend
            ? "bg-elevated/70"
            : "bg-card";

  // Single event → cell links to it. Multiple events → cell links
  // to the upcoming list anchor so the user can pick.
  const href = !hasEvents
    ? null
    : dayEvents.length === 1
      ? `/events/${firstEvent.slug}`
      : "#upcoming";

  // Tooltip for the date cell. Combines holiday name + event titles.
  const titleParts: string[] = [];
  if (holiday) titleParts.push(holiday.name);
  for (const e of dayEvents) titleParts.push(e.title.replace(/^Demo · /, ""));
  const tooltip = titleParts.length ? titleParts.join(" · ") : undefined;

  const inner = (
    <div
      title={tooltip}
      className={cn(
        "h-full flex flex-col items-stretch transition-colors relative",
        rowExpanded ? `p-1.5 ${minHEvent} text-[11px]` : `px-1 py-0 ${minHEmpty} text-[10px]`,
        baseBg,
        isToday && !hasEvents && "ring-2 ring-inset ring-brand-400",
      )}
    >
      <span className={cn(
        "text-left font-semibold leading-none flex items-center gap-1",
        rowExpanded ? "text-xs" : "text-[10px]",
        isToday && "text-brand-700",
        !hasEvents && !isToday && (
          holiday?.kind === "fed" ? "text-rose-800"
          : holiday?.kind === "prov" ? "text-amber-800"
          : holiday?.kind === "uoft" ? "text-violet-800"
          : isWeekend ? "text-subtle"
          : "text-muted"
        ),
      )}>
        {d}
        {holiday && (
          // Tiny coloured pip beside the date number — federal red,
          // provincial amber, U of T violet. Pure decoration; the
          // tooltip carries the name for screen readers.
          <span
            aria-hidden
            className={cn(
              "inline-block w-1 h-1 rounded-full",
              holiday.kind === "fed"  && "bg-rose-500",
              holiday.kind === "prov" && "bg-amber-500",
              holiday.kind === "uoft" && "bg-violet-500",
            )}
          />
        )}
      </span>
      {rowExpanded && (
        <div className="flex-1 flex flex-col justify-end gap-0.5 mt-1 overflow-hidden">
          {dayEvents.slice(0, 2).map((e) => (
            <div
              key={e.id}
              className={cn(
                "px-1.5 py-0.5 text-[11px] font-semibold leading-tight line-clamp-2 break-words",
                e.tone === "brand"
                  ? "bg-brand-700 text-white"
                  : "bg-sky-600 text-white",
              )}
              title={e.title.replace(/^Demo · /, "")}
            >
              {e.title.replace(/^Demo · /, "")}
            </div>
          ))}
          {dayEvents.length > 2 && (
            <p className="text-[10px] text-muted text-right leading-none">+{dayEvents.length - 2}</p>
          )}
        </div>
      )}
    </div>
  );
  if (!href) return <div>{inner}</div>;
  return (
    <Link href={href} className="block focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-0">
      {inner}
    </Link>
  );
}
