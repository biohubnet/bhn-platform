"use client";

/**
 * The design-system control panel.
 *
 * LAYOUT
 * Forty-odd controls will not fit as one card each, so nothing is a
 * card. Groups are tabs, and inside a group every control is a single
 * row about 34px tall: name, hint, the control itself, the value, and a
 * reset. Colours go two-up because a swatch needs width, not height.
 * The result is a whole group on one screen without scrolling, which is
 * what makes comparing steps in a ladder possible at all.
 *
 * PREVIEW
 * Edits are applied to document.documentElement immediately, so the
 * admin shell around the panel — its own cards, buttons, nav and this
 * table — re-renders at the new values as you drag. A swatch strip would
 * show you a rounded rectangle; this shows you the platform. Nothing is
 * persisted until Save, and the inline properties are stripped on
 * unmount so leaving without saving cannot leave the rest of the admin
 * area wearing values that were never stored.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { RotateCcw, Check, Loader2, AlertTriangle } from "lucide-react";
import {
  CONTROLS, GROUPS, controlsFor, isValidColor,
  type Control, type ControlGroup, type TokenOverrides,
} from "@/lib/design-tokens/registry";
import { contrastRatio } from "@/lib/design-tokens/contrast";
import { cn } from "@/lib/utils";

type Status = "idle" | "saving" | "saved" | "error";

export function DesignTokenEditor({ initial }: { initial: TokenOverrides }) {
  const [values, setValues] = useState<TokenOverrides>(initial);
  const [group, setGroup] = useState<ControlGroup>("corners");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const saved = useRef<TokenOverrides>(initial);

  const apply = useCallback((next: TokenOverrides) => {
    const root = document.documentElement;
    for (const c of CONTROLS) {
      const v = next[c.name];
      if (c.kind === "option") {
        const chosen = c.options.find((o) => o.value === v);
        for (const o of c.options) for (const k of Object.keys(o.writes)) root.style.removeProperty(`--${k}`);
        root.style.removeProperty(`--${c.name}`);
        if (chosen) {
          for (const [k, val] of Object.entries(chosen.writes)) root.style.setProperty(`--${k}`, val);
          if (Object.keys(chosen.writes).length === 0) root.style.setProperty(`--${c.name}`, String(v));
        }
        continue;
      }
      if (v === undefined) root.style.removeProperty(`--${c.name}`);
      else root.style.setProperty(`--${c.name}`, c.kind === "size" ? `${v}${c.unit}` : String(v));
    }
  }, []);

  useEffect(() => {
    apply(values);
    return () => {
      const root = document.documentElement;
      for (const c of CONTROLS) {
        root.style.removeProperty(`--${c.name}`);
        if (c.kind === "option") {
          for (const o of c.options) for (const k of Object.keys(o.writes)) root.style.removeProperty(`--${k}`);
        }
      }
    };
  }, [values, apply]);

  const dirty = CONTROLS.some((c) => (values[c.name] ?? null) !== (saved.current[c.name] ?? null));

  const set = (name: string, v: string | number) => {
    setStatus("idle");
    setValues((p) => ({ ...p, [name]: v }));
  };
  /** Removing the key hands the token back to the active theme, which is
   *  not the same as writing the fallback — the fallback is one theme's
   *  value and there are seventeen. */
  const clear = (name: string) => {
    setStatus("idle");
    setValues((p) => { const n = { ...p }; delete n[name]; return n; });
  };

  async function save() {
    setStatus("saving"); setMessage(null);
    try {
      const res = await fetch("/api/admin/design-tokens", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ overrides: values }),
      });
      if (!res.ok) throw new Error(`Save failed (${res.status})`);
      const data = (await res.json()) as { overrides: TokenOverrides };
      // Re-seed from the response: the server drops anything out of range,
      // and this is where that becomes visible rather than the form and the
      // database quietly disagreeing.
      saved.current = data.overrides;
      setValues(data.overrides);
      setStatus("saved");
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Could not save");
    }
  }

  const active = GROUPS.find((g) => g.id === group)!;
  const rows = controlsFor(group);
  const colours = rows.filter((c) => c.kind === "color");
  const others = rows.filter((c) => c.kind !== "color");
  const touched = (g: ControlGroup) => controlsFor(g).filter((c) => values[c.name] !== undefined).length;

  return (
    <div>
      {/* group tabs — horizontal so no vertical space is spent on navigation */}
      <div className="flex flex-wrap gap-1 border-b border-line pb-2">
        {GROUPS.map((g) => {
          const n = touched(g.id);
          return (
            <button
              key={g.id} type="button" onClick={() => setGroup(g.id)}
              aria-current={g.id === group}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[13px] font-semibold transition-colors",
                g.id === group ? "bg-fg text-bg" : "text-fg-muted hover:bg-elevated hover:text-fg",
              )}
            >
              {g.label}
              {n > 0 && (
                <span className={cn(
                  "rounded-full px-1.5 text-[10px] font-bold tabular-nums",
                  g.id === group ? "bg-bg/25" : "bg-brand-600 text-white",
                )}>{n}</span>
              )}
            </button>
          );
        })}
      </div>

      <p className="mt-2.5 text-[13px] leading-relaxed text-fg-muted">{active.blurb}</p>

      {others.length > 0 && (
        <div className="mt-3 divide-y divide-line rounded-lg border border-line">
          {others.map((c) => <Row key={c.name} c={c} values={values} onSet={set} onClear={clear} />)}
        </div>
      )}

      {colours.length > 0 && (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {colours.map((c) => <Swatch key={c.name} c={c} values={values} onSet={set} onClear={clear} />)}
        </div>
      )}

      {/* sticky so Save is reachable from any group without scrolling back */}
      <div className="sticky bottom-0 mt-4 flex flex-wrap items-center gap-3 border-t border-line bg-card/95 py-3 backdrop-blur">
        <button
          type="button" onClick={save} disabled={!dirty || status === "saving"}
          className="inline-flex items-center gap-2 rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {status === "saving" ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
          {status === "saving" ? "Saving…" : "Save for everyone"}
        </button>
        <button
          type="button" onClick={() => { setStatus("idle"); setMessage(null); setValues(saved.current); }}
          disabled={!dirty}
          className="inline-flex items-center gap-2 rounded-md border border-line px-3 py-2 text-sm font-medium transition-colors hover:bg-elevated disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RotateCcw size={14} /> Revert
        </button>
        {status === "saved" && !dirty && <span className="text-sm font-medium text-emerald-700">Saved. Every page uses these now.</span>}
        {status === "error" && <span className="inline-flex items-center gap-1.5 text-sm font-medium text-rose-700"><AlertTriangle size={14} /> {message}</span>}
        {dirty && status !== "error" && <span className="text-sm text-fg-muted">Previewing — this page is already using these.</span>}
      </div>
    </div>
  );
}

