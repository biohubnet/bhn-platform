"use client";

/**
 * Login-floater admin editor.
 *
 * Two parts stacked:
 *   1. The Gallery — editorial visual browse of the curated library
 *      (FLOATER_REGISTRY). Sits at the top because picking what to
 *      seat on /login is the primary task; the row editor below
 *      only matters once something is seated. Each card renders the
 *      ACTUAL React floater component at thumbnail scale so admins
 *      see exactly what will show up on /login. Click any card to
 *      add it to the active list. Already-active cards are dimmed
 *      and show "ACTIVE".
 *   2. Active rows — one per floater currently seated on the /login
 *      backdrop, below the gallery. Each row carries the
 *      fine-tuning inputs:
 *        • side: left | right
 *        • verticalPct: 0..100
 *        • size: optional px override
 *        • colorClass: optional Tailwind text-color class
 *        • swimClass: optional drift variant
 *
 * The gallery replaces what used to be a separate static
 * /floaters-showcase.html file — same editorial aesthetic, but now
 * each card is interactive and only shows floaters that can really
 * be added (i.e. the ones in the registry).
 *
 * Saves the full list back via POST /api/admin/login-floaters.
 * No drag reorder; ordering inside the array doesn't affect render
 * (each floater is positioned absolutely by side + verticalPct), so
 * reordering would be cosmetic. Reset button restores the default
 * 5-floater layout.
 */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Trash2, RotateCcw, Save, Loader2, AlertCircle, CheckCircle2, Check,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { FLOATER_REGISTRY, FLOATER_LIST, type FloaterDef } from "@/lib/login-floaters/registry";
import type { FloaterInstance } from "@/lib/login-floaters/types";

interface Props {
  initialFloaters: FloaterInstance[];
  swimClasses: string[];
}

