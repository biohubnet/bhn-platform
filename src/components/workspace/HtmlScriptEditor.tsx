"use client";

/**
 * Editor for an "html"-format script. Keeps the original guide's exact styling
 * (mounted in a Shadow DOM — isolated CSS, renders inline, no iframe), is
 * directly editable (contentEditable), and adds:
 *   • a sticky toolbar (Save always in reach) with live presence avatars;
 *   • near-real-time collaboration: a ~2s heartbeat reports who's here and
 *     which section each person's caret is in; everyone's active/recent
 *     sections are outlined + tinted in that person's colour (overlaid via a
 *     shadow-DOM <style>, so nothing is written into the saved content);
 *   • a right sidebar: Sections (add / move / remove) and History (who/when +
 *     restore).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Save, Loader2, CheckCircle2, AlertCircle, Code2, Pencil, History, ListTree,
  Plus, ChevronUp, ChevronDown, Trash2, RotateCcw, User as UserIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { colorForKey, type PresencePeer } from "@/lib/scripts/presence";

interface Revision {
  id: string;
  authorName: string;
  authorKind: string;
  summary: string;
  createdAt: string;
}

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

function findSections(root: HTMLElement): HTMLElement[] {
  const boxes = Array.from(root.querySelectorAll<HTMLElement>(".box"));
  if (boxes.length) return boxes;
  const main = root.querySelector("main") ?? root;
  return Array.from(main.children).filter((el) => el.tagName === "SECTION" || el.tagName === "ARTICLE") as HTMLElement[];
}

const uniqueSid = () => "x" + Math.random().toString(36).slice(2, 8);
const initials = (name: string) =>
  name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("") || "?";
const cssStr = (s: string) => s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');

export function HtmlScriptEditor({
  scriptId,
  initialHtml,
  css,
  meId,
  meName,
}: {
  scriptId: string;
  initialHtml: string;
  css: string;
  meId: string;
  meName: string;
}) {
  const router = useRouter();
  const myColor = useMemo(() => colorForKey(meId), [meId]);

  const hostRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const presenceStyleRef = useRef<HTMLStyleElement | null>(null);
  const boxesRef = useRef<HTMLElement[]>([]);
  const activeSidRef = useRef<string | null>(null);
  const recentRef = useRef<Map<string, number>>(new Map());
  const peersKeyRef = useRef<string>("");

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showSource, setShowSource] = useState(false);
  const [sourceHtml, setSourceHtml] = useState(initialHtml);
  const [tab, setTab] = useState<"sections" | "history">("sections");
  const [sections, setSections] = useState<{ heading: string }[]>([]);
  const [revisions, setRevisions] = useState<Revision[]>([]);
  const [revLoading, setRevLoading] = useState(false);
  const [peers, setPeers] = useState<PresencePeer[]>([]);

  const refreshSections = useCallback(() => {
    const root = contentRef.current;
    if (!root) return;
    const boxes = findSections(root);
    boxes.forEach((b) => { if (!b.getAttribute("data-sid")) b.setAttribute("data-sid", uniqueSid()); });
    boxesRef.current = boxes;
    setSections(boxes.map((b) => ({
      heading: (b.querySelector("h1,h2,h3")?.textContent ?? "Untitled section").trim().slice(0, 70) || "Untitled section",
    })));
  }, []);

  // Mount the styled, editable document into a shadow root once + wire caret
  // tracking for presence.
  useEffect(() => {
    const host = hostRef.current;
    if (!host || host.shadowRoot) return;
    const shadow = host.attachShadow({ mode: "open" });

    const style = document.createElement("style");
    style.textContent = `${adaptCss(css)}\n:host{display:block}\n:host main{max-width:100%}`;
    const presenceStyle = document.createElement("style");
    presenceStyleRef.current = presenceStyle;

    const content = document.createElement("div");
    content.innerHTML = initialHtml;
    content.contentEditable = "true";
    content.spellcheck = true;
    content.style.outline = "none";
    contentRef.current = content;
    shadow.append(style, presenceStyle, content);

    // Deterministic ids for the initial sections (so every client agrees).
    findSections(content).forEach((b, i) => { if (!b.getAttribute("data-sid")) b.setAttribute("data-sid", `s${i}`); });
    refreshSections();

    const sidOf = (node: Node | null): string | null => {
      const el = node && node.nodeType === 1 ? (node as Element) : node?.parentElement ?? null;
      return (el?.closest?.("[data-sid]") as HTMLElement | null)?.getAttribute("data-sid") ?? null;
    };
    const updateActive = () => {
      const s = shadow as unknown as { getSelection?: () => Selection | null };
      const sel = typeof s.getSelection === "function" ? s.getSelection() : window.getSelection();
      const node = sel?.anchorNode ?? null;
      if (node && content.contains(node)) activeSidRef.current = sidOf(node);
    };
    const onSel = () => updateActive();
    const onInput = () => {
      updateActive();
      const sid = activeSidRef.current;
      if (sid) recentRef.current.set(sid, Date.now());
    };
    content.addEventListener("keyup", onSel);
    content.addEventListener("mouseup", onSel);
    content.addEventListener("focusin", onSel);
    content.addEventListener("input", onInput);
  }, [css, initialHtml, refreshSections]);

  // ── Presence heartbeat (~2s): report me + activeSid + recent, get peers. ──
  useEffect(() => {
    let cancelled = false;
    async function beat() {
      const now = Date.now();
      const recent: string[] = [];
      for (const [sid, t] of recentRef.current) {
        if (now - t < 30_000) recent.push(sid);
        else recentRef.current.delete(sid);
      }
      try {
        const res = await fetch(`/api/workspace/scripts/${scriptId}/presence`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ editorKey: meId, name: meName, color: myColor, activeSid: activeSidRef.current, recentSids: recent }),
        });
        const j = (await res.json().catch(() => ({}))) as { ok?: boolean; peers?: PresencePeer[] };
        if (!cancelled && j.ok && Array.isArray(j.peers)) {
          // Only re-render when presence actually changes — avoids a needless
          // 2s re-render churn (and any flicker) while someone is typing.
          const key = JSON.stringify(j.peers);
          if (key !== peersKeyRef.current) {
            peersKeyRef.current = key;
            setPeers(j.peers);
          }
        }
      } catch { /* ignore — presence is best-effort */ }
    }
    beat();
    const iv = setInterval(beat, 2000);
    return () => { cancelled = true; clearInterval(iv); };
  }, [scriptId, meId, meName, myColor]);

  // ── Paint peer highlights into the shadow <style> whenever peers change. ──
  useEffect(() => {
    const ps = presenceStyleRef.current;
    if (!ps) return;
    // One indicator per section (deterministic, peers are stably ordered) so a
    // shared section never flips its colour/name between collaborators.
    let out = "";
    const seen = new Set<string>();
    for (const p of peers) {
      if (p.activeSid && !seen.has(p.activeSid)) {
        seen.add(p.activeSid);
        const c = p.color;
        out += `[data-sid="${p.activeSid}"]{outline:2px solid ${c};outline-offset:2px;border-radius:6px;position:relative}`;
        out += `[data-sid="${p.activeSid}"]::after{content:"${cssStr(p.name)}";position:absolute;top:-0.85em;right:8px;background:${c};color:#fff;font:600 10px/1.5 ui-sans-serif,system-ui,sans-serif;padding:0 6px;border-radius:5px;white-space:nowrap;pointer-events:none;z-index:5}`;
      }
    }
    for (const p of peers) {
      for (const sid of p.recentSids) {
        if (seen.has(sid)) continue;
        seen.add(sid);
        out += `[data-sid="${sid}"]{box-shadow:inset 4px 0 0 ${p.color}}`;
      }
    }
    ps.textContent = out;
  }, [peers]);

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
    art.setAttribute("data-sid", uniqueSid());
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
  const roster = [{ editorKey: meId, name: `${meName} (you)`, color: myColor }, ...peers];

  return (
    <div className="space-y-3">
      {/* Sticky toolbar */}
      <div className="sticky top-0 z-30 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-card-solid px-3 py-2 shadow-card-rest">
        <div className="flex items-center gap-3">
          <div className="flex items-center -space-x-1.5">
            {roster.slice(0, 6).map((p) => (
              <span
                key={p.editorKey}
                title={p.name}
                className="inline-flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-white ring-2 ring-card-solid"
                style={{ background: p.color }}
              >
                {initials(p.name)}
              </span>
            ))}
          </div>
          <span className="hidden items-center gap-1.5 text-xs text-muted sm:inline-flex">
            <Pencil size={12} />
            {peers.length > 0 ? `${peers.length + 1} editing live` : "Click in the document to edit"}
          </span>
        </div>
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

        <aside className="self-start space-y-3 lg:sticky lg:top-16">
          <div className="grid grid-cols-2 gap-1 rounded-lg bg-elevated/60 p-1">
            <button
              type="button"
              onClick={() => setTab("sections")}
              className={cn("inline-flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-semibold transition-colors", tab === "sections" ? "bg-card-solid text-fg shadow-card-rest" : "text-muted hover:text-fg")}
            >
              <ListTree size={13} /> Sections
            </button>
            <button
              type="button"
              onClick={() => { setTab("history"); loadRevisions(); }}
              className={cn("inline-flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-semibold transition-colors", tab === "history" ? "bg-card-solid text-fg shadow-card-rest" : "text-muted hover:text-fg")}
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
