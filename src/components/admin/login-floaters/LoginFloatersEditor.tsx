"use client";

/**
 * Login-floater admin editor.
 *
 * Renders the active list as editable rows + an "Add a floater"
 * panel that picks from the registry. Each row carries:
 *   • registry id (immutable — picked at add time)
 *   • side: left | right
 *   • verticalPct: 0..100
 *   • size: optional px override
 *   • colorClass: optional Tailwind text-color string
 *   • swimClass: optional drift variant
 *
 * Saves the full list back via POST /api/admin/login-floaters.
 * No drag reorder; ordering inside an array doesn't affect render
 * (each floater is positioned absolutely by side + verticalPct),
 * so reordering would be cosmetic. Reset button restores the
 * default 5-floater layout.
 */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Trash2, Plus, RotateCcw, Save, Loader2, AlertCircle, CheckCircle2,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import type { FloaterInstance } from "@/lib/login-floaters/types";

interface RegistryEntry {
  id: string;
  displayName: string;
  category: string;
  defaultSize: number;
  defaultColorClass: string;
}

interface Props {
  initialFloaters: FloaterInstance[];
  registry: RegistryEntry[];
  swimClasses: string[];
}

export function LoginFloatersEditor({
  initialFloaters,
  registry,
  swimClasses,
}: Props) {
  const router = useRouter();
  const [floaters, setFloaters] = useState<FloaterInstance[]>(initialFloaters);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [savedNote, setSavedNote] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  // Registry id → metadata, for quick label lookups in the rows.
  const registryById = new Map(registry.map((r) => [r.id, r]));

  function patchAt(idx: number, patch: Partial<FloaterInstance>) {
    setFloaters((cur) => cur.map((f, i) => (i === idx ? { ...f, ...patch } : f)));
  }
  function patchPositionAt(idx: number, patch: Partial<FloaterInstance["position"]>) {
    setFloaters((cur) =>
      cur.map((f, i) => (i === idx ? { ...f, position: { ...f.position, ...patch } } : f)),
    );
  }
  function removeAt(idx: number) {
    setFloaters((cur) => cur.filter((_, i) => i !== idx));
  }
  function addFloater(reg: RegistryEntry) {
    setFloaters((cur) => [
      ...cur,
      {
        id: reg.id,
        position: { side: "right", verticalPct: 50 },
        size: reg.defaultSize,
        colorClass: reg.defaultColorClass,
        swimClass: "lab-swim-slow",
      },
    ]);
    setPickerOpen(false);
  }

  async function save() {
    setError(null);
    setSavedNote(null);
    startTransition(async () => {
      try {
        const r = await fetch("/api/admin/login-floaters", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ floaters }),
        });
        const j = (await r.json().catch(() => ({}))) as {
          ok?: boolean;
          floaters?: FloaterInstance[];
          error?: string;
        };
        if (!r.ok || !j.ok) {
          setError(j.error ?? "Save failed.");
          return;
        }
        if (Array.isArray(j.floaters)) setFloaters(j.floaters);
        setSavedNote("Saved. Refresh /login to see the change.");
        router.refresh();
      } catch (e) {
        setError((e as Error).message);
      }
    });
  }
  async function reset() {
    if (!confirm("Reset login floaters to the default 5? Your customisations will be lost."))
      return;
    setError(null);
    setSavedNote(null);
    startTransition(async () => {
      try {
        const r = await fetch("/api/admin/login-floaters", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reset: true }),
        });
        const j = (await r.json().catch(() => ({}))) as {
          ok?: boolean;
          floaters?: FloaterInstance[];
          error?: string;
        };
        if (!r.ok || !j.ok) {
          setError(j.error ?? "Reset failed.");
          return;
        }
        if (Array.isArray(j.floaters)) setFloaters(j.floaters);
        setSavedNote("Reset to defaults.");
        router.refresh();
      } catch (e) {
        setError((e as Error).message);
      }
    });
  }

  // Registry entries grouped by category for the picker.
  const grouped = registry.reduce<Record<string, RegistryEntry[]>>((acc, r) => {
    (acc[r.category] ??= []).push(r);
    return acc;
  }, {});

  // IDs already in use — block adding the same floater twice
  // (defending against duplicates that would render in the same
  // absolute slot anyway).
  const usedIds = new Set(floaters.map((f) => f.id));

  return (
    <div className="space-y-4">
      {/* Status bar — save / reset / count + inline feedback. */}
      <Card className="px-5 py-3 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <p className="text-sm text-fg">
            <span className="font-semibold">{floaters.length}</span>{" "}
            {floaters.length === 1 ? "floater" : "floaters"} active
            <span className="text-muted"> · 12 max</span>
          </p>
          {savedNote && (
            <span className="inline-flex items-center gap-1 text-xs text-emerald-700">
              <CheckCircle2 size={12} /> {savedNote}
            </span>
          )}
          {error && (
            <span className="inline-flex items-center gap-1 text-xs text-rose-700">
              <AlertCircle size={12} /> {error}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={reset}
            disabled={pending}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-muted hover:text-fg border border-line disabled:opacity-50"
          >
            <RotateCcw size={12} /> Reset
          </button>
          <button
            type="button"
            onClick={save}
            disabled={pending}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-md text-xs font-bold bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {pending ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
            Save
          </button>
        </div>
      </Card>

      {/* Editable rows. Each row's left side shows the floater
          name + category; right side has side/vertical/size/color/
          swim inputs in a compact grid. Nothing fancy — text inputs
          + selects — but a 12-row table would feel cramped on a
          half-width column, so we use a stacked row layout. */}
      <div className="space-y-3">
        {floaters.length === 0 && (
          <Card className="px-5 py-8 text-center text-sm text-muted">
            No floaters active. Click <strong>Add a floater</strong> below to start, or hit{" "}
            <strong>Reset</strong> to restore the default 5.
          </Card>
        )}
        {floaters.map((f, idx) => {
          const reg = registryById.get(f.id);
          return (
            <Card key={`${f.id}-${idx}`} className="px-5 py-4">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-fg">
                    {reg?.displayName ?? f.id}
                  </p>
                  <p className="text-[11px] text-subtle mt-0.5">
                    {reg?.category ?? "unknown"} · id: <code className="font-mono">{f.id}</code>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => removeAt(idx)}
                  className="text-xs text-rose-700 hover:text-rose-900 inline-flex items-center gap-1"
                  title="Remove this floater"
                >
                  <Trash2 size={11} /> Remove
                </button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <Field label="Side">
                  <select
                    value={f.position.side}
                    onChange={(e) =>
                      patchPositionAt(idx, { side: e.target.value as "left" | "right" })
                    }
                    className="w-full bg-card-solid border border-line rounded-md px-2 py-1.5 text-xs"
                  >
                    <option value="left">Left</option>
                    <option value="right">Right</option>
                  </select>
                </Field>
                <Field label="Vertical %">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={f.position.verticalPct}
                    onChange={(e) =>
                      patchPositionAt(idx, { verticalPct: Number(e.target.value) })
                    }
                    className="w-full bg-card-solid border border-line rounded-md px-2 py-1.5 text-xs font-mono"
                  />
                </Field>
                <Field label="Size (px)">
                  <input
                    type="number"
                    min={50}
                    max={400}
                    value={f.size ?? reg?.defaultSize ?? 150}
                    onChange={(e) =>
                      patchAt(idx, { size: Number(e.target.value) })
                    }
                    className="w-full bg-card-solid border border-line rounded-md px-2 py-1.5 text-xs font-mono"
                  />
                </Field>
                <Field label="Color class">
                  <input
                    type="text"
                    value={f.colorClass ?? ""}
                    placeholder={reg?.defaultColorClass ?? "text-sky-300/28"}
                    onChange={(e) => patchAt(idx, { colorClass: e.target.value })}
                    className="w-full bg-card-solid border border-line rounded-md px-2 py-1.5 text-xs font-mono"
                  />
                </Field>
                <Field label="Drift variant">
                  <select
                    value={f.swimClass ?? "lab-swim-slow"}
                    onChange={(e) => patchAt(idx, { swimClass: e.target.value })}
                    className="w-full bg-card-solid border border-line rounded-md px-2 py-1.5 text-xs"
                  >
                    {swimClasses.map((s) => (
                      <option key={s} value={s}>
                        {s.replace(/^lab-swim-?/, "") || "default"}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Add picker — opens a panel of available registry entries
          grouped by category. Each one is a click-to-add button
          that appends a default-positioned instance. */}
      <Card className="px-5 py-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <p className="text-sm font-semibold text-fg">Add a floater</p>
            <p className="text-[11px] text-muted mt-0.5">
              Pick from the curated library. Already-active floaters are dimmed.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setPickerOpen((o) => !o)}
            disabled={floaters.length >= 12}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold border border-line hover:bg-elevated disabled:opacity-50"
          >
            <Plus size={12} /> {pickerOpen ? "Close picker" : "Open picker"}
          </button>
        </div>

        {pickerOpen && (
          <div className="mt-4 space-y-4">
            {Object.entries(grouped).map(([category, entries]) => (
              <div key={category}>
                <div className="flex items-center gap-2 mb-2">
                  <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-subtle">
                    {category}
                  </p>
                  <Badge tone="neutral">{entries.length}</Badge>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {entries.map((reg) => {
                    const inUse = usedIds.has(reg.id);
                    return (
                      <button
                        key={reg.id}
                        type="button"
                        onClick={() => !inUse && addFloater(reg)}
                        disabled={inUse}
                        className={
                          "text-left px-3 py-2 rounded-md border text-xs transition-colors " +
                          (inUse
                            ? "border-line bg-elevated/40 text-subtle cursor-not-allowed"
                            : "border-line bg-card-solid text-fg hover:border-brand-300 hover:bg-elevated/60")
                        }
                      >
                        <p className="font-semibold">{reg.displayName}</p>
                        <p className="text-[10px] text-subtle mt-0.5 font-mono">
                          {inUse ? "already active" : `default ${reg.defaultSize}px`}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[10px] uppercase tracking-[0.22em] font-semibold text-subtle">
        {label}
      </span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
