"use client";

/**
 * The design-system control panel.
 *
 * LAYOUT
 * Groups used to be tabs — only one visible at a time, so seeing a
 * change meant switching away from the controls that made it, and
 * finding out a control even existed meant clicking through six tabs
 * first. All six now sit open in one rail, always, ordered corners →
 * spacing → type → ink → brand → motion. A rail this long only stays
 * usable because each row is one line: name, control, value, reset —
 * the density that made a whole GROUP fit a screen now makes the whole
 * PANEL fit a scroll.
 *
 * A group can still be collapsed — long-lived familiarity with one
 * area (an admin who only ever touches Brand) shouldn't force six
 * groups of scrolling every visit — but open is the default and
 * nothing is hidden behind a click on first arrival.
 *
 * PREVIEW
 * Edits are applied to document.documentElement immediately, so the
 * admin shell around the panel — its own cards, buttons, nav — re-
 * renders at the new values as you drag. That answers "what does the
 * platform look like now", but not "what am I looking at" when the
 * affected element is scrolled off-screen. <PreviewPanel> answers
 * that: a standing sample — card, button, chip, type, ink, the brand
 * ramp — that stays in view beside the rail, built from the same
 * Tailwind utility classes the real platform uses, so it responds to
 * every group without a line of bespoke preview logic. Nothing here
 * is invented UI: every element shown is controlled by a token in this
 * panel. It does not include the sidebar's section colours (Engage /
 * Experience / etc.) — those are a separate, fixed palette in
 * Sidebar.tsx that this panel has no control over, and showing them
 * here would imply a slider changes something it does not touch.
 *
 * Nothing is persisted until Save, and the inline properties are
 * stripped on unmount so leaving without saving cannot leave the rest
 * of the admin area wearing values that were never stored.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { RotateCcw, Check, Loader2, AlertTriangle, ChevronDown, Heart } from "lucide-react";
import {
  CONTROLS, GROUPS, MANAGED, controlsFor, isValidColor,
  type Control, type ControlGroup, type TokenOverrides,
} from "@/lib/design-tokens/registry";
import { contrastRatio } from "@/lib/design-tokens/contrast";
import { cn } from "@/lib/utils";

type Status = "idle" | "saving" | "saved" | "error";

const RAMP_STEPS = [
  { step: "50",  cls: "bg-brand-50" },
  { step: "100", cls: "bg-brand-100" },
  { step: "200", cls: "bg-brand-200" },
  { step: "600", cls: "bg-brand-600" },
  { step: "700", cls: "bg-brand-700" },
] as const;

export function DesignTokenEditor({ initial }: { initial: TokenOverrides }) {
  const [values, setValues] = useState<TokenOverrides>(initial);
  // Every group open on arrival — a Set of the CLOSED ones, so the
  // default (nothing in it) means "show everything" with no per-group
  // bookkeeping on mount.
  const [closedGroups, setClosedGroups] = useState<Set<ControlGroup>>(new Set());
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const saved = useRef<TokenOverrides>(initial);

  /**
   * The saved-override stylesheet is switched OFF while this editor is
   * mounted, and everything is driven from inline properties on <html>
   * instead.
   *
   * Without that, clearing a control did not preview what it claimed to.
   * removeProperty() drops the inline value, but <style
   * id="design-token-overrides"> is still in the head, so the token fell
   * back to the SAVED override rather than to the theme — "Use theme
   * value" showed you the thing you were trying to get away from.
   * Disabling the sheet makes the fallback genuinely be the theme.
   */
  useEffect(() => {
    const sheet = document.getElementById("design-token-overrides") as HTMLStyleElement | null;
    const wasDisabled = sheet?.disabled ?? false;
    if (sheet) sheet.disabled = true;
    return () => { if (sheet) sheet.disabled = wasDisabled; };
  }, []);

  /**
   * The theme's own value for every managed token, captured once with
   * nothing of ours applied.
   *
   * Needed because "before" has two sources: a token the admin has saved
   * comes from `saved`, and a token they have not comes from whatever
   * theme is active — which lives only in CSS, so it has to be read off
   * a clean root rather than looked up. Captured synchronously in one
   * strip → read → restore pass: the browser cannot paint mid-task, so
   * nothing flashes, and it is idempotent under StrictMode's double
   * invoke because it restores exactly what it removed.
   */
  const [baseline, setBaseline] = useState<Record<string, string>>({});
  useEffect(() => {
    const root = document.documentElement;
    const held: [string, string][] = [];
    for (const name of MANAGED) {
      const inline = root.style.getPropertyValue(`--${name}`);
      if (inline !== "") { held.push([name, inline]); root.style.removeProperty(`--${name}`); }
    }
    const computed = getComputedStyle(root);
    const read: Record<string, string> = {};
    for (const name of MANAGED) read[name] = computed.getPropertyValue(`--${name}`).trim();
    // Never touch the whole style attribute — ThemeScript and other code
    // put things on <html> too. Restore only what we removed.
    for (const [name, v] of held) root.style.setProperty(`--${name}`, v);
    setBaseline(read);
    // Re-read if the theme changes underneath us, or every "before" would
    // keep showing the theme that happened to be active at mount.
    const mo = new MutationObserver(() => {
      const c = getComputedStyle(root);
      const next: Record<string, string> = {};
      for (const name of MANAGED) next[name] = c.getPropertyValue(`--${name}`).trim();
      setBaseline(next);
    });
    mo.observe(root, { attributes: true, attributeFilter: ["data-theme"] });
    return () => mo.disconnect();
  }, []);

  const apply = useCallback((next: TokenOverrides) => {
    const root = document.documentElement;
    for (const c of CONTROLS) {
      const v = next[c.name];
      if (v === undefined) root.style.removeProperty(`--${c.name}`);
      else root.style.setProperty(`--${c.name}`, c.kind === "size" ? `${v}${c.unit}` : String(v));
    }
  }, []);

  useEffect(() => {
    apply(values);
    // Inline properties are a preview, not state: strip them on unmount so
    // leaving without saving cannot leave the rest of the admin area
    // wearing values that were never stored.
    return () => {
      const root = document.documentElement;
      for (const name of MANAGED) root.style.removeProperty(`--${name}`);
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

  const touched = (g: ControlGroup) => controlsFor(g).filter((c) => values[c.name] !== undefined).length;
  const toggleGroup = (id: ControlGroup) => setClosedGroups((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_336px]">
      {/* LEFT — every group open, stacked, nothing behind a tab */}
      <div className="min-w-0">
        <div className="divide-y divide-line rounded-lg border border-line">
          {GROUPS.map((g) => {
            const isOpen = !closedGroups.has(g.id);
            const rows = controlsFor(g.id);
            const colours = rows.filter((c) => c.kind === "color");
            const others = rows.filter((c) => c.kind !== "color");
            const n = touched(g.id);
            return (
              <section key={g.id}>
                <button
                  type="button" onClick={() => toggleGroup(g.id)} aria-expanded={isOpen}
                  aria-controls={`group-${g.id}`} id={`group-${g.id}-h`}
                  className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left transition-colors hover:bg-elevated"
                >
                  <ChevronDown size={14} className={cn("shrink-0 text-subtle transition-transform", !isOpen && "-rotate-90")} />
                  <span className="text-[13px] font-bold text-fg">{g.label}</span>
                  {n > 0 && (
                    <span className="rounded-full bg-brand-600 px-1.5 text-[10px] font-bold tabular-nums text-white">{n}</span>
                  )}
                  <span className="ml-auto hidden text-[12px] text-muted sm:inline">{g.blurb}</span>
                </button>
                {isOpen && (
                  <div id={`group-${g.id}`} role="region" aria-labelledby={`group-${g.id}-h`} className="px-3.5 pb-3.5">
                    {others.length > 0 && (
                      <div className="divide-y divide-line rounded-md border border-line">
                        {others.map((c) => <Row key={c.name} c={c} values={values} onSet={set} onClear={clear} />)}
                      </div>
                    )}
                    {colours.length > 0 && (
                      <div className={cn("grid gap-2 sm:grid-cols-2", others.length > 0 && "mt-2")}>
                        {colours.map((c) => <Swatch key={c.name} c={c} values={values} onSet={set} onClear={clear} />)}
                      </div>
                    )}
                  </div>
                )}
              </section>
            );
          })}
        </div>

        {/* sticky so Save is reachable no matter how far down the rail you are */}
        <div className="sticky bottom-0 mt-4 flex flex-wrap items-center gap-3 rounded-lg border border-line bg-card/95 px-3.5 py-3 backdrop-blur">
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
          {dirty && status !== "error" && <span className="text-sm text-muted">Previewing — this page is already using these.</span>}
        </div>
      </div>

      {/* RIGHT — the mockup: standing, live, every group represented */}
      <aside className="lg:sticky lg:top-4">
        {dirty && <CompareRail baseline={baseline} saved={saved.current} />}
        <PreviewPanel />
      </aside>
    </div>
  );
}


/**
 * The compare rail — the same four miniatures drawn twice, once as
 * everyone currently sees them and once as your edits would leave them.
 *
 * <PreviewPanel> below answers "what does the platform look like now" —
 * it is always on screen. This answers a different question, "what did
 * I change", which after four or five adjustments is not the same one:
 * staring at the live preview alone, a moved slider and an unmoved one
 * can look identical if the eye does not have both states at once. This
 * is the only place they sit side by side.
 *
 * It appears only when something is dirty, above the standing preview —
 * a permanent second pane would cost real height to show two identical
 * copies of the same four things every visit.
 */
function beforeVars(baseline: Record<string, string>, saved: TokenOverrides): React.CSSProperties {
  const out: Record<string, string> = {};
  for (const name of MANAGED) {
    const c = CONTROLS.find((x) => x.name === name)!;
    const s = saved[name];
    // Every managed token is set explicitly. Leaving one out would let it
    // inherit the live edit from <html> and the "before" would silently
    // be part-after.
    out[`--${name}`] = s === undefined
      ? (baseline[name] ?? "")
      : (c.kind === "size" ? `${s}${c.unit}` : String(s));
  }
  return out as React.CSSProperties;
}

/** Miniatures chosen so that between them they consume every group:
 *  corners and ink (the card), type (the stack), brand and motion (the
 *  button), and the brand ramp. Spacing shows up in all of them. */
function Specimens() {
  return (
    <div className="flex items-center gap-3">
      <div className="rounded-lg border border-line bg-card-solid px-2.5 py-2">
        <div className="text-[11px] font-semibold text-fg">Card</div>
        <div className="mt-0.5 text-[10px] text-muted">Supporting line</div>
      </div>
      <div className="leading-snug">
        <div className="text-lg font-bold text-fg">Ag</div>
        <div className="text-xs text-muted">Type</div>
      </div>
      <span className="rounded-md bg-brand-600 px-2.5 py-1.5 text-[11px] font-semibold text-white transition-colors">
        Button
      </span>
      <div className="flex overflow-hidden rounded-sm">
        {RAMP_STEPS.map(({ step, cls }) => <span key={step} className={cn("h-5 w-4", cls)} />)}
      </div>
    </div>
  );
}

function CompareRail({ baseline, saved }: { baseline: Record<string, string>; saved: TokenOverrides }) {
  return (
    <div className="mb-4 overflow-hidden rounded-lg border border-line">
      <div className="grid grid-cols-2 divide-x divide-line">
        <div className="min-w-0 px-3 py-2">
          <p className="mb-1.5 text-[10.5px] font-bold uppercase tracking-[0.14em] text-subtle">
            Now — what everyone sees
          </p>
          {/* every managed property pinned, so this pane cannot pick up
              the live edit from <html> */}
          <div style={beforeVars(baseline, saved)}><Specimens /></div>
        </div>
        <div className="min-w-0 bg-elevated/40 px-3 py-2">
          <p className="mb-1.5 text-[10.5px] font-bold uppercase tracking-[0.14em] text-subtle">
            Your edits
          </p>
          {/* nothing pinned: inherits the preview already live on <html> */}
          <div><Specimens /></div>
        </div>
      </div>
    </div>
  );
}

/**
 * The standing mockup. Always visible, not gated on dirty — the request
 * this answers was "I want to see all the elements", not "show me a
 * diff", and that has to hold true the moment the page loads, before
 * anyone has touched a slider.
 *
 * Every element below is built from ordinary theme-token Tailwind
 * classes — bg-card, text-fg, bg-brand-600, rounded-lg — the same
 * classes the real platform uses, so it needs no bespoke preview
 * mechanism: the inline properties DesignTokenEditor already sets on
 * <html> reach it for free through the cascade, exactly like every
 * other card on this page. `transition-colors` on the button and chip
 * is what makes the Motion group visible here — Tailwind's transition
 * utilities read var(--default-transition-duration) and
 * var(--default-transition-timing-function) by default, so changing
 * those two sliders changes how this button's hover actually feels
 * without any extra wiring.
 *
 * Deliberately excluded: the sidebar's own section colours (Engage /
 * Experience / Equip / Admin). Those come from a fixed palette in
 * Sidebar.tsx that no control on this page touches — drawing them here
 * would claim a slider does something it does not.
 */
function PreviewPanel() {
  return (
    <div className="rounded-lg border border-line bg-card p-4">
      <p className="mb-3 text-[10.5px] font-bold uppercase tracking-[0.14em] text-subtle">
        Live mockup — every group, at once
      </p>

      {/* corners · spacing · ink · type */}
      <div className="rounded-lg border border-line bg-card-solid p-3.5">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-subtle">Sample course</p>
            <p className="mt-1 text-base font-bold leading-snug text-fg">Regulatory Affairs in Canada</p>
          </div>
          <Heart size={16} className="mt-0.5 shrink-0 text-subtle" />
        </div>
        <p className="mt-1.5 text-sm leading-relaxed text-muted">
          How professionals interpret regulations, prepare submissions and work with the authority.
        </p>
        <div className="mt-3 flex items-center gap-2">
          <span className="rounded-full bg-brand-50 px-2.5 py-1 text-[11px] font-semibold text-brand-700">
            Open
          </span>
          <span className="rounded-full bg-elevated px-2.5 py-1 text-[11px] font-semibold text-fg">
            1,500 credits
          </span>
        </div>
      </div>

      {/* brand + motion */}
      <button
        type="button"
        className="mt-3 w-full rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
      >
        Course info &amp; application
      </button>

      {/* brand ramp */}
      <div className="mt-3 flex overflow-hidden rounded-sm">
        {RAMP_STEPS.map(({ step, cls }) => (
          <span key={step} className={cn("h-6 flex-1", cls)} title={`brand-${step}`} />
        ))}
      </div>

      {/* type scale */}
      <div className="mt-3.5 space-y-1 border-t border-line pt-3">
        <p className="text-lg font-bold leading-snug text-fg">Heading</p>
        <p className="text-sm leading-relaxed text-muted">
          Body copy at the platform&rsquo;s current size and line height, long enough to show how
          it wraps.
        </p>
        <p className="text-xs text-subtle">Caption text</p>
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
        <span className="ml-2 hidden truncate text-[12px] text-muted lg:inline">{c.hint}</span>
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
                target === undefined ? "bg-elevated text-muted"
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
            "mt-0.5 w-full bg-transparent font-mono text-[11.5px] text-muted outline-none",
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
        disabled ? "cursor-default text-transparent" : "text-subtle hover:bg-elevated hover:text-fg",
      )}
    >
      <RotateCcw size={13} />
    </button>
  );
}
