"use client";
import { useState } from "react";
import { CalendarClock, Clock, Info } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * "Need help choosing?" advisor-booking card — MOCK-UP ONLY.
 *
 * The current platform embeds a live Calendly widget here (BioHubNet
 * Course Selection, 15 min). This build has no scheduling integration
 * of any kind: no Calendly/Cal.com account wired up, no advisor or
 * availability model in Prisma, no booking table, no notification path.
 *
 * So this is a visual placeholder that shows the SHAPE of the feature
 * without pretending to work. It is labelled a mock-up on its face,
 * every slot is disabled, and nothing is submitted anywhere. That is
 * deliberate: a booking form that silently does nothing is worse than
 * no booking form, because a trainee walks away believing a call is in
 * the diary.
 *
 * To make it real, either:
 *   • embed Calendly — swap this component for an iframe of the real
 *     scheduling URL (smallest change, no schema), or
 *   • build native booking — AdvisorAvailability + Booking models, a
 *     slot API, and confirmation email. Much larger.
 */

/** Fixed, obviously-illustrative slots. Deliberately NOT generated from
 *  today's date: a mock that looks like live availability invites
 *  someone to trust it. */
const MOCK_SLOTS = ["9:00 AM", "10:30 AM", "1:00 PM", "2:30 PM", "4:00 PM"];

export function AdvisorBookingMock({ className }: { className?: string }) {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <aside
      className={cn("rounded-2xl border border-line bg-card overflow-hidden", className)}
      aria-labelledby="advisor-booking-heading"
    >
      <div className="px-4 py-3 border-b border-line bg-elevated">
        <h2 id="advisor-booking-heading" className="text-sm font-semibold text-fg flex items-center gap-2">
          <CalendarClock size={15} className="text-brand-600" />
          Need help choosing?
        </h2>
      </div>

      {/* The label is part of the component, not a caption someone can
          crop away. */}
      <div className="px-4 py-2.5 bg-amber-50 border-b border-amber-200 flex items-start gap-2">
        <Info size={13} className="text-amber-700 mt-0.5 shrink-0" />
        <p className="text-[11px] leading-snug text-amber-800">
          <strong>Mock-up only.</strong> This shows the intended booking flow.
          No scheduling system is connected and no appointment is created.
        </p>
      </div>

      <div className="p-4">
        <p className="text-sm font-semibold text-fg">BioHubNet course selection</p>
        <p className="text-xs text-muted mt-0.5 flex items-center gap-1.5">
          <Clock size={12} /> 15 minutes · with a BHN advisor
        </p>

        <p className="text-[11px] uppercase tracking-[0.18em] font-semibold text-subtle mt-4 mb-2">
          Pick a time
        </p>
        <div className="grid grid-cols-2 gap-1.5">
          {MOCK_SLOTS.map((slot) => (
            <button
              key={slot}
              type="button"
              aria-disabled="true"
              onClick={() => setSelected(slot)}
              className={cn(
                "text-xs rounded-lg border px-2 py-1.5 cursor-default transition-colors",
                selected === slot
                  ? "border-brand-400 bg-brand-50 text-brand-700 font-semibold"
                  : "border-line text-muted hover:bg-elevated",
              )}
            >
              {slot}
            </button>
          ))}
        </div>

        <button
          type="button"
          disabled
          className="mt-3 w-full rounded-lg bg-elevated text-muted text-xs font-semibold py-2 cursor-not-allowed"
        >
          {selected ? `Book ${selected} — unavailable in this build` : "Select a time"}
        </button>
      </div>
    </aside>
  );
}
