"use client";

/**
 * SimPayloadEditor — JSON textarea + Save button for an existing
 * SimulationPayload.
 *
 * The textarea opens against the server-rendered pretty-printed
 * payload. On Save the client:
 *   1. JSON.parses locally — fails fast on syntax errors with a
 *      line/column hint when available.
 *   2. PUTs to /api/admin/simulations/[id] which re-validates via
 *      validatePayload() and writes the row.
 *   3. On success: re-pretty-prints from the saved payload so the
 *      editor stays in sync (in case the server normalised anything).
 *
 * A subtle "unsaved changes" indicator surfaces in the action bar
 * whenever the textarea diverges from the last-saved snapshot. Save
 * is disabled when there's nothing to save.
 */
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle, CheckCircle2, ExternalLink, Loader2, RotateCcw, Save,
} from "lucide-react";
import Link from "next/link";
import { TestAttemptButton } from "./TestAttemptButton";

interface Props {
  simulationId: string;
  /** Pretty-printed JSON, server-side. */
  initialJson: string;
}

export function SimPayloadEditor({ simulationId, initialJson }: Props) {
  const router = useRouter();
  const [savedJson, setSavedJson] = useState(initialJson);
  const [editorJson, setEditorJson] = useState(initialJson);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  const dirty = useMemo(
    () => editorJson.trim() !== savedJson.trim(),
    [editorJson, savedJson],
  );

  function revertToSaved() {
    setEditorJson(savedJson);
    setError(null);
    setFlash(null);
  }

  async function save() {
    setSaving(true);
    setError(null);
    setFlash(null);
    // 1. Local parse — surface syntax errors before round-tripping.
    let parsed: unknown;
    try {
      parsed = JSON.parse(editorJson);
    } catch (e) {
      setError(
        `JSON is invalid: ${
          e instanceof Error ? e.message : String(e)
        }. Nothing was saved.`,
      );
      setSaving(false);
      return;
    }
    try {
      const res = await fetch(`/api/admin/simulations/${simulationId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payload: parsed }),
      });
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(j.error ?? `Save failed (HTTP ${res.status}).`);
        return;
      }
      // Re-pretty-print from the parsed object so the editor stays in
      // sync with what's now on the server.
      const reset = JSON.stringify(parsed, null, 2);
      setSavedJson(reset);
      setEditorJson(reset);
      setFlash("Saved. New payload is live; refresh any open player tabs to pick it up.");
      // Revalidate the page (Meta strip etc.) without a hard reload.
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  const lineCount = editorJson.split("\n").length;

  return (
    <section className="rounded-2xl border border-line bg-card overflow-hidden">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-elevated/40 px-5 py-3">
        <div className="min-w-0">
          <h2 className="text-[13px] font-semibold text-fg">
            SimulationPayload (JSON)
          </h2>
          <p className="text-[11px] text-muted">
            Same validator the AI and hand-author paths run.{" "}
            <span className="text-fg-muted tabular-nums">{lineCount} lines</span>
            {dirty && (
              <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800 ring-1 ring-inset ring-amber-200">
                Unsaved changes
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <TestAttemptButton
            simulationId={simulationId}
            variant="secondary"
            disabled={dirty}
            disabledHint={dirty ? "Save your changes first — a test attempt runs the published payload." : undefined}
            label="Launch test attempt"
          />
          <button
            type="button"
            onClick={revertToSaved}
            disabled={!dirty || saving}
            className="inline-flex items-center gap-1.5 rounded-md bg-card text-fg ring-1 ring-inset ring-line px-3 py-2 text-[12px] font-semibold hover:bg-elevated disabled:opacity-40"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Revert
          </button>
          <button
            type="button"
            onClick={save}
            disabled={!dirty || saving}
            className="inline-flex items-center gap-1.5 rounded-md bg-brand-600 text-white px-4 py-2 text-[12.5px] font-semibold hover:bg-brand-700 disabled:opacity-40"
          >
            {saving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            Save payload
          </button>
        </div>
      </header>

      <div className="px-5 py-4 space-y-3">
        {error && (
          <div className="rounded-xl bg-rose-50 ring-1 ring-inset ring-rose-200 px-3 py-2 text-[12.5px] text-rose-800 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span className="whitespace-pre-wrap break-words">{error}</span>
          </div>
        )}
        {flash && (
          <div className="rounded-xl bg-emerald-50 ring-1 ring-inset ring-emerald-200 px-3.5 py-3 text-[12.5px] text-emerald-900 space-y-2.5">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{flash}</span>
            </div>
            <div className="pl-6">
              <TestAttemptButton
                simulationId={simulationId}
                variant="primary"
                label="Launch test attempt to verify"
              />
            </div>
          </div>
        )}
        <textarea
          value={editorJson}
          onChange={(e) => setEditorJson(e.target.value)}
          spellCheck={false}
          // Roughly 30 visible lines on desktop, scrolls for the rest.
          rows={30}
          className="w-full font-mono text-[11.5px] leading-[1.55] rounded-md border border-line bg-card-solid px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-brand-500 resize-y min-h-[420px] tab-size-2"
        />
        <p className="text-[11px] text-muted leading-relaxed">
          Stat keys must stay <span className="font-mono text-fg-muted">morale / vpTrust / velocity / crossFunc / capacity</span> for the runtime to render icons + weight the QBR score correctly. The validator accepts any strings, but the player won&apos;t.{" "}
          <Link
            href={`/api/admin/simulations/${simulationId}`}
            target="_blank"
            className="inline-flex items-center gap-0.5 text-brand-700 hover:underline"
          >
            Raw API <ExternalLink className="h-3 w-3" />
          </Link>
        </p>
      </div>
    </section>
  );
}
