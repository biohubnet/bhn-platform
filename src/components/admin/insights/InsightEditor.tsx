"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Save, Megaphone, CheckCircle2, AlertTriangle, Loader2, Lightbulb,
} from "lucide-react";

/**
 * Period-note editor for /admin/insights.
 *
 * Two state-mutating actions:
 *   • Save (POST /api/admin/insights) — upsert by period; idempotent.
 *   • Publish to changelog (POST /api/admin/insights/publish) — flips
 *     `publishedToChangelogAt`, drops a ChangeLog row visible to ALL
 *     roles (the "what users told us" loop-closer).
 *
 * Local state is only the form fields; canonical state lives in
 * Prisma. router.refresh() pulls fresh server props after either
 * action so the page stays in sync with what's actually saved.
 */
export function InsightEditor({
  initialPeriod,
  initialBody,
  initialUpdatedAt,
  initialPublishedAt,
}: {
  initialPeriod: string;
  initialBody: string;
  initialUpdatedAt: string | null;
  initialPublishedAt: string | null;
}) {
  const router = useRouter();
  const [period, setPeriod] = useState(initialPeriod);
  const [body, setBody] = useState(initialBody);
  const [busy, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState(initialUpdatedAt);
  const [publishedAt, setPublishedAt] = useState(initialPublishedAt);

  function setFlashAuto(msg: string) {
    setFlash(msg);
    setTimeout(() => setFlash(null), 3500);
  }

  async function save() {
    setError(null);
    if (!body.trim()) {
      setError("Write something first — even a single observation is better than nothing.");
      return;
    }
    try {
      const res = await fetch("/api/admin/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ period: period.trim(), body: body.trim() }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        insight?: { updatedAt: string; publishedToChangelogAt: string | null };
      };
      if (!res.ok) throw new Error(data.error ?? "Save failed");
      if (data.insight) {
        setSavedAt(data.insight.updatedAt);
        setPublishedAt(data.insight.publishedToChangelogAt);
      }
      setFlashAuto("Saved.");
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function publish() {
    setError(null);
    try {
      const res = await fetch("/api/admin/insights/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ period: period.trim() }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        publishedToChangelogAt?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "Publish failed");
      if (data.publishedToChangelogAt) setPublishedAt(data.publishedToChangelogAt);
      setFlashAuto("Published to /changelog as 'What users told us'.");
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <section className="rounded-2xl border border-line bg-card p-5 surface-shadow">
      <header className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h2 className="text-sm font-bold text-fg inline-flex items-center gap-2">
            <Lightbulb size={14} className="text-brand-600" />
            Current period
          </h2>
          <p className="text-xs text-muted mt-1 max-w-md leading-snug">
            Read the signal feeds → write a 1–3 paragraph synthesis →
            optionally publish to the changelog so users hear back.
          </p>
        </div>
        <div className="text-right">
          {savedAt && (
            <p className="text-[10px] text-subtle">
              Last saved {new Date(savedAt).toLocaleString("en-CA", {
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
            </p>
          )}
          {publishedAt && (
            <p className="text-[10px] text-emerald-700 font-semibold mt-0.5">
              Published {new Date(publishedAt).toLocaleDateString("en-CA", {
                month: "short",
                day: "numeric",
              })}
            </p>
          )}
        </div>
      </header>

      <div className="space-y-3">
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-[0.18em] text-subtle mb-1">
            Period
          </label>
          <input
            type="text"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            disabled={busy}
            placeholder="2026-05 or release-262f39c"
            className="w-48 bg-card border border-line rounded-lg px-3 py-1.5 text-sm font-mono text-fg placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 disabled:opacity-60"
          />
          <p className="text-[11px] text-muted mt-1">
            Conventionally YYYY-MM. Each period stores exactly one synthesis row.
          </p>
        </div>

        <div>
          <label className="block text-[10px] font-bold uppercase tracking-[0.18em] text-subtle mb-1">
            What users told us
          </label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            disabled={busy}
            rows={10}
            placeholder={
              "Three observations from this period:\n\n" +
              "  1. ...\n  2. ...\n  3. ...\n\n" +
              "What we're going to do about it:\n\n  • ..."
            }
            className="w-full bg-card border border-line rounded-lg px-3 py-2 text-sm text-fg placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 disabled:opacity-60 resize-y leading-relaxed"
          />
          <p className="text-[11px] text-muted mt-1">
            Markdown supported. Aim for 100–400 words. Quote at least one
            signal source you reference — that's what makes synthesis defensible.
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-xl bg-rose-50 ring-1 ring-inset ring-rose-200 px-4 py-3 flex items-start gap-2 mt-4">
          <AlertTriangle size={14} className="text-rose-700 shrink-0 mt-0.5" />
          <p className="text-sm text-rose-900 leading-snug">{error}</p>
        </div>
      )}
      {flash && (
        <div className="rounded-xl bg-emerald-50 ring-1 ring-inset ring-emerald-200 px-4 py-3 flex items-start gap-2 mt-4">
          <CheckCircle2 size={14} className="text-emerald-700 shrink-0 mt-0.5" />
          <p className="text-sm text-emerald-900 leading-snug">{flash}</p>
        </div>
      )}

      <div className="flex flex-wrap gap-3 pt-4 mt-4 border-t border-line">
        <button
          type="button"
          disabled={busy}
          onClick={() => startTransition(() => { void save(); })}
          className="inline-flex items-center gap-2 rounded-xl bg-brand-600 text-white px-4 py-2 text-sm font-bold hover:bg-brand-700 disabled:opacity-50 shadow-md shadow-brand-600/25"
        >
          {busy ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          Save synthesis
        </button>
        <button
          type="button"
          disabled={busy || !savedAt}
          title={!savedAt ? "Save the synthesis first." : "Publish a 'What users told us' entry to /changelog visible to all users."}
          onClick={() => startTransition(() => { void publish(); })}
          className="admin-glow inline-flex items-center gap-2 rounded-xl bg-emerald-600 text-white px-4 py-2 text-sm font-bold hover:bg-emerald-700 disabled:opacity-50"
        >
          <Megaphone size={14} />
          {publishedAt ? "Re-publish" : "Publish to changelog"}
        </button>
      </div>
    </section>
  );
}
