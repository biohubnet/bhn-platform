"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, AlertTriangle, CheckCircle2 } from "lucide-react";

/**
 * Generic admin-only "Clear demo + sandbox X" button.
 *
 * Pages embed it with an `entity` (and `scope` where the entity
 * needs it) — same endpoint, different rows wiped per page. The
 * heavy lifting + the defence-in-depth (real-account blocking,
 * kind whitelist, scope validation) lives on the API; the button
 * is just a thin wrapper with a confirm dialog and a success
 * flash showing per-kind counts.
 *
 * Phantom + showcase are excluded by default — phantoms have
 * their own dedicated lifecycle, and showcase is a single global
 * persona kept alive on purpose. Pages that genuinely need to
 * include them can pass kinds explicitly.
 */
export function ClearTestDataButton({
  entity,
  scope,
  label = "Clear demo + sandbox",
  helpText,
  kinds,
}: {
  entity:
    | "internship_posting"
    | "form_submission"
    | "credit_application"
    | "pool_exit_feedback"
    | "event_registration";
  scope?: { formSlug?: string; eventSlug?: string };
  label?: string;
  /** Override the confirm-dialog body when the default doesn't fit. */
  helpText?: string;
  /** Override the default ["demo", "sandbox"] kind set if a page
   *  legitimately needs to include phantom or showcase. */
  kinds?: string[];
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  async function run() {
    const defaultHelp =
      "Delete every row in this view that belongs to a demo or sandbox account. " +
      "The accounts themselves stay (they're reusable for other tests). " +
      "Phantom accounts have their own dedicated 'Clear all phantoms' control " +
      "and aren't touched by this button.";
    if (!confirm(helpText ?? defaultHelp)) return;

    setSubmitting(true); setError(null); setFlash(null);
    try {
      const res = await fetch("/api/admin/clear-test-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entity, scope, accountKinds: kinds }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        deleted?: number;
        byKind?: Record<string, number>;
      };
      if (!res.ok) throw new Error(data.error ?? "Clear failed");

      const parts = Object.entries(data.byKind ?? {})
        .map(([k, n]) => `${n} ${k}`)
        .join(", ");
      setFlash(
        data.deleted === 0
          ? "Nothing to clear."
          : `Cleared ${data.deleted}${parts ? ` (${parts})` : ""}.`,
      );
      setTimeout(() => setFlash(null), 5000);
      startTransition(() => router.refresh());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <button
        type="button"
        onClick={() => startTransition(() => { void run(); })}
        disabled={submitting}
        className="admin-glow inline-flex items-center gap-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50 px-3 py-1.5 ring-1 ring-inset ring-rose-200 rounded-lg disabled:opacity-50"
        title="Delete demo + sandbox rows in this view. Users are kept."
      >
        <Trash2 size={12} />
        {submitting ? "Clearing…" : label}
      </button>
      {flash && (
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 ring-1 ring-inset ring-emerald-200 rounded-lg px-2 py-1">
          <CheckCircle2 size={11} /> {flash}
        </span>
      )}
      {error && (
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-700 bg-rose-50 ring-1 ring-inset ring-rose-200 rounded-lg px-2 py-1">
          <AlertTriangle size={11} /> {error}
        </span>
      )}
    </div>
  );
}
