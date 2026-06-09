"use client";

/**
 * Editor for an "html"-format script — keeps the original guide's exact
 * styling, is directly editable, and adds structure + history tooling:
 *   • the styled document mounts in a Shadow DOM (isolated CSS, renders inline
 *     as normal page content — no iframe, no inner scrollbar) and is
 *     contentEditable, so you click in and type;
 *   • a sticky toolbar keeps Save in reach while scrolling;
 *   • a right sidebar has a Sections panel (add / move / remove the document's
 *     section blocks) and a History panel (who changed what + when, restore).
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Save, Loader2, CheckCircle2, AlertCircle, Code2, Pencil, History, ListTree,
  Plus, ChevronUp, ChevronDown, Trash2, RotateCcw, User as UserIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Revision {
  id: string;
  authorName: string;
  authorKind: string;
  summary: string;
  createdAt: string;
}

/** Remap document-level selectors to :host so body/:root styling applies
 *  inside the shadow tree (everything else matches as-is). */
function adaptCss(css: string): string {
  return css
    .replace(/:root\b/g, ":host")
    .replace(/(^|})(\s*)html\s*,\s*body\b/g, "$1$2:host")
    .replace(/(^|})(\s*)body\b/g, "$1$2:host")
    .replace(/(^|})(\s*)html\b/g, "$1$2:host");
}

function fmtWhen(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  } catch {
    return iso;
  }
}

/** Section blocks = the styled `.box` cards; fall back to the top-level
 *  section/article children of <main> if a script has no boxes. */
