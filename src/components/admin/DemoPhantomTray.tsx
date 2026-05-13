"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Ghost, Sparkles, Trash2, AlertTriangle, CheckCircle2, Wand2,
} from "lucide-react";

/**
 * Reusable "demo phantom" tray for admin pages.
 *
 * Pages where there's something interesting to demo — a queue, a
 * dashboard tile that lights up at a non-zero count — embed this
 * component so admins can spawn pre-seeded phantom users in one
 * click. After the demo, the same tray's "Clear all phantoms"
 * button wipes them.
 *
 * Each page tells the tray what scenarios to expose. A scenario =
 * { kind, options } where each option carries the targetId the
 * spawn endpoint will attach to every spawned phantom (e.g. a
 * specific Course id or Pathway id). Scenario "none" spawns plain
 * phantoms without any seeded state — useful for pages that just
 * need warm bodies (Manage users, registrations, etc.).
 */
export interface DemoScenario {
  kind: "none" | "course_enrollment_request" | "pathway_enrollment_request";
  label: string;
  /** Per-target picker. Required for the request scenarios. */
  options?: { id: string; label: string }[];
}

export function DemoPhantomTray({
  scenarios,
  defaultCount = 5,
  defaultRole = "trainee",
  contextLabel,
}: {
  scenarios: DemoScenario[];
  defaultCount?: number;
  defaultRole?: "trainee" | "evaluating" | "employer" | "instructor";
  /** Used in the panel header copy — e.g. "demoing enrollments". */
  contextLabel?: string;
}) {
  const router = useRouter();
  const [count, setCount] = useState(defaultCount);
  const [scenarioIdx, setScenarioIdx] = useState(0);
  const [targetId, setTargetId] = useState<string>(
    scenarios[0]?.options?.[0]?.id ?? "",
  );
  const [busy, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  const scenario = scenarios[scenarioIdx];

  function setFlashAuto(s: string) {
    setFlash(s);
    setTimeout(() => setFlash(null), 4500);
  }

  async function spawn() {
    setError(null);
    if (scenario.kind !== "none" && !targetId) {
      setError("Pick what they should request enrolment in.");
      return;
    }
    try {
      const body: Record<string, unknown> = { count, role: defaultRole };
      if (scenario.kind !== "none") {
        body.scenario = { kind: scenario.kind, targetId };
      }
      const res = await fetch("/api/admin/phantom-users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        phantoms?: { id: string; name: string }[];
      };
      if (!res.ok) throw new Error(data.error ?? "Spawn failed");
      const targetLabel = scenario.options?.find((o) => o.id === targetId)?.label;
      setFlashAuto(
        scenario.kind === "none"
          ? `Spawned ${data.phantoms?.length ?? count} phantom${count === 1 ? "" : "s"}.`
          : `Spawned ${data.phantoms?.length ?? count} phantom${count === 1 ? "" : "s"} requesting enrolment in ${targetLabel}.`,
      );
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function clearAll() {
    // No confirm — phantoms are throwaway test fixtures. The blast
    // radius (every page that uses phantoms) sounds dramatic but
    // every affected row is by definition demo-only, so spending an
    // extra click on each clear hurt the demo cadence more than it
    // protected anything.
    setError(null);
    try {
      const res = await fetch("/api/admin/phantom-users/clear-all", {
        method: "POST",
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string; deleted?: number; failed?: number;
      };
      if (!res.ok) throw new Error(data.error ?? "Clear failed");
      setFlashAuto(`Cleared ${data.deleted ?? 0} phantom${data.deleted === 1 ? "" : "s"}${data.failed ? `, ${data.failed} failed` : ""}.`);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <section className="admin-glow rounded-2xl border border-dashed border-amber-300 bg-amber-50/40 p-4 space-y-3">
      <header className="flex items-center justify-between gap-3 flex-wrap">
        <h3 className="text-sm font-bold text-amber-900 inline-flex items-center gap-2">
          <Wand2 size={14} />
          Demo controls
          {contextLabel && (
            <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-700/80">
              — {contextLabel}
            </span>
          )}
        </h3>
        <button
          type="button"
          onClick={() => startTransition(() => { void clearAll(); })}
          disabled={busy}
          className="inline-flex items-center gap-1 text-xs font-semibold text-rose-700 hover:bg-rose-50 px-2 py-1 rounded disabled:opacity-50"
          title="Delete every phantom user on the platform"
        >
          <Trash2 size={11} /> Clear all phantoms
        </button>
      </header>

      <p className="text-xs text-amber-900/80 leading-snug">
        Spawn pre-seeded test users so the dashboard / queue has something
        to show in a demo. Phantoms auto-delete after 24h or when you
        click <strong>Clear all phantoms</strong>. Use the{" "}
        <a href="/admin/phantom-users" className="underline hover:no-underline font-semibold">phantom users page</a> for advanced lifecycle control.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-[80px_1fr_1fr_auto] gap-2 items-end">
        <label className="block">
          <span className="block text-[10px] uppercase tracking-[0.16em] font-bold text-amber-900/80 mb-1">Count</span>
          <input
            type="number"
            min={1}
            max={20}
            value={count}
            onChange={(e) => setCount(Math.max(1, Math.min(20, Number(e.target.value) || 1)))}
            disabled={busy}
            className="w-full bg-card border border-line rounded-lg px-2 py-1.5 text-sm font-mono"
          />
        </label>

        <label className="block">
          <span className="block text-[10px] uppercase tracking-[0.16em] font-bold text-amber-900/80 mb-1">Scenario</span>
          <select
            value={scenarioIdx}
            onChange={(e) => {
              const next = Number(e.target.value);
              setScenarioIdx(next);
              setTargetId(scenarios[next]?.options?.[0]?.id ?? "");
            }}
            disabled={busy}
            className="w-full bg-card border border-line rounded-lg px-2 py-1.5 text-sm"
          >
            {scenarios.map((s, i) => (
              <option key={s.kind + i} value={i}>{s.label}</option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="block text-[10px] uppercase tracking-[0.16em] font-bold text-amber-900/80 mb-1">
            Target {scenario?.kind === "none" && "(n/a)"}
          </span>
          <select
            value={targetId}
            onChange={(e) => setTargetId(e.target.value)}
            disabled={busy || scenario?.kind === "none" || !scenario?.options?.length}
            className="w-full bg-card border border-line rounded-lg px-2 py-1.5 text-sm disabled:opacity-50"
          >
            {scenario?.options?.length === 0 ? (
              <option value="">(none available)</option>
            ) : (
              scenario?.options?.map((o) => (
                <option key={o.id} value={o.id}>{o.label}</option>
              ))
            )}
            {scenario?.kind === "none" && <option value="">—</option>}
          </select>
        </label>

        <button
          type="button"
          onClick={() => startTransition(() => { void spawn(); })}
          disabled={busy || (scenario?.kind !== "none" && !targetId)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 text-white px-3 py-1.5 text-sm font-bold hover:bg-amber-700 disabled:opacity-50"
        >
          <Sparkles size={12} /> Spawn
        </button>
      </div>

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

      <p className="text-[10px] text-amber-700/80 inline-flex items-center gap-1">
        <Ghost size={10} /> Phantom accounts are tagged <code className="font-mono">@bhn.test</code> — easy to spot in any list.
      </p>
    </section>
  );
}
