"use client";

/**
 * Editor for an "html"-format script — content that keeps the original guide's
 * styling. The styled document renders in a sandboxed iframe (its own CSS,
 * scripts disabled); editing is done on the HTML source with a live preview.
 */
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, Code2, Save, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export function HtmlScriptEditor({
  scriptId,
  initialHtml,
  css,
}: {
  scriptId: string;
  initialHtml: string;
  css: string;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<"preview" | "source">("preview");
  const [html, setHtml] = useState(initialHtml);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const srcDoc = `<!doctype html><html><head><meta charset="utf-8"><style>${css}</style></head><body>${html}</body></html>`;

  async function save() {
    setSaving(true);
    setError(null);
    setSaved(null);
    try {
      const res = await fetch(`/api/workspace/scripts/${scriptId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format: "html", richContent: { kind: "html", html, css }, summary: "Edited script" }),
      });
      const j = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !j.ok) {
        setError(j.error ?? "Save failed.");
        return;
      }
      setSaved("Saved.");
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  const tabBtn = (key: "preview" | "source", icon: React.ReactNode, label: string) => (
    <button
      type="button"
      onClick={() => setTab(key)}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors",
        tab === key ? "bg-card-solid text-fg shadow-card-rest" : "text-muted hover:text-fg",
      )}
    >
      {icon} {label}
    </button>
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex items-center gap-1 rounded-lg bg-elevated/60 p-1">
          {tabBtn("preview", <Eye size={13} />, "Preview")}
          {tabBtn("source", <Code2 size={13} />, "HTML source")}
        </div>
        <div className="flex items-center gap-3">
          {saved && (
            <span className="inline-flex items-center gap-1 text-xs text-emerald-700">
              <CheckCircle2 size={12} /> {saved}
            </span>
          )}
          {error && (
            <span className="inline-flex items-center gap-1 text-xs text-rose-700">
              <AlertCircle size={12} /> {error}
            </span>
          )}
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="inline-flex items-center gap-1.5 rounded-md bg-brand-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} Save
          </button>
        </div>
      </div>

      {tab === "preview" ? (
        <div className="overflow-hidden rounded-xl border border-line bg-white">
          <iframe title="Script preview" sandbox="" className="h-[640px] w-full border-0 bg-white" srcDoc={srcDoc} />
        </div>
      ) : (
        <textarea
          value={html}
          spellCheck={false}
          onChange={(e) => setHtml(e.target.value)}
          className="min-h-[640px] w-full resize-y rounded-xl border border-line bg-card-solid px-3 py-2 font-mono text-xs leading-relaxed text-fg focus:outline-none focus:ring-2 focus:ring-brand-400"
        />
      )}

      <p className="text-[11px] text-muted">
        This script keeps the original guide&apos;s styling. Edit the HTML source — the preview updates live.
        Friendlier inline editing, comments, and shareable collaborative links arrive in the next updates.
      </p>
    </div>
  );
}