function findSections(root: HTMLElement): HTMLElement[] {
  const boxes = Array.from(root.querySelectorAll<HTMLElement>(".box"));
  if (boxes.length) return boxes;
  const main = root.querySelector("main") ?? root;
  return Array.from(main.children).filter((el) => el.tagName === "SECTION" || el.tagName === "ARTICLE") as HTMLElement[];
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
  const boxesRef = useRef<HTMLElement[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showSource, setShowSource] = useState(false);
  const [sourceHtml, setSourceHtml] = useState(initialHtml);
  const [tab, setTab] = useState<"sections" | "history">("sections");
  const [sections, setSections] = useState<{ heading: string }[]>([]);
  const [revisions, setRevisions] = useState<Revision[]>([]);
  const [revLoading, setRevLoading] = useState(false);

  const refreshSections = useCallback(() => {
    const root = contentRef.current;
    if (!root) return;
    const boxes = findSections(root);
    boxesRef.current = boxes;
    setSections(
      boxes.map((b) => ({
        heading: (b.querySelector("h1,h2,h3")?.textContent ?? "Untitled section").trim().slice(0, 70) || "Untitled section",
      })),
    );
  }, []);

  // Mount the styled, editable document into a shadow root once.
  useEffect(() => {
    const host = hostRef.current;
    if (!host || host.shadowRoot) return;
    const shadow = host.attachShadow({ mode: "open" });
    const style = document.createElement("style");
    style.textContent = `${adaptCss(css)}\n:host{display:block}\n:host main{max-width:100%}`;
    const content = document.createElement("div");
    content.innerHTML = initialHtml;
    content.contentEditable = "true";
    content.spellcheck = true;
    content.style.outline = "none";
    contentRef.current = content;
    shadow.append(style, content);
    refreshSections();
  }, [css, initialHtml, refreshSections]);

  const loadRevisions = useCallback(async () => {
    setRevLoading(true);
    try {
      const res = await fetch(`/api/workspace/scripts/${scriptId}/revisions`);
      const j = (await res.json().catch(() => ({}))) as { ok?: boolean; revisions?: Revision[] };
      if (j.ok && Array.isArray(j.revisions)) setRevisions(j.revisions);
    } finally {
      setRevLoading(false);
    }
  }, [scriptId]);

  useEffect(() => { loadRevisions(); }, [loadRevisions]);

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
      if (showSource && contentRef.current) {
        contentRef.current.innerHTML = sourceHtml;
        refreshSections();
      }
      setSaved("Saved.");
      loadRevisions();
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
      refreshSections();
    }
    setShowSource((s) => !s);
  }

  // ── Section structure ops (operate on the live shadow content) ──
  function moveSection(i: number, dir: -1 | 1) {
    const a = boxesRef.current[i];
    const b = boxesRef.current[i + dir];
    if (!a || !b || !b.parentNode) return;
    if (dir === -1) b.parentNode.insertBefore(a, b);
    else b.parentNode.insertBefore(a, b.nextSibling);
    refreshSections();
  }
  function removeSection(i: number) {
    const b = boxesRef.current[i];
    if (!b) return;
    if (!confirm("Remove this section?")) return;
    const parent = b.parentElement;
    b.remove();
    if (parent && parent.tagName === "SECTION" && parent.children.length === 0) parent.remove();
    refreshSections();
  }
  function addSection() {
    const root = contentRef.current;
    if (!root) return;
    const host = root.querySelector("main") ?? root;
    const sec = document.createElement("section");
    const art = document.createElement("article");
    art.className = "box";
    art.innerHTML = "<h2>New section</h2><p>Write here…</p>";
    sec.appendChild(art);
    host.appendChild(sec);
    refreshSections();
    art.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  async function restore(revId: string) {
    if (!confirm("Restore this version? The current content is replaced and saved as a new version.")) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/workspace/scripts/${scriptId}/revisions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restoreId: revId }),
      });
      const j = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; snapshot?: { richContent?: { html?: string } } };
      if (!res.ok || !j.ok) {
        setError(j.error ?? "Restore failed.");
        return;
      }
      const html = j.snapshot?.richContent?.html;
      if (typeof html === "string" && contentRef.current) {
        contentRef.current.innerHTML = html;
        setSourceHtml(html);
        refreshSections();
      }
      setSaved("Restored.");
      loadRevisions();
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  const miniBtn = "inline-flex h-6 w-6 items-center justify-center rounded text-muted hover:text-fg hover:bg-elevated disabled:opacity-30";

  return (
    <div className="space-y-3">
      {/* Sticky toolbar */}
      <div className="sticky top-0 z-30 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-card-solid px-3 py-2 shadow-card-rest">
        <span className="inline-flex items-center gap-1.5 text-xs text-muted">
          <Pencil size={12} /> Click in the document to edit — original styling preserved.
        </span>
        <div className="flex items-center gap-2.5">
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

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
        {/* Document (shadow DOM, editable inline). Kept mounted; hidden in source mode. */}
        <div className={cn("min-w-0", showSource && "hidden")}>
          <div ref={hostRef} />
        </div>
        {showSource && (
          <textarea
            value={sourceHtml}
            spellCheck={false}
            onChange={(e) => setSourceHtml(e.target.value)}
            className="min-h-[560px] w-full min-w-0 resize-y rounded-xl border border-line bg-card-solid px-3 py-2 font-mono text-xs leading-relaxed text-fg focus:outline-none focus:ring-2 focus:ring-brand-400"
          />
        )}

        {/* Right sidebar — Sections + History */}
        <aside className="self-start space-y-3 lg:sticky lg:top-16">
          <div className="grid grid-cols-2 gap-1 rounded-lg bg-elevated/60 p-1">
            <button
              type="button"
              onClick={() => setTab("sections")}
              className={cn(
                "inline-flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-semibold transition-colors",
                tab === "sections" ? "bg-card-solid text-fg shadow-card-rest" : "text-muted hover:text-fg",
              )}
            >
              <ListTree size={13} /> Sections
            </button>
            <button
              type="button"
              onClick={() => { setTab("history"); loadRevisions(); }}
              className={cn(
                "inline-flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-semibold transition-colors",
                tab === "history" ? "bg-card-solid text-fg shadow-card-rest" : "text-muted hover:text-fg",
              )}
            >
              <History size={13} /> History
            </button>
          </div>

          {tab === "sections" ? (
            <div className="rounded-xl border border-line bg-card-solid p-2">
              <div className="flex items-center justify-between px-1 py-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-subtle">Sections</span>
                <button type="button" onClick={addSection} className="inline-flex items-center gap-1 text-xs font-medium text-brand-700 hover:text-brand-900">
                  <Plus size={12} /> Add
                </button>
              </div>
              <ul className="space-y-0.5">
                {sections.map((s, i) => (
                  <li key={i} className="group flex items-center gap-0.5 rounded-md px-1.5 py-1 hover:bg-elevated">
                    <span className="flex-1 truncate text-xs text-fg" title={s.heading}>{s.heading}</span>
                    <button type="button" title="Move up" disabled={i === 0} onClick={() => moveSection(i, -1)} className={miniBtn}><ChevronUp size={13} /></button>
                    <button type="button" title="Move down" disabled={i === sections.length - 1} onClick={() => moveSection(i, 1)} className={miniBtn}><ChevronDown size={13} /></button>
                    <button type="button" title="Remove" onClick={() => removeSection(i)} className={cn(miniBtn, "hover:text-rose-700")}><Trash2 size={12} /></button>
                  </li>
                ))}
                {sections.length === 0 && <li className="px-2 py-2 text-[11px] text-muted">No sections detected.</li>}
              </ul>
              <p className="px-1.5 pt-1.5 text-[10px] leading-relaxed text-muted">Structure changes apply on Save.</p>
            </div>
          ) : (
            <div className="rounded-xl border border-line bg-card-solid p-2">
              <div className="flex items-center justify-between px-1 py-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-subtle">History</span>
                {revLoading && <Loader2 size={12} className="animate-spin text-muted" />}
              </div>
              <ul className="max-h-[58vh] space-y-0.5 overflow-y-auto">
                {revisions.map((r) => (
                  <li key={r.id} className="rounded-md px-1.5 py-1.5 hover:bg-elevated">
                    <div className="flex items-center gap-1.5">
                      <UserIcon size={11} className="shrink-0 text-muted" />
                      <span className="flex-1 truncate text-xs font-medium text-fg" title={r.authorName}>{r.authorName}</span>
                      {r.authorKind === "anon" && <span className="rounded bg-elevated px-1 text-[9px] uppercase tracking-wide text-subtle">guest</span>}
                      <button type="button" title="Restore this version" onClick={() => restore(r.id)} className={cn(miniBtn, "hover:text-brand-700")}><RotateCcw size={12} /></button>
                    </div>
                    <div className="mt-0.5 pl-[18px] text-[10px] text-muted">{fmtWhen(r.createdAt)}{r.summary ? ` · ${r.summary}` : ""}</div>
                  </li>
                ))}
                {!revLoading && revisions.length === 0 && (
                  <li className="px-2 py-2 text-[11px] text-muted">No saved versions yet. Hit Save to start the history.</li>
                )}
              </ul>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
