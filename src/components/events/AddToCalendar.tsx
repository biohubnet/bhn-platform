"use client";
import { useState } from "react";
import { CalendarPlus, ChevronDown } from "lucide-react";
import {
  googleCalendarUrl,
  outlookCalendarUrl,
  yahooCalendarUrl,
  type CalendarLinkInput,
} from "@/lib/events/calendar-links";

/**
 * AddToCalendar — dropdown menu with three platform options (Google,
 * Outlook web, Yahoo). Phase 1 URL-only — .ics file generation
 * arrives in Phase 2 of the gap-closure roadmap (will add an "Apple
 * Calendar / iCal (.ics)" option pointing at the download endpoint).
 *
 * Props are split-into-serialisable so the parent (server component)
 * can hand off Date objects via ISO strings — the client converts
 * back to Date for the URL builders.
 */
interface Props {
  title: string;
  description?: string | null;
  location?: string | null;
  /** ISO string. Converted to Date inside the component. */
  startISO: string;
  /** ISO string. */
  endISO: string;
  /** Tone for the trigger button — "dark" on the hero (white on
   *  brand-blue), "light" elsewhere. */
  tone?: "dark" | "light";
}

export function AddToCalendar({
  title,
  description,
  location,
  startISO,
  endISO,
  tone = "light",
}: Props) {
  const [open, setOpen] = useState(false);
  const input: CalendarLinkInput = {
    title,
    description,
    location,
    start: new Date(startISO),
    end: new Date(endISO),
  };
  const items = [
    { label: "Google Calendar", href: googleCalendarUrl(input) },
    { label: "Outlook (web)",   href: outlookCalendarUrl(input) },
    { label: "Yahoo Calendar",  href: yahooCalendarUrl(input) },
  ];

  const triggerClass =
    tone === "dark"
      ? "inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white ring-1 ring-inset ring-white/40 hover:bg-white/10 transition-colors"
      : "inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-fg ring-1 ring-inset ring-line bg-card hover:bg-elevated transition-colors";

  return (
    <div className="relative inline-block">
      <button
        type="button"
        className={triggerClass}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <CalendarPlus size={14} />
        Add to calendar
        <ChevronDown size={12} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <>
          {/* Backdrop catches outside clicks. */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div
            role="menu"
            className="absolute right-0 mt-2 z-20 min-w-[200px] rounded-xl border border-line bg-card-solid shadow-elevated-heavy overflow-hidden"
          >
            {items.map((it) => (
              <a
                key={it.label}
                href={it.href}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setOpen(false)}
                className="block px-4 py-2.5 text-sm text-fg hover:bg-elevated transition-colors"
                role="menuitem"
              >
                {it.label}
              </a>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
