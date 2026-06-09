"use client";

/**
 * Editor for an "html"-format script — keeps the original guide's exact
 * styling AND is directly editable. The styled document is mounted inside a
 * Shadow DOM: its stylesheet is fully isolated from the dashboard (no leaks
 * in or out), but it renders inline as normal page content — no iframe, no
 * internal scrollbar. The content is contentEditable, so you click into the
 * styled document and type. A Visual/HTML toggle exposes the raw source.
 */
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Save, Loader2, CheckCircle2, AlertCircle, Code2, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";

/** Remap document-level selectors to :host so body/:root styling still
 *  applies inside the shadow tree (everything else matches as-is). */
function adaptCss(css: string): string {
  return css
    .replace(/:root\b/g, ":host")
    .replace(/(^|})(\s*)html\s*,\s*body\b/g, "$1$2:host")
    .replace(/(^|})(\s*)body\b/g, "$1$2:host")
    .replace(/(^|})(\s*)html\b/g, "$1$2:host");
}

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
  const hostRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showSource, setShowSource] = useState(false);
  const [sourceHtml, setSourceHtml] = useState(initialHtml);

  // Mount the styled, editable document into a shadow root once.
  useEffect(() => {
    const host = hostRef.current;
    if (!host || host.shadowRoot) return;
    const shadow = host.attachShadow({ mode: "open" });
    const style = document.createElement("style");
    // ":host{display:block}" + a horizontal-overflow guard so the centred
    // 980px column never forces a sideways scrollbar inside the column.
    style.textContent = `${adaptCss(css)}\n:host{display:block}\n:host main{max-width:100%}`;
    const content = document.createElement("div");
    content.innerHTML = initialHtml;
    content.contentEditable = "true";
    content.spellcheck = true;
    content.style.outline = "none";
    contentRef.current = content;
    shadow.append(style, content);
  }, [css, initialHtml]);

  const currentHtml = () => contentRef.current?.innerHTML ?? sourceHtml;

  async function save() {
    setSaving(true);
    setError(null);
    setSaved(null);
    const html = showSource ? sourceHtml : currentHtml();
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
      if (showSource && contentRef.current) contentRef.current.innerHTML = sourceHtml;
      setSaved("Saved.");
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  function toggleSource() {
    if (!showSource) {
      setSourceHtml(currentHtml());
    } else if (contentRef.current) {
      contentRef.current.innerHTML = sourceHtml;
    }
    setShowSource((s) => !s);
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="inline-flex items-center gap-1.5 text-xs text-muted">
          <Pencil size={12} /> Click anywhere in the document to edit — it keeps the original styling.
        </span>
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
            onClick={toggleSource}
            className="inline-flex items-center gap-1.5 rounded-md border border-line bg-card-solid px-3 py-1.5 text-xs font-semibold text-fg hover:bg-elevated"
          >
            <Code2 size={13} /> {showSource ? "Visual" : "HTML"}
          </button>
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

      {/* Styled, editable document (shadow DOM) — flows inline, no iframe. */}
      <div ref={hostRef} className={cn(showSource && "hidden")} />

      {/* Raw HTML source */}
      {showSource && (
        <textarea
          value={sourceHtml}
          spellCheck={false}
          onChange={(e) => setSourceHtml(e.target.value)}
          className="min-h-[520px] w-full resize-y rounded-xl border border-line bg-card-solid px-3 py-2 font-mono text-xs leading-relaxed text-fg focus:outline-none focus:ring-2 focus:ring-brand-400"
        />
      )}
    </div>
  );
}
