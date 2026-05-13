"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Trash2 } from "lucide-react";

/**
 * Admin-only twin buttons on /events: seed three demo events (so the
 * calendar / upcoming list has interesting content for screenshots
 * and demos), or wipe every demo event back out (idempotent — fine
 * to spam).
 *
 * Hidden entirely from non-admin visitors. The endpoints themselves
 * enforce role gating too; this is just UI.
 */
export function DemoEventsControls() {
  const router = useRouter();
  const [busy, setBusy] = useState<"seed" | "clear" | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function seed() {
    setBusy("seed");
    setMsg(null);
    try {
      const res = await fetch("/api/admin/events/demo-seed", { method: "POST" });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg(j.error ?? "Couldn't seed demo events.");
        return;
      }
      setMsg(`Seeded ${j.created ?? 0} new, refreshed ${j.updated ?? 0}.`);
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  async function clear() {
    if (!window.confirm("Delete every demo event and their registrations? Real events aren't touched.")) return;
    setBusy("clear");
    setMsg(null);
    try {
      const res = await fetch("/api/admin/events/demo-seed", { method: "DELETE" });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg(j.error ?? "Couldn't clear demo events.");
        return;
      }
      setMsg(`Cleared ${j.deleted ?? 0} demo event${j.deleted === 1 ? "" : "s"}.`);
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="admin-glow rounded-xl border border-dashed border-amber-300 bg-amber-50/60 p-3 flex flex-wrap items-center gap-2 text-xs">
      <span className="text-[10px] uppercase tracking-[0.18em] font-bold text-amber-900">Admin · Demo data</span>
      <button
        type="button"
        onClick={seed}
        disabled={busy !== null}
        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-100 text-amber-900 ring-1 ring-inset ring-amber-300 hover:bg-amber-200 font-semibold disabled:opacity-50 transition-colors"
      >
        <Sparkles size={11} />
        {busy === "seed" ? "Seeding…" : "Seed demo events"}
      </button>
      <button
        type="button"
        onClick={clear}
        disabled={busy !== null}
        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-rose-700 bg-rose-50 ring-1 ring-inset ring-rose-200 hover:bg-rose-100 font-semibold disabled:opacity-50 transition-colors"
      >
        <Trash2 size={11} />
        {busy === "clear" ? "Clearing…" : "Clear demo events"}
      </button>
      {msg && <span className="text-amber-900">{msg}</span>}
      <span className="ml-auto text-[10px] text-amber-800/80">
        Demo events use the <code className="font-mono">demo-</code> slug prefix.
      </span>
    </div>
  );
}
