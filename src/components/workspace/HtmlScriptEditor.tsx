"use client";

/**
 * Editor for an "html"-format script. Keeps the original guide's exact styling
 * (mounted in a Shadow DOM — isolated CSS, renders inline, no iframe), is
 * directly editable (contentEditable), and adds:
 *   • a big floating Save button with auto-save every 30s, a live countdown,
 *     an "auto-saved/saved at HH:MM" status, and a Revert button that rolls
 *     the document back to the last MANUAL save (auto-saves and unsaved edits
 *     after it are replaced; every version stays in History);
 *   • near-real-time collaboration: a ~2s heartbeat reports who's here and
 *     which section each person's caret is in; everyone's active/recent
 *     sections are outlined + tinted in their colour (overlaid via a shadow-DOM
 *     <style>, so nothing is written into the saved content);
 *   • a right sidebar: Sections (add / move / remove) and History (who/when +
 *     restore).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Save, Loader2, CheckCircle2, AlertCircle, Code2, Pencil, History, ListTree,
  Plus, ChevronUp, ChevronDown, Trash2, RotateCcw, User as UserIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { colorForKey, type PresencePeer } from "@/lib/scripts/presence";
import { AccountOfferModal } from "./AccountOfferModal";

interface Revision {
  id: string;
  authorName: string;
  authorKind: string;
  summary: string;
  createdAt: string;
}

const AUTOSAVE_SECONDS = 30;

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
function fmtTime(ms: number): string {
  try {
    return new Date(ms).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  } catch {
    return "";
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
  apiBase,
  readOnly = false,
  initialEditCount = 0,
  alreadyConverted = false,
  scriptUrl,
}: {
  scriptId: string;
  initialHtml: string;
  css: string;
  meId: string;
  meName: string;
  /** Endpoint prefix for save/revisions/presence. Defaults to the admin
   *  workspace API; the public share page passes its token-scoped base. */
  apiBase?: string;
  /** View-only share links: document not editable, no save bar / structure
   *  buttons / restore. */
  readOnly?: boolean;
  /** P4: edit count so far (from the ScriptCollaborator row). */
  initialEditCount?: number;
  /** P4: collaborator already has a BHN account — never show the offer. */
  alreadyConverted?: boolean;
  /** P4: full URL of this page, emailed on account creation. */
  scriptUrl?: string;
}) {
  const myColor = useMemo(() => colorForKey(meId), [meId]);
  const base = apiBase ?? `/api/workspace/scripts/${scriptId}`;

  const hostRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const presenceStyleRef = useRef<HTMLStyleElement | null>(null);
  const boxesRef = useRef<HTMLElement[]>([]);
  const intercutRef = useRef<HTMLElement[]>([]);
  const activeSidRef = useRef<string | null>(null);
  const recentRef = useRef<Map<string, number>>(new Map());
  const peersKeyRef = useRef<string>("");
  const peersRef = useRef<PresencePeer[]>([]);
  const paintRef = useRef<() => void>(() => {});
  // Auto-save bookkeeping (refs so the 1s ticker never sees stale values).
  const dirtyRef = useRef(false);
  const savingRef = useRef(false);
  const secondsRef = useRef(AUTOSAVE_SECONDS);
  const doSaveRef = useRef<(k: "manual" | "auto") => void>(() => {});

  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(AUTOSAVE_SECONDS);
  const [lastSaved, setLastSaved] = useState<{ at: number; kind: "manual" | "auto" } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showSource, setShowSource] = useState(false);
  const [sourceHtml, setSourceHtml] = useState(initialHtml);
  const [tab, setTab] = useState<"sections" | "history">("sections");
  const [sections, setSections] = useState<{ heading: string }[]>([]);
  // Dialogue rows inside the "Draft Full Intercut Script" block (.intercut-row).
  const [intercut, setIntercut] = useState<{ label: string }[]>([]);
  const [hasIntercut, setHasIntercut] = useState(false);
  const [revisions, setRevisions] = useState<Revision[]>([]);
  const [revLoading, setRevLoading] = useState(false);
  const [peers, setPeers] = useState<PresencePeer[]>([]);
  // P4: account-offer modal. Track edit count client-side; show at multiples of 3.
  const [editCount, setEditCount] = useState(initialEditCount);
  const [converted, setConverted] = useState(alreadyConverted);
  const [showOffer, setShowOffer] = useState(false);

  // Mark unsaved. setDirty only on the clean→dirty transition (keystrokes are
  // cheap — we don't re-render on every key).
  const markDirty = useCallback(() => {
    if (!dirtyRef.current) {
      dirtyRef.current = true;
      setDirty(true);
    }
  }, []);

  const refreshSections = useCallback(() => {
    const root = contentRef.current;
    if (!root) return;
    const boxes = findSections(root);
    boxes.forEach((b) => { if (!b.getAttribute("data-sid")) b.setAttribute("data-sid", uniqueSid()); });
    boxesRef.current = boxes;
    setSections(boxes.map((b) => ({
      heading: (b.querySelector("h1,h2,h3")?.textContent ?? "Untitled section").trim().slice(0, 70) || "Untitled section",
    })));

    // The intercut script's dialogue rows — managed as their own sub-list.
    const rows = Array.from(root.querySelectorAll<HTMLElement>(".intercut-row"));
    intercutRef.current = rows;
    setIntercut(rows.map((r) => {
      const speaker = r.querySelector(".speaker")?.textContent?.trim() || "—";
      const copy = (r.querySelector(".script-copy")?.textContent ?? "").trim().replace(/\s+/g, " ");
      return { label: `${speaker} · ${copy.slice(0, 46)}${copy.length > 46 ? "…" : ""}` };
    }));
    setHasIntercut(rows.length > 0 || !!root.querySelector(".full-script, .intercut-list"));
  }, []);

  // Mount the styled, editable document into a shadow root once + wire caret
  // tracking for presence + dirty-marking for auto-save.
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
    content.contentEditable = readOnly ? "false" : "true";
    content.spellcheck = true;
    content.style.outline = "none";
    contentRef.current = content;
    shadow.append(style, presenceStyle, content);

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
    const onSel = () => { updateActive(); paintRef.current(); };
    const onInput = () => {
      markDirty();
      updateActive();
      const sid = activeSidRef.current;
      if (sid) recentRef.current.set(sid, Date.now());
      paintRef.current();
    };
    content.addEventListener("keyup", onSel);
    content.addEventListener("mouseup", onSel);
    content.addEventListener("focusin", onSel);
    content.addEventListener("input", onInput);
  }, [css, initialHtml, refreshSections, markDirty, readOnly]);

  // ── Presence heartbeat (~2s) ──
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
        const res = await fetch(`${base}/presence`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ editorKey: meId, name: meName, color: myColor, activeSid: activeSidRef.current, recentSids: recent }),
        });
        const j = (await res.json().catch(() => ({}))) as { ok?: boolean; peers?: PresencePeer[] };
        if (!cancelled && j.ok && Array.isArray(j.peers)) {
          const key = JSON.stringify(j.peers);
          if (key !== peersKeyRef.current) {
            peersKeyRef.current = key;
            setPeers(j.peers);
          }
        }
      } catch { /* best-effort */ }
    }
    beat();
    const iv = setInterval(beat, 2000);
    return () => { cancelled = true; clearInterval(iv); };
  }, [base, meId, meName, myColor]);

  // ── Paint peer highlights (never on the local caret's own section). ──
  const paint = useCallback(() => {
    const ps = presenceStyleRef.current;
    if (!ps) return;
    const mine = activeSidRef.current;
    let out = "";
    const seen = new Set<string>();
    for (const p of peersRef.current) {
      const sid = p.activeSid;
      if (sid && sid !== mine && !seen.has(sid)) {
        seen.add(sid);
        const c = p.color;
        out += `[data-sid="${sid}"]{outline:2px solid ${c};outline-offset:2px;border-radius:6px;position:relative}`;
        out += `[data-sid="${sid}"]::after{content:"${cssStr(p.name)}";position:absolute;top:-0.85em;right:8px;background:${c};color:#fff;font:600 10px/1.5 ui-sans-serif,system-ui,sans-serif;padding:0 6px;border-radius:5px;white-space:nowrap;pointer-events:none;z-index:5}`;
      }
    }
    for (const p of peersRef.current) {
      for (const sid of p.recentSids) {
        if (sid === mine || seen.has(sid)) continue;
        seen.add(sid);
        out += `[data-sid="${sid}"]{box-shadow:inset 4px 0 0 ${p.color}}`;
      }
    }
    ps.textContent = out;
  }, []);

  useEffect(() => { paintRef.current = paint; }, [paint]);
  useEffect(() => { peersRef.current = peers; paint(); }, [peers, paint]);

  const loadRevisions = useCallback(async () => {
    setRevLoading(true);
    try {
      const res = await fetch(`${base}/revisions`);
      const j = (await res.json().catch(() => ({}))) as { ok?: boolean; revisions?: Revision[] };
      if (j.ok && Array.isArray(j.revisions)) setRevisions(j.revisions);
    } finally {
      setRevLoading(false);
    }
  }, [base]);

  useEffect(() => { loadRevisions(); }, [loadRevisions]);

  const currentHtml = () => contentRef.current?.innerHTML ?? sourceHtml;

  const doSave = useCallback(async (kind: "manual" | "auto") => {
    if (savingRef.current) return;
    // Auto-save only when there's something to save.
    if (kind === "auto" && !dirtyRef.current) return;
    savingRef.current = true;
    setSaving(true);
    setError(null);
    const html = showSource ? sourceHtml : currentHtml();
    try {
      const res = await fetch(base, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format: "html", richContent: { kind: "html", html, css }, summary: kind === "auto" ? "Auto-saved" : "Edited script" }),
      });
      const j = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; editCount?: number; converted?: boolean };
      if (!res.ok || !j.ok) {
        setError(j.error ?? "Save failed.");
        return;
      }
      if (showSource && contentRef.current) {
        contentRef.current.innerHTML = sourceHtml;
        refreshSections();
      }
      dirtyRef.current = false;
      secondsRef.current = AUTOSAVE_SECONDS;
      setDirty(false);
      setSecondsLeft(AUTOSAVE_SECONDS);
      setLastSaved({ at: Date.now(), kind });
      loadRevisions();
      // P4: after each save on the shared route the server returns the new editCount.
      // Show the account offer at every multiple of 3 while the collab hasn't converted.
      if (typeof j.editCount === "number" && !j.converted && !converted && scriptUrl) {
        const newCount = j.editCount;
        setEditCount(newCount);
        const dismissed = sessionStorage.getItem(`offer-dismissed-${scriptId}`);
        if (newCount > 0 && newCount % 3 === 0 && dismissed !== String(newCount)) {
          setShowOffer(true);
        }
      }
      if (j.converted) setConverted(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }, [base, css, showSource, sourceHtml, refreshSections, loadRevisions]);

  useEffect(() => { doSaveRef.current = doSave; }, [doSave]);

  // ── Auto-save ticker: 1s pulse, counts down only while there are unsaved
  //    changes, fires an auto-save at zero, then resets. ──
  useEffect(() => {
    const iv = setInterval(() => {
      if (savingRef.current) return;
      if (!dirtyRef.current) {
        if (secondsRef.current !== AUTOSAVE_SECONDS) {
          secondsRef.current = AUTOSAVE_SECONDS;
          setSecondsLeft(AUTOSAVE_SECONDS);
        }
        return;
      }
      secondsRef.current -= 1;
      if (secondsRef.current <= 0) {
        secondsRef.current = AUTOSAVE_SECONDS;
        setSecondsLeft(AUTOSAVE_SECONDS);
        doSaveRef.current("auto");
      } else {
        setSecondsLeft(secondsRef.current);
      }
    }, 1000);
    return () => clearInterval(iv);
  }, []);

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
    markDirty();
    refreshSections();
  }
  function removeSection(i: number) {
    const b = boxesRef.current[i];
    if (!b) return;
    if (!confirm("Remove this section?")) return;
    const parent = b.parentElement;
    b.remove();
    if (parent && parent.tagName === "SECTION" && parent.children.length === 0) parent.remove();
    markDirty();
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
    markDirty();
    refreshSections();
    art.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  // ── Intercut-script rows (under "Draft Full Intercut Script") ──
  function moveIntercut(i: number, dir: -1 | 1) {
    const a = intercutRef.current[i];
    const b = intercutRef.current[i + dir];
    if (!a || !b || !b.parentNode) return;
    if (dir === -1) b.parentNode.insertBefore(a, b);
    else b.parentNode.insertBefore(a, b.nextSibling);
    markDirty();
    refreshSections();
  }
  function removeIntercut(i: number) {
    const r = intercutRef.current[i];
    if (!r) return;
    if (!confirm("Remove this script line?")) return;
    r.remove();
    markDirty();
    refreshSections();
  }
  function addIntercut() {
    const root = contentRef.current;
    if (!root) return;
    // Append inside the existing list; create the list inside the full-script
    // section if it was emptied out.
    let list = root.querySelector<HTMLElement>(".intercut-list");
    if (!list) {
      const host = root.querySelector<HTMLElement>(".full-script");
      if (!host) return;
      list = document.createElement("div");
      list.className = "intercut-list";
      host.appendChild(list);
    }
    const row = document.createElement("article");
    row.className = "intercut-row";
    row.innerHTML =
      '<div class="speaker">Speaker</div><p class="script-copy">Write the line…</p><p class="visual-note">Visual note for the editor…</p>';
    list.appendChild(row);
    markDirty();
    refreshSections();
    row.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  // Newest revision that was a deliberate act — a manual Save, a section
  // edit, or an earlier revert. Auto-saves tag themselves "Auto-saved".
  const lastManual = revisions.find((r) => r.summary !== "Auto-saved");
  const canRevert = !!lastManual && (dirty || revisions[0]?.id !== lastManual.id);

  async function revertToLastManual() {
    if (!lastManual) return;
    if (!confirm(
      `Revert to the last manual save — by ${lastManual.authorName}, ${fmtWhen(lastManual.createdAt)}?\n\n` +
      "Unsaved edits are discarded. Newer auto-saved versions stay in History."
    )) return;
    await applyRestore(lastManual.id);
  }

  async function restore(revId: string) {
    if (!confirm("Restore this version? The current content is replaced and saved as a new version.")) return;
    await applyRestore(revId);
  }

  async function applyRestore(revId: string) {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`${base}/revisions`, {
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
      dirtyRef.current = false;
      setDirty(false);
      setLastSaved({ at: Date.now(), kind: "manual" });
      loadRevisions();
    } finally {
      setSaving(false);
    }
  }

  const miniBtn = "inline-flex h-6 w-6 items-center justify-center rounded text-muted hover:text-fg hover:bg-elevated disabled:opacity-30";
  const roster = [{ editorKey: meId, name: `${meName} (you)`, color: myColor }, ...peers];

  return (
    <div className="space-y-3 pb-24">
      {/* Sticky toolbar — presence + view toggle (Save lives in the floating bar). */}
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
            {readOnly
              ? "View-only link"
              : peers.length > 0 ? `${peers.length + 1} editing live` : "Click in the document to edit"}
          </span>
        </div>
        {!readOnly && (
          <button
            type="button"
            onClick={toggleSource}
            className="inline-flex items-center gap-1.5 rounded-md border border-line bg-card-solid px-3 py-1.5 text-xs font-semibold text-fg hover:bg-elevated"
          >
            <Code2 size={13} /> {showSource ? "Visual" : "HTML"}
          </button>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className={cn("min-w-0", showSource && "hidden")}>
          <div ref={hostRef} />
        </div>
        {showSource && (
          <textarea
            value={sourceHtml}
            spellCheck={false}
            onChange={(e) => { setSourceHtml(e.target.value); markDirty(); }}
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
                {!readOnly && (
                  <button type="button" onClick={addSection} className="inline-flex items-center gap-1 text-xs font-medium text-brand-700 hover:text-brand-900">
                    <Plus size={12} /> Add
                  </button>
                )}
              </div>
              <ul className="space-y-0.5">
                {sections.map((s, i) => (
                  <li key={i} className="group flex items-center gap-0.5 rounded-md px-1.5 py-1 hover:bg-elevated">
                    <span className="flex-1 truncate text-xs text-fg" title={s.heading}>{s.heading}</span>
                    {!readOnly && (
                      <>
                        <button type="button" title="Move up" disabled={i === 0} onClick={() => moveSection(i, -1)} className={miniBtn}><ChevronUp size={13} /></button>
                        <button type="button" title="Move down" disabled={i === sections.length - 1} onClick={() => moveSection(i, 1)} className={miniBtn}><ChevronDown size={13} /></button>
                        <button type="button" title="Remove" onClick={() => removeSection(i)} className={cn(miniBtn, "hover:text-rose-700")}><Trash2 size={12} /></button>
                      </>
                    )}
                  </li>
                ))}
                {sections.length === 0 && <li className="px-2 py-2 text-[11px] text-muted">No sections detected.</li>}
              </ul>

              {hasIntercut && (
                <>
                  <div className="mt-2 flex items-center justify-between border-t border-line px-1 pb-1 pt-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-subtle">Intercut script</span>
                    {!readOnly && (
                      <button type="button" onClick={addIntercut} className="inline-flex items-center gap-1 text-xs font-medium text-brand-700 hover:text-brand-900">
                        <Plus size={12} /> Add line
                      </button>
                    )}
                  </div>
                  <ul className="space-y-0.5">
                    {intercut.map((r, i) => (
                      <li key={i} className="group flex items-center gap-0.5 rounded-md px-1.5 py-1 hover:bg-elevated">
                        <span className="w-4 shrink-0 text-right font-mono text-[10px] text-subtle">{i + 1}</span>
                        <span className="flex-1 truncate text-xs text-fg" title={r.label}>{r.label}</span>
                        {!readOnly && (
                          <>
                            <button type="button" title="Move up" disabled={i === 0} onClick={() => moveIntercut(i, -1)} className={miniBtn}><ChevronUp size={13} /></button>
                            <button type="button" title="Move down" disabled={i === intercut.length - 1} onClick={() => moveIntercut(i, 1)} className={miniBtn}><ChevronDown size={13} /></button>
                            <button type="button" title="Remove line" onClick={() => removeIntercut(i)} className={cn(miniBtn, "hover:text-rose-700")}><Trash2 size={12} /></button>
                          </>
                        )}
                      </li>
                    ))}
                    {intercut.length === 0 && (
                      <li className="px-2 py-2 text-[11px] text-muted">No script lines yet — Add line starts the intercut.</li>
                    )}
                  </ul>
                </>
              )}

              <p className="px-1.5 pt-1.5 text-[10px] leading-relaxed text-muted">Structure changes save with the document.</p>
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
                      {!readOnly && (
                        <button type="button" title="Restore this version" onClick={() => restore(r.id)} className={cn(miniBtn, "hover:text-brand-700")}><RotateCcw size={12} /></button>
                      )}
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

      {/* ── Floating Save bar (bottom-centre, clear of the bottom-right tour
          button). Big Save button + auto-save countdown + saved status. ── */}
      {!readOnly && (
      <div className="fixed bottom-5 left-1/2 z-40 flex -translate-x-1/2 items-center gap-3 rounded-full border border-line bg-card-solid/95 px-3 py-2 shadow-elevated backdrop-blur supports-[backdrop-filter]:bg-card-solid/80">
        <div className="pl-1.5 text-xs">
          {error ? (
            <span className="inline-flex items-center gap-1.5 font-medium text-rose-700"><AlertCircle size={13} /> {error}</span>
          ) : saving ? (
            <span className="inline-flex items-center gap-1.5 text-muted"><Loader2 size={13} className="animate-spin" /> Saving…</span>
          ) : dirty ? (
            <span className="inline-flex items-center gap-1.5 font-medium text-amber-700">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> Unsaved · auto-save in {secondsLeft}s
            </span>
          ) : lastSaved ? (
            <span className="inline-flex items-center gap-1.5 text-emerald-700">
              <CheckCircle2 size={13} /> {lastSaved.kind === "auto" ? "Auto-saved" : "Saved"} at {fmtTime(lastSaved.at)}
            </span>
          ) : (
            <span className="text-muted">All changes saved</span>
          )}
        </div>
        <button
          type="button"
          onClick={revertToLastManual}
          disabled={saving || !canRevert}
          title={
            !lastManual
              ? "No manual save to revert to yet"
              : canRevert
                ? `Revert to the last manual save — ${fmtWhen(lastManual.createdAt)} by ${lastManual.authorName}`
                : "Already at the last manual save"
          }
          className="inline-flex items-center gap-1.5 rounded-full border border-line bg-card-solid px-4 py-3 text-xs font-semibold text-fg transition-colors hover:bg-elevated disabled:opacity-40"
        >
          <RotateCcw size={14} /> Revert
        </button>
        <button
          type="button"
          onClick={() => doSave("manual")}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-full bg-brand-600 px-6 py-3 text-sm font-bold text-white shadow-sm shadow-brand-600/30 transition-colors hover:bg-brand-700 disabled:opacity-50"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save
        </button>
      </div>
      )}

      {showOffer && scriptUrl && (
        <AccountOfferModal
          scriptId={scriptId}
          scriptUrl={scriptUrl}
          onDismiss={() => {
            sessionStorage.setItem(`offer-dismissed-${scriptId}`, String(editCount));
            setShowOffer(false);
          }}
          onConverted={() => {
            setConverted(true);
            setShowOffer(false);
          }}
        />
      )}
    </div>
  );
}
