"use client";

/**
 * Structured resume editor + inline comment thread.
 *
 *   • Top-of-tree: header (name / contact / summary) — flat fields,
 *     edited in place.
 *   • Sections (Experience / Skills / Education / …) render as
 *     hairline-divided cards; each section holds items (a job, a
 *     degree, a project) and each item holds bullets.
 *   • Every bullet has a comment-count chip that pops the per-bullet
 *     thread. Comments left by mentors / admins appear next to the
 *     bullet they pin to. The trainee can mark each comment
 *     `applied` (they accepted the suggestion into the bullet) or
 *     `resolved` (they read it and choose not to act).
 *   • Save is auto + debounced ~600 ms after the last edit. A small
 *     mono-eyebrow status line shows "Saved · v12" with the version.
 *   • The "AI parse" CTA at the top of the page (props.canParse) hits
 *     POST /api/profile/resume/structure/parse — overwrites the tree
 *     with a fresh parse from the uploaded file; the previous tree is
 *     preserved as a revision so the trainee can revert.
 *
 * The editor is owner-only by design — this component is rendered
 * inside /profile/resume which is always the trainee's own surface.
 * Mentor / admin views render a read-only variant that I'll add as a
 * follow-up.
 */

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Plus, Trash2, GripVertical, MessageCircle, CheckCircle2, X, Loader2, Sparkles, Save, ChevronUp, ChevronDown,
  Target, Wand2, Clock, Printer,
} from "lucide-react";
import type { ResumeContent, ResumeSection, ResumeItem, ResumeBullet, ResumeSectionKind } from "@/lib/resume/types";
import { SECTION_LABEL, SECTION_HINTS, rid } from "@/lib/resume/types";
import { ResumeItemEditor } from "./ResumeItemEditor";
import { RewriteableTextarea } from "./RewriteableTextarea";
import { VersionHistoryDrawer } from "./VersionHistoryDrawer";

/** Lightweight posting summary fed in from the server shell. */
export interface PostingSummary {
  id: string;
  title: string;
  companyName: string;
}

/** Server-returned preview row from POST /api/profile/resume/structure/tailor. */
interface TailorRewriteRow {
  id: string;
  original: string;
  rewritten: string;
  changed: boolean;
}

/** A single undoable removal. Captures the exact data + the position
 *  it was removed from so Undo restores it in place — not appended
 *  at the end. `label` is used in the snackbar UI ("Bullet removed"
 *  / "Item removed" / "Section removed"). */
type RemovalEntry =
  | {
      type: "bullet";
      sectionId: string;
      itemId: string;
      bullet: ResumeBullet;
      position: number;
      label: string;
    }
  | {
      type: "item";
      sectionId: string;
      item: ResumeItem;
      position: number;
      label: string;
    }
  | {
      type: "section";
      section: ResumeSection;
      position: number;
      label: string;
    };

interface CommentRow {
  id: string;
  authorId: string;
  authorRole: string;
  authorName: string | null;
  authorEmail: string | null;
  body: string;
  status: "open" | "resolved" | "applied";
  anchorBulletId: string | null;
  anchorItemId: string | null;
  anchorSectionId: string | null;
  createdAt: string;
}

interface Props {
  initialResume: {
    id: string;
    content: ResumeContent;
    version: number;
    parsedAt: string | null;
    sourceFileUrl: string | null;
  };
  initialComments: CommentRow[];
  /** When true, show the "AI parse from uploaded file" CTA. */
  canParse: boolean;
  ownerId: string;
  /** Postings the trainee can tailor their resume against. When the
   *  array is empty, the "Tailor to posting" toolbar is hidden. */
  postings?: PostingSummary[];
}

const DEBOUNCE_MS = 600;

