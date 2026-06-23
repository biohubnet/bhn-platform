"use client";

/**
 * Anchored comments for the HTML script editor.
 *
 * Mounted only on the Comments tab. Renders:
 *   • a "Make comment" button you DRAG onto the script — on drop it anchors to
 *     the SENTENCE under the cursor (default), with draggable start/end handles
 *     to widen/narrow the range word by word;
 *   • highlight rectangles + handles over the document (the doc lives in a
 *     Shadow DOM; we read ranges with getClientRects across the boundary);
 *   • margin comment cards to the right of the document, each linked to its
 *     anchor by a thin loosely-dotted connector that routes through the margin
 *     so it never crosses text;
 *   • author + relative time, inline edit (tracked as "edited Nx · last …"),
 *     threaded replies, resolve/reopen, and (admins) delete.
 *
 * Everything except the button is portaled to <body> at fixed viewport
 * coordinates, recomputed on scroll/resize/edit, so it tracks the document as
 * it moves without fighting the editor's grid layout.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MessageSquarePlus, Check, RotateCcw, Trash2, Pencil, Loader2, CornerDownRight } from "lucide-react";

interface Cmt {
  id: string;
  body: string;
  authorName: string;
  authorKind: string;
  status: string;
  parentId: string | null;
  anchorSectionId: string | null;
  anchorFrom: number | null;
  anchorTo: number | null;
  anchorQuote: string | null;
  editCount: number;
  editedAt: string | null;
  createdAt: string;
}
interface Draft { sid: string; from: number; to: number; quote: string }

const CARD_W = 264;

/* ── text helpers ─────────────────────────────────────────────────────── */
function caretFromPoint(root: Document | ShadowRoot, x: number, y: number): { node: Node; offset: number } | null {
  const r = (root as Document).caretRangeFromPoint?.(x, y);
  if (r && r.startContainer.nodeType === 3) return { node: r.startContainer, offset: r.startOffset };
  const d = document.caretRangeFromPoint?.(x, y);
  if (d && d.startContainer.nodeType === 3) return { node: d.startContainer, offset: d.startOffset };
  return null;
}
/** char offset within block.textContent for a (textNode, offset) inside it. */
function pointToChar(block: HTMLElement, node: Node, offset: number): number {
  let n = 0;
  const w = document.createTreeWalker(block, NodeFilter.SHOW_TEXT);
  let t: Node | null;
  while ((t = w.nextNode())) {
    if (t === node) return n + offset;
    n += (t.textContent ?? "").length;
  }
  return n;
}
/** (textNode, offset) for a char offset within block.textContent. */
function charToPoint(block: HTMLElement, target: number): { node: Node; offset: number } | null {
  let n = 0;
  let last: Node | null = null;
  const w = document.createTreeWalker(block, NodeFilter.SHOW_TEXT);
  let t: Node | null;
  while ((t = w.nextNode())) {
    const len = (t.textContent ?? "").length;
    if (target <= n + len) return { node: t, offset: Math.max(0, target - n) };
    n += len;
    last = t;
  }
  return last ? { node: last, offset: (last.textContent ?? "").length } : null;
}
function sentenceBounds(text: string, off: number): [number, number] {
  const marks = [0]; const re = /[.!?]+[)\]"']*\s+/g; let m: RegExpExecArray | null;
  while ((m = re.exec(text))) marks.push(m.index + m[0].length);
  if (marks[marks.length - 1] !== text.length) marks.push(text.length);
  for (let i = 0; i < marks.length - 1; i++) {
    if (off >= marks[i]! && off < marks[i + 1]!) {
      let s = marks[i]!, e = marks[i + 1]!;
      while (s < e && /\s/.test(text[s]!)) s++;
      while (e > s && /\s/.test(text[e - 1]!)) e--;
      return [s, e];
    }
  }
  return [0, text.length];
}
function wordBounds(text: string, off: number): [number, number] {
  off = Math.max(0, Math.min(text.length, off));
  let s = off, e = off;
  if ((s > 0 && /\S/.test(text[s - 1]!)) || /\S/.test(text[s] ?? "")) {
    while (s > 0 && /\S/.test(text[s - 1]!)) s--;
    while (e < text.length && /\S/.test(text[e]!)) e++;
  } else {
    while (s > 0 && /\s/.test(text[s - 1]!)) s--;
    e = s; while (s > 0 && /\S/.test(text[s - 1]!)) s--;
  }
  return [s, e];
}
function relTime(iso: string): string {
  const t = new Date(iso).getTime();
  const s = Math.max(0, Math.round((Date.now() - t) / 1000));
  if (s < 10) return "just now";
  if (s < 60) return s + "s ago";
  const m = Math.round(s / 60); if (m < 60) return m + "m ago";
  const h = Math.round(m / 60); if (h < 24) return h + "h ago";
  return new Date(t).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function ScriptCommentLayer({
  contentRef, base,
}: {
  contentRef: React.RefObject<HTMLDivElement | null>;
  base: string;
}) {
  const [comments, setComments] = useState<Cmt[]>([]);
  const [canModerate, setCanModerate] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [draftBody, setDraftBody] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBody, setEditBody] = useState("");
  const [replyFor, setReplyFor] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState("");
  const [pin, setPin] = useState<{ x: number; y: number } | null>(null);
  const [, force] = useState(0);
  const tick = useCallback(() => force((n) => n + 1), []);

  const blockFor = (sid: string | null) =>
    sid ? contentRef.current?.querySelector<HTMLElement>(`[data-sid="${CSS.escape(sid)}"]`) ?? null : null;

  /** Resolve a comment's live range, relocating via the quote if offsets drift. */
  const rangeFor = useCallback((sid: string, from: number, to: number, quote: string | null): Range | null => {
    const block = blockFor(sid); if (!block) return null;
    const text = block.textContent ?? "";
    let f = from, t = to;
    if (quote && text.slice(f, t) !== quote) {
      const idx = text.indexOf(quote);
      if (idx >= 0) { f = idx; t = idx + quote.length; } else return null;
    }
    const a = charToPoint(block, f), b = charToPoint(block, t);
    if (!a || !b) return null;
    const r = document.createRange();
    try { r.setStart(a.node, a.offset); r.setEnd(b.node, b.offset); } catch { return null; }
    return r;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentRef]);

  /* fetch */
  const load = useCallback(async () => {
    const res = await fetch(`${base}/comments`).catch(() => null);
    const j = (await res?.json().catch(() => ({}))) as { ok?: boolean; comments?: Cmt[]; canModerate?: boolean };
    if (j?.ok && Array.isArray(j.comments)) { setComments(j.comments); setCanModerate(!!j.canModerate); }
  }, [base]);
  useEffect(() => { load(); }, [load]);

  /* recompute overlay positions on scroll / resize / content mutation */
  useEffect(() => {
    const onMove = () => tick();
    window.addEventListener("scroll", onMove, true);
    window.addEventListener("resize", onMove);
    const mo = contentRef.current ? new MutationObserver(onMove) : null;
    if (contentRef.current) mo!.observe(contentRef.current, { subtree: true, characterData: true, childList: true });
    const iv = setInterval(onMove, 1500); // keep relative times + drift fresh
    return () => { window.removeEventListener("scroll", onMove, true); window.removeEventListener("resize", onMove); mo?.disconnect(); clearInterval(iv); };
  }, [contentRef, tick]);

  /* ── drag the button to place a new anchor ─────────────────────────── */
  function onButtonDown(e: React.PointerEvent) {
    e.preventDefault();
    setPin({ x: e.clientX, y: e.clientY });
    const move = (ev: PointerEvent) => setPin({ x: ev.clientX, y: ev.clientY });
    const up = (ev: PointerEvent) => {
      window.removeEventListener("pointermove", move);
      setPin(null);
      placeAt(ev.clientX, ev.clientY);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up, { once: true });
  }
  function placeAt(x: number, y: number) {
    const content = contentRef.current; if (!content) return;
    const root = content.getRootNode() as ShadowRoot;
    const caret = caretFromPoint(root, x, y);
    if (!caret) return;
    const block = (caret.node.parentElement?.closest("[data-sid]") as HTMLElement | null);
    if (!block || !content.contains(block)) return;
    const text = block.textContent ?? "";
    const off = pointToChar(block, caret.node, caret.offset);
    const [s, e] = sentenceBounds(text, off);
    const sid = block.getAttribute("data-sid")!;
    setDraft({ sid, from: s, to: e, quote: text.slice(s, e) });
    setDraftBody(""); setSelectedId(null);
  }

  /* ── handle drag (word-level) ──────────────────────────────────────── */
  function onHandleDown(which: "start" | "end", e: React.PointerEvent) {
    e.preventDefault(); e.stopPropagation();
    const content = contentRef.current; if (!content || !draft) return;
    const block = blockFor(draft.sid); if (!block) return;
    const text = block.textContent ?? "";
    const root = content.getRootNode() as ShadowRoot;
    const move = (ev: PointerEvent) => {
      const caret = caretFromPoint(root, ev.clientX, ev.clientY);
      if (!caret || (caret.node.parentElement?.closest("[data-sid]") as HTMLElement | null) !== block) return;
      const off = pointToChar(block, caret.node, caret.offset);
      const [ws, we] = wordBounds(text, off);
      setDraft((d) => {
        if (!d) return d;
        let { from, to } = d;
        if (which === "start") from = Math.min(ws, to - 1);
        else to = Math.max(we, from + 1);
        return { ...d, from, to, quote: text.slice(from, to) };
      });
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", () => window.removeEventListener("pointermove", move), { once: true });
  }

  /* ── mutations ─────────────────────────────────────────────────────── */
  async function saveDraft() {
    if (!draft || !draftBody.trim()) return;
    await fetch(`${base}/comments`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: draftBody.trim(), anchorSectionId: draft.sid, anchorFrom: draft.from, anchorTo: draft.to, anchorQuote: draft.quote }),
    }).catch(() => {});
    setDraft(null); setDraftBody(""); await load();
  }
  async function resolve(c: Cmt) {
    const status = c.status === "resolved" ? "open" : "resolved";
    setComments((cur) => cur.map((x) => (x.id === c.id ? { ...x, status } : x)));
    await fetch(`${base}/comments`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ commentId: c.id, status }) }).catch(() => {});
  }
  async function saveEdit(c: Cmt) {
    if (!editBody.trim() || editBody.trim() === c.body) { setEditingId(null); return; }
    await fetch(`${base}/comments`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ commentId: c.id, body: editBody.trim() }) }).catch(() => {});
    setEditingId(null); await load();
  }
  async function sendReply(parentId: string) {
    if (!replyBody.trim()) return;
    await fetch(`${base}/comments`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ body: replyBody.trim(), parentId }) }).catch(() => {});
    setReplyBody(""); setReplyFor(null); await load();
  }
  async function del(c: Cmt) {
    if (!confirm("Delete this comment?")) return;
    setComments((cur) => cur.filter((x) => x.id !== c.id && x.parentId !== c.id));
    await fetch(`${base}/comments?commentId=${c.id}`, { method: "DELETE" }).catch(() => {});
  }

  /* ── geometry for the portal layer ─────────────────────────────────── */
  const content = contentRef.current;
  const docRect = content?.getBoundingClientRect();
  const tops = comments.filter((c) => !c.parentId);
  const repliesOf = (id: string) => comments.filter((c) => c.parentId === id).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const modCount = (c: Cmt) => c.editCount + repliesOf(c.id).length;
  const lastActivity = (c: Cmt) => {
    let at = c.createdAt, by = c.authorName;
    if (c.editedAt && c.editedAt > at) { at = c.editedAt; by = c.authorName; }
    for (const r of repliesOf(c.id)) if (r.createdAt > at) { at = r.createdAt; by = r.authorName; }
    return { at, by };
  };

  // Build placement (anchor Y + stacked card Y) for each top-level comment + the draft.
  type Placed = { key: string; cmt?: Cmt; isDraft?: boolean; anchorY: number; anchorRight: number; rects: DOMRect[]; cardTop: number };
  const placed: Placed[] = [];
  const railLeft = docRect ? Math.min(docRect.right + 14, window.innerWidth - CARD_W - 12) : 0;
  if (docRect) {
    const items: { key: string; cmt?: Cmt; isDraft?: boolean; sid: string; from: number; to: number; quote: string | null }[] = [];
    for (const c of tops) if (c.anchorSectionId != null && c.anchorFrom != null && c.anchorTo != null)
      items.push({ key: c.id, cmt: c, sid: c.anchorSectionId, from: c.anchorFrom, to: c.anchorTo, quote: c.anchorQuote });
    if (draft) items.push({ key: "draft", isDraft: true, sid: draft.sid, from: draft.from, to: draft.to, quote: draft.quote });
    const measured = items.map((it) => {
      const r = rangeFor(it.sid, it.from, it.to, it.quote);
      const rects = r ? Array.from(r.getClientRects()) : [];
      const top = rects.length ? rects[0]!.top : -9999;
      return { it, rects, top };
    }).filter((x) => x.rects.length).sort((a, b) => a.top - b.top);
    let cursor = 0;
    for (const { it, rects, top } of measured) {
      const cardTop = Math.max(top, cursor);
      placed.push({ key: it.key, cmt: it.cmt, isDraft: it.isDraft, anchorY: (rects[0]!.top + rects[rects.length - 1]!.bottom) / 2, anchorRight: docRect.right, rects, cardTop });
      cursor = cardTop + (it.isDraft ? 92 : 116) + 12; // rough card height + gap
    }
  }

  const overlay = docRect ? createPortal(
    <div style={{ position: "fixed", inset: 0, zIndex: 60, pointerEvents: "none" }}>
      {/* highlights */}
      {placed.map((p) => {
        const sel = p.isDraft || p.cmt?.id === selectedId;
        const resolved = p.cmt?.status === "resolved";
        return p.rects.map((r, i) => (
          <div key={p.key + ":" + i} style={{
            position: "fixed", left: r.left, top: r.top, width: r.width, height: r.height,
            background: resolved ? "rgba(120,130,140,.14)" : sel ? "rgba(18,110,55,.26)" : "rgba(18,110,55,.15)",
            borderRadius: 3, pointerEvents: "none",
          }} />
        ));
      })}
      {/* handles for the draft */}
      {draft && placed.filter((p) => p.isDraft).map((p) => {
        const f = p.rects[0]!, l = p.rects[p.rects.length - 1]!;
        const H = (which: "start" | "end", x: number, top: number, h: number) => (
          <div onPointerDown={(e) => onHandleDown(which, e)} style={{
            position: "fixed", left: x - 6, top, height: h, width: 12, cursor: "ew-resize", pointerEvents: "auto",
            display: "flex", flexDirection: "column", alignItems: "center", zIndex: 62,
          }}>
            <span style={{ width: 10, height: 10, borderRadius: 9, background: "#126e37", border: "2px solid #fff", boxShadow: "0 1px 2px rgba(0,0,0,.3)" }} />
            <span style={{ width: 2, flex: 1, background: "#126e37" }} />
          </div>
        );
        return <div key="handles">{H("start", f.left, f.top, f.height)}{H("end", l.right, l.top, l.height)}</div>;
      })}
      {/* connectors */}
      <svg style={{ position: "fixed", inset: 0, width: "100%", height: "100%", pointerEvents: "none", overflow: "visible" }}>
        {placed.map((p) => {
          const cy = p.cardTop + 18, gx = docRect.right + 7;
          const dim = p.cmt?.status === "resolved" ? 0.4 : (p.isDraft || p.cmt?.id === selectedId) ? 1 : 0.75;
          return (
            <g key={"th" + p.key} opacity={dim}>
              <path d={`M ${p.anchorRight} ${p.anchorY} L ${gx} ${p.anchorY} L ${gx} ${cy} L ${railLeft} ${cy}`} fill="none" stroke="#9aa4b2" strokeWidth={1} strokeDasharray="1 6" strokeLinecap="round" />
              <circle cx={p.anchorRight} cy={p.anchorY} r={2.4} fill="#126e37" />
            </g>
          );
        })}
      </svg>
      {/* cards */}
      {placed.map((p) => (
        <div key={"card" + p.key} style={{ position: "fixed", left: railLeft, top: p.cardTop, width: CARD_W, pointerEvents: "auto", zIndex: 61 }}>
          {p.isDraft ? (
            <div style={cardStyle(true)}>
              <div style={quoteStyle}>“{draft?.quote}”</div>
              <div style={{ display: "flex", gap: 6 }}>
                <input autoFocus value={draftBody} onChange={(e) => setDraftBody(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") saveDraft(); if (e.key === "Escape") setDraft(null); }}
                  placeholder="Comment on this…" style={inputStyle} />
                <button onClick={saveDraft} style={sendStyle}>Send</button>
              </div>
            </div>
          ) : p.cmt && (
            <CardBody
              c={p.cmt} sel={p.cmt.id === selectedId} canModerate={canModerate}
              replies={repliesOf(p.cmt.id)} modCount={modCount(p.cmt)} last={lastActivity(p.cmt)}
              editing={editingId === p.cmt.id} editBody={editBody} setEditBody={setEditBody}
              replyOpen={replyFor === p.cmt.id} replyBody={replyBody} setReplyBody={setReplyBody}
              onSelect={() => setSelectedId(p.cmt!.id)}
              onResolve={() => resolve(p.cmt!)} onDelete={() => del(p.cmt!)}
              onEditStart={() => { setEditingId(p.cmt!.id); setEditBody(p.cmt!.body); }}
              onEditSave={() => saveEdit(p.cmt!)} onEditCancel={() => setEditingId(null)}
              onReplyOpen={() => { setReplyFor(p.cmt!.id); setReplyBody(""); }}
              onReplySend={() => sendReply(p.cmt!.id)}
            />
          )}
        </div>
      ))}
    </div>,
    document.body,
  ) : null;

  return (
    <div className="rounded-xl border border-line bg-card-solid p-3">
      <button type="button" onPointerDown={onButtonDown}
        className="inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-brand-600 px-3 py-2 text-xs font-bold text-white hover:bg-brand-700"
        title="Drag onto a sentence">
        <MessageSquarePlus size={14} /> Make comment
      </button>
      <p className="mt-2 text-[11px] leading-relaxed text-muted">
        <b>Drag</b> the button onto a sentence to anchor a comment, then drag the round handles to widen or narrow it. Comments appear in the margin, linked by a dotted line.
      </p>
      {tops.length > 0 && <p className="mt-2 text-[11px] text-subtle">{tops.filter((c) => c.status !== "resolved").length} open · {tops.length} total</p>}
      {pin && createPortal(
        <div style={{ position: "fixed", left: pin.x, top: pin.y - 4, transform: "translate(-50%,-100%)", zIndex: 70, pointerEvents: "none" }}>
          <svg width="24" height="31" viewBox="0 0 26 34" fill="none"><path d="M13 33S24 20.5 24 12.5C24 6.1 19 1 13 1S2 6.1 2 12.5C2 20.5 13 33 13 33Z" fill="#126e37" stroke="#fff" strokeWidth="1.6" /><circle cx="13" cy="12.5" r="4.4" fill="#fff" /></svg>
        </div>, document.body)}
      {overlay}
    </div>
  );
}

/* ── small presentational card ────────────────────────────────────────── */
const cardStyle = (draft?: boolean): React.CSSProperties => ({
  background: "var(--card-solid)", border: `1px solid ${draft ? "#126e37" : "var(--line-strong, #cfd6df)"}`,
  borderRadius: 10, boxShadow: "0 6px 18px -8px rgba(0,0,0,.3)", padding: "9px 10px",
});
const quoteStyle: React.CSSProperties = { fontSize: 11, color: "var(--fg-muted)", borderLeft: "2px solid var(--line)", paddingLeft: 7, marginBottom: 6, fontStyle: "italic", maxHeight: 32, overflow: "hidden" };
const inputStyle: React.CSSProperties = { flex: 1, minWidth: 0, border: "1px solid var(--line)", borderRadius: 7, padding: "5px 8px", fontSize: 12.5, color: "var(--fg)", background: "var(--elevated)", outline: "none" };
const sendStyle: React.CSSProperties = { flex: "none", background: "#126e37", color: "#fff", border: 0, borderRadius: 7, padding: "5px 10px", fontWeight: 700, fontSize: 12, cursor: "pointer" };
const ico: React.CSSProperties = { width: 22, height: 22, display: "inline-flex", alignItems: "center", justifyContent: "center", borderRadius: 6, color: "var(--fg-muted)", cursor: "pointer", border: 0, background: "transparent" };

function CardBody(props: {
  c: Cmt; sel: boolean; canModerate: boolean; replies: Cmt[]; modCount: number; last: { at: string; by: string };
  editing: boolean; editBody: string; setEditBody: (v: string) => void;
  replyOpen: boolean; replyBody: string; setReplyBody: (v: string) => void;
  onSelect: () => void; onResolve: () => void; onDelete: () => void;
  onEditStart: () => void; onEditSave: () => void; onEditCancel: () => void;
  onReplyOpen: () => void; onReplySend: () => void;
}) {
  const { c } = props;
  return (
    <div style={{ ...cardStyle(), opacity: c.status === "resolved" ? 0.62 : 1, outline: props.sel ? "1px solid #126e37" : "none" }} onClick={props.onSelect}>
      <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 4 }}>
        <span style={{ flex: 1, fontSize: 12, fontWeight: 600, color: "var(--fg)" }}>{c.authorName}</span>
        {c.authorKind === "anon" && <span style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: ".04em", color: "var(--fg-subtle)", background: "var(--elevated)", padding: "1px 5px", borderRadius: 4 }}>guest</span>}
        <span style={{ fontSize: 11, color: "var(--fg-subtle)" }}>{relTime(c.createdAt)}</span>
        <button title="Edit" style={ico} onClick={(e) => { e.stopPropagation(); props.onEditStart(); }}><Pencil size={12} /></button>
        <button title={c.status === "resolved" ? "Reopen" : "Resolve"} style={ico} onClick={(e) => { e.stopPropagation(); props.onResolve(); }}>{c.status === "resolved" ? <RotateCcw size={12} /> : <Check size={12} />}</button>
        {props.canModerate && <button title="Delete" style={ico} onClick={(e) => { e.stopPropagation(); props.onDelete(); }}><Trash2 size={12} /></button>}
      </div>
      {c.anchorQuote && <div style={quoteStyle}>“{c.anchorQuote}”</div>}
      {props.editing ? (
        <div style={{ display: "flex", gap: 6 }}>
          <input autoFocus value={props.editBody} onChange={(e) => props.setEditBody(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") props.onEditSave(); if (e.key === "Escape") props.onEditCancel(); }} style={inputStyle} />
          <button onClick={(e) => { e.stopPropagation(); props.onEditSave(); }} style={sendStyle}>Save</button>
        </div>
      ) : (
        <div style={{ fontSize: 13, color: "var(--fg)", whiteSpace: "pre-wrap", wordBreak: "break-word", textDecoration: c.status === "resolved" ? "line-through" : "none" }}>
          {c.body}{c.editCount > 0 && <span style={{ fontSize: 11, color: "var(--fg-subtle)", fontStyle: "italic", marginLeft: 4 }}>edited{c.editCount > 1 ? ` ${c.editCount}×` : ""}</span>}
        </div>
      )}
      {props.replies.map((r) => (
        <div key={r.id} style={{ marginTop: 7, paddingTop: 7, borderTop: "1px solid var(--line)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ fontSize: 11.5, fontWeight: 600, color: "var(--fg)" }}>{r.authorName}</span>
            <span style={{ fontSize: 10.5, color: "var(--fg-subtle)" }}>{relTime(r.createdAt)}</span>
          </div>
          <div style={{ fontSize: 12.5, color: "var(--fg)", marginTop: 2, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{r.body}</div>
        </div>
      ))}
      {props.replyOpen ? (
        <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
          <input autoFocus value={props.replyBody} onChange={(e) => props.setReplyBody(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") props.onReplySend(); if (e.key === "Escape") props.onReplyOpen(); }} placeholder="Reply…" style={inputStyle} />
          <button onClick={(e) => { e.stopPropagation(); props.onReplySend(); }} style={sendStyle}>Reply</button>
        </div>
      ) : (
        <button onClick={(e) => { e.stopPropagation(); props.onReplyOpen(); }} style={{ ...ico, width: "auto", gap: 4, marginTop: 7, fontSize: 11, padding: "0 4px" }}><CornerDownRight size={11} /> Reply</button>
      )}
      {props.modCount > 1 && (
        <div style={{ marginTop: 8, paddingTop: 7, borderTop: "1px dashed var(--line)", fontSize: 11, color: "var(--fg-muted)" }}>
          ↻ updated {props.modCount}× · last {relTime(props.last.at)} by {props.last.by}
        </div>
      )}
    </div>
  );
}