function Row({ c, values, onSet, onClear }: {
  c: Control; values: TokenOverrides;
  onSet: (n: string, v: string | number) => void; onClear: (n: string) => void;
}) {
  const overridden = values[c.name] !== undefined;
  return (
    <div className="flex items-center gap-3 px-3 py-1.5">
      <div className="min-w-0 flex-1">
        <span className="text-[13px] font-semibold text-fg">{c.label}</span>
        <span className="ml-2 hidden truncate text-[12px] text-fg-muted lg:inline">{c.hint}</span>
      </div>

      {c.kind === "size" ? (
        <>
          <input
            type="range" min={c.min} max={c.max} step={c.step}
            value={Number(values[c.name] ?? c.fallback)}
            onChange={(e) => onSet(c.name, Number(e.target.value))}
            aria-label={c.label}
            className="w-32 shrink-0 accent-brand-600 sm:w-44"
          />
          <span className="w-16 shrink-0 text-right font-mono text-[12px] font-semibold tabular-nums text-fg">
            {values[c.name] ?? c.fallback}{c.unit}
          </span>
        </>
      ) : c.kind === "option" ? (
        <select
          value={String(values[c.name] ?? c.fallback)}
          onChange={(e) => onSet(c.name, e.target.value)}
          aria-label={c.label}
          className="shrink-0 rounded border border-line bg-card-solid px-2 py-1 text-[12.5px] text-fg"
        >
          {c.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      ) : null}

      <ResetDot onClick={() => onClear(c.name)} disabled={!overridden} />
    </div>
  );
}

function Swatch({ c, values, onSet, onClear }: {
  c: Control; values: TokenOverrides;
  onSet: (n: string, v: string | number) => void; onClear: (n: string) => void;
}) {
  if (c.kind !== "color") return null;
  const overridden = values[c.name] !== undefined;
  const value = String(values[c.name] ?? c.fallback);

  // Compare against the live value of whatever this colour is read on,
  // so the ratio reflects the edit in progress rather than the shipped
  // default. `against` may be another token or a literal like #ffffff.
  const againstRaw = c.against
    ? (String(values[c.against] ?? c.against))
    : null;
  const againstVal = againstRaw !== null && !isValidColor(againstRaw)
    ? String(values[c.against!] ?? (CONTROLS.find((x) => x.name === c.against) as { fallback?: string } | undefined)?.fallback ?? "")
    : againstRaw;
  const ratio = againstVal ? contrastRatio(value, againstVal) : null;
  // A control with no declared target gets an informational readout, not
  // a verdict. Painting a decorative divider red for "failing" a bar it
  // was never held to teaches the wrong standard.
  const target = c.ratio;
  const fails = target !== undefined && ratio !== null && ratio < target;

  // A native colour input cannot express alpha, so translucent tokens
  // (--line) get a text field instead of silently losing it.
  const hexable = /^#/.test(value);

  return (
    <div className="flex items-center gap-2.5 rounded-lg border border-line px-2.5 py-2">
      <label className="relative shrink-0 cursor-pointer" aria-label={c.label}>
        <span
          className="block h-8 w-8 rounded border border-line-strong"
          style={{ background: value }}
        />
        {hexable && (
          <input
            type="color" value={value.slice(0, 7)}
            onChange={(e) => onSet(c.name, e.target.value)}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          />
        )}
      </label>

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="truncate text-[13px] font-semibold text-fg">{c.label}</span>
          {ratio !== null && (
            <span
              title={
                target === undefined
                  ? `Contrast against ${c.against}. No minimum — this is a decorative divider.`
                  : `Contrast against ${c.against}. Target ${target}:1.`
              }
              className={cn(
                "shrink-0 rounded px-1.5 text-[10.5px] font-bold tabular-nums",
                target === undefined ? "bg-elevated text-fg-muted"
                : fails ? "bg-rose-100 text-rose-800"
                : "bg-emerald-100 text-emerald-800",
              )}
            >
              {ratio.toFixed(2)}:1{fails ? " ✕" : ""}
            </span>
          )}
        </div>
        <input
          type="text" value={value}
          onChange={(e) => { const v = e.target.value; if (isValidColor(v)) onSet(c.name, v); else onSet(c.name, v); }}
          aria-label={`${c.label} value`}
          spellCheck={false}
          className={cn(
            "mt-0.5 w-full bg-transparent font-mono text-[11.5px] text-fg-muted outline-none",
            !isValidColor(value) && "text-rose-700",
          )}
        />
      </div>

      <ResetDot onClick={() => onClear(c.name)} disabled={!overridden} />
    </div>
  );
}

/** Reset affordance, sized to the row rather than the sentence. Present
 *  but inert when a control is still on its theme value, so the rows do
 *  not reflow as things are touched. */
function ResetDot({ onClick, disabled }: { onClick: () => void; disabled: boolean }) {
  return (
    <button
      type="button" onClick={onClick} disabled={disabled}
      title={disabled ? "Using the theme's own value" : "Hand this back to the theme"}
      aria-label={disabled ? "Using the theme's own value" : "Reset to the theme's value"}
      className={cn(
        "shrink-0 rounded p-1 transition-colors",
        disabled ? "cursor-default text-transparent" : "text-fg-subtle hover:bg-elevated hover:text-fg",
      )}
    >
      <RotateCcw size={13} />
    </button>
  );
}
