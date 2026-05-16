"use client";
/**
 * Consent + preferences panel for the AutoPipette feature.
 * Lives on /profile and on /profile/assist-history. Self-contained
 * client component — reads the GET /preferences endpoint on mount
 * and PATCHes on toggle.
 *
 * Default state is ON (the schema default for AssistPreferences
 * `consented` is true; a first-run notice banner in the dashboard
 * layout informs the user and offers one-click opt-out).
 */
import { useEffect, useState } from "react";
import { Loader2, Shield, AlertCircle, CheckCircle2 } from "lucide-react";
import Link from "next/link";

interface Prefs {
  consented: boolean;
  hintsDisabled: boolean;
  confidenceThreshold: number;
  suppressUntil: string | null;
}

export function AssistConsentPanel({
  /** Show the verbose first-run consent copy. */
  verbose = false,
}: {
  verbose?: boolean;
}) {
  const [prefs, setPrefs] = useState<Prefs | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/assist/preferences");
        if (!res.ok) throw new Error(await res.text());
        setPrefs(await res.json());
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function save(patch: Partial<Prefs> & { resetThreshold?: boolean }) {
    setSaving(Object.keys(patch)[0] ?? "save");
    setError(null);
    try {
      const res = await fetch("/api/assist/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j as { error?: string }).error ?? "Update failed");
      }
      setPrefs(await res.json());
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(null);
    }
  }

  if (loading) {
    return (
      <section className="rounded-2xl border border-line bg-card p-5 surface-shadow">
        <div className="inline-flex items-center gap-2 text-sm text-muted">
          <Loader2 size={14} className="animate-spin" /> Loading AutoPipette preferences…
        </div>
      </section>
    );
  }

  if (!prefs) {
    return (
      <section className="rounded-2xl border border-rose-200 bg-rose-50 p-5">
        <p className="text-sm text-rose-800 inline-flex items-center gap-1.5">
          <AlertCircle size={14} /> Couldn't load AutoPipette preferences. {error}
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-line bg-card p-5 surface-shadow space-y-4">
      <header className="flex items-start gap-3">
        <span className="w-9 h-9 rounded-xl bg-brand-50 text-brand-700 flex items-center justify-center shrink-0">
          <Shield size={15} />
        </span>
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-bold text-fg">AutoPipette</h2>
          <p className="text-xs text-muted leading-snug mt-0.5">
            BHN's AI lab partner. AutoPipette quietly watches how
            you use the platform and dispenses a single, precise
            hint when you look stuck. Default is ON so you don't
            have to discover the feature to benefit from it —
            turn it off here any time.
          </p>
        </div>
      </header>

      {verbose && (
        <div className="text-[11px] text-subtle leading-relaxed bg-elevated/40 rounded-lg p-3 space-y-1.5">
          <p>
            <strong className="text-fg">We capture</strong> page visits, click
            target labels (button text, not coordinates), dwell time, form
            focus/abandon, rage-clicks (≥3 same-target clicks in 1 second),
            client errors, and idle transitions.
          </p>
          <p>
            <strong className="text-fg">We never capture</strong> what you
            type, field values, screen recordings, raw HTML, mouse coordinates,
            or keystrokes.
          </p>
          <p>
            <strong className="text-fg">Retention.</strong> Raw events are
            kept 90 days, daily aggregates 12 months, weekly journey
            summaries 18 months. Everything is downloadable +{" "}
            <Link href="/profile/assist-history" className="underline">deletable</Link>{" "}
            from the audit page.
          </p>
        </div>
      )}

      {/* Consent master switch */}
      <Toggle
        label="AutoPipette — collect behaviour signals"
        help={
          prefs.consented
            ? "On. New clicks / dwell / errors / form events are being recorded; turn it off to stop new collection. Your existing history stays available for review + delete on the audit page."
            : "Off. Nothing new is being collected. Turn it back on whenever — the first-run notice won't re-appear."
        }
        checked={prefs.consented}
        busy={saving === "consented"}
        onChange={(v) => save({ consented: v })}
      />

      {/* Hint disable (only meaningful when consented) */}
      <Toggle
        label="Show me chip-style hints"
        help={
          prefs.hintsDisabled
            ? "Hints are silenced. Telemetry continues if consent is on."
            : "Hints appear in the bottom-right corner when the system is confident you'd benefit."
        }
        checked={!prefs.hintsDisabled}
        disabled={!prefs.consented}
        busy={saving === "hintsDisabled"}
        onChange={(v) => save({ hintsDisabled: !v })}
      />

      {/* Sensitivity */}
      <div className="border-t border-line pt-4 flex items-start gap-3 flex-wrap">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-fg">Hint sensitivity</p>
          <p className="text-[11px] text-muted leading-snug mt-0.5">
            Confidence threshold for surfacing a hint. Adjusted
            automatically based on your reactions (clicked / dismissed /
            ignored). Reset to bring it back to the platform default.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-xs font-mono tabular-nums text-fg">
            {(prefs.confidenceThreshold * 100).toFixed(0)}%
          </span>
          <button
            type="button"
            onClick={() => save({ resetThreshold: true })}
            disabled={saving === "resetThreshold"}
            className="text-xs font-bold text-muted hover:text-fg hover:bg-elevated px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
          >
            {saving === "resetThreshold" ? <Loader2 size={11} className="animate-spin inline" /> : "Reset"}
          </button>
        </div>
      </div>

      {/* Audit link */}
      <div className="border-t border-line pt-4">
        <Link
          href="/profile/assist-history"
          className="text-xs font-bold text-brand-700 hover:text-brand-800 inline-flex items-center gap-1"
        >
          See what's on file →
        </Link>
      </div>

      {error && (
        <p className="text-[11px] text-rose-700 inline-flex items-center gap-1.5">
          <AlertCircle size={11} /> {error}
        </p>
      )}
      {saving && (
        <p className="text-[11px] text-emerald-700 inline-flex items-center gap-1.5">
          <CheckCircle2 size={11} /> Saved.
        </p>
      )}
    </section>
  );
}

function Toggle({
  label, help, checked, disabled, busy, onChange,
}: {
  label: string;
  help: string;
  checked: boolean;
  disabled?: boolean;
  busy?: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label
      className={
        "flex items-start gap-3 " +
        (disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer")
      }
    >
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled || busy}
        onClick={() => !disabled && !busy && onChange(!checked)}
        className={
          "relative w-10 h-6 rounded-full ring-1 ring-inset transition-colors flex-shrink-0 mt-0.5 " +
          (checked ? "bg-brand-600 ring-brand-700" : "bg-elevated ring-line")
        }
      >
        <span
          className={
            "absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all " +
            (checked ? "left-[18px]" : "left-0.5")
          }
        />
      </button>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-fg">{label}</p>
        <p className="text-[11px] text-muted leading-snug mt-0.5">{help}</p>
      </div>
    </label>
  );
}
