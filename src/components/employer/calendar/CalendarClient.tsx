"use client";

/**
 * CalendarClient — week-view interview calendar.
 *
 * Fetches from GET /api/employer/calendar?from=ISO&to=ISO on mount
 * and whenever the week changes. Renders a 7-column grid (desktop)
 * or stacked day list (mobile).
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ChevronLeft, ChevronRight, CalendarDays,
  PhoneCall, Video, MapPin, Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/Card";

// ── Types ─────────────────────────────────────────────────────────

interface CalendarEvent {
  id:            string;
  applicantName: string;
  postingTitle:  string;
  postingId:     string;
  startsAt:      string;  // ISO string
  format:        string | null;  // phone | video | onsite | null
  status:        string;         // proposed | accepted | ...
}

interface Props {
  companyId: string;
}

// ── Week helpers ─────────────────────────────────────────────────

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function getMondayOf(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun, 1=Mon, ...
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth()    === b.getMonth()    &&
    a.getDate()     === b.getDate()
  );
}

function formatMonthRange(mon: Date): string {
  const sun = addDays(mon, 6);
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  if (mon.getMonth() === sun.getMonth()) {
    return `${mon.toLocaleDateString(undefined, { month: "long" })} ${mon.getDate()}–${sun.getDate()}, ${mon.getFullYear()}`;
  }
  return `${mon.toLocaleDateString(undefined, opts)} – ${sun.toLocaleDateString(undefined, opts)}, ${sun.getFullYear()}`;
}

// ── Format icon ───────────────────────────────────────────────────

function FormatIcon({ format }: { format: string | null }) {
  if (format === "phone") return <PhoneCall size={11} className="shrink-0 text-muted" />;
  if (format === "onsite") return <MapPin size={11} className="shrink-0 text-muted" />;
  return <Video size={11} className="shrink-0 text-muted" />;
}

// ── Component ────────────────────────────────────────────────────

export function CalendarClient({ companyId }: Props) {
  const [weekStart, setWeekStart] = useState<Date>(() => getMondayOf(new Date()));
  const [events,    setEvents]    = useState<CalendarEvent[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);

  // Build the 7-day array for the current week
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const weekEnd = addDays(weekStart, 7);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const from = weekStart.toISOString();
    const to   = weekEnd.toISOString();

    fetch(`/api/employer/calendar?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`)
      .then(async (res) => {
        if (!res.ok) throw new Error();
        const data = await res.json();
        if (!cancelled) setEvents(data.events ?? []);
      })
      .catch(() => {
        if (!cancelled) setError("Could not load calendar events.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekStart.toISOString()]);

  function goToToday()   { setWeekStart(getMondayOf(new Date())); }
  function goPrev()      { setWeekStart((w) => addDays(w, -7)); }
  function goNext()      { setWeekStart((w) => addDays(w, 7)); }

  const eventsForDay = (day: Date) =>
    events
      .filter((e) => isSameDay(new Date(e.startsAt), day))
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt));

  const totalEvents = events.length;

  return (
    <Card className="p-5 space-y-4">
      {/* Navigation row */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <button
            onClick={goPrev}
            className="p-2 rounded-lg border border-line hover:bg-elevated transition-colors"
            aria-label="Previous week"
          >
            <ChevronLeft size={15} />
          </button>
          <button
            onClick={goToToday}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-line hover:bg-elevated transition-colors text-fg"
          >
            Today
          </button>
          <button
            onClick={goNext}
            className="p-2 rounded-lg border border-line hover:bg-elevated transition-colors"
            aria-label="Next week"
          >
            <ChevronRight size={15} />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-fg">
            {formatMonthRange(weekStart)}
          </span>
          {loading && <Loader2 size={14} className="animate-spin text-muted" />}
        </div>
        <span className="text-xs text-muted">
          {loading ? "Loading…" : `${totalEvents} interview${totalEvents !== 1 ? "s" : ""}`}
        </span>
      </div>

      {error && (
        <div className="text-sm text-rose-700 bg-rose-50 rounded-lg px-3 py-2 ring-1 ring-inset ring-rose-200">
          {error}
        </div>
      )}

      {/* ── Desktop: 7-column grid ────────────────────────────── */}
      <div className="hidden md:grid grid-cols-7 gap-2">
        {days.map((day) => {
          const dayEvents  = eventsForDay(day);
          const isToday    = isSameDay(day, new Date());
          const hasEvents  = dayEvents.length > 0;

          return (
            <div key={day.toISOString()} className="min-h-[160px]">
              {/* Day header */}
              <div className={cn(
                "text-center mb-2 pb-2 border-b border-line",
              )}>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-subtle">
                  {DAY_NAMES[days.indexOf(day)]}
                </p>
                <p className={cn(
                  "text-sm font-bold mt-0.5",
                  isToday
                    ? "text-brand"
                    : "text-fg",
                )}>
                  {day.getDate()}
                </p>
              </div>

              {/* Events */}
              {!hasEvents && (
                <p className="text-[10px] text-muted text-center py-2">—</p>
              )}
              <div className="space-y-1.5">
                {dayEvents.map((e) => (
                  <EventCard key={e.id} event={e} />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Mobile: vertical list by day ─────────────────────── */}
      <div className="md:hidden space-y-4">
        {days.map((day) => {
          const dayEvents = eventsForDay(day);
          const isToday   = isSameDay(day, new Date());

          return (
            <div key={day.toISOString()}>
              <div className="flex items-center gap-2 mb-2">
                <span className={cn(
                  "text-xs font-bold",
                  isToday ? "text-brand" : "text-subtle",
                )}>
                  {DAY_NAMES[days.indexOf(day)]} {day.getDate()}
                </span>
                {dayEvents.length > 0 && (
                  <span className="text-[10px] bg-elevated px-1.5 py-0.5 rounded text-muted border border-line">
                    {dayEvents.length}
                  </span>
                )}
              </div>
              {dayEvents.length === 0 ? (
                <p className="text-xs text-muted pl-2">No interviews</p>
              ) : (
                <div className="space-y-2">
                  {dayEvents.map((e) => (
                    <EventCard key={e.id} event={e} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Empty week state */}
      {!loading && !error && totalEvents === 0 && (
        <div className="py-10 text-center">
          <CalendarDays size={28} className="mx-auto text-muted mb-3" />
          <p className="text-sm font-medium text-fg">No interviews scheduled this week.</p>
          <p className="text-xs text-muted mt-1">
            Check another week or schedule an interview from the candidate panel.
          </p>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && totalEvents === 0 && (
        <div className="grid grid-cols-7 gap-2 md:grid hidden">
          {Array.from({ length: 7 }, (_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-8 bg-elevated rounded-lg animate-pulse" />
              <div className="h-14 bg-elevated/50 rounded-lg animate-pulse" />
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

// ── Event card sub-component ──────────────────────────────────────

function EventCard({ event }: { event: CalendarEvent }) {
  const isConfirmed = event.status === "accepted";
  const timeStr = new Date(event.startsAt).toLocaleTimeString(undefined, {
    hour:   "numeric",
    minute: "2-digit",
  });

  return (
    <Link
      href={`/employer/postings#posting-${event.postingId}`}
      className="block rounded-lg border border-line bg-elevated/40 hover:bg-elevated hover:border-brand/30 px-2.5 py-2 transition-colors group"
    >
      <div className="flex items-center justify-between gap-1 mb-0.5">
        <span className="text-[10px] text-muted tabular-nums">{timeStr}</span>
        <span className={cn(
          "text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full ring-1 ring-inset shrink-0",
          isConfirmed
            ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
            : "bg-amber-50 text-amber-700 ring-amber-200",
        )}>
          {isConfirmed ? "Confirmed" : "Pending"}
        </span>
      </div>
      <p className="text-xs font-semibold text-fg leading-tight truncate group-hover:text-brand transition-colors">
        {event.applicantName}
      </p>
      <div className="flex items-center gap-1 mt-0.5">
        <FormatIcon format={event.format} />
        <span className="text-[10px] text-muted truncate">{event.postingTitle}</span>
      </div>
    </Link>
  );
}