export function ResumeEditor({
  initialResume, initialComments, canParse, ownerId, postings = [],
}: Props) {
  const router = useRouter();
  const [versionsOpen, setVersionsOpen] = useState(false);
  const [content, setContent] = useState<ResumeContent>(initialResume.content);
  const [comments, setComments] = useState<CommentRow[]>(initialComments);
  const [version, setVersion] = useState(initialResume.version);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [parsing, startParse] = useTransition();
  const [parseError, setParseError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstRender = useRef(true);

  // ── Per-bullet AI rewrite state ─────────────────────────────────
  //   key   — bullet id
  //   value — { original, rewritten } preview waiting for accept/cancel
  const [rewritePreviews, setRewritePreviews] = useState<Map<string, { original: string; rewritten: string }>>(new Map());
  const [rewriteBusyId, setRewriteBusyId] = useState<string | null>(null);
  const [rewriteError, setRewriteError] = useState<{ bulletId: string; msg: string } | null>(null);

  // ── Whole-resume "Tailor to posting" state ──────────────────────
  const [tailorOpen, setTailorOpen] = useState(false);
  const [tailorPostingId, setTailorPostingId] = useState<string>("");
  const [tailorBusy, setTailorBusy] = useState<"preview" | "apply" | null>(null);
  const [tailorError, setTailorError] = useState<string | null>(null);
  const [tailorPreview, setTailorPreview] = useState<TailorRewriteRow[] | null>(null);
  // Per-row edited text for the Tailor preview. Initialised from the
  // AI's `rewritten` when the preview lands; the user can tweak each
  // row's textarea before applying. Apply functions look up the
  // edited text rather than the raw AI output so manual tweaks land
  // verbatim in the resume.
  const [tailorEdits, setTailorEdits] = useState<Map<string, string>>(new Map());

  // ── Undo stack for removals ─────────────────────────────────────
  // Push removed bullets / items / sections here so an accidental X
  // click is one tap away from being restored. Stack supports many
  // undos in a row — pops the most recent on each Undo click. Lives
  // on the editor instance; clears on next remount (seed / clear /
  // AI-parse force a remount which is the right time to start fresh).
  const [removedStack, setRemovedStack] = useState<RemovalEntry[]>([]);

  // ── Auto-save: any change to `content` triggers a debounced PATCH ──
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSaving(true);
      try {
        const r = await fetch("/api/profile/resume/structure", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content }),
        });
        const j = (await r.json().catch(() => ({}))) as { ok?: boolean; resume?: { version: number } };
        if (j.ok && j.resume?.version) setVersion(j.resume.version);
        setSavedAt(new Date());
      } finally { setSaving(false); }
    }, DEBOUNCE_MS);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [content]);

  // ── Comments grouped by anchor for fast lookups ──
  const commentsByBullet  = useMemo(() => indexComments(comments, "anchorBulletId"),  [comments]);
  const commentsBySection = useMemo(() => indexComments(comments, "anchorSectionId"), [comments]);
  const wholeResumeComments = useMemo(
    () => comments.filter((c) => !c.anchorBulletId && !c.anchorItemId && !c.anchorSectionId),
    [comments],
  );

  // ── AI parse handler ──
  function runParse() {
    setParseError(null);
    startParse(async () => {
      try {
        const r = await fetch("/api/profile/resume/structure/parse", { method: "POST" });
        const j = (await r.json().catch(() => ({}))) as { ok?: boolean; error?: string; resume?: { content: ResumeContent; version: number } };
        if (!r.ok || !j.ok || !j.resume) {
          setParseError(j.error ?? "Parse failed");
          return;
        }
        setContent(j.resume.content);
        setVersion(j.resume.version);
        setSavedAt(new Date());
      } catch (e) {
        setParseError((e as Error).message);
      }
    });
  }

  // ── Per-bullet rewrite ──────────────────────────────────────────
  // 1. Preview path — no DB write, user accepts/cancels inline.
  // 2. Comment-driven path — calls with apply:true so the server
  //    persists immediately + marks the source comment "applied"
  //    (closes the loop on the mentor's suggestion in one click).
  async function previewBulletRewrite(bulletId: string, commentId?: string) {
    setRewriteError(null);
    setRewriteBusyId(bulletId);
    try {
      const r = await fetch("/api/profile/resume/structure/rewrite-bullet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bulletId, commentId }),
      });
      const j = (await r.json().catch(() => ({}))) as {
        ok?: boolean; error?: string;
        original?: string; rewritten?: string; changed?: boolean;
      };
      if (!r.ok || !j.ok || !j.rewritten || !j.original) {
        setRewriteError({ bulletId, msg: j.error ?? "AI rewrite failed." });
        return;
      }
      if (j.changed === false) {
        setRewriteError({ bulletId, msg: "AI returned an essentially identical bullet." });
        return;
      }
      setRewritePreviews((m) => {
        const next = new Map(m);
        next.set(bulletId, { original: j.original!, rewritten: j.rewritten! });
        return next;
      });
    } finally {
      setRewriteBusyId(null);
    }
  }
  function acceptBulletRewrite(bulletId: string, edited?: string) {
    const preview = rewritePreviews.get(bulletId);
    if (!preview) return;
    // The trainee can edit the "Proposed" textarea before accepting,
    // so `edited` overrides the AI's exact output. Falls back to the
    // raw AI text if the diff card didn't pass one through.
    const finalText = (edited ?? preview.rewritten).trim();
    if (!finalText) return;
    setContent((c) => ({
      ...c,
      sections: c.sections.map((s) => ({
        ...s,
        items: s.items.map((it) => ({
          ...it,
          bullets: it.bullets.map((b) =>
            b.id === bulletId ? { ...b, body: finalText, aiSuggested: true } : b,
          ),
        })),
      })),
    }));
    setRewritePreviews((m) => {
      const next = new Map(m);
      next.delete(bulletId);
      return next;
    });
  }
  function dismissBulletRewrite(bulletId: string) {
    setRewritePreviews((m) => {
      const next = new Map(m);
      next.delete(bulletId);
      return next;
    });
    setRewriteError(null);
  }

  /** Comment-driven rewrite. Server applies + marks the comment
   *  applied; client refreshes both the bullet body and the comment
   *  row to match. */
  async function applyCommentWithAI(commentId: string, bulletId: string) {
    setRewriteError(null);
    setRewriteBusyId(bulletId);
    try {
      const r = await fetch("/api/profile/resume/structure/rewrite-bullet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bulletId, commentId, apply: true }),
      });
      const j = (await r.json().catch(() => ({}))) as {
        ok?: boolean; error?: string; rewritten?: string; version?: number; changed?: boolean;
      };
      if (!r.ok || !j.ok) {
        setRewriteError({ bulletId, msg: j.error ?? "AI rewrite failed." });
        return;
      }
      if (j.changed === false || !j.rewritten) {
        setRewriteError({ bulletId, msg: "AI returned an essentially identical bullet." });
        return;
      }
      // Patch local state to match what the server wrote.
      const rewritten = j.rewritten;
      setContent((c) => ({
        ...c,
        sections: c.sections.map((s) => ({
          ...s,
          items: s.items.map((it) => ({
            ...it,
            bullets: it.bullets.map((b) =>
              b.id === bulletId ? { ...b, body: rewritten, aiSuggested: true } : b,
            ),
          })),
        })),
      }));
      if (j.version) setVersion(j.version);
      setSavedAt(new Date());
      // Server also marks the comment applied — sync locally.
      setComments((cur) => cur.map((c) => (c.id === commentId ? { ...c, status: "applied" } : c)));
    } finally {
      setRewriteBusyId(null);
    }
  }

  // ── Tailor to posting ──────────────────────────────────────────
  async function runTailorPreview() {
    if (!tailorPostingId) return;
    setTailorError(null);
    setTailorPreview(null);
    setTailorEdits(new Map());
    setTailorBusy("preview");
    try {
      const r = await fetch("/api/profile/resume/structure/tailor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postingId: tailorPostingId }),
      });
      const j = (await r.json().catch(() => ({}))) as {
        ok?: boolean; error?: string; rewrites?: TailorRewriteRow[]; note?: string;
      };
      if (!r.ok || !j.ok) {
        setTailorError(j.error ?? "Tailor failed.");
        return;
      }
      const changed = (j.rewrites ?? []).filter((row) => row.changed);
      setTailorPreview(changed);
      // Seed each row's editable text from the AI output so the user
      // sees the AI's suggestion in the textarea — they can edit
      // before clicking Apply per-row or Apply all.
      const seeded = new Map<string, string>();
      for (const row of changed) seeded.set(row.id, row.rewritten);
      setTailorEdits(seeded);
      if (changed.length === 0) {
        setTailorError(j.note ?? "No bullets needed rewriting for this posting.");
      }
    } finally {
      setTailorBusy(null);
    }
  }

  /** Apply a single tailor-preview row using whatever's in its
   *  textarea right now. Mutates local content state; auto-save
   *  persists via the standard PATCH path. Removes the row from the
   *  preview list so the user sees their queue shrink as they accept. */
  function applyTailorRow(bulletId: string) {
    const edited = (tailorEdits.get(bulletId) ?? "").trim();
    if (!edited) return;
    setContent((c) => ({
      ...c,
      sections: c.sections.map((s) => ({
        ...s,
        items: s.items.map((it) => ({
          ...it,
          bullets: it.bullets.map((b) =>
            b.id === bulletId ? { ...b, body: edited, aiSuggested: true } : b,
          ),
        })),
      })),
    }));
    setTailorPreview((rows) => (rows ? rows.filter((r) => r.id !== bulletId) : rows));
    setTailorEdits((m) => {
      const next = new Map(m);
      next.delete(bulletId);
      return next;
    });
  }

  /** Apply every remaining tailor-preview row using each row's edited
   *  text. Same client-side mutation pattern as applyTailorRow but in
   *  bulk; auto-save snapshots one revision after the debounce. */
  function runTailorApply() {
    if (!tailorPreview || tailorPreview.length === 0) return;
    setTailorError(null);
    setTailorBusy("apply");
    try {
      const edits = new Map(tailorEdits); // snapshot
      setContent((c) => ({
        ...c,
        sections: c.sections.map((s) => ({
          ...s,
          items: s.items.map((it) => ({
            ...it,
            bullets: it.bullets.map((b) => {
              const next = edits.get(b.id);
              return next && next.trim() ? { ...b, body: next.trim(), aiSuggested: true } : b;
            }),
          })),
        })),
      }));
      setSavedAt(new Date());
      setTailorPreview(null);
      setTailorEdits(new Map());
      setTailorOpen(false);
    } finally {
      setTailorBusy(null);
    }
  }

  async function updateCommentStatus(id: string, status: "open" | "resolved" | "applied") {
    const prev = comments;
    setComments((cur) => cur.map((c) => (c.id === id ? { ...c, status } : c)));
    try {
      const r = await fetch(`/api/resume/${ownerId}/comments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!r.ok) throw new Error("status update failed");
    } catch {
      // revert on failure
      setComments(prev);
    }
  }

  // ── Tree mutation helpers ──
  function updateSection(sIdx: number, patch: Partial<ResumeSection>) {
    setContent((c) => ({
      ...c,
      sections: c.sections.map((s, i) => (i === sIdx ? { ...s, ...patch } : s)),
    }));
  }
  function removeSection(sIdx: number) {
    setContent((c) => {
      const section = c.sections[sIdx];
      if (section) {
        const heading = section.title ?? SECTION_LABEL[section.kind];
        pushRemoval({
          type: "section",
          section,
          position: sIdx,
          label: `Section · ${heading}`,
        });
      }
      return { ...c, sections: c.sections.filter((_, i) => i !== sIdx) };
    });
  }
  function addSection() {
    setContent((c) => ({
      ...c,
      sections: [...c.sections, { id: rid(), kind: "other", position: c.sections.length, items: [] }],
    }));
  }
  function moveSection(sIdx: number, dir: -1 | 1) {
    setContent((c) => {
      const next = [...c.sections];
      const tgt = sIdx + dir;
      if (tgt < 0 || tgt >= next.length) return c;
      [next[sIdx], next[tgt]] = [next[tgt], next[sIdx]];
      return { ...c, sections: next.map((s, i) => ({ ...s, position: i })) };
    });
  }
  function addItem(sIdx: number) {
    setContent((c) => ({
      ...c,
      sections: c.sections.map((s, i) =>
        i === sIdx
          ? { ...s, items: [...s.items, { id: rid(), position: s.items.length, bullets: [] }] }
          : s
      ),
    }));
  }
  function updateItem(sIdx: number, iIdx: number, patch: Partial<ResumeItem>) {
    setContent((c) => ({
      ...c,
      sections: c.sections.map((s, i) =>
        i === sIdx
          ? { ...s, items: s.items.map((it, j) => (j === iIdx ? { ...it, ...patch } : it)) }
          : s
      ),
    }));
  }
  function removeItem(sIdx: number, iIdx: number) {
    setContent((c) => {
      const section = c.sections[sIdx];
      const item = section?.items[iIdx];
      if (section && item) {
        const labelBits = [item.title, item.subtitle].filter(Boolean).join(" — ");
        pushRemoval({
          type: "item",
          sectionId: section.id,
          item,
          position: iIdx,
          label: labelBits ? `Item · ${labelBits}` : "Item",
        });
      }
      return {
        ...c,
        sections: c.sections.map((s, i) =>
          i === sIdx ? { ...s, items: s.items.filter((_, j) => j !== iIdx) } : s
        ),
      };
    });
  }
  function addBullet(sIdx: number, iIdx: number) {
    setContent((c) => ({
      ...c,
      sections: c.sections.map((s, i) =>
        i === sIdx
          ? {
              ...s,
              items: s.items.map((it, j) =>
                j === iIdx
                  ? { ...it, bullets: [...it.bullets, { id: rid(), position: it.bullets.length, body: "" }] }
                  : it
              ),
            }
          : s
      ),
    }));
  }
  function updateBullet(sIdx: number, iIdx: number, bIdx: number, patch: Partial<ResumeBullet>) {
    setContent((c) => ({
      ...c,
      sections: c.sections.map((s, i) =>
        i === sIdx
          ? {
              ...s,
              items: s.items.map((it, j) =>
                j === iIdx
                  ? {
                      ...it,
                      bullets: it.bullets.map((b, k) => (k === bIdx ? { ...b, ...patch } : b)),
                    }
                  : it
              ),
            }
          : s
      ),
    }));
  }
  function removeBullet(sIdx: number, iIdx: number, bIdx: number) {
    setContent((c) => {
      const section = c.sections[sIdx];
      const item = section?.items[iIdx];
      const bullet = item?.bullets[bIdx];
      if (section && item && bullet) {
        const preview = bullet.body.trim().slice(0, 60);
        pushRemoval({
          type: "bullet",
          sectionId: section.id,
          itemId: item.id,
          bullet,
          position: bIdx,
          label: preview ? `Bullet · "${preview}${bullet.body.length > 60 ? "…" : ""}"` : "Empty bullet",
        });
      }
      return {
        ...c,
        sections: c.sections.map((s, i) =>
          i === sIdx
            ? {
                ...s,
                items: s.items.map((it, j) =>
                  j === iIdx ? { ...it, bullets: it.bullets.filter((_, k) => k !== bIdx) } : it
                ),
              }
            : s
        ),
      };
    });
  }

  // ── Undo for removals ───────────────────────────────────────────
  function pushRemoval(entry: RemovalEntry) {
    setRemovedStack((s) => [...s, entry]);
  }
  function undoLastRemoval() {
    setRemovedStack((stack) => {
      if (stack.length === 0) return stack;
      const entry = stack[stack.length - 1];
      // Restore via setContent. Splice the data back at its original
      // position so the resume reads the same as before the X click.
      setContent((c) => restoreRemoval(c, entry));
      return stack.slice(0, -1);
    });
  }
  function dismissUndo() {
    // User waves off the snackbar — clear the most recent entry only,
    // so older removals from earlier still have undo on the next click.
    setRemovedStack((s) => s.slice(0, -1));
  }

  // ── Header field updates ──
  function updateHeader(patch: Partial<NonNullable<ResumeContent["header"]>>) {
    setContent((c) => ({ ...c, header: { ...(c.header ?? {}), ...patch } }));
  }

  return (
    <div className="space-y-5">
      {/* Save status + AI parse CTA + Tailor-to-posting toolbar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <SaveStatus saving={saving} version={version} savedAt={savedAt} />
        <div className="flex items-center gap-2 flex-wrap">
          {canParse && (
            <button
              type="button"
              onClick={runParse}
              disabled={parsing}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50 transition-colors"
            >
              {parsing ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
              AI-parse my uploaded resume
            </button>
          )}
          {postings.length > 0 && (
            <button
              type="button"
              onClick={() => setTailorOpen((v) => !v)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold bg-elevated text-fg ring-1 ring-line hover:bg-card transition-colors"
            >
              <Target size={12} /> Tailor to posting
            </button>
          )}
          {/* Versions — opens the side drawer with every snapshot. */}
          <button
            type="button"
            onClick={() => setVersionsOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold bg-elevated text-fg ring-1 ring-line hover:bg-card transition-colors"
            title="Browse every saved version of your resume"
          >
            <Clock size={12} /> Versions
          </button>
          {/* Preview PDF — opens a print-styled page that the browser
              can save as PDF. Same tab so the editor's draft state
              (Tailor preview, AI rewrite previews, undo stack) isn't
              left orphaned in the background. */}
          <Link
            href="/profile/resume/preview"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold bg-elevated text-fg ring-1 ring-line hover:bg-card transition-colors"
            title="Preview your resume in print layout — save as PDF from there"
          >
            <Printer size={12} /> Preview PDF
          </Link>
          {parseError && (
            <span className="text-[11px] text-rose-700">{parseError}</span>
          )}
        </div>
      </div>

      {/* Tailor toolbar — picker + preview diff + per-row + apply-all */}
      {tailorOpen && postings.length > 0 && (
        <TailorPanel
          postings={postings}
          postingId={tailorPostingId}
          onPostingId={setTailorPostingId}
          busy={tailorBusy}
          error={tailorError}
          preview={tailorPreview}
          edits={tailorEdits}
          onEditRow={(id, text) => {
            setTailorEdits((m) => {
              const next = new Map(m);
              next.set(id, text);
              return next;
            });
          }}
          onApplyRow={applyTailorRow}
          onPreview={runTailorPreview}
          onApply={runTailorApply}
          onClose={() => {
            setTailorOpen(false);
            setTailorPreview(null);
            setTailorEdits(new Map());
            setTailorError(null);
          }}
        />
      )}

      {/* Header block */}
      <section className="bg-card-solid border border-line rounded-2xl p-5">
        <h2 className="text-[10px] font-mono uppercase tracking-[0.28em] font-bold text-fg-muted mb-3">Header</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="Name"     value={content.header?.name     ?? ""} onChange={(v) => updateHeader({ name:     v })} />
          <Field label="Email"    value={content.header?.email    ?? ""} onChange={(v) => updateHeader({ email:    v })} />
          <Field label="Phone"    value={content.header?.phone    ?? ""} onChange={(v) => updateHeader({ phone:    v })} />
          <Field label="Location" value={content.header?.location ?? ""} onChange={(v) => updateHeader({ location: v })} />
        </div>
        <div className="mt-3">
          <RewriteableTextarea
            label="Summary"
            value={content.header?.summary ?? ""}
            onChange={(v) => updateHeader({ summary: v })}
            placeholder="2-3 sentences for the top of the resume — what you do, what you specialise in, what you're looking for."
            rows={3}
            rewriteContext="Resume header — professional summary paragraph"
            rewriteInstruction="Keep it 2-3 sentences max. Lead with what they do, end with what they're looking for."
          />
        </div>
      </section>

      {/* Whole-resume comments */}
      {wholeResumeComments.length > 0 && (
        <CommentList
          title="Comments on the whole resume"
          comments={wholeResumeComments}
          onStatus={updateCommentStatus}
        />
      )}

      {/* Sections */}
      {content.sections.map((section, sIdx) => (
        <section key={section.id} className="bg-card-solid border border-line rounded-2xl p-5">
          <div className="flex items-start justify-between gap-2 mb-3 flex-wrap">
            <div className="flex items-center gap-2">
              <select
                value={section.kind}
                onChange={(e) => updateSection(sIdx, { kind: e.target.value as ResumeSectionKind })}
                className="bg-card border border-line rounded-md px-2 py-1 text-xs font-mono uppercase tracking-[0.18em] font-bold text-fg-muted"
              >
                {(Object.keys(SECTION_LABEL) as ResumeSectionKind[]).map((k) => (
                  <option key={k} value={k}>{SECTION_LABEL[k]}</option>
                ))}
              </select>
              <input
                type="text"
                placeholder={`Custom title (defaults to "${SECTION_LABEL[section.kind]}")`}
                value={section.title ?? ""}
                onChange={(e) => updateSection(sIdx, { title: e.target.value })}
                className="bg-transparent border-0 text-base font-semibold text-fg focus:outline-none focus:bg-card rounded px-2 py-0.5 -ml-2"
              />
            </div>
            <div className="flex items-center gap-1">
              <IconBtn onClick={() => moveSection(sIdx, -1)} title="Move up"><ChevronUp size={12} /></IconBtn>
              <IconBtn onClick={() => moveSection(sIdx, +1)} title="Move down"><ChevronDown size={12} /></IconBtn>
              <IconBtn onClick={() => removeSection(sIdx)} title="Remove section" danger><Trash2 size={12} /></IconBtn>
            </div>
          </div>

          {/* Section-level comments */}
          {commentsBySection.get(section.id)?.length ? (
            <CommentList
              compact
              title={null}
              comments={commentsBySection.get(section.id)!}
              onStatus={updateCommentStatus}
            />
          ) : null}

          {/* Items — rendered via the kind-aware editor so Experience
              gets start/end + currently here, Education gets GPA,
              Projects gets a URL, etc. Bullets are still owned by
              this parent so the comment-thread / AI-rewrite handlers
              stay wired in one place. */}
          <div className="space-y-3">
            {section.items.map((item, iIdx) => {
              const hint = SECTION_HINTS[section.kind];
              return (
                <ResumeItemEditor
                  key={item.id}
                  kind={section.kind}
                  item={item}
                  onPatch={(patch) => updateItem(sIdx, iIdx, patch)}
                  onRemove={() => removeItem(sIdx, iIdx)}
                  bulletsSlot={hint.showBullets ? (
                    <div className="space-y-1.5">
                      {hint.bulletLabel && (
                        <p className="text-[10px] uppercase tracking-[0.22em] font-semibold text-fg-subtle mt-1">
                          {hint.bulletLabel}
                        </p>
                      )}
                      {item.bullets.map((bullet, bIdx) => {
                        const bulletComments = commentsByBullet.get(bullet.id) ?? [];
                        return (
                          <BulletRow
                            key={bullet.id}
                            bullet={bullet}
                            comments={bulletComments}
                            placeholder={hint.bulletPlaceholder}
                            onChange={(v) => updateBullet(sIdx, iIdx, bIdx, { body: v, aiSuggested: false })}
                            onRemove={() => removeBullet(sIdx, iIdx, bIdx)}
                            onCommentStatus={updateCommentStatus}
                            onRewrite={() => previewBulletRewrite(bullet.id)}
                            onApplyCommentWithAI={(commentId) => applyCommentWithAI(commentId, bullet.id)}
                            rewriting={rewriteBusyId === bullet.id}
                            rewritePreview={rewritePreviews.get(bullet.id) ?? null}
                            onAcceptRewrite={(edited) => acceptBulletRewrite(bullet.id, edited)}
                            onDismissRewrite={() => dismissBulletRewrite(bullet.id)}
                            rewriteError={rewriteError && rewriteError.bulletId === bullet.id ? rewriteError.msg : null}
                          />
                        );
                      })}
                      <button
                        type="button"
                        onClick={() => addBullet(sIdx, iIdx)}
                        className="text-[11px] text-fg-muted hover:text-brand-700 inline-flex items-center gap-1 px-2 py-1"
                      >
                        <Plus size={11} /> Add {section.kind === "skills" ? "skill" : "bullet"}
                      </button>
                    </div>
                  ) : null}
                />
              );
            })}
            <button
              type="button"
              onClick={() => addItem(sIdx)}
              className="text-xs text-fg-muted hover:text-brand-700 inline-flex items-center gap-1 px-2 py-1"
            >
              <Plus size={12} /> Add an entry
            </button>
          </div>
        </section>
      ))}

      <button
        type="button"
        onClick={addSection}
        className="w-full text-sm text-fg-muted hover:text-brand-700 inline-flex items-center justify-center gap-1.5 py-3 border border-dashed border-line rounded-2xl hover:border-brand-300 transition-colors"
      >
        <Plus size={14} /> Add another section
      </button>

      {/* Undo snackbar — pinned to viewport bottom-right. Renders only
          when there's something to undo; multiple removals stack. */}
      <UndoSnackbar
        stack={removedStack}
        onUndo={undoLastRemoval}
        onDismiss={dismissUndo}
      />

      {/* Version-history drawer — opens from the toolbar "Versions"
          button. After a successful revert we router.refresh() so the
          server re-fetches the resume; the key-based remount on
          /profile/resume picks up the new version and replaces the
          editor's state with the reverted content. */}
      <VersionHistoryDrawer
        open={versionsOpen}
        onClose={() => setVersionsOpen(false)}
        ownerId={ownerId}
        currentVersion={version}
        onReverted={() => {
          // Close the drawer first (its onClose runs before this),
          // then ask the server for a fresh page render. The next
          // mount of ResumeEditor will hold the reverted content.
          router.refresh();
        }}
      />
    </div>
  );
}

/* ── Small UI bits ─────────────────────────────────────────────── */

function SaveStatus({ saving, version, savedAt }: { saving: boolean; version: number; savedAt: Date | null }) {
  let label = "Auto-saves";
  if (saving) label = "Saving…";
  else if (savedAt) label = `Saved · v${version}`;
  else label = `v${version}`;
  return (
    <p className="text-[10.5px] font-mono uppercase tracking-[0.22em] text-fg-subtle inline-flex items-center gap-1.5">
      {saving ? <Loader2 size={11} className="animate-spin" /> : <Save size={11} />}
      {label}
    </p>
  );
}

function Field({
  label, value, onChange, multiline,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-[10px] uppercase tracking-[0.22em] font-semibold text-fg-subtle">{label}</span>
      <div className="mt-1">
        {multiline ? (
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            rows={3}
            className="w-full bg-card border border-line rounded-md px-2 py-1.5 text-sm focus:outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-100"
          />
        ) : (
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full bg-card border border-line rounded-md px-2 py-1.5 text-sm focus:outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-100"
          />
        )}
      </div>
    </label>
  );
}

function IconBtn({
  children, onClick, title, danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title: string;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={
        "p-1.5 rounded-md transition-colors " +
        (danger
          ? "text-rose-600 hover:bg-rose-50"
          : "text-fg-muted hover:bg-elevated hover:text-fg")
      }
    >
      {children}
    </button>
  );
}

function BulletRow({
  bullet, comments, onChange, onRemove, onCommentStatus,
  onRewrite, onApplyCommentWithAI, rewriting, rewritePreview, onAcceptRewrite, onDismissRewrite, rewriteError,
  placeholder,
}: {
  bullet: ResumeBullet;
  comments: CommentRow[];
  onChange: (v: string) => void;
  onRemove: () => void;
  onCommentStatus: (id: string, status: "open" | "resolved" | "applied") => void;
  onRewrite: () => void;
  onApplyCommentWithAI: (commentId: string) => void;
  rewriting: boolean;
  rewritePreview: { original: string; rewritten: string } | null;
  onAcceptRewrite: (edited?: string) => void;
  onDismissRewrite: () => void;
  rewriteError: string | null;
  placeholder?: string;
}) {
  const [showThread, setShowThread] = useState(false);
  const openCount = comments.filter((c) => c.status === "open").length;
  const hasBody = bullet.body.trim().length > 0;
  return (
    <div className="space-y-1.5">
      <div className="flex items-start gap-2">
        <GripVertical size={12} className="text-fg-subtle mt-2 shrink-0" />
        <textarea
          value={bullet.body}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder ?? "One bullet — what you did and the outcome"}
          // rows=2 gives a comfortable starting height; the
          // field-sizing:content rule (where supported) auto-grows
          // as the user types; resize-y is the universal fallback.
          rows={2}
          style={{ fieldSizing: "content" } as React.CSSProperties}
          className={
            "flex-1 bg-card-solid border border-line text-sm leading-snug py-1.5 px-2 rounded-md resize-y min-h-[44px] " +
            "focus:outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-100 " +
            (bullet.aiSuggested ? "border-l-2 border-l-brand-400 bg-brand-50/30 pl-2" : "")
          }
        />
        {/* "Rewrite with AI" — only shown when the bullet has content;
            opens an inline diff card under the row that the user
            accepts or dismisses. No DB write happens until accept. */}
        {hasBody && (
          <button
            type="button"
            onClick={onRewrite}
            disabled={rewriting}
            title="Rewrite this bullet with AI"
            className="shrink-0 inline-flex items-center gap-1 text-[10.5px] uppercase tracking-[0.16em] font-bold px-2 py-1 rounded-full ring-1 ring-inset bg-brand-50 text-brand-800 ring-brand-200 hover:bg-brand-100 disabled:opacity-50 transition-colors"
          >
            {rewriting ? <Loader2 size={9} className="animate-spin" /> : <Wand2 size={9} />}
            Rewrite
          </button>
        )}
        {comments.length > 0 && (
          <button
            type="button"
            onClick={() => setShowThread((v) => !v)}
            className={
              "shrink-0 inline-flex items-center gap-1 text-[10.5px] uppercase tracking-[0.16em] font-bold px-2 py-1 rounded-full ring-1 ring-inset transition-colors " +
              (openCount > 0
                ? "bg-amber-50 text-amber-800 ring-amber-200 hover:bg-amber-100"
                : "bg-elevated text-fg-muted ring-line hover:bg-card")
            }
            title={`${comments.length} comment${comments.length === 1 ? "" : "s"} · ${openCount} open`}
          >
            <MessageCircle size={9} /> {comments.length}
            {openCount > 0 && <span className="font-semibold">· {openCount} open</span>}
          </button>
        )}
        <IconBtn onClick={onRemove} title="Remove bullet" danger><X size={11} /></IconBtn>
      </div>

      {/* Inline rewrite preview — original vs proposed, accept/dismiss */}
      {rewritePreview && (
        <RewriteDiff
          original={rewritePreview.original}
          rewritten={rewritePreview.rewritten}
          onAccept={onAcceptRewrite}
          onDismiss={onDismissRewrite}
        />
      )}
      {rewriteError && !rewritePreview && (
        <div className="ml-6 text-[11px] text-rose-700 inline-flex items-center gap-1.5">
          {rewriteError}
          <button type="button" onClick={onDismissRewrite} className="underline">dismiss</button>
        </div>
      )}

      {showThread && comments.length > 0 && (
        <div className="ml-6">
          <CommentList
            compact
            comments={comments}
            onStatus={onCommentStatus}
            title={null}
            onApplyWithAI={onApplyCommentWithAI}
          />
        </div>
      )}
    </div>
  );
}

/** Side-by-side diff card for an AI bullet rewrite. The trainee owns
 *  the accept decision — nothing persists until they click Accept.
 *  The "Proposed" pane is an editable textarea so the trainee can
 *  tweak the AI suggestion before accepting (e.g. soften the tone,
 *  drop a hallucinated number, shorten by a few words). The original
 *  stays read-only so the diff stays a diff. */
function RewriteDiff({
  original, rewritten, onAccept, onDismiss,
}: {
  original: string;
  rewritten: string;
  onAccept: (edited: string) => void;
  onDismiss: () => void;
}) {
  // Initialise the editable proposed-text from the AI output. A `key`
  // on this component (its place in the tree) means React mounts a
  // fresh state every time a new preview opens, so we don't need to
  // sync `rewritten` into the state on re-render.
  const [edited, setEdited] = useState(rewritten);
  return (
    <div className="ml-6 rounded-xl border border-brand-200 bg-brand-50/40 p-3 space-y-2">
      <p className="text-[10px] font-mono uppercase tracking-[0.22em] font-bold text-brand-800 inline-flex items-center gap-1.5">
        <Wand2 size={10} /> AI rewrite — preview · edit before accepting
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div className="rounded-md bg-card-solid border border-line p-2">
          <p className="text-[10px] uppercase tracking-[0.18em] font-semibold text-fg-subtle mb-1">Original</p>
          <p className="text-sm text-fg leading-snug">{original}</p>
        </div>
        <div className="rounded-md bg-card-solid border border-brand-300 p-2">
          <p className="text-[10px] uppercase tracking-[0.18em] font-semibold text-brand-700 mb-1">Proposed (editable)</p>
          <textarea
            value={edited}
            onChange={(e) => setEdited(e.target.value)}
            rows={3}
            // Mirror the bullet textarea styling so the editing
            // affordance reads as "this is a normal text input".
            className="w-full bg-card-solid border border-line rounded-md px-2 py-1.5 text-sm leading-snug focus:outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-100 resize-y"
            onKeyDown={(e) => {
              // Cmd / Ctrl + Enter accepts — keeps hands on keyboard
              // for power users who want to skim, tweak, accept.
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                e.preventDefault();
                onAccept(edited);
              }
            }}
          />
        </div>
      </div>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <button
          type="button"
          onClick={() => setEdited(rewritten)}
          disabled={edited === rewritten}
          className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium text-fg-muted hover:bg-fg/5 disabled:opacity-50"
          title="Restore the AI's original wording"
        >
          Reset to AI
        </button>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onDismiss}
            className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium text-fg-muted hover:bg-fg/5"
          >
            <X size={11} /> Dismiss
          </button>
          <button
            type="button"
            onClick={() => onAccept(edited)}
            disabled={edited.trim().length === 0}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-brand-600 text-white text-[11px] font-semibold hover:bg-brand-700 transition-colors disabled:opacity-50"
          >
            <CheckCircle2 size={11} /> Accept rewrite
          </button>
        </div>
      </div>
    </div>
  );
}

function CommentList({
  comments, onStatus, title, compact, onApplyWithAI,
}: {
  comments: CommentRow[];
  onStatus: (id: string, status: "open" | "resolved" | "applied") => void;
  title: string | null;
  compact?: boolean;
  /** When provided, each open comment shows an "AI apply" button that
   *  rewrites the anchored bullet using this comment as guidance and
   *  auto-marks the comment applied on success. Only meaningful for
   *  bullet-anchored threads — pass-through is hidden otherwise. */
  onApplyWithAI?: (commentId: string) => void;
}) {
  return (
    <div className={"rounded-xl border border-amber-200 bg-amber-50/40 " + (compact ? "p-2" : "p-3")}>
      {title && (
        <p className="text-[10px] font-mono uppercase tracking-[0.22em] font-bold text-amber-800 mb-2">{title}</p>
      )}
      <ul className={"space-y-2 " + (compact ? "" : "")}>
        {comments.map((c) => {
          const author = c.authorName ?? c.authorEmail?.split("@")[0] ?? "Reviewer";
          const canAiApply = !!onApplyWithAI && !!c.anchorBulletId && c.status !== "applied";
          return (
            <li key={c.id} className="bg-card-solid border border-line rounded-md px-2.5 py-1.5">
              <div className="flex items-start gap-2 flex-wrap">
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-mono uppercase tracking-[0.16em] text-fg-subtle">
                    {author} · {c.authorRole} · {new Date(c.createdAt).toLocaleDateString("en-CA", { month: "short", day: "numeric" })}
                  </p>
                  <p className="text-[13px] text-fg mt-0.5 whitespace-pre-wrap">{c.body}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {canAiApply && (
                    <button
                      type="button"
                      onClick={() => onApplyWithAI!(c.id)}
                      className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.16em] px-2 py-0.5 rounded-full bg-brand-50 text-brand-800 ring-1 ring-brand-200 hover:bg-brand-100"
                      title="Rewrite the bullet using this comment as guidance, then mark it applied"
                    >
                      <Wand2 size={9} /> AI apply
                    </button>
                  )}
                  {c.status !== "applied" && (
                    <button
                      type="button"
                      onClick={() => onStatus(c.id, "applied")}
                      className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.16em] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200 hover:bg-emerald-100"
                      title="Mark as applied — you've incorporated this into the bullet"
                    >
                      <CheckCircle2 size={9} /> Applied
                    </button>
                  )}
                  {c.status !== "resolved" && c.status !== "applied" && (
                    <button
                      type="button"
                      onClick={() => onStatus(c.id, "resolved")}
                      className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.16em] px-2 py-0.5 rounded-full bg-elevated text-fg-muted ring-1 ring-line hover:bg-card"
                      title="Mark as resolved — you read this and chose not to act"
                    >
                      Resolved
                    </button>
                  )}
                  {c.status !== "open" && (
                    <span
                      className={
                        "inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.16em] px-2 py-0.5 rounded-full ring-1 ring-inset " +
                        (c.status === "applied"
                          ? "bg-emerald-50 text-emerald-800 ring-emerald-200"
                          : "bg-elevated text-fg-muted ring-line")
                      }
                    >
                      {c.status === "applied" ? <><CheckCircle2 size={9} /> applied</> : "resolved"}
                    </span>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Toolbar that drives whole-resume tailoring. Two-step UX:
 *
 *   1. Pick a posting → click "Preview" → server returns a list of
 *      bullets it wants to rewrite, with original + proposed text.
 *      Nothing is persisted yet; the trainee can preview against a
 *      different posting without polluting their resume.
 *   2. Click "Apply all" → server overwrites the changed bullets,
 *      marks them aiSuggested (brand-tinted left edge in the editor),
 *      and stamps a ResumeRevision tagged "ai_tailor".
 *
 * Each preview row is a compact original / rewritten pair so the
 * trainee can read the diffs before committing. Nothing forces them
 * to apply everything — the explicit two-step is the whole point of
 * separating preview from apply at the API level. */
function TailorPanel({
  postings, postingId, onPostingId, busy, error, preview, edits, onEditRow, onApplyRow, onPreview, onApply, onClose,
}: {
  postings: PostingSummary[];
  postingId: string;
  onPostingId: (v: string) => void;
  busy: "preview" | "apply" | null;
  error: string | null;
  preview: TailorRewriteRow[] | null;
  /** Edited "Proposed" text per row id — initialised from the AI's
   *  suggestion, mutated as the user types in each row's textarea. */
  edits: Map<string, string>;
  onEditRow: (id: string, text: string) => void;
  onApplyRow: (id: string) => void;
  onPreview: () => void;
  onApply: () => void;
  onClose: () => void;
}) {
  return (
    <div className="rounded-2xl border border-brand-200 bg-brand-50/40 p-4 space-y-3">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <p className="text-[10px] font-mono uppercase tracking-[0.22em] font-bold text-brand-800 inline-flex items-center gap-1.5">
            <Target size={11} /> Tailor to posting
          </p>
          <p className="text-[12px] text-fg-muted mt-1 max-w-prose">
            Pick a posting; we&apos;ll preview bullet-level rewrites that align
            with its required skills. You apply only after reviewing the diff.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] text-fg-muted hover:bg-fg/5"
        >
          <X size={11} /> Close
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <select
          value={postingId}
          onChange={(e) => onPostingId(e.target.value)}
          className="bg-card border border-line rounded-md px-2 py-1.5 text-xs focus:outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-100 min-w-[260px]"
        >
          <option value="">— Pick a posting —</option>
          {postings.map((p) => (
            <option key={p.id} value={p.id}>{p.title} · {p.companyName}</option>
          ))}
        </select>
        <button
          type="button"
          onClick={onPreview}
          disabled={!postingId || busy !== null}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-card-solid text-fg ring-1 ring-line hover:bg-elevated disabled:opacity-50 transition-colors"
        >
          {busy === "preview" ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
          Preview rewrites
        </button>
        {preview && preview.length > 0 && (
          <button
            type="button"
            onClick={onApply}
            disabled={busy !== null}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50 transition-colors"
          >
            {busy === "apply" ? <Loader2 size={11} className="animate-spin" /> : <CheckCircle2 size={11} />}
            Apply all {preview.length}
          </button>
        )}
      </div>

      {error && (
        <p className="text-[11px] text-fg-muted bg-card-solid ring-1 ring-line rounded-md px-2.5 py-1.5">
          {error}
        </p>
      )}

      {preview && preview.length > 0 && (
        <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
          {preview.map((row) => {
            const editedText = edits.get(row.id) ?? row.rewritten;
            const dirty = editedText !== row.rewritten;
            return (
              <div key={row.id} className="rounded-lg bg-card-solid ring-1 ring-line p-2.5 space-y-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.18em] font-semibold text-fg-subtle mb-1">Original</p>
                    <p className="text-[13px] text-fg leading-snug">{row.original}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.18em] font-semibold text-brand-700 mb-1">
                      Proposed (editable){dirty && <span className="ml-1 text-[9px] font-normal text-brand-600">· edited</span>}
                    </p>
                    <textarea
                      value={editedText}
                      onChange={(e) => onEditRow(row.id, e.target.value)}
                      rows={Math.max(2, Math.min(6, Math.ceil(editedText.length / 70)))}
                      className="w-full bg-card-solid border border-line rounded-md px-2 py-1.5 text-[13px] leading-snug focus:outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-100 resize-y"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-end gap-1.5">
                  <button
                    type="button"
                    onClick={() => onEditRow(row.id, row.rewritten)}
                    disabled={!dirty}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10.5px] font-medium text-fg-muted hover:bg-fg/5 disabled:opacity-40"
                    title="Restore the AI's original suggestion for this row"
                  >
                    Reset to AI
                  </button>
                  <button
                    type="button"
                    onClick={() => onApplyRow(row.id)}
                    disabled={!editedText.trim()}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-brand-600 text-white text-[11px] font-semibold hover:bg-brand-700 disabled:opacity-50 transition-colors"
                  >
                    <CheckCircle2 size={10} /> Accept this row
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** Splice a previously-removed bullet / item / section back into the
 *  tree at the exact position it came from. The lookups are by id
 *  rather than index so a later removal of a different sibling doesn't
 *  throw the restore off (e.g. you delete bullet A, then bullet B,
 *  then undo — A goes back to its original slot in the now-shrunken
 *  list, clamped to the current length). */
function restoreRemoval(content: ResumeContent, entry: RemovalEntry): ResumeContent {
  if (entry.type === "section") {
    const next = [...content.sections];
    const pos = Math.min(entry.position, next.length);
    next.splice(pos, 0, entry.section);
    return { ...content, sections: next.map((s, i) => ({ ...s, position: i })) };
  }
  if (entry.type === "item") {
    return {
      ...content,
      sections: content.sections.map((s) => {
        if (s.id !== entry.sectionId) return s;
        const next = [...s.items];
        const pos = Math.min(entry.position, next.length);
        next.splice(pos, 0, entry.item);
        return { ...s, items: next.map((it, i) => ({ ...it, position: i })) };
      }),
    };
  }
  // bullet
  return {
    ...content,
    sections: content.sections.map((s) => {
      if (s.id !== entry.sectionId) return s;
      return {
        ...s,
        items: s.items.map((it) => {
          if (it.id !== entry.itemId) return it;
          const next = [...it.bullets];
          const pos = Math.min(entry.position, next.length);
          next.splice(pos, 0, entry.bullet);
          return { ...it, bullets: next.map((b, i) => ({ ...b, position: i })) };
        }),
      };
    }),
  };
}

/** Floating snackbar at the bottom-right showing the most-recent
 *  removal with an Undo button. Multiple removals stack — undoing
 *  reveals the next-most-recent until the stack is empty. Persistent
 *  (no auto-dismiss) so users who notice their mistake a minute later
 *  still get the bullet back. */
function UndoSnackbar({
  stack, onUndo, onDismiss,
}: {
  stack: RemovalEntry[];
  onUndo: () => void;
  onDismiss: () => void;
}) {
  if (stack.length === 0) return null;
  const latest = stack[stack.length - 1];
  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm rounded-xl border border-line bg-card-solid shadow-xl ring-1 ring-line/40 p-3 flex items-center gap-3">
      <div className="min-w-0 flex-1">
        <p className="text-[10px] uppercase tracking-[0.18em] font-bold text-fg-subtle">
          Removed{stack.length > 1 ? ` · ${stack.length} in stack` : ""}
        </p>
        <p className="text-[12.5px] text-fg mt-0.5 truncate">{latest.label}</p>
      </div>
      <button
        type="button"
        onClick={onUndo}
        className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-brand-600 text-white text-[11px] font-bold uppercase tracking-[0.16em] hover:bg-brand-700 transition-colors"
      >
        Undo
      </button>
      <button
        type="button"
        onClick={onDismiss}
        title="Dismiss this notice (the bullet stays removed)"
        className="shrink-0 inline-flex items-center justify-center w-6 h-6 rounded text-fg-muted hover:text-fg hover:bg-elevated"
      >
        <X size={11} />
      </button>
    </div>
  );
}

function indexComments(comments: CommentRow[], key: keyof CommentRow): Map<string, CommentRow[]> {
  const m = new Map<string, CommentRow[]>();
  for (const c of comments) {
    const k = c[key];
    if (typeof k !== "string" || !k) continue;
    const list = m.get(k) ?? [];
    list.push(c);
    m.set(k, list);
  }
  return m;
}
