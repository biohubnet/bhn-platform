"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, AlertTriangle, CheckCircle2 } from "lucide-react";

/**
 * Admin-only inline action on /talent-pool: wipe demo + sandbox
 * talent-application submissions in one click so the list is back
 * to real candidates between testing rounds.
 *
 * Phantom + showcase are NOT included by default — phantoms have
 * their own dedicated lifecycle (daily cron + /admin/phantom-users
 * "Clear all"), and showcase is the single global persona we
 * deliberately keep alive across sessions. Admin can extend the
 * kinds list manually via the API if they need to.
 */
export function ClearTestApplicationsButton() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  async function run() {
    if (!confirm("Delete every demo + sandbox talent-application submission?\n\nThe sandbox / demo USERS themselves stay (they're reusable for other tests) — only their pool applications are removed. Phantom accounts have their own dedicated 'Clear all phantoms' control; they aren't touched by this button.")) {
      return;
    }
    setSubmitting(true); setError(null); setFlash(null);
    try {
      const res = await fetch("/api/admin/talent-pool/clear-test-applications", {
        method: "POST",
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        deleted?: number;
        byKind?: Record<string, number>;
      };
      if (!res.ok) throw new Error(data.error ?? "Clear failed");

      // Tally text — "5 demo, 2 sandbox" — based on what actually
      // got deleted, not what we asked to delete.
      const parts = Object.entries(data.byKind ?? {})
        .map(([k, n]) => `${n} ${k}`)
        .join(", ");
      setFlash(
        data.deleted === 0
          ? "No demo or sandbox applications to clear."
          : `Cleared ${data.deleted} application${data.deleted === 1 ? "" : "s"}${parts ? ` (${parts})` : ""}.`,
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
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50 px-3 py-1.5 ring-1 ring-inset ring-rose-200 rounded-lg disabled:opacity-50"
        title="Delete every talent-application submission from demo + sandbox accounts. Users are kept."
      >
        <Trash2 size={12} />
        {submitting ? "Clearing…" : "Clear demo + sandbox applications"}
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
