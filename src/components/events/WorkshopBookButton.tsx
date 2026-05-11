"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, CheckCircle2, Clock, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";

type BookStatus = "confirmed" | "waitlist" | null;

interface Props {
  slug: string;
  workshopId: string;
  /** Current user's booking status on this workshop. null = not booked. */
  myStatus: BookStatus;
  /** Position if myStatus === "waitlist". */
  myWaitlistPosition: number | null;
  /** Number of confirmed seats already taken. */
  confirmedCount: number;
  capacity: number;
  /** True when the user is already at MAX_WORKSHOPS_PER_USER. */
  atCap: boolean;
}

/**
 * Per-workshop book / cancel button. Three states it renders for:
 *   • Already booked (confirmed) → "Booked ✓" + small Cancel
 *   • Already booked (waitlist) → "Waitlist #N" + small Cancel
 *   • Not booked, capacity free → "Book this spot" (primary)
 *   • Not booked, capacity full → "Join waitlist" (amber)
 *   • Not booked, at cap → "Pick 2 reached" (disabled, tooltip)
 *
 * Optimistic state; reverts on API failure. router.refresh() on
 * success so the surrounding page picks up new counts.
 */
export function WorkshopBookButton({
  slug, workshopId, myStatus, myWaitlistPosition, confirmedCount, capacity, atCap,
}: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localStatus, setLocalStatus] = useState<BookStatus>(myStatus);
  const [localPos, setLocalPos] = useState<number | null>(myWaitlistPosition);

  const isBooked = localStatus !== null;
  const capacityFull = confirmedCount >= capacity;

  async function book() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/events/${slug}/workshops/${workshopId}/book`, {
        method: "POST",
      });
      const j = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        status?: "confirmed" | "waitlist";
        waitlistPosition?: number | null;
        error?: string;
      };
      if (!res.ok || !j.ok) throw new Error(j.error ?? "Booking failed");
      setLocalStatus(j.status ?? null);
      setLocalPos(j.waitlistPosition ?? null);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function cancel() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/events/${slug}/workshops/${workshopId}/book`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? "Cancel failed");
      }
      setLocalStatus(null);
      setLocalPos(null);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (isBooked && localStatus === "confirmed") {
    return (
      <div className="flex flex-col gap-1.5">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-100 text-emerald-800 ring-1 ring-inset ring-emerald-200">
          <CheckCircle2 size={12} />
          You're booked
        </div>
        <button
          type="button"
          onClick={cancel}
          disabled={busy}
          className="inline-flex items-center justify-center gap-1 px-2 py-1 rounded text-[11px] text-rose-700 hover:bg-rose-50 disabled:opacity-40 self-start"
        >
          {busy ? <Loader2 size={10} className="animate-spin" /> : <X size={10} />}
          Cancel
        </button>
        {error && <p className="text-[11px] text-rose-700">{error}</p>}
      </div>
    );
  }

  if (isBooked && localStatus === "waitlist") {
    return (
      <div className="flex flex-col gap-1.5">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-100 text-amber-800 ring-1 ring-inset ring-amber-200">
          <Clock size={12} />
          Waitlist {localPos !== null && `#${localPos}`}
        </div>
        <button
          type="button"
          onClick={cancel}
          disabled={busy}
          className="inline-flex items-center justify-center gap-1 px-2 py-1 rounded text-[11px] text-rose-700 hover:bg-rose-50 disabled:opacity-40 self-start"
        >
          {busy ? <Loader2 size={10} className="animate-spin" /> : <X size={10} />}
          Leave waitlist
        </button>
        {error && <p className="text-[11px] text-rose-700">{error}</p>}
      </div>
    );
  }

  // Not booked.
  return (
    <div className="flex flex-col gap-1.5">
      <button
        type="button"
        onClick={book}
        disabled={busy || atCap}
        title={atCap ? "You've already booked 2 workshops. Cancel one first." : undefined}
        className={cn(
          "inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
          atCap
            ? "bg-elevated text-subtle ring-1 ring-inset ring-line"
            : capacityFull
            ? "bg-amber-100 text-amber-900 hover:bg-amber-200 ring-1 ring-inset ring-amber-300"
            : "bg-brand-600 text-white hover:bg-brand-700",
        )}
      >
        {busy ? <Loader2 size={11} className="animate-spin" /> : capacityFull ? <Clock size={11} /> : <Plus size={11} />}
        {atCap ? "Pick 2 reached" : capacityFull ? "Join waitlist" : "Book this spot"}
      </button>
      {error && <p className="text-[11px] text-rose-700">{error}</p>}
    </div>
  );
}
