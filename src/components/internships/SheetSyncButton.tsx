"use client";
/**
 * "Sync from sheet" on /internships (admins): pulls postings from the
 * host-company Google Sheet now. The daily maintenance cron does the
 * same once a day.
 */
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";

export function SheetSyncButton() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [note, setNote] = useState<string | null>(null);

  function sync() {
    start(async () => {
      try {
        const res = await fetch("/api/admin/internships/sheet-sync", { method: "POST" });
        const body: { synced?: number; closed?: number; error?: string } = await res.json().catch(() => ({}));
        if (!res.ok || body.error) return setNote(body.error ?? `Sync failed (HTTP ${res.status}).`);
        setNote(`${body.synced ?? 0} synced${body.closed ? `, ${body.closed} closed` : ""}`);
        router.refresh();
      } catch {
        setNote("Sync failed: no response.");
      }
    });
  }

  return (
    <span className="inline-flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={sync}
        disabled={pending}
        className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-brand-700 shadow-md hover:bg-brand-50 disabled:opacity-60 transition-colors"
      >
        <RefreshCw size={14} className={pending ? "animate-spin" : undefined} aria-hidden /> {pending ? "Syncing…" : "Sync from sheet"}
      </button>
      {note && <span role="status" className="rounded bg-white px-2 py-0.5 text-xs text-brand-700 shadow-sm">{note}</span>}
    </span>
  );
}
