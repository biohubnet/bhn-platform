"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, Clock, Check, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * "Need help choosing?" advisor booking.
 *
 * This replaces an earlier mock-up. It books real AdvisorSession rows
 * and writes a real AdvisorBooking, so a slot a trainee takes here is a
 * slot no one else can take. A trainee holds at most one upcoming
 * booking; the API enforces that, and the UI reflects it by showing the
 * existing booking instead of the slot picker.
 */

export interface AdvisorSlot {
  id: string;
  advisorName: string;
  startsAtISO: string;
  /** Pre-formatted on the server so the slot label can't drift between
   *  a server render and a client hydration in another timezone. */
  dayLabel: string;
  timeLabel: string;
  minutes: number;
  location: string | null;
  seatsLeft: number;
}

export interface AdvisorBookingState {
  bookingId: string;
  dayLabel: string;
  timeLabel: string;
  advisorName: string;
  location: string | null;
}

interface Props {
  slots: AdvisorSlot[];
  existing: AdvisorBookingState | null;
  className?: string;
}

export function AdvisorBooking({ slots, existing, className }: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(null);
  const [topic, setTopic] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function send(url: string, method: "POST" | "DELETE", body: unknown) {
    setError(null);
    const res = await fetch(url, {
      method,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const data: unknown = await res.json().catch(() => null);
      const message =
        typeof data === "object" && data !== null && "error" in data
          ? String((data as { error: unknown }).error)
          : "Something went wrong. Try again.";
      setError(message);
      return false;
    }
    return true;
  }

  function book() {
    if (!selected) return;
    startTransition(async () => {
      const ok = await send("/api/engage/advisor", "POST", {
        sessionId: selected,
        topic: topic.trim() || undefined,
      });
      if (ok) {
        setSelected(null);
        setTopic("");
        router.refresh();
      }
    });
  }

  function cancel() {
    if (!existing) return;
    startTransition(async () => {
      const ok = await send("/api/engage/advisor", "DELETE", { bookingId: existing.bookingId });
      if (ok) router.refresh();
    });
  }

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

      <div className="p-4">
        <p className="text-sm font-semibold text-fg">BioHubNet course selection</p>
        <p className="text-xs text-muted mt-0.5 flex items-center gap-1.5">
          <Clock size={12} /> 15 minutes · with a BHN advisor
        </p>

        {existing ? (
          <div className="mt-4">
            <div className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2.5">
              <p className="text-xs font-semibold text-emerald-800 flex items-center gap-1.5">
                <Check size={13} /> You&rsquo;re booked
              </p>
              <p className="text-sm font-semibold text-emerald-900 mt-1">
                {existing.dayLabel}, {existing.timeLabel}
              </p>
              <p className="text-[11px] text-emerald-800 mt-0.5">with {existing.advisorName}</p>
              {existing.location && (
                <p className="text-[11px] text-emerald-800 mt-0.5 flex items-center gap-1">
                  <MapPin size={11} /> {existing.location}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={cancel}
              disabled={pending}
              className="mt-3 w-full rounded-lg border border-line text-muted hover:text-fg hover:border-subtle text-xs font-semibold py-2 transition-colors disabled:opacity-60"
            >
              {pending ? "Cancelling…" : "Cancel this booking"}
            </button>
          </div>
        ) : slots.length === 0 ? (
          <p className="mt-4 text-xs text-muted leading-relaxed">
            No advisor slots are open at the moment. Check back shortly — new times are
            released regularly.
          </p>
        ) : (
          <>
            <p className="text-[11px] uppercase tracking-[0.18em] font-semibold text-subtle mt-4 mb-2">
              Pick a time
            </p>
            <div className="flex flex-col gap-1.5 max-h-56 overflow-y-auto">
              {slots.map((slot) => {
                const isSelected = selected === slot.id;
                return (
                  <button
                    key={slot.id}
                    type="button"
                    onClick={() => setSelected(isSelected ? null : slot.id)}
                    aria-pressed={isSelected}
                    className={cn(
                      "rounded-lg border px-3 py-2 text-left transition-colors",
                      isSelected
                        ? "border-brand-600 bg-brand-50 text-brand-900"
                        : "border-line bg-card hover:border-subtle text-fg",
                    )}
                  >
                    <span className="block text-xs font-semibold">
                      {slot.dayLabel} · {slot.timeLabel}
                    </span>
                    <span className="block text-[11px] text-muted mt-0.5">
                      {slot.advisorName}
                      {slot.location ? ` · ${slot.location}` : ""}
                    </span>
                  </button>
                );
              })}
            </div>

            {selected && (
              <label className="block mt-3">
                <span className="text-[11px] uppercase tracking-[0.18em] font-semibold text-subtle">
                  What would you like to cover?
                </span>
                <textarea
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  rows={2}
                  maxLength={500}
                  placeholder="Optional — helps your advisor prepare."
                  className="mt-1 w-full rounded-lg border border-line bg-card px-2.5 py-2 text-xs text-fg placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-brand-300"
                />
              </label>
            )}

            <button
              type="button"
              onClick={book}
              disabled={!selected || pending}
              className={cn(
                "mt-3 w-full rounded-lg text-xs font-semibold py-2 transition-colors",
                selected && !pending
                  ? "bg-brand-600 text-white hover:bg-brand-700"
                  : "bg-elevated text-muted cursor-not-allowed",
              )}
            >
              {pending ? "Booking…" : selected ? "Confirm booking" : "Select a time"}
            </button>
          </>
        )}

        {error && (
          <p role="alert" className="mt-2 text-[11px] text-rose-700 leading-snug">
            {error}
          </p>
        )}
      </div>
    </aside>
  );
}
