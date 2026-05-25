"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles, Loader2, AlertCircle, Eraser, FlaskConical,
} from "lucide-react";

/**
 * Generic reusable demo seeder bar for employer portal pages.
 *
 * Mirrors DemoSeederBar's violet styling and two-step clear confirm,
 * but accepts a configurable endpoint and description so it can be
 * dropped into Templates, Talent Pool, or any other page that needs
 * its own seed/clear lifecycle.
 */
export interface EmployerEntityDemoBarProps {
  /** API route to POST (seed) and DELETE (clear) against. */
  endpoint: string;
  /** One-sentence explanation shown inside the bar. */
  description: string;
  /** Label for the seed button (default: "Seed demo data"). */
  seedLabel?: string;
  /** Whether the page already has at least one demo row.
   *  When true, shows "Add more" on the seed button and surfaces
   *  the Clear button. */
  hasExistingDemos: boolean;
  /** Singular noun used in the success toast — e.g. "demo template",
   *  "demo candidate". The component builds the plural by suffixing
   *  "s". MUST be a string, not a function: this component is a Client
   *  Component, and Next.js RSC forbids passing functions from Server
   *  Components across the boundary (it surfaces as the page-wide
   *  digest-only error). */
  entityNoun?: string;
}

export function EmployerEntityDemoBar({
  endpoint,
  description,
  seedLabel = "Seed demo data",
  hasExistingDemos,
  entityNoun = "demo row",
}: EmployerEntityDemoBarProps) {
  const router = useRouter();
  const [busy, setBusy] = useState<"seed" | "clear" | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  async function seed() {
    setBusy("seed");
    setMsg(null);
    setError(null);
    try {
      const res = await fetch(endpoint, { method: "POST" });
      const j = (await res.json().catch(() => ({}))) as Record<string, unknown> & {
        ok?: boolean;
        error?: string;
      };
      if (!res.ok || !j.ok) {
        setError((j.error as string | undefined) ?? "Seeding failed.");
        return;
      }
      const createdRaw = j.created;
      const created = typeof createdRaw === "number" ? createdRaw : null;
      setMsg(
        created != null
          ? `Created ${created} ${entityNoun}${created === 1 ? "" : "s"}.`
          : "Demo data seeded successfully.",
      );
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function clear() {
    setBusy("clear");
    setMsg(null);
    setError(null);
    setConfirmClear(false);
    try {
      const res = await fetch(endpoint, { method: "DELETE" });
      const j = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        deleted?: number;
        error?: string;
      };
      if (!res.ok || !j.ok) {
        setError(j.error ?? "Clear failed.");
        return;
      }
      setMsg(
        j.deleted === 0
          ? "Nothing to clear."
          : `Cleared ${j.deleted} demo item${j.deleted === 1 ? "" : "s"}.`,
      );
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="rounded-2xl border border-violet-200 bg-violet-50/60 px-4 py-3 mb-4 flex flex-wrap items-center gap-3">
      <span className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-violet-100 text-violet-700 shrink-0">
        <FlaskConical size={14} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-violet-900 leading-tight">
          Try things out with demo data
        </p>
        <p className="text-[11px] text-violet-800 leading-snug mt-0.5">
          {description} Use <em>Clear</em> to wipe them when you&apos;re done — your real
          data is never touched.
        </p>
        {msg && (
          <p className="text-[11px] text-emerald-700 mt-1">{msg}</p>
        )}
        {error && (
          <p className="text-[11px] text-rose-700 inline-flex items-center gap-1 mt-1">
            <AlertCircle size={11} /> {error}
          </p>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2 shrink-0">
        {/* Seed button */}
        <button
          type="button"
          onClick={seed}
          disabled={busy !== null}
          className="inline-flex items-center gap-1.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white text-xs font-bold px-3 py-2 rounded-lg shadow-sm shadow-violet-600/25 transition-colors"
        >
          {busy === "seed"
            ? <Loader2 size={12} className="animate-spin" />
            : <Sparkles size={12} />}
          {busy === "seed" ? "Seeding…" : hasExistingDemos ? "Add more" : seedLabel}
        </button>

        {/* Clear — two-step confirm, no window.confirm */}
        {hasExistingDemos && !confirmClear && (
          <button
            type="button"
            onClick={() => setConfirmClear(true)}
            disabled={busy !== null}
            className="inline-flex items-center gap-1.5 bg-card-solid hover:bg-rose-50 border border-line hover:border-rose-200 text-rose-800 text-xs font-bold px-3 py-2 rounded-lg transition-colors disabled:opacity-60"
          >
            <Eraser size={12} />
            Clear demo data
          </button>
        )}
        {confirmClear && (
          <>
            <span className="text-[11px] font-semibold text-rose-700 whitespace-nowrap">
              Remove all demo data?
            </span>
            <button
              type="button"
              onClick={clear}
              disabled={busy !== null}
              className="inline-flex items-center gap-1.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-60 text-white text-xs font-bold px-3 py-2 rounded-lg transition-colors"
            >
              {busy === "clear"
                ? <Loader2 size={12} className="animate-spin" />
                : <Eraser size={12} />}
              {busy === "clear" ? "Clearing…" : "Yes, remove"}
            </button>
            <button
              type="button"
              onClick={() => setConfirmClear(false)}
              disabled={busy !== null}
              className="text-xs text-muted hover:text-fg transition-colors px-1"
            >
              Cancel
            </button>
          </>
        )}
      </div>
    </section>
  );
}
