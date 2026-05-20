"use client";

/**
 * Admin batch toolbar + per-row checkbox for the talent-pool
 * eligibility gate.
 *
 * Renders TWO things, in tandem:
 *   • A sticky action toolbar that slides into view as soon as any
 *     row is selected. Two bulk actions:
 *       - Approve eligibility
 *       - Revoke eligibility
 *   • Per-row checkboxes (rendered by RowCheckbox below — admins
 *     drop one inside each talent-pool list item).
 *
 * Selection state lives in this component (one parent on the page)
 * and is shared with every RowCheckbox via a tiny context.
 *
 * After a successful batch, router.refresh() picks up the fresh
 * eligibility timestamps on the next render — no client-side state
 * juggling for the row's "Eligible" badge.
 */

import { createContext, useContext, useMemo, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2, XCircle, Loader2, AlertCircle, ChevronUp,
} from "lucide-react";

type EligibilityAction = "approve" | "revoke";

interface Ctx {
  selected: Set<string>;
  toggle: (id: string) => void;
}
const EligibilityCtx = createContext<Ctx | null>(null);

interface Props {
  /** Every submission id currently visible on the page — drives the
   *  "Select all" checkbox count. */
  allIds: string[];
  /** Body content (the list of submissions) — rendered between the
   *  toolbar and the footer. Each item should drop a `<RowCheckbox>`
   *  next to its title. */
  children: ReactNode;
}

export function EligibilityBatchToolbar({ allIds, children }: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const ctxValue = useMemo<Ctx>(() => ({
    selected,
    toggle: (id) => setSelected((cur) => {
      const next = new Set(cur);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    }),
  }), [selected]);

  const allSelected = selected.size > 0 && selected.size === allIds.length;
  const someSelected = selected.size > 0 && !allSelected;
  function selectAll() {
    setSelected(allSelected ? new Set() : new Set(allIds));
  }
  function clearSelection() { setSelected(new Set()); }

  async function run(action: EligibilityAction) {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    setError(null);
    setToast(null);
    startTransition(async () => {
      try {
        const r = await fetch("/api/admin/talent-pool/eligibility", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids, action }),
        });
        const j = (await r.json().catch(() => ({}))) as {
          ok?: boolean; affected?: number; error?: string;
        };
        if (!r.ok || !j.ok) {
          setError(j.error ?? "Batch action failed.");
          return;
        }
        const verb = action === "approve" ? "approved" : "revoked";
        setToast(`Eligibility ${verb} for ${j.affected ?? ids.length} submission${(j.affected ?? ids.length) === 1 ? "" : "s"}.`);
        clearSelection();
        router.refresh();
      } catch (e) {
        setError((e as Error).message);
      }
    });
  }

  return (
    <EligibilityCtx.Provider value={ctxValue}>
      {/* Header strip — explains the gate + offers "Select all". */}
      <div className="px-4 py-3 bg-elevated/40 border border-line rounded-xl flex items-center justify-between gap-3 flex-wrap">
        <label className="inline-flex items-center gap-2.5 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={allSelected}
            ref={(el) => { if (el) el.indeterminate = someSelected; }}
            onChange={selectAll}
            className="w-4 h-4 accent-brand-600 cursor-pointer"
          />
          <span className="text-xs font-mono uppercase tracking-[0.22em] font-bold text-fg-muted">
            {allSelected ? "All selected" : someSelected ? `${selected.size} of ${allIds.length}` : `Select all (${allIds.length})`}
          </span>
        </label>
        <p className="text-[11px] text-fg-muted max-w-[60ch]">
          <strong className="text-fg">Eligibility check</strong> — only submissions you mark eligible become visible to employers.
          Tick rows below, then Approve.
        </p>
      </div>

      {/* The sticky toolbar appears once any row is selected. */}
      {selected.size > 0 && (
        <div className="sticky top-2 z-30 mt-3">
          <div className="bg-fg text-bg rounded-xl shadow-lg ring-1 ring-fg/10 px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold tabular-nums">
                {selected.size} selected
              </span>
              <button
                type="button"
                onClick={clearSelection}
                className="text-xs opacity-70 hover:opacity-100 underline underline-offset-2"
              >
                Clear
              </button>
              {toast && (
                <span className="inline-flex items-center gap-1 text-xs text-emerald-300 opacity-90">
                  <CheckCircle2 size={12} /> {toast}
                </span>
              )}
              {error && (
                <span className="inline-flex items-center gap-1 text-xs text-rose-300">
                  <AlertCircle size={12} /> {error}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <BatchBtn icon={CheckCircle2} label="Approve eligibility" onClick={() => run("approve")} pending={pending} tone="emerald" />
              <BatchBtn icon={XCircle}      label="Revoke"              onClick={() => run("revoke")}  pending={pending} tone="rose" />
            </div>
          </div>
        </div>
      )}

      <div className="mt-3">{children}</div>

      <div className="mt-3 px-4 text-[11px] text-fg-subtle flex items-center justify-between flex-wrap gap-2">
        <span>
          <ChevronUp size={11} className="inline -mt-0.5" /> Toolbar appears once anything is selected.
          Approval is reversible — Revoke clears the flag.
        </span>
        <span className="font-mono uppercase tracking-[0.18em]">Audit-logged · admin / instructor</span>
      </div>
    </EligibilityCtx.Provider>
  );
}

/** Drop one of these inside each talent-pool list row. Reads the
 *  shared selection state from EligibilityCtx; no per-row state. */
export function RowCheckbox({ id, label }: { id: string; label?: string }) {
  const ctx = useContext(EligibilityCtx);
  if (!ctx) return null;
  const checked = ctx.selected.has(id);
  return (
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => { e.stopPropagation(); ctx.toggle(id); }}
      onClick={(e) => e.stopPropagation()}
      className="w-4 h-4 accent-brand-600 cursor-pointer shrink-0"
      aria-label={label ?? `Select submission ${id}`}
    />
  );
}

function BatchBtn({
  icon: Icon, label, onClick, pending, tone,
}: {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
  pending: boolean;
  tone: "emerald" | "rose";
}) {
  const toneCls = tone === "emerald"
    ? "hover:bg-emerald-500 hover:text-white"
    : "hover:bg-rose-600 hover:text-white";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      className={
        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold " +
        "bg-bg text-fg ring-1 ring-fg/15 transition-colors disabled:opacity-50 " +
        toneCls
      }
    >
      {pending ? <Loader2 size={12} className="animate-spin" /> : <Icon size={12} />}
      {label}
    </button>
  );
}
