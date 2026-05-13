"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Clock, MapPin, Users, X, Plus, AlertTriangle, CheckCircle2, AlertCircle, Check,
} from "lucide-react";

export interface BookingRowAdmin {
  id: string;
  workshopId: string;
  title: string;
  kind: string;
  partnerOrganization: string | null;
  locationName: string | null;
  timeLabel: string;
  status: "pending" | "confirmed" | "waitlist" | "cancelled";
  waitlistPosition: number | null;
  bookedAt: string;
}

export interface WorkshopOptionAdmin {
  id: string;
  title: string;
  kind: string;
  partnerOrganization: string | null;
  locationName: string | null;
  timeLabel: string;
  capacity: number;
  confirmedCount: number;
  waitlistCount: number;
}

/**
 * Admin-on-behalf workshop manager. Two panels:
 *   • Current bookings — every WorkshopBooking the attendee holds
 *     for this event, with a cancel button that runs the standard
 *     side effects (waitlist promotion).
 *   • Book another — picker showing every active workshop the
 *     attendee doesn't already have an active booking on.
 *
 * Each action talks to the admin API which wraps the service-layer
 * helpers — so cap, capacity, and waitlist semantics stay
 * consistent with the user-facing flow.
 */
export function AttendeeWorkshopManager({
  slug,
  registrationId,
  currentBookings,
  availableWorkshops,
}: {
  slug: string;
  registrationId: string;
  currentBookings: BookingRowAdmin[];
  availableWorkshops: WorkshopOptionAdmin[];
}) {
  const router = useRouter();
  const [busy, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  const activeBookings = currentBookings.filter((b) => b.status !== "cancelled");
  const cancelledBookings = currentBookings.filter((b) => b.status === "cancelled");

  async function cancelBooking(b: BookingRowAdmin) {
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/events/${slug}/registrations/${registrationId}/workshop-bookings/${b.id}`,
        { method: "DELETE" },
      );
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        promoted?: boolean;
      };
      if (!res.ok) throw new Error(data.error ?? "Cancel failed");
      setFlash(
        data.promoted
          ? "Cancelled — next waitlister promoted."
          : "Cancelled.",
      );
      setTimeout(() => setFlash(null), 3500);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function approveBooking(b: BookingRowAdmin) {
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/events/${slug}/registrations/${registrationId}/workshop-bookings/${b.id}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "approve" }),
        },
      );
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        status?: "confirmed" | "waitlist";
        waitlistPosition?: number | null;
      };
      if (!res.ok) throw new Error(data.error ?? "Approve failed");
      setFlash(
        data.status === "confirmed"
          ? "Approved — confirmed."
          : `Approved — waitlist position ${data.waitlistPosition ?? "?"}.`,
      );
      setTimeout(() => setFlash(null), 3500);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function bookWorkshop(workshopId: string) {
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/events/${slug}/registrations/${registrationId}/workshop-bookings`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ workshopId }),
        },
      );
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        status?: "confirmed" | "waitlist";
        waitlistPosition?: number | null;
      };
      if (!res.ok) throw new Error(data.error ?? "Booking failed");
      setFlash(
        data.status === "confirmed"
          ? "Booked — confirmed."
          : `Booked — waitlist position ${data.waitlistPosition ?? "?"}.`,
      );
      setTimeout(() => setFlash(null), 3500);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <section className="space-y-4">
      <header>
        <h2 className="text-lg font-bold text-fg tracking-tight">Workshop bookings</h2>
        <p className="text-xs text-muted leading-snug mt-1">
          Manage this attendee's Training Week picks. The 2-workshop cap and
          waitlist rules apply to admin actions too — book on their behalf when
          someone emails asking to switch.
        </p>
      </header>

      {error && (
        <div className="rounded-xl bg-rose-50 ring-1 ring-inset ring-rose-200 px-4 py-3 flex items-start gap-2">
          <AlertTriangle size={14} className="text-rose-700 shrink-0 mt-0.5" />
          <p className="text-sm text-rose-900 leading-snug">{error}</p>
        </div>
      )}
      {flash && (
        <div className="rounded-xl bg-emerald-50 ring-1 ring-inset ring-emerald-200 px-4 py-3 flex items-start gap-2">
          <CheckCircle2 size={14} className="text-emerald-700 shrink-0 mt-0.5" />
          <p className="text-sm text-emerald-900 leading-snug">{flash}</p>
        </div>
      )}

      {/* Current */}
      <div className="rounded-2xl border border-line bg-card divide-y divide-line">
        {activeBookings.length === 0 ? (
          <p className="text-sm text-muted text-center py-6">
            No active workshop bookings.
          </p>
        ) : (
          activeBookings.map((b) => (
            <article key={b.id} className="px-4 py-3 flex flex-wrap items-start gap-3 justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-subtle">
                    {b.kind}
                  </span>
                  {b.partnerOrganization && (
                    <span className="text-[10px] font-semibold text-muted">{b.partnerOrganization}</span>
                  )}
                  <BookingStatusChip status={b.status} pos={b.waitlistPosition} />
                </div>
                <p className="text-sm font-bold text-fg leading-tight mt-1">{b.title}</p>
                <dl className="text-[11px] flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-muted">
                  <span className="inline-flex items-center gap-1"><Clock size={10} />{b.timeLabel}</span>
                  <span className="inline-flex items-center gap-1"><MapPin size={10} />{b.locationName ?? "TBA"}</span>
                </dl>
              </div>
              <div className="flex items-center gap-1.5">
                {b.status === "pending" && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => startTransition(() => { void approveBooking(b); })}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 px-3 py-1.5 disabled:opacity-50 admin-glow"
                    title="Approve this pending booking — moves it to confirmed if seats are open, else waitlist"
                  >
                    <Check size={12} /> Approve
                  </button>
                )}
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => startTransition(() => { void cancelBooking(b); })}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold rounded-lg border border-line bg-card text-rose-700 hover:bg-rose-50 hover:border-rose-300 px-3 py-1.5 disabled:opacity-50"
                >
                  <X size={12} /> {b.status === "pending" ? "Reject" : "Cancel"}
                </button>
              </div>
            </article>
          ))
        )}
      </div>

      {/* Available */}
      {availableWorkshops.length > 0 && activeBookings.length < 2 && (
        <div>
          <h3 className="text-[11px] font-bold uppercase tracking-[0.18em] text-subtle mb-2">
            Book another for them
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {availableWorkshops.map((w) => {
              const isFull = w.confirmedCount >= w.capacity;
              return (
                <article
                  key={w.id}
                  className="rounded-xl border border-line bg-card p-3.5 flex flex-col gap-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-subtle">{w.kind}</span>
                        {w.partnerOrganization && (
                          <span className="text-[10px] font-semibold text-muted">{w.partnerOrganization}</span>
                        )}
                      </div>
                      <p className="text-sm font-bold text-fg leading-tight mt-1">{w.title}</p>
                    </div>
                  </div>
                  <dl className="text-[11px] flex flex-wrap gap-x-3 gap-y-0.5 text-muted">
                    <span className="inline-flex items-center gap-1"><Clock size={10} />{w.timeLabel}</span>
                    <span className="inline-flex items-center gap-1"><MapPin size={10} />{w.locationName ?? "TBA"}</span>
                    <span className={`inline-flex items-center gap-1 ${isFull ? "text-amber-700 font-bold" : ""}`}>
                      <Users size={10} />{w.confirmedCount} / {w.capacity}
                      {isFull && " · waitlist"}
                    </span>
                  </dl>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => startTransition(() => { void bookWorkshop(w.id); })}
                    className={`mt-1 inline-flex items-center justify-center gap-1.5 text-xs font-bold rounded-lg px-3 py-1.5 disabled:opacity-50 ${
                      isFull
                        ? "border border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100"
                        : "bg-brand-600 text-white hover:bg-brand-700"
                    }`}
                  >
                    <Plus size={12} />
                    {isFull ? "Add to waitlist" : "Book"}
                  </button>
                </article>
              );
            })}
          </div>
        </div>
      )}

      {activeBookings.length >= 2 && availableWorkshops.length > 0 && (
        <div className="rounded-xl bg-amber-50 ring-1 ring-inset ring-amber-200 px-4 py-3 flex items-start gap-2">
          <AlertCircle size={14} className="text-amber-700 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-900 leading-snug">
            This attendee is at the 2-workshop cap. Cancel one above before
            booking another.
          </p>
        </div>
      )}

      {cancelledBookings.length > 0 && (
        <details className="text-xs">
          <summary className="cursor-pointer text-muted hover:text-fg">
            {cancelledBookings.length} cancelled booking{cancelledBookings.length === 1 ? "" : "s"} (history)
          </summary>
          <ul className="mt-2 rounded-xl border border-line bg-card divide-y divide-line">
            {cancelledBookings.map((b) => (
              <li key={b.id} className="px-3 py-2 text-fg flex items-center justify-between gap-3">
                <span className="opacity-70">{b.title}</span>
                <span className="text-subtle">{b.timeLabel}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}

function BookingStatusChip({
  status, pos,
}: {
  status: "pending" | "confirmed" | "waitlist" | "cancelled";
  pos: number | null;
}) {
  const tints: Record<string, string> = {
    pending: "bg-violet-100 text-violet-800 ring-violet-200",
    confirmed: "bg-emerald-100 text-emerald-800 ring-emerald-200",
    waitlist: "bg-amber-100 text-amber-800 ring-amber-200",
    cancelled: "bg-slate-100 text-slate-700 ring-slate-200",
  };
  const label = status === "pending"
    ? "Pending approval"
    : status === "waitlist" && pos !== null
      ? `Waitlist #${pos}`
      : status;
  return (
    <span
      className={`inline-flex items-center text-[10px] font-bold uppercase tracking-[0.16em] px-2 py-0.5 rounded-full ring-1 ring-inset ${tints[status] ?? tints.cancelled}`}
    >
      {label}
    </span>
  );
}