export function LoginFloatersEditor({
  initialFloaters,
  swimClasses,
}: Props) {
  const router = useRouter();
  const [floaters, setFloaters] = useState<FloaterInstance[]>(initialFloaters);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [savedNote, setSavedNote] = useState<string | null>(null);

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
  function addFloater(reg: FloaterDef) {
    if (floaters.length >= 12) return;
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

  // ── Active editing surface (bottom) ───────────────────────────
  const usedIds = new Set(floaters.map((f) => f.id));

  // ── Gallery (top) — categorise the registry for editorial
  // section headers, in a stable order that matches the showcase
  // narrative arc (discovery → cell → omics → preclinical →
  // clinical → manufacturing → QC → regulatory → people).
  const CATEGORY_ORDER: FloaterDef["category"][] = [
    "Discovery",
    "Cell / Process",
    "Omics",
    "Preclinical",
    "Clinical",
    "Manufacturing",
    "QC Analytics",
    "QC Micro",
    "Regulatory",
    "Medical Affairs",
    "Commercial",
    "Patient & Academia",
  ];
  const grouped = CATEGORY_ORDER
    .map((cat) => ({
      category: cat,
      entries: FLOATER_LIST.filter((f) => f.category === cat),
    }))
    .filter((g) => g.entries.length > 0);

  return (
    <div className="space-y-4">
      {/* ── GALLERY ────────────────────────────────────────────────
          The visual picker sits at the TOP — picking what to seat
          on /login is the primary task. Replaces the standalone
          /floaters-showcase.html — admins see the actual React
          component animating on each card, grouped into editorial
          sections. Click any inactive card to add. The dark backdrop
          + thin hairline categorisation mirrors the showcase's
          editorial mood. */}
      <Card className="overflow-hidden p-0">
        <GalleryHeader count={floaters.length} />
        <div
          className="relative px-5 sm:px-8 py-8 sm:py-10"
          style={{
            background: "radial-gradient(900px 600px at 80% -10%, rgba(72,188,167,0.10), transparent 60%), radial-gradient(700px 500px at -10% 110%, rgba(56,140,200,0.12), transparent 60%), linear-gradient(180deg, #04080f 0%, #0a1623 100%)",
          }}
        >
          {grouped.map(({ category, entries }, sectionIdx) => (
            <section key={category} className={sectionIdx > 0 ? "mt-12" : ""}>
              <div className="mb-5">
                <p className="font-mono text-[10px] tracking-[0.4em] text-white/40">
                  {String(sectionIdx + 1).padStart(2, "0")}
                </p>
                <h3 className="mt-1 text-xl font-semibold text-white/95 tracking-tight">
                  {category}
                </h3>
                <div className="mt-2 h-px w-16 bg-gradient-to-r from-cyan-300/60 to-transparent" />
              </div>
              <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))" }}>
                {entries.map((reg) => {
                  const inUse = usedIds.has(reg.id);
                  const atCap = floaters.length >= 12 && !inUse;
                  return (
                    <button
                      key={reg.id}
                      type="button"
                      onClick={() => !inUse && !atCap && addFloater(reg)}
                      disabled={inUse || atCap}
                      className={
                        "group relative text-left rounded-2xl border p-3.5 transition-all backdrop-blur-md " +
                        (inUse
                          ? "border-emerald-400/30 bg-emerald-400/[0.06] cursor-not-allowed"
                          : atCap
                            ? "border-white/10 bg-white/[0.02] opacity-40 cursor-not-allowed"
                            : "border-white/10 bg-white/[0.04] hover:border-white/30 hover:bg-white/[0.07] hover:-translate-y-px")
                      }
                      title={inUse ? "Already on the login screen" : atCap ? "Floater cap reached (12)" : `Add ${reg.displayName} to the login screen`}
                    >
                      {/* Meta row — category eyebrow + ACTIVE/ADD chip */}
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[9px] font-bold tracking-[0.3em] uppercase text-white/55">
                          {reg.category}
                        </span>
                        {inUse ? (
                          <span className="inline-flex items-center gap-1 text-[9px] font-bold tracking-[0.18em] uppercase text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-400/30 bg-emerald-400/[0.08]">
                            <Check size={9} /> Active
                          </span>
                        ) : (
                          <span className="text-[9px] font-bold tracking-[0.18em] uppercase text-white/35 px-2 py-0.5 rounded-full border border-white/10 group-hover:text-white/70 group-hover:border-white/25 transition-colors">
                            Add
                          </span>
                        )}
                      </div>
                      <p className="text-[13px] font-semibold text-white/95 tracking-tight mb-1">
                        {reg.displayName}
                      </p>
                      {/* Stage — square frame containing the actual
                          floater component at its registered default
                          size. The component's own colour comes from
                          the parent's text-color class. */}
                      <div className={"mt-2 aspect-square flex items-center justify-center rounded-xl " + (reg.defaultColorClass)}
                        style={{ background: "radial-gradient(60% 60% at 50% 40%, rgba(72,188,167,0.05), transparent 70%)" }}
                      >
                        <reg.Component size={Math.min(reg.defaultSize, 160)} />
                      </div>
                      <p className="mt-3 text-center font-mono text-[10px] tracking-[0.18em] uppercase text-white/45">
                        {reg.defaultSize}px · default
                      </p>
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </Card>

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

      {/* Active rows — fine-tuning inputs for already-seated floaters. */}
      <div className="space-y-3">
        {floaters.length === 0 && (
          <Card className="px-5 py-8 text-center text-sm text-muted">
            No floaters active. Click any card in the gallery above to seat one, or hit{" "}
            <strong>Reset</strong> to restore the default 5.
          </Card>
        )}
        {floaters.map((f, idx) => {
          const reg = FLOATER_REGISTRY[f.id];
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

    </div>
  );
}

/** Editorial header rendered above the dark gallery body. Lives on
 *  the Card's normal surface so the contrast between admin chrome
 *  and the dark gallery interior is sharp. */
function GalleryHeader({ count }: { count: number }) {
  return (
    <div className="px-5 sm:px-8 py-5 border-b border-line bg-elevated/30">
      <p className="font-mono text-[10px] tracking-[0.4em] uppercase text-subtle">
        Library
      </p>
      <h2 className="mt-1 text-lg font-semibold text-fg tracking-tight">
        Floater gallery
      </h2>
      <p className="mt-1.5 text-[12px] text-muted max-w-[60ch]">
        Editorial browse of the curated library. Each card is the actual React
        component at thumbnail scale — exactly what shows up on{" "}
        <code className="font-mono text-fg bg-card-solid px-1.5 py-0.5 rounded text-[11px]">/login</code>.
        Click any inactive card to seat it on the login backdrop; already-active
        ones carry the <span className="text-emerald-700 font-semibold">Active</span> chip.
        Currently <span className="font-semibold text-fg">{count}</span> of 12 seats filled.
      </p>
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
