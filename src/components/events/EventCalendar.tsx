"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";

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
   * How many extra months past the anchor to render. Default 2 (so
   * 3 months show in total). Pass 0 to render a single month.
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

export function EventCalendar({ events, monthsAhead = 2 }: Props) {
  // Anchor on the earliest upcoming event's month if present, else
  // today's month — feels much more useful than always starting on
  // "now" if the next event is six months out.
  const initial = useMemo(() => {
    if (events.length === 0) return startOfMonth(new Date());
    const earliest = events
      .map((e) => new Date(e.start))
      .reduce((a, b) => (a < b ? a : b));
    return startOfMonth(earliest < new Date() ? new Date() : earliest);
  }, [events]);
  const [anchor, setAnchor] = useState<Date>(initial);

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

  // Pick a grid template — 1 / 2 / 3 columns based on the number of
  // rendered months. monthsAhead=0 → single-column wide; =1 → side by
  // side at md; =2 (default) → 3-up on xl, 2-up on md, 1-up below.
  let monthGridClass = "grid grid-cols-1 gap-4";
  if (monthsAhead === 1) monthGridClass = "grid grid-cols-1 md:grid-cols-2 gap-4";
  else if (monthsAhead >= 2) monthGridClass = "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4";

  return (
    <div className="rounded-2xl border border-line bg-card surface-shadow overflow-hidden">
      {/* Shared header — range label + nav. Shifts every rendered
          month by 1 step at a time. */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-line">
        <span className="inline-flex w-7 h-7 rounded-lg bg-brand-50 text-brand-700 items-center justify-center">
          <CalendarIcon size={14} />
        </span>
        <h3 className="text-sm font-semibold text-fg flex-1 truncate">
          {rangeLabel}
        </h3>
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
    <div className="rounded-xl bg-card ring-1 ring-inset ring-line/60 overflow-hidden flex flex-col">
      {/* Per-month label + count */}
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-line bg-elevated/40">
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
      <div className="grid grid-cols-7 px-2 pt-2 text-[10px] uppercase tracking-[0.12em] font-bold text-subtle">
        {WEEKDAYS.map((w) => (
          <div key={w} className="px-1 py-1 text-center">
            {w}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 gap-1 p-2">
        {cells.map((d, idx) => {
          if (d === null) return <div key={`b${idx}`} className="min-h-20" />;
          const key = ymd(new Date(month.getFullYear(), month.getMonth(), d));
          const dayEvents = byDay.get(key) ?? [];
          const isToday = key === todayKey;
          const hasEvents = dayEvents.length > 0;
          const firstEvent = dayEvents[0];
          // Single event → cell links to it. Multiple events → cell
          // links to the upcoming list anchor so the user can pick.
          const href = !hasEvents
            ? null
            : dayEvents.length === 1
              ? `/events/${firstEvent.slug}`
              : "#upcoming";
          const inner = (
            <div
              className={cn(
                // Rectangular cell — taller than wide so event labels
                // get vertical room to wrap to a second line.
                "min-h-20 rounded-lg flex flex-col items-stretch p-1.5 text-[11px] transition-colors",
                hasEvents
                  ? firstEvent.tone === "brand"
                    ? "bg-brand-50 text-brand-900 hover:bg-brand-100 ring-1 ring-inset ring-brand-200"
                    : "bg-elevated text-fg hover:bg-raised ring-1 ring-inset ring-line"
                  : isToday
                    ? "ring-1 ring-inset ring-brand-300"
                    : "",
              )}
            >
              <span className={cn(
                "text-right font-semibold leading-none text-[11px]",
                isToday && !hasEvents && "text-brand-700",
                hasEvents ? "" : "text-muted",
              )}>
                {d}
              </span>
              <div className="flex-1 flex flex-col justify-end gap-0.5 mt-1 overflow-hidden">
                {dayEvents.slice(0, 2).map((e) => (
                  <div
                    key={e.id}
                    className={cn(
                      // line-clamp-2 lets two-word event names like
                      // "Biomanufacturing Day" sit on two lines instead
                      // of truncating to "Bioma…". 11px is the cell
                      // floor; smaller and the brand background can't
                      // hold its own visually.
                      "rounded px-1 py-0.5 text-[11px] font-semibold leading-tight line-clamp-2 break-words",
                      e.tone === "brand"
                        ? "bg-brand-600 text-white"
                        : "bg-muted/30 text-fg",
                    )}
                    title={e.title.replace(/^Demo · /, "")}
                  >
                    {e.title.replace(/^Demo · /, "")}
                  </div>
                ))}
                {dayEvents.length > 2 && (
                  <p className="text-[9px] text-muted text-right leading-none">+{dayEvents.length - 2}</p>
                )}
              </div>
            </div>
          );
          if (!href) return <div key={idx}>{inner}</div>;
          return (
            <Link key={idx} href={href} className="block focus:outline-none focus:ring-2 focus:ring-brand-500 rounded-lg">
              {inner}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
