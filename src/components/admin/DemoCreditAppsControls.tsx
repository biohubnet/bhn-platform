"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Trash2, CheckCircle2, AlertTriangle } from "lucide-react";

/**
 * Combined seed + clear tray for the credit-applications admin page.
 *
 * The two buttons are paired deliberately: the seeder creates rows
 * attached to demo / sandbox account holders, and the Clear button
 * uses the existing /api/admin/clear-test-data endpoint with
 * entity="credit_application" — which targets the exact same rows.
 * Symmetry by design: whatever Seed inserts, Clear removes.
 *
 * Shipping this as one component (instead of two separate buttons
 * side-by-side) makes the relationship visible at a glance, gives
 * us one place to surface the success / error flash, and keeps the
 * page header from sprouting extra trays as we add more demo-data
 * affordances elsewhere.
 *
 * Marked .admin-glow at the tray level so the whole pair pulses
 * together — these are testing-only controls and the cyan halo is
 * how the platform consistently calls that out.
 */
export function DemoCreditAppsControls() {
  const router = useRouter();
  const [busy, setBusy] = useState<"seed" | "clear" | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function showFlash(msg: string) {
    setFlash(msg);
    setError(null);
    setTimeout(() => setFlash(null), 5000);
  }

  async function seed() {
    setBusy("seed");
    setError(null);
    setFlash(null);
    try {
      const res = await fetch("/api/admin/credit-applications/demo-seed", { method: "POST" });
      const j = (await res.json().catch(() => ({}))) as { error?: string; created?: number };
      if (!res.ok) {
        setError(j.error ?? "Couldn't seed demo applications.");
        return;
      }
      showFlash(`Seeded ${j.created ?? 0} demo application${j.created === 1 ? "" : "s"}.`);
      startTransition(() => router.refresh());
    } finally {
      setBusy(null);
    }
  }

  async function clear() {
    if (!confirm(
      "Delete every credit application from demo or sandbox accounts. " +
      "The accounts themselves stay. Phantoms have their own clear control."
    )) return;
    setBusy("clear");
    setError(null);
    setFlash(null);
    try {
      const res = await fetch("/api/admin/clear-test-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entity: "credit_application" }),
      });
      const j = (await res.json().catch(() => ({}))) as {
        error?: string; deleted?: number; byKind?: Record<string, number>;
      };
      if (!res.ok) {
        setError(j.error ?? "Couldn't clear applications.");
        return;
      }
      const parts = Object.entries(j.byKind ?? {}).map(([k, n]) => `${n} ${k}`).join(", ");
      showFlash(
        j.deleted === 0
          ? "Nothing to clear."
          : `Cleared ${j.deleted}${parts ? ` (${parts})` : ""}.`,
      );
      startTransition(() => router.refresh());
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="admin-glow rounded-xl border border-dashed border-amber-300 bg-amber-50/60 p-3 flex flex-wrap items-center gap-2 text-xs">
      <span className="text-[10px] uppercase tracking-[0.18em] font-bold text-amber-900">
        Admin · Demo data
      </span>
      <button
        type="button"
        onClick={() => startTransition(() => { void seed(); })}
        disabled={busy !== null}
        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-100 text-amber-900 ring-1 ring-inset ring-amber-300 hover:bg-amber-200 font-semibold disabled:opacity-50 transition-colors"
      >
        <Sparkles size={11} />
        {busy === "seed" ? "Seeding…" : "Seed demo applications"}
      </button>
      <button
        type="button"
        onClick={() => startTransition(() => { void clear(); })}
        disabled={busy !== null}
        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-rose-700 bg-rose-50 ring-1 ring-inset ring-rose-200 hover:bg-rose-100 font-semibold disabled:opacity-50 transition-colors"
      >
        <Trash2 size={11} />
        {busy === "clear" ? "Clearing…" : "Clear demo + sandbox"}
      </button>
      {flash && (
        <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 ring-1 ring-inset ring-emerald-200 rounded-md px-2 py-1 font-semibold">
          <CheckCircle2 size={11} /> {flash}
        </span>
      )}
      {error && (
        <span className="inline-flex items-center gap-1 text-rose-700 bg-rose-50 ring-1 ring-inset ring-rose-200 rounded-md px-2 py-1 font-semibold">
          <AlertTriangle size={11} /> {error}
        </span>
      )}
      <span className="ml-auto text-[10px] text-amber-800/80">
        Seed creates rows on demo / sandbox accounts so Clear can find them.
      </span>
    </div>
  );
}
