"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle } from "lucide-react";

/**
 * Enrollment CTA used on course detail pages.
 *
 * Trainees: one click → POST → router.refresh. The server enforces the
 * concurrent-course limit and surfaces a friendly error if they're at
 * cap.
 *
 * Admins / superadmins: the limit doesn't apply to them, but it's
 * still very much real for trainees. The first time a staff member
 * tries to enrol past the configured cap they see a one-time popup
 * reminding them the cap is still in effect for learners — important
 * because admin enrolments are often "I'm checking what the trainee
 * experience looks like" and quietly bypassing the rule defeats the
 * point of the check. The popup defers to the user — they can
 * proceed (bypassing the cap) or cancel and switch into trainee view
 * to validate the real flow.
 *
 * `staffRole` is true when the viewer is admin or superadmin. The
 * parent server component decides this (the client can't be trusted)
 * and passes it as a prop. `activeCount` and `limit` give the modal
 * the numbers it needs to surface; if they aren't passed (older
 * callers) we still gate on staffRole alone.
 */
interface Props {
  courseId: string;
  staffRole?: boolean;
  activeCount?: number;
  limit?: number;
}

export function EnrollButton({ courseId, staffRole = false, activeCount, limit }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showStaffWarn, setShowStaffWarn] = useState(false);

  async function doEnroll() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/courses/${courseId}/enroll`, { method: "POST" });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error ?? "Couldn't enroll. Please try again.");
        return;
      }
      setShowStaffWarn(false);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  function handleClick() {
    // Staff are bypassing the cap if they're already at-or-past it.
    // We don't need to count trainees against the cap (the server
    // would have blocked them anyway).
    const bypassing =
      staffRole &&
      typeof activeCount === "number" &&
      typeof limit === "number" &&
      activeCount >= limit;
    if (bypassing) {
      setShowStaffWarn(true);
      return;
    }
    void doEnroll();
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        onClick={handleClick}
        disabled={loading}
        className="bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors"
      >
        {loading ? "Enrolling…" : "Enroll Now"}
      </button>
      {error && (
        <p className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2 max-w-xs leading-snug">
          {error}
        </p>
      )}

      {showStaffWarn && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => !loading && setShowStaffWarn(false)}
        >
          <div
            className="max-w-md w-full bg-card rounded-2xl border border-line shadow-xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <span className="inline-flex w-10 h-10 rounded-xl bg-amber-100 text-amber-700 items-center justify-center shrink-0">
                <AlertTriangle size={18} />
              </span>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-semibold text-fg">
                  Admin bypass — trainee cap is {limit}
                </h3>
                <p className="mt-2 text-sm text-muted leading-snug">
                  You already have <strong>{activeCount}</strong> active
                  course{activeCount === 1 ? "" : "s"}. Trainees would be
                  blocked here — the cap is a fairness rule for learners.
                  You can proceed because you&apos;re staff, but remember the
                  rule still applies to everyone else. Change the cap from
                  Admin · Settings if it no longer fits.
                </p>
              </div>
            </div>
            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                onClick={() => setShowStaffWarn(false)}
                disabled={loading}
                className="px-4 py-2 rounded-lg text-sm font-medium text-muted hover:text-fg hover:bg-elevated transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={() => void doEnroll()}
                disabled={loading}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-brand-600 text-white hover:bg-brand-700 transition-colors disabled:opacity-50"
              >
                {loading ? "Enrolling…" : "Enroll anyway"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
