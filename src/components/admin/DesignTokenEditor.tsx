"use client";

/**
 * The design-token editor.
 *
 * Edits are applied to document.documentElement immediately, so the
 * whole admin shell around the panel — its own cards, buttons and nav —
 * re-renders at the new values as the slider moves. That is the point:
 * a swatch strip would show you a rounded rectangle, whereas this shows
 * you the actual platform. Nothing is persisted until Save, and Revert
 * puts the live document back to what is stored.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { RotateCcw, Check, Loader2, AlertTriangle } from "lucide-react";
import {
  RADIUS_TOKENS, SPACING_TOKENS, ALL_TOKENS,
  type TokenOverrides, type TokenDef,
} from "@/lib/design-tokens/registry";
import { cn } from "@/lib/utils";

type Status = "idle" | "saving" | "saved" | "error";

export function DesignTokenEditor({ initial }: { initial: TokenOverrides }) {
  const [values, setValues] = useState<TokenOverrides>(initial);
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState<string | null>(null);
  // What is actually in the database, so Revert has something true to go
  // back to and the dirty check is against storage rather than mount.
  const saved = useRef<TokenOverrides>(initial);

  /** Push the working set onto the live document. */
  const apply = useCallback((next: TokenOverrides) => {
    const root = document.documentElement;
    for (const t of ALL_TOKENS) {
      const v = next[t.name];
      if (v === undefined) root.style.removeProperty(`--${t.name}`);
      else root.style.setProperty(`--${t.name}`, `${v}${t.unit}`);
    }
  }, []);

  useEffect(() => {
    apply(values);
    // Inline properties on <html> are a preview, not state. Strip them on
    // unmount so leaving the page without saving cannot leave the rest of
    // the admin area wearing values that were never stored.
    return () => {
      const root = document.documentElement;
      for (const t of ALL_TOKENS) root.style.removeProperty(`--${t.name}`);
    };
  }, [values, apply]);

  const dirty =
    ALL_TOKENS.some((t) => (values[t.name] ?? null) !== (saved.current[t.name] ?? null));

  function set(name: string, v: number) {
    setStatus("idle");
    setValues((prev) => ({ ...prev, [name]: v }));
  }

  /** Removing a key is not the same as setting the fallback: it hands the
   *  token back to whichever theme is active, which is what "use the
   *  theme's own value" has to mean on a platform with seventeen. */
  function clear(name: string) {
    setStatus("idle");
    setValues((prev) => {
      const next = { ...prev };
      delete next[name];
      return next;
    });
  }

  async function save() {
    setStatus("saving");
    setMessage(null);
    try {
      const res = await fetch("/api/admin/design-tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ overrides: values }),
      });
      if (!res.ok) throw new Error(`Save failed (${res.status})`);
      const data = (await res.json()) as { overrides: TokenOverrides };
      // Re-seed from the response, not from what was sent: the server
      // drops anything out of range, and this is where that becomes
      // visible rather than silently disagreeing with the database.
      saved.current = data.overrides;
      setValues(data.overrides);
      setStatus("saved");
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Could not save");
    }
  }

  function revert() {
    setStatus("idle");
    setMessage(null);
    setValues(saved.current);
  }

  return (
    <div className="space-y-6">
      <Group title="Corners" tokens={RADIUS_TOKENS} values={values} onSet={set} onClear={clear} />
      <Group title="Spacing" tokens={SPACING_TOKENS} values={values} onSet={set} onClear={clear} />

      <div className="flex flex-wrap items-center gap-3 border-t border-line pt-4">
        <button
          type="button"
          onClick={save}
          disabled={!dirty || status === "saving"}
          className={cn(
            "inline-flex items-center gap-2 rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white",
            "hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors",
          )}
        >
          {status === "saving" ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
          {status === "saving" ? "Saving…" : "Save for everyone"}
        </button>
        <button
          type="button"
          onClick={revert}
          disabled={!dirty}
          className={cn(
            "inline-flex items-center gap-2 rounded-md border border-line px-3 py-2 text-sm font-medium",
            "hover:bg-elevated disabled:opacity-50 disabled:cursor-not-allowed transition-colors",
          )}
        >
          <RotateCcw size={14} /> Revert
        </button>
        {status === "saved" && !dirty && (
          <span className="text-sm text-emerald-700 font-medium">Saved. Every page uses these now.</span>
        )}
        {status === "error" && (
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-rose-700">
            <AlertTriangle size={14} /> {message}
          </span>
        )}
        {dirty && status !== "error" && (
          <span className="text-sm text-fg-muted">
            Previewing — not saved yet. Everything on this page is already using these values.
          </span>
        )}
      </div>
    </div>
  );
}

function Group({
  title, tokens, values, onSet, onClear,
}: {
  title: string;
  tokens: readonly TokenDef[];
  values: TokenOverrides;
  onSet: (name: string, v: number) => void;
  onClear: (name: string) => void;
}) {
  return (
    <section>
      <h3 className="text-sm font-bold uppercase tracking-[0.14em] text-fg-muted mb-3">{title}</h3>
      <div className="space-y-3">
        {tokens.map((t) => {
          const overridden = values[t.name] !== undefined;
          const value = values[t.name] ?? t.fallback;
          return (
            <div key={t.name} className="rounded-lg border border-line bg-card p-3.5">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <label htmlFor={`tok-${t.name}`} className="text-sm font-semibold text-fg">
                  {t.label}
                </label>
                <code className="font-mono text-[11px] text-fg-muted">--{t.name}</code>
                <span className="ml-auto font-mono text-sm font-semibold tabular-nums text-fg">
                  {value}{t.unit}
                </span>
                {!overridden && (
                  <span className="text-[11px] font-medium text-fg-muted">theme default</span>
                )}
              </div>
              <p className="mt-1 text-[12.5px] text-fg-muted">{t.hint}</p>
              <div className="mt-2.5 flex items-center gap-3">
                <input
                  id={`tok-${t.name}`}
                  type="range"
                  min={t.min}
                  max={t.max}
                  step={t.step}
                  value={value}
                  onChange={(e) => onSet(t.name, Number(e.target.value))}
                  className="flex-1 accent-brand-600"
                />
                <button
                  type="button"
                  onClick={() => onClear(t.name)}
                  disabled={!overridden}
                  className={cn(
                    "shrink-0 rounded border border-line px-2 py-1 text-[11px] font-medium",
                    "hover:bg-elevated disabled:opacity-40 disabled:cursor-not-allowed transition-colors",
                  )}
                >
                  Use theme value
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
