"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Layers, Calendar, Users, Clock, AlertTriangle, CheckCircle2, ArrowRight,
} from "lucide-react";

export interface PublicCohort {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  /** ISO */
  startDate: string;
  /** ISO or null */
  endDate: string | null;
  capacity: number;
  confirmedCount: number;
  waitlistCount: number;
  /** Computed display state. */
  state: "open" | "waitlisted" | "full" | "closed" | "not_open_yet" | "draft" | "archived";
  /** ISO or null */
  enrollmentClosesAt: string | null;
}

const STATE_LABEL: Record<PublicCohort["state"], string> = {
  open: "Open",
  waitlisted: "Waitlist only",
  full: "Full",
  closed: "Closed",
  not_open_yet: "Opens soon",
  draft: "Draft",
  archived: "Past cohort",
};

const STATE_TINT: Record<PublicCohort["state"], string> = {
  open:         "bg-emerald-100 text-emerald-800 ring-emerald-200",
  waitlisted:   "bg-amber-100 text-amber-800 ring-amber-200",
  full:         "bg-rose-100 text-rose-800 ring-rose-200",
  closed:       "bg-slate-100 text-slate-700 ring-slate-200",
  not_open_yet: "bg-sky-100 text-sky-800 ring-sky-200",
  draft:        "bg-elevated text-subtle ring-line",
  archived:     "bg-slate-100 text-slate-700 ring-slate-200",
};

/**
 * Public cohort picker shown on /pathways/[id] when the pathway has
 * ≥ 1 cohort. Each card shows dates / capacity / state badge plus
 * the right action for its state (Enroll · Join waitlist · disabled).
 */
export function PathwayCohortPicker({
  pathwayId,
  cohorts,
  alreadyEnrolledCohortId,
}: {
  pathwayId: string;
  cohorts: PublicCohort[];
  alreadyEnrolledCohortId: string | null;
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  // Hide drafts and archived from public listing — admin sees them
  // via the manager. Closed cohorts stay visible so trainees know
  // there was a past offering.
  const visible = cohorts.filter((c) => c.state !== "draft");

  async function enroll(cohortId: string) {
    setBusyId(cohortId); setError(null);
    try {
      const res = await fetch(`/api/pathways/${pathwayId}/enroll`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cohortId }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        status?: "approved" | "waitlisted" | "pending";
        waitlistPosition?: number | null;
      };
      if (!res.ok) throw new Error(data.error ?? "Enrollment failed");
      if (data.status === "waitlisted") {
        setFlash(`Added to waitlist (position #${data.waitlistPosition ?? "?"}).`);
      } else if (data.status === "approved") {
        setFlash("Enrolled! Welcome to the cohort.");
      } else {
        setFlash("Request submitted — admin will review.");
      }
      setTimeout(() => setFlash(null), 4000);
      startTransition(() => router.refresh());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  if (visible.length === 0) return null;

  return (
    <section className="space-y-3">
      <header>
        <h2 className="text-lg font-bold text-fg tracking-tight inline-flex items-center gap-2">
          <Layers size={16} className="text-brand-600" />
          Available cohorts
        </h2>
        <p className="text-sm text-muted mt-1 leading-snug">
          This pathway runs in cohorts. Pick the one that fits your schedule.
        </p>
      </header>

      {error && (
        <div className="rounded-xl bg-rose-50 ring-1 ring-inset ring-rose-200 px-3 py-2 flex items-start gap-2 text-xs text-rose-900">
          <AlertTriangle size={11} className="text-rose-700 shrink-0 mt-0.5" /> {error}
        </div>
      )}
      {flash && (
        <div className="rounded-xl bg-emerald-50 ring-1 ring-inset ring-emerald-200 px-3 py-2 flex items-start gap-2 text-xs text-emerald-900">
          <CheckCircle2 size={11} className="text-emerald-700 shrink-0 mt-0.5" /> {flash}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {visible.map((c) => {
          const isMine = alreadyEnrolledCohortId === c.id;
          const canEnroll = c.state === "open" || c.state === "waitlisted";
          const seats = Math.max(0, c.capacity - c.confirmedCount);
          return (
            <article
              key={c.id}
              className={`rounded-2xl border p-4 surface-shadow ${isMine ? "border-brand-400 bg-brand-50/40 ring-1 ring-brand-200" : "border-line bg-card"}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-fg text-base leading-tight">{c.name}</p>
                  {c.description && (
                    <p className="text-xs text-muted leading-snug mt-1">{c.description}</p>
                  )}
                </div>
                <span className={`inline-flex items-center text-[10px] font-bold uppercase tracking-[0.16em] px-2 py-0.5 rounded-full ring-1 ring-inset ${STATE_TINT[c.state]}`}>
                  {STATE_LABEL[c.state]}
                </span>
              </div>

              <dl className="text-[11px] flex flex-wrap gap-x-3 gap-y-1 mt-3 text-fg">
                <Meta icon={Calendar}>
                  {new Date(c.startDate).toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" })}
                  {c.endDate && ` – ${new Date(c.endDate).toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" })}`}
                </Meta>
                <Meta icon={Users}>
                  {c.state === "open" ? (
                    <>{seats} seat{seats === 1 ? "" : "s"} left of {c.capacity}</>
                  ) : c.state === "waitlisted" ? (
                    <>Full · {c.waitlistCount} on waitlist</>
                  ) : (
                    <>{c.confirmedCount} / {c.capacity}</>
                  )}
                </Meta>
                {c.enrollmentClosesAt && c.state !== "closed" && c.state !== "archived" && (
                  <Meta icon={Clock}>
                    Closes {new Date(c.enrollmentClosesAt).toLocaleDateString("en-CA", { month: "short", day: "numeric" })}
                  </Meta>
                )}
              </dl>

              <div className="mt-4">
                {isMine ? (
                  <p className="text-xs text-brand-800 font-bold inline-flex items-center gap-1">
                    <CheckCircle2 size={12} /> You're enrolled in this cohort
                  </p>
                ) : alreadyEnrolledCohortId !== null ? (
                  <p className="text-xs text-subtle italic">
                    You're enrolled in another cohort for this pathway.
                  </p>
                ) : canEnroll ? (
                  <button
                    type="button"
                    disabled={busyId !== null}
                    onClick={() => { void enroll(c.id); }}
                    className={`inline-flex items-center gap-1.5 text-sm font-bold rounded-xl px-4 py-2 transition-colors disabled:opacity-50 ${
                      c.state === "open"
                        ? "bg-brand-600 text-white hover:bg-brand-700"
                        : "bg-amber-100 text-amber-900 hover:bg-amber-200 ring-1 ring-inset ring-amber-200"
                    }`}
                  >
                    {busyId === c.id
                      ? "…"
                      : c.state === "open" ? "Enroll" : "Join waitlist"}
                    <ArrowRight size={12} />
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled
                    className="inline-flex items-center gap-1.5 text-sm font-bold rounded-xl px-4 py-2 bg-elevated text-subtle ring-1 ring-inset ring-line cursor-not-allowed"
                    title={
                      c.state === "full" ? "This cohort is full and the waitlist is closed."
                      : c.state === "closed" ? "Enrollment for this cohort is closed."
                      : c.state === "not_open_yet" ? "Enrollment hasn't opened yet."
                      : "Not currently enrollable."
                    }
                  >
                    {c.state === "full" ? "Full" : c.state === "not_open_yet" ? "Opens soon" : "Closed"}
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function Meta({ icon: Icon, children }: { icon: React.ElementType; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1">
      <Icon size={11} className="text-subtle" /> {children}
    </span>
  );
}
