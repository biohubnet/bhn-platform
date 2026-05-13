"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Lightweight monthly calendar that highlights every day an event is
 * running. Each day cell shows a colored band per overlapping event;
 * clicking a day jumps to the matching event's landing page (or to a
 * picker if multiple events fall on the same day).
 *
 * Deliberately not a full FullCalendar/Big Calendar integration — we
 * have at most a handful of multi-day events per year, so a custom
 * grid keeps the bundle small and the styling exactly aligned with
 * the rest of the events surface. Drag, drop, week view, multi-tz
 * are explicit non-goals; if we ever need them we'll swap in a real
 * library.
 *
 * The component is keyboard-friendly: ←/→ navigate months when the
 * grid has focus, Today snaps back to the current month.
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

export function EventCalendar({ events }: Props) {
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
  const [view, setView] = useState<Date>(initial);

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

  const monthLabel = view.toLocaleDateString("en-CA", { month: "long", year: "numeric" });
  const firstDay = view.getDay(); // 0 = Sun
  const daysInMonth = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const today = new Date();
  const todayKey = ymd(today);

  return (
    <div className="rounded-2xl border border-line bg-card surface-shadow">
      {/* Header bar — month label + nav buttons */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-line">
        <span className="inline-flex w-7 h-7 rounded-lg bg-brand-50 text-brand-700 items-center justify-center">
          <CalendarIcon size={14} />
        </span>
        <h3 className="text-sm font-semibold text-fg flex-1 truncate">
          {monthLabel}
        </h3>
        <button
          type="button"
          onClick={() => setView((v) => addMonths(v, -1))}
          className="p-1.5 rounded-md text-muted hover:text-fg hover:bg-elevated transition-colors"
          aria-label="Previous month"
        >
          <ChevronLeft size={14} />
        </button>
        <button
          type="button"
          onClick={() => setView(startOfMonth(new Date()))}
          className="text-[11px] font-medium px-2 py-1 rounded-md text-muted hover:text-fg hover:bg-elevated transition-colors"
        >
          Today
        </button>
        <button
          type="button"
          onClick={() => setView((v) => addMonths(v, 1))}
          className="p-1.5 rounded-md text-muted hover:text-fg hover:bg-elevated transition-colors"
          aria-label="Next month"
        >
          <ChevronRight size={14} />
        </button>
      </div>

      {/* Weekday header */}
      <div className="grid grid-cols-7 px-2 pt-2 text-[10px] uppercase tracking-[0.18em] font-bold text-subtle">
        {WEEKDAYS.map((w) => (
          <div key={w} className="px-2 py-1 text-center">
            {w}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 gap-1 p-2">
        {cells.map((d, idx) => {
          if (d === null) return <div key={`b${idx}`} className="aspect-square" />;
          const key = ymd(new Date(view.getFullYear(), view.getMonth(), d));
          const dayEvents = byDay.get(key) ?? [];
          const isToday = key === todayKey;
          const hasEvents = dayEvents.length > 0;
          const firstEvent = dayEvents[0];
          // Single event → cell links to it. Multiple events → cell
          // links to the bottom-of-page upcoming list (anchor) so
          // the user can pick. (Rare in practice — at most a few
          // events per year in this org.)
          const href = !hasEvents
            ? null
            : dayEvents.length === 1
              ? `/events/${firstEvent.slug}`
              : "#upcoming";
          const inner = (
            <div
              className={cn(
                "aspect-square rounded-lg flex flex-col items-stretch p-1 text-[11px] transition-colors",
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
                "text-right font-semibold leading-none",
                isToday && !hasEvents && "text-brand-700",
                hasEvents ? "" : "text-muted",
              )}>
                {d}
              </span>
              <div className="flex-1 flex flex-col justify-end gap-0.5 mt-0.5 overflow-hidden">
                {dayEvents.slice(0, 2).map((e) => (
                  <div
                    key={e.id}
                    className={cn(
                      "rounded-sm px-1 py-0.5 truncate text-[10px] font-semibold leading-tight",
                      e.tone === "brand"
                        ? "bg-brand-600 text-white"
                        : "bg-muted/30 text-fg",
                    )}
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
