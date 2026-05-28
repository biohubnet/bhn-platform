/**
 * Add-to-calendar URL builders.
 *
 * Phase-1 lightweight: URL-only deep links (no .ics file generation
 * yet — that's queued for Phase 2 of the gap-closure roadmap, where
 * .ics will be attached to the confirmation email AND served from a
 * dedicated download endpoint).
 *
 * Three platforms covered:
 *   • Google Calendar — `calendar.google.com/calendar/render` deep link
 *   • Outlook web    — `outlook.live.com/calendar/0/deeplink/compose`
 *   • Yahoo Calendar — `calendar.yahoo.com/?v=60`
 *
 * iOS / macOS / desktop-Outlook need a .ics file (Phase 2), but
 * Google + web-Outlook cover ~80% of typical attendees today.
 */

export interface CalendarLinkInput {
  /** Event title — will be URL-encoded. */
  title: string;
  /** Optional rich description — will be URL-encoded. */
  description?: string | null;
  /** Optional venue / location string. */
  location?: string | null;
  /** Event start as a Date object (server-resolved, timezone-aware). */
  start: Date;
  /** Event end as a Date object. */
  end: Date;
}

/** Format a Date as `YYYYMMDDTHHmmssZ` (RFC 5545 "UTC" form). All three
 *  providers accept this; we don't need to ship a TZID — UTC is
 *  unambiguous. */
function toCalendarUTC(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    d.getUTCFullYear().toString() +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) +
    "T" +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    pad(d.getUTCSeconds()) +
    "Z"
  );
}

export function googleCalendarUrl(input: CalendarLinkInput): string {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: input.title,
    dates: `${toCalendarUTC(input.start)}/${toCalendarUTC(input.end)}`,
  });
  if (input.description) params.set("details", input.description);
  if (input.location) params.set("location", input.location);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function outlookCalendarUrl(input: CalendarLinkInput): string {
  // Outlook web uses ISO strings; same target wall-clock as the
  // Date object since we pass full ISO including timezone offset.
  const params = new URLSearchParams({
    path: "/calendar/action/compose",
    rru: "addevent",
    subject: input.title,
    startdt: input.start.toISOString(),
    enddt: input.end.toISOString(),
  });
  if (input.description) params.set("body", input.description);
  if (input.location) params.set("location", input.location);
  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
}

export function yahooCalendarUrl(input: CalendarLinkInput): string {
  // Yahoo uses `dur` for duration in HHMM format. Compute from
  // start/end so multi-hour events are correct.
  const durMs = Math.max(0, input.end.getTime() - input.start.getTime());
  const durHours = Math.floor(durMs / 3_600_000);
  const durMins  = Math.floor((durMs % 3_600_000) / 60_000);
  const dur = String(durHours).padStart(2, "0") + String(durMins).padStart(2, "0");
  const params = new URLSearchParams({
    v: "60",
    title: input.title,
    st: toCalendarUTC(input.start),
    dur,
  });
  if (input.description) params.set("desc", input.description);
  if (input.location) params.set("in_loc", input.location);
  return `https://calendar.yahoo.com/?${params.toString()}`;
}
