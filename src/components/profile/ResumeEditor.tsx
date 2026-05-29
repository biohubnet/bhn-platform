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
  Target, Wand2, Clock, Printer, RotateCcw, FileText, Check, Info,
  Library, ArrowUp,
} from "lucide-react";
import type { ResumeContent, ResumeSection, ResumeItem, ResumeBullet, ResumeSectionKind } from "@/lib/resume/types";
import { SECTION_LABEL, SECTION_HINTS, rid } from "@/lib/resume/types";
import { cn } from "@/lib/utils";
import { ResumeItemEditor } from "./ResumeItemEditor";
import { RewriteableTextarea } from "./RewriteableTextarea";
import { VersionHistoryDrawer } from "./VersionHistoryDrawer";
import { ResumeLintPanel } from "./ResumeLintPanel";
import { useConfirmDialog } from "@/components/ui/ConfirmDialog";
import { PullFromMasterDrawer } from "./PullFromMasterDrawer";
import { OPEN_MASTER_DRAWER_EVENT } from "./MasterResumeBanner";

/** Custom MIME the master drawer sets on dataTransfer when a master
 *  bullet is being dragged. The editor's drop targets use it to tell
 *  master pulls apart from in-item bullet reorders without reading
 *  text/plain (browsers don't expose payloads during dragover). */
const MASTER_DRAG_MIME = "application/x-bhn-master-bullet";

/** Lightweight posting summary fed in from the server shell. */
export interface PostingSummary {
  id: string;
  title: string;
  companyName: string;
}

/** One of the user's resumes — feeds the picker dropdown so the user
 *  can switch between Main / Tailored copies without leaving the
 *  editor. The picker drives a navigation to /profile/resume?id=X
 *  which triggers a fresh server-side load via the existing key. */
export interface ResumeSibling {
  id: string;
  name: string;
  lastEditedAt: string;
  derivedForPostingId: string | null;
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
  /** When true, the AI-parse button is enabled — the user has a PDF
   *  uploaded that the parser can read. */
  canParse: boolean;
  /** Has the resume been AI-parsed at least once? Used to flip the
   *  button label between "AI-parse" and "Re-parse" — re-parsing
   *  overwrites the current tree (the prior tree is preserved as a
   *  ResumeRevision so the user can revert if the new parse is worse). */
  hasParsed?: boolean;
  ownerId: string;
  /** Postings the trainee can tailor their resume against. When the
   *  array is empty, the "Tailor to posting" toolbar is hidden. */
  postings?: PostingSummary[];
  /** Every (non-archived) resume the user owns — drives the picker
   *  dropdown at the top of the editor. */
  siblings?: ResumeSibling[];
  /** Display name of the resume currently being edited. */
  currentName?: string;
}

const DEBOUNCE_MS = 600;

export function ResumeEditor({
  initialResume, initialComments, canParse, hasParsed = false, ownerId,
  postings = [], siblings = [], currentName,
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

  // ── Bullet drag-to-reorder state ────────────────────────────────
  // Tracks which bullet (if any) the user is currently dragging by
  // its sIdx / iIdx / bIdx. Restricted to within-item reorder for
  // now — cross-item bullet moves are rare and would force the user
  // to also rewrite which item each one is attributed to.
  const [bulletDrag, setBulletDrag] = useState<
    | { sIdx: number; iIdx: number; bIdx: number; bulletId: string }
    | null
  >(null);

  // ── Pull-from-master state ──────────────────────────────────────
  // The drawer + drop targets surface bullets from the user's master
  // library. Opens via either:
  //   - the "Pull from master" button on the MasterResumeBanner
  //     (banner dispatches a window CustomEvent we listen for here),
  //   - or programmatic open via the same path.
  // Drops happen on bullet rows + the bullets-list area inside each
  // resume item; the pullFromMaster helper persists the insertion via
  // /api/profile/resume/[id]/pull-from-master and replaces local
  // content with the server's response.
  const [masterDrawerOpen, setMasterDrawerOpen] = useState(false);
  const [masterPullError, setMasterPullError] = useState<string | null>(null);
  // Skip-flag for the auto-save effect — set to true RIGHT BEFORE we
  // setContent from a server-authoritative response (pull-from-master).
  // Without this, the auto-save effect would immediately PATCH the
  // same content back to the server, double-bumping the version and
  // updating the just-recorded revision in place (coalesce window).
  const skipNextAutoSave = useRef(false);

  // Listen for the banner-dispatched open event.
  useEffect(() => {
    function handler() { setMasterDrawerOpen(true); }
    window.addEventListener(OPEN_MASTER_DRAWER_EVENT, handler);
    return () => window.removeEventListener(OPEN_MASTER_DRAWER_EVENT, handler);
  }, []);

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
  // When checked, the Apply step doesn't mutate this resume in place —
  // it asks the server to create a NEW resume row with the tailored
  // content, attribution to the source, and the posting tied in. The
  // checkbox defaults to ON because parallel tailored copies is the
  // new mental model; users who want in-place can untick.
  const [tailorSaveAsNew, setTailorSaveAsNew] = useState(true);

  // ── Undo stack for removals ─────────────────────────────────────
  // Push removed bullets / items / sections here so an accidental X
  // click is one tap away from being restored. Stack supports many
  // undos in a row — pops the most recent on each Undo click. Lives
  // on the editor instance; clears on next remount (seed / clear /
  // AI-parse force a remount which is the right time to start fresh).
  const [removedStack, setRemovedStack] = useState<RemovalEntry[]>([]);

  // Branded confirm dialog — replaces window.confirm() for the re-parse
  // overwrite prompt and the "clear all recoverable removals" prompt.
  const { confirmDialog, node: confirmNode } = useConfirmDialog();

  // ── Auto-save: any change to `content` triggers a debounced PATCH ──
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    // Server-side write happened in another handler (e.g. pull-from-
    // master) and the local state is the response we just replaced
    // with — don't echo it back.
    if (skipNextAutoSave.current) { skipNextAutoSave.current = false; return; }
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
  // Item-anchored comments — mentors can leave these via /resume/[userId]
  // when the feedback is about the entire job / degree / project, not
  // a specific bullet. Without indexing them here they were silently
  // hidden from the trainee.
  const commentsByItem = useMemo(
    () => indexComments(
      comments.filter((c) => !c.anchorBulletId), // bullet anchor wins
      "anchorItemId",
    ),
    [comments],
  );
  const commentsBySection = useMemo(
    () => indexComments(
      // Section anchor only when there's no narrower bullet/item anchor.
      comments.filter((c) => !c.anchorBulletId && !c.anchorItemId),
      "anchorSectionId",
    ),
    [comments],
  );
  const wholeResumeComments = useMemo(
    () => comments.filter((c) => !c.anchorBulletId && !c.anchorItemId && !c.anchorSectionId),
    [comments],
  );

  // ── AI parse handler ──
  async function runParse() {
    setParseError(null);
    // Re-parse confirms with the user — overwrites the current tree
    // (the existing version is preserved as a ResumeRevision so the
    // trainee can revert, but the confirm prompt makes the cost
    // explicit before the AI call fires).
    if (hasParsed) {
      const ok = await confirmDialog({
        title: "Re-parse from your uploaded PDF?",
        description: "This overwrites your current resume tree with a fresh AI parse. Your current version is saved in Version history — you can revert from there if you don't like the new parse.",
        confirmLabel: "Re-parse",
        cancelLabel: "Keep current",
        tone: "warning",
      });
      if (!ok) return;
    }
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

  /** Apply every remaining tailor-preview row.
   *
   *  Two paths, gated by the saveAsNew checkbox:
   *
   *  - **In place** (saveAsNew = false): mutate the current resume's
   *    content via setContent; auto-save handles the PATCH. Same
   *    behaviour as before multi-resume.
   *
   *  - **Save as new** (saveAsNew = true, default): POST to the
   *    tailor endpoint with saveAsNew + the edited rewrites. The
   *    server creates a fresh Resume row tied to the posting and
   *    derived from this one. On success we route the editor to
   *    the new resume (?id=…) so the user lands on their tailored
   *    copy with the source resume untouched. */
  async function runTailorApply() {
    if (!tailorPreview || tailorPreview.length === 0) return;
    setTailorError(null);
    setTailorBusy("apply");
    try {
      if (tailorSaveAsNew) {
        // Server-side create. We send the edited rewrites by patching
        // the content tree client-side first and pushing the whole
        // tree through the structure POST? Simpler: use the tailor
        // endpoint with saveAsNew + rely on it for the AI run +
        // create. But we need to honour the user's per-row edits.
        // Send the content tree directly with applied edits as the
        // initial content of the new resume.
        const edits = new Map(tailorEdits);
        const tailoredContent: ResumeContent = {
          ...content,
          sections: content.sections.map((s) => ({
            ...s,
            items: s.items.map((it) => ({
              ...it,
              bullets: it.bullets.map((b) => {
                const next = edits.get(b.id);
                return next && next.trim() ? { ...b, body: next.trim(), aiSuggested: true } : b;
              }),
            })),
          })),
        };
        // First create a duplicate; then PATCH the duplicate's content
        // with the tailored tree. Two round-trips, but uses existing
        // endpoints without needing to ship per-row edits through the
        // tailor endpoint's apply path.
        const created = await fetch("/api/profile/resumes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: tailorPostingName(tailorPostingId, postings),
            sourceResumeId: initialResume.id,
          }),
        });
        const j = (await created.json().catch(() => ({}))) as {
          ok?: boolean; error?: string; resume?: { id: string };
        };
        if (!created.ok || !j.ok || !j.resume) {
          setTailorError(j.error ?? "Couldn't create tailored resume.");
          return;
        }
        const newId = j.resume.id;
        // Push the tailored content into the new resume + tag it for
        // derivation. PATCH /structure handles content + revision; we
        // also want to set derivedForPostingId, so we hit the resumes
        // collection's PATCH for that metadata after.
        await fetch("/api/profile/resume/structure", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            resumeId: newId,
            content: tailoredContent,
            note: "Tailored from source resume",
          }),
        });
        // Navigate to the new resume.
        setTailorPreview(null);
        setTailorEdits(new Map());
        setTailorOpen(false);
        router.push(`/profile/resume?id=${newId}`);
      } else {
        // In-place — same as the prior behaviour. Mutate content
        // state; auto-save persists via the existing PATCH path.
        const edits = new Map(tailorEdits);
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
      }
    } finally {
      setTailorBusy(null);
    }
  }

  // ── Pull a bullet from the master library ───────────────────────
  //
  // Two callers:
  //   • Drop handler on a BulletRow or bullets-list area → fires
  //     with the dropped-on position so the new bullet lands there.
  //   • "Send to" picker in the drawer → fires with no position so
  //     the new bullet appends at the end of the target item.
  //
  // Persistence path:
  //   1. Flush any pending auto-save so the endpoint reads the user's
  //      latest content, not a stale snapshot.
  //   2. POST to the pull-from-master endpoint — server splices the
  //      bullet in, records a revision, returns the updated content.
  //   3. Replace local content + version with the server's response,
  //      with skipNextAutoSave on so we don't echo the same content
  //      back via the auto-save effect.
  async function pullFromMaster(args: {
    masterBulletId: string;
    targetSectionId: string;
    targetItemId: string;
    position?: number;
  }) {
    setMasterPullError(null);
    // Flush any debounced auto-save first. We send the current local
    // content directly so the endpoint reads what the user sees.
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    setSaving(true);
    try {
      // Push current local content as the authoritative state before
      // the splice. Without this, an in-flight typing session would
      // be lost when the server splices the master bullet onto the
      // older persisted content.
      await fetch("/api/profile/resume/structure", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, resumeId: initialResume.id }),
      }).catch(() => null);

      const r = await fetch(`/api/profile/resume/${initialResume.id}/pull-from-master`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(args),
      });
      const j = (await r.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        resume?: { id: string; version: number; content: ResumeContent };
      };
      if (!r.ok || !j.ok || !j.resume) {
        setMasterPullError(j.error ?? "Couldn't pull bullet from master.");
        return;
      }
      skipNextAutoSave.current = true;
      setContent(j.resume.content);
      setVersion(j.resume.version);
      setSavedAt(new Date());
    } catch (e) {
      setMasterPullError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  // ── Promote an edited bullet back to the master library ─────────
  //
  // Called from BulletRow's promote chip. The bullet must have
  // `derivedFromMasterBulletId` (only derived bullets show the chip).
  // On success we update the bullet's `derivedFromMasterBody` snapshot
  // locally to the just-promoted body so the chip disappears until
  // the user edits the bullet again. Persisting the snapshot is the
  // auto-save effect's job — we tag a marker on the bullet and the
  // next debounce flushes it.
  async function promoteToMaster(args: {
    bulletId: string;
    masterBulletId: string;
    body: string;
  }) {
    setMasterPullError(null);
    try {
      const r = await fetch("/api/profile/master/bullets/promote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ masterBulletId: args.masterBulletId, body: args.body }),
      });
      const j = (await r.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!r.ok || !j.ok) {
        setMasterPullError(j.error ?? "Couldn't promote bullet to master.");
        return;
      }
      // Sync the bullet's derived-snapshot to match the promoted body
      // so the chip stops showing until the user makes another edit.
      setContent((c) => ({
        ...c,
        sections: c.sections.map((s) => ({
          ...s,
          items: s.items.map((it) => ({
            ...it,
            bullets: it.bullets.map((b) =>
              b.id === args.bulletId ? { ...b, derivedFromMasterBody: args.body } : b,
            ),
          })),
        })),
      }));
    } catch (e) {
      setMasterPullError((e as Error).message);
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
  /** Reorder bullets within one item via index → index. Used by the
   *  drag-handle on each bullet row. Positions are re-stamped after
   *  the splice so the printed order on the PDF matches the visual
   *  order in the editor. */
  function moveBullet(sIdx: number, iIdx: number, fromBIdx: number, toBIdx: number) {
    if (fromBIdx === toBIdx) return;
    setContent((c) => ({
      ...c,
      sections: c.sections.map((s, i) => {
        if (i !== sIdx) return s;
        return {
          ...s,
          items: s.items.map((it, j) => {
            if (j !== iIdx) return it;
            const next = [...it.bullets];
            if (fromBIdx < 0 || fromBIdx >= next.length) return it;
            const clampedTo = Math.max(0, Math.min(next.length - 1, toBIdx));
            const [moved] = next.splice(fromBIdx, 1);
            next.splice(clampedTo, 0, moved);
            return {
              ...it,
              bullets: next.map((b, idx) => ({ ...b, position: idx })),
            };
          }),
        };
      }),
    }));
  }

  // ── Recovery stack for removals ────────────────────────────────
  // Pushed to whenever a bullet / item / section X is clicked. The
  // panel renders the contents persistently so the user can restore
  // anything, not just the most recent one — that was the bug the
  // earlier snackbar created (clicking × on the snackbar quietly
  // dropped the most recent entry, which felt destructive).
  function pushRemoval(entry: RemovalEntry) {
    setRemovedStack((s) => [...s, entry]);
  }
  /** Restore the most recent removal (the top of the stack). Used by
   *  the panel's quick-action and by Cmd/Ctrl-Z if we wire it later. */
  function undoLastRemoval() {
    setRemovedStack((stack) => {
      if (stack.length === 0) return stack;
      const entry = stack[stack.length - 1];
      setContent((c) => restoreRemoval(c, entry));
      return stack.slice(0, -1);
    });
  }
  /** Restore a specific entry by stack index. Lets the user reach
   *  past the most recent removal — e.g. you deleted bullet A, then
   *  realised bullet B is the one you actually wanted gone. */
  function restoreSpecific(stackIndex: number) {
    setRemovedStack((stack) => {
      if (stackIndex < 0 || stackIndex >= stack.length) return stack;
      const entry = stack[stackIndex];
      setContent((c) => restoreRemoval(c, entry));
      return [...stack.slice(0, stackIndex), ...stack.slice(stackIndex + 1)];
    });
  }
  /** Permanently dismiss all recoverable entries — for when the user
   *  is confident none of them are coming back and wants to clear
   *  the visible panel. Confirmed via ConfirmDialog so a stray click
   *  doesn't wipe minutes of recovery surface. */
  async function clearAllRemovals() {
    if (removedStack.length === 0) return;
    const count = removedStack.length;
    const ok = await confirmDialog({
      title: `Dismiss ${count} recoverable item${count === 1 ? "" : "s"}?`,
      description: "They won't be retrievable from the recovery panel any more. The resume tree itself is unaffected.",
      confirmLabel: "Dismiss all",
      cancelLabel: "Keep them",
      tone: "warning",
    });
    if (!ok) return;
    setRemovedStack([]);
  }

  // ── Header field updates ──
  function updateHeader(patch: Partial<NonNullable<ResumeContent["header"]>>) {
    setContent((c) => ({ ...c, header: { ...(c.header ?? {}), ...patch } }));
  }

  return (
    <div
      // When the pull-from-master drawer (fixed, 400px, right) is open,
      // shift the editor content left on wide screens so the two sit
      // side-by-side and you can drag straight across — nothing hidden
      // behind the drawer.
      className={`space-y-5 transition-[padding] duration-200 ${masterDrawerOpen ? "lg:pr-[420px]" : ""}`}
    >
      {/* Resume picker — multi-resume aware. Shows the current
          resume's name as the selected value; the dropdown lists
          every non-archived sibling + a link to /profile/resumes
          for the full index (which also handles archived rows). */}
      <ResumePicker
        currentName={currentName ?? "Main resume"}
        currentResumeId={initialResume.id}
        siblings={siblings}
        onSwitch={(id) => router.push(`/profile/resume?id=${id}`)}
      />

      {/* ── Primary actions panel ───────────────────────────────────
       *
       * Tailor / Versions / Preview PDF are the three things a trainee
       * actually wants to DO with their resume. They were buried in a
       * mixed toolbar with the AI-parse button and the save indicator;
       * promoted here to brand-tinted, full-size action cards so they
       * read at a glance.
       *
       * Each card is the same visual weight — none of these three is
       * more important than the others. Re-parse stays where it was
       * (smaller, top-right of the status bar) because it's a less-
       * frequent action that exists mostly for re-runs after a new
       * PDF upload. */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        {postings.length > 0 ? (
          <PrimaryActionCard
            icon={Target}
            label="Tailor to posting"
            sub="Rewrite bullets for a specific role"
            onClick={() => setTailorOpen((v) => !v)}
            active={tailorOpen}
          />
        ) : (
          // Keep grid alignment when there's no postings — render a
          // placeholder card explaining why the action's hidden.
          <div className="rounded-xl border border-dashed border-line bg-bg/30 p-3 text-[11px] text-fg-subtle leading-snug">
            Tailor to posting unlocks when there are active internship postings on the platform.
          </div>
        )}
        <PrimaryActionCard
          icon={Clock}
          label="Versions"
          sub="Browse, preview, revert any saved state"
          onClick={() => setVersionsOpen(true)}
        />
        <PrimaryActionLink
          icon={Printer}
          label="Preview PDF"
          sub="Print-styled view → save as PDF"
          href="/profile/resume/preview"
        />
      </div>

      {/* Save status + open-comment count + secondary AI tools */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          <SaveStatus saving={saving} version={version} savedAt={savedAt} />
          {/* Glanceable badge — at-a-glance "you have N comments to
              triage". Hidden when there are zero. */}
          {(() => {
            const openCount = comments.filter((c) => c.status === "open").length;
            if (openCount === 0) return null;
            return (
              <span
                className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-50 text-amber-900 ring-1 ring-inset ring-amber-200 text-[11px] font-semibold"
                title={`${openCount} comment${openCount === 1 ? "" : "s"} from mentors or instructors still need${openCount === 1 ? "s" : ""} your reply. Open each thread and mark it Resolved (you chose not to act) or Applied (you took the suggestion).`}
              >
                <MessageCircle size={11} />
                {openCount} {openCount === 1 ? "comment needs reply" : "comments need reply"}
              </span>
            );
          })()}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {canParse && (
            <button
              type="button"
              onClick={runParse}
              disabled={parsing}
              className={
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-bold disabled:opacity-50 transition-colors " +
                (hasParsed
                  ? "bg-elevated text-fg-muted ring-1 ring-line hover:bg-card"
                  : "bg-brand-600 text-white hover:bg-brand-700")
              }
              title={hasParsed
                ? "Overwrite the current tree with a fresh AI parse of your uploaded PDF. Your current version stays in history."
                : "Read your uploaded PDF/DOCX and seed sections + bullets automatically."}
            >
              {parsing ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
              {hasParsed ? "Re-parse from PDF" : "AI-parse my uploaded resume"}
            </button>
          )}
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
          saveAsNew={tailorSaveAsNew}
          onSaveAsNewChange={setTailorSaveAsNew}
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
          <p className="mt-1.5 text-[11px] text-fg-subtle leading-snug">
            This is the short opener that prints under your name on the PDF. If you also have a separate &quot;Summary&quot; section below, it duplicates this field — you can delete it from the section&apos;s menu.
          </p>
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
          {/* Section heading row.
           *
           * Two controls that confuse users until they understand the
           * split:
           *   • The kind <select> ("Experience" / "Skills" / …)
           *     controls how the section *behaves* — which fields
           *     show (dates, GPA, URL, bullets), what placeholder
           *     copy each field gets, and how the section is parsed
           *     by AI tailoring.
           *   • The "Custom heading" <input> next to it controls
           *     only what the section *prints as* on the PDF. Leave
           *     it empty and the printed heading defaults to the
           *     kind's label ("Experience"). Type something and that
           *     overrides — e.g. "Industry roles", "Research
           *     experience", "Bench experience".
           *
           * Discoverability: the Info icon next to the heading input
           * carries a tooltip explaining the purpose for users who
           * don't read the helper line below. */}
          <div className="flex items-start justify-between gap-2 mb-1.5 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={section.kind}
                onChange={(e) => updateSection(sIdx, { kind: e.target.value as ResumeSectionKind })}
                title="Section type — controls which fields show inside (dates / GPA / URL / bullets) and how AI tailoring treats it."
                className="bg-card border border-line rounded-md px-2 py-1 text-xs font-mono uppercase tracking-[0.18em] font-bold text-fg-muted"
              >
                {(Object.keys(SECTION_LABEL) as ResumeSectionKind[]).map((k) => (
                  <option key={k} value={k}>{SECTION_LABEL[k]}</option>
                ))}
              </select>
              <div className="inline-flex items-center gap-1">
                <input
                  type="text"
                  placeholder={`Heading prints as "${SECTION_LABEL[section.kind]}" — override here`}
                  value={section.title ?? ""}
                  onChange={(e) => updateSection(sIdx, { title: e.target.value })}
                  title={`Custom heading for the printed PDF only. Leave blank to use the default ("${SECTION_LABEL[section.kind]}"). Examples: "Industry roles", "Research experience", "Bench skills".`}
                  className="bg-transparent border-0 text-base font-semibold text-fg focus:outline-none focus:bg-card rounded px-2 py-0.5 -ml-2 min-w-[260px]"
                />
                <span
                  title={`Custom heading for the printed PDF only — overrides the default "${SECTION_LABEL[section.kind]}". Leave it empty and the section type's label is used. Useful when you want a more specific name (e.g. "Industry roles" instead of "Experience") or to group two sections of the same type with different headings.`}
                  className="inline-flex items-center justify-center w-4 h-4 rounded-full text-fg-subtle hover:text-fg cursor-help shrink-0"
                  aria-label="About custom heading"
                >
                  <Info size={12} />
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <IconBtn onClick={() => moveSection(sIdx, -1)} title="Move up"><ChevronUp size={12} /></IconBtn>
              <IconBtn onClick={() => moveSection(sIdx, +1)} title="Move down"><ChevronDown size={12} /></IconBtn>
              <IconBtn onClick={() => removeSection(sIdx)} title="Remove section" danger><Trash2 size={12} /></IconBtn>
            </div>
          </div>

          {/* One-liner under the heading row clarifying the two
              controls. Shown on the FIRST section only — once is
              enough; repeating it on every section becomes noise. */}
          {sIdx === 0 && (
            <p className="text-[11px] text-fg-subtle leading-snug mb-3">
              The <strong>dropdown</strong> sets the section type (which fields appear and how AI tailors it).
              The <strong>heading text</strong> is what prints on your PDF — leave blank to use the type&apos;s default name, or type your own (e.g. <em>Industry roles</em>, <em>Research experience</em>).
            </p>
          )}

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
              const itemComments = commentsByItem.get(item.id) ?? [];
              return (
                <div key={item.id} className="space-y-1.5">
                  {/* Item-level comments — mentors leave these via
                      /resume/[userId] when the feedback is about the
                      whole job / degree / project, not one bullet. */}
                  {itemComments.length > 0 && (
                    <CommentList
                      compact
                      title="On this entry"
                      comments={itemComments}
                      onStatus={updateCommentStatus}
                    />
                  )}
                <ResumeItemEditor
                  key={item.id}
                  kind={section.kind}
                  item={item}
                  onPatch={(patch) => updateItem(sIdx, iIdx, patch)}
                  onRemove={() => removeItem(sIdx, iIdx)}
                  bulletsSlot={hint.showBullets ? (
                    <BulletsListDropZone
                      onDropMasterBullet={(masterBulletId, position) =>
                        void pullFromMaster({
                          masterBulletId,
                          targetSectionId: section.id,
                          targetItemId: item.id,
                          position,
                        })
                      }
                      bulletCount={item.bullets.length}
                    >
                      {hint.bulletLabel && (
                        <p className="text-[10px] uppercase tracking-[0.22em] font-semibold text-fg-subtle mt-1">
                          {hint.bulletLabel}
                        </p>
                      )}
                      {item.bullets.map((bullet, bIdx) => {
                        const bulletComments = commentsByBullet.get(bullet.id) ?? [];
                        const isDragging   = bulletDrag?.bulletId === bullet.id;
                        // Drop targets only highlight when the drag
                        // originated within the SAME item — bullets
                        // can't be dragged across items today.
                        const isValidTarget = !!bulletDrag
                          && bulletDrag.sIdx === sIdx
                          && bulletDrag.iIdx === iIdx
                          && bulletDrag.bulletId !== bullet.id;
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
                            isDragging={isDragging}
                            isDragTarget={isValidTarget}
                            onDragStartBullet={() =>
                              setBulletDrag({ sIdx, iIdx, bIdx, bulletId: bullet.id })
                            }
                            onDragEndBullet={() => setBulletDrag(null)}
                            onDropOnBullet={() => {
                              if (
                                bulletDrag
                                && bulletDrag.sIdx === sIdx
                                && bulletDrag.iIdx === iIdx
                                && bulletDrag.bIdx !== bIdx
                              ) {
                                moveBullet(sIdx, iIdx, bulletDrag.bIdx, bIdx);
                              }
                              setBulletDrag(null);
                            }}
                            onDropMasterBullet={(masterBulletId) =>
                              void pullFromMaster({
                                masterBulletId,
                                targetSectionId: section.id,
                                targetItemId: item.id,
                                position: bIdx,
                              })
                            }
                            onPromoteToMaster={(masterBulletId, body) =>
                              void promoteToMaster({ bulletId: bullet.id, masterBulletId, body })
                            }
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
                    </BulletsListDropZone>
                  ) : null}
                />
                </div>
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

      {/* Grammar + style lint panel — runs an AI pass over the whole
          resume and surfaces typos, weak verbs, passive voice, vague
          filler, missing quantification on experience bullets, tense
          inconsistency, repetition, and first-person openers. Pinned
          at the bottom so it reads as the "final check before
          export" step. */}
      <ResumeLintPanel content={content} setContent={setContent} />

      {/* Recovery panel — pinned bottom-right. Always visible while
          the stack has items; lets the user restore any specific
          removal, not just the most recent. The panel collapses to
          a small chip that shows the count + most recent entry until
          the user expands it. */}
      <RecoveryPanel
        stack={removedStack}
        onUndoLatest={undoLastRemoval}
        onRestore={restoreSpecific}
        onClearAll={clearAllRemovals}
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

      {/* Floating save indicator — always visible in the viewport's
          bottom-right corner so the user knows their work is safe
          even after they've scrolled past the inline SaveStatus near
          the top. See FloatingSaveStatus for the three-state visual. */}
      <FloatingSaveStatus saving={saving} version={version} savedAt={savedAt} />

      {/* Confirm dialog portal — yes/no prompts (re-parse overwrite,
          dismiss-all-removals). See ConfirmDialog for the API. */}
      {confirmNode}

      {/* Pull-from-master drawer — toggled by the banner button via
          a window CustomEvent, or by future in-editor buttons. The
          drawer fetches /api/profile/master on open and renders every
          non-archived bullet, grouped by section, with a drag handle
          and a "Send to" picker. */}
      <PullFromMasterDrawer
        open={masterDrawerOpen}
        onClose={() => setMasterDrawerOpen(false)}
        content={content}
        onSendToTarget={async (args) => {
          await pullFromMaster(args);
        }}
      />

      {/* Inline error toast for pull / promote failures. Auto-dismiss
          with a click; never blocks the surface. */}
      {masterPullError && (
        <div className="fixed left-4 bottom-20 z-50 max-w-sm rounded-lg bg-rose-50 ring-1 ring-rose-200 text-rose-900 text-[12px] px-3 py-2 shadow-lg flex items-start gap-2">
          <span className="flex-1">{masterPullError}</span>
          <button
            type="button"
            onClick={() => setMasterPullError(null)}
            className="p-0.5 rounded hover:bg-rose-100 shrink-0"
            aria-label="Dismiss error"
          >
            <X size={12} />
          </button>
        </div>
      )}
    </div>
  );
}

/** Wraps an item's bullets list and accepts master-bullet drops on
 *  the empty space inside (or below the last bullet) — keeps the
 *  drop target generous so the user doesn't have to aim at a specific
 *  bullet row when they just want to add to this item.
 *
 *  Master pulls dropped here append to the end (position omitted ⇒
 *  endpoint defaults to append). Drops on a specific BulletRow take
 *  priority via event bubbling — the row handles its own drop and
 *  stops propagation. */
function BulletsListDropZone({
  children, onDropMasterBullet, bulletCount,
}: {
  children: React.ReactNode;
  onDropMasterBullet: (masterBulletId: string, position?: number) => void;
  bulletCount: number;
}) {
  const [hover, setHover] = useState(false);
  return (
    <div
      className={
        "space-y-1.5 rounded-md transition-colors " +
        (hover ? "ring-2 ring-brand-300 ring-offset-1 ring-offset-card-solid bg-brand-50/40 " : "")
      }
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes(MASTER_DRAG_MIME)) {
          e.preventDefault();
          e.dataTransfer.dropEffect = "copy";
          if (!hover) setHover(true);
        }
      }}
      onDragLeave={(e) => {
        // Only un-hover when we genuinely leave the zone, not when
        // the cursor crosses into a child. relatedTarget being null
        // (or outside the current target) means a real leave.
        if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
        setHover(false);
      }}
      onDrop={(e) => {
        setHover(false);
        if (!e.dataTransfer.types.includes(MASTER_DRAG_MIME)) return;
        const data = e.dataTransfer.getData("text/plain");
        if (!data.startsWith("master:")) return;
        e.preventDefault();
        e.stopPropagation();
        const masterBulletId = data.slice("master:".length);
        // Append-at-end when dropped on the list area (a bullet row
        // would have stopped propagation already and handled the
        // drop at its specific position).
        onDropMasterBullet(masterBulletId, bulletCount);
      }}
    >
      {children}
    </div>
  );
}

/* ── Small UI bits ─────────────────────────────────────────────── */

/** Brand-tinted primary action card. Same visual treatment for each
 *  of Tailor / Versions / Preview PDF so the eye reads them as the
 *  three things you actually do with a resume. `active` makes the
 *  card look "on" — useful for toggles like the Tailor panel where
 *  the card opens an inline drawer. */
/** Multi-resume picker. Selects between every non-archived resume
 *  the user owns. Switching routes to /profile/resume?id=X which
 *  triggers a fresh server-side load — the existing key-based
 *  remount on the page handles state hand-off cleanly. */
/** Build a default "tailored resume" name from a posting id and the
 *  available postings list — e.g. "STEMCELL · Process Engineer Intern".
 *  Falls back to "Tailored resume" if the posting isn't found. */
function tailorPostingName(postingId: string, postings: PostingSummary[]): string {
  const p = postings.find((x) => x.id === postingId);
  if (!p) return "Tailored resume";
  return `${p.companyName} · ${p.title}`.slice(0, 120);
}

function ResumePicker({
  currentName, currentResumeId, siblings, onSwitch,
}: {
  currentName: string;
  currentResumeId: string;
  siblings: ResumeSibling[];
  onSwitch: (id: string) => void;
}) {
  const others = siblings.filter((s) => s.id !== currentResumeId);
  return (
    <div className="flex items-center justify-between gap-3 flex-wrap rounded-xl border border-line bg-card-solid px-3 py-2">
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <span className="inline-flex w-7 h-7 rounded-md bg-brand-50 text-brand-700 items-center justify-center shrink-0">
          <FileText size={13} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] uppercase tracking-[0.18em] font-bold text-fg-subtle">Editing</p>
          {/* Native select keeps the picker accessible + lightweight.
              When the user only has one resume, the dropdown still
              works but only shows the current name + the "all resumes"
              link — no real switching to do. */}
          <select
            value={currentResumeId}
            onChange={(e) => {
              const v = e.target.value;
              if (v === "__all__") {
                window.location.href = "/profile/resumes";
                return;
              }
              if (v === "__new__") {
                // Routed to the new-resume API by the index page; here
                // we just navigate the user to the index where the
                // "+ New resume" affordance lives.
                window.location.href = "/profile/resumes";
                return;
              }
              if (v !== currentResumeId) onSwitch(v);
            }}
            className="-ml-1 px-1.5 py-0.5 rounded text-sm font-semibold text-fg bg-transparent hover:bg-elevated focus:outline-none focus:ring-2 focus:ring-brand-100 max-w-full truncate"
          >
            <option value={currentResumeId}>{currentName}</option>
            {others.length > 0 && (
              <optgroup label="Switch to">
                {others.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </optgroup>
            )}
            <option value="__all__">All resumes / new…</option>
          </select>
        </div>
      </div>
      <Link
        href="/profile/resumes"
        className="text-[11px] font-medium text-brand-700 hover:underline shrink-0"
      >
        Manage resumes →
      </Link>
    </div>
  );
}

function PrimaryActionCard({
  icon: Icon, label, sub, onClick, active,
}: {
  icon: React.ElementType;
  label: string;
  sub: string;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "group flex items-start gap-3 rounded-xl px-3.5 py-3 text-left transition-colors " +
        (active
          ? "bg-brand-100 ring-1 ring-inset ring-brand-300 text-brand-900"
          : "bg-brand-50 ring-1 ring-inset ring-brand-200 text-brand-900 hover:bg-brand-100")
      }
    >
      <span className="shrink-0 inline-flex w-9 h-9 rounded-lg bg-brand-600 text-white items-center justify-center">
        <Icon size={16} />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-bold leading-tight">{label}</span>
        <span className="block text-[11px] text-brand-800/80 mt-0.5">{sub}</span>
      </span>
    </button>
  );
}

/** Link-flavoured primary action card. Same look as PrimaryActionCard
 *  but routes via next/link instead of an onClick handler — needed
 *  for the Preview PDF action which navigates to its own page. */
function PrimaryActionLink({
  icon: Icon, label, sub, href,
}: {
  icon: React.ElementType;
  label: string;
  sub: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-start gap-3 rounded-xl px-3.5 py-3 text-left transition-colors bg-brand-50 ring-1 ring-inset ring-brand-200 text-brand-900 hover:bg-brand-100"
    >
      <span className="shrink-0 inline-flex w-9 h-9 rounded-lg bg-brand-600 text-white items-center justify-center">
        <Icon size={16} />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-bold leading-tight">{label}</span>
        <span className="block text-[11px] text-brand-800/80 mt-0.5">{sub}</span>
      </span>
    </Link>
  );
}

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

/**
 * FloatingSaveStatus — always-visible save badge anchored to the
 * viewport's bottom-left corner (bottom-right is taken by the global
 * AutoPipette hint dock + the recovery panel).
 *
 * The inline `SaveStatus` near the top of the editor scrolls away as
 * the user works down a long resume. This floating variant stays
 * pinned so the user always knows the save state at a glance:
 *
 *   • Saving — amber chip, spinner, "Saving…"
 *   • Just saved (within the last 4s) — green chip with check,
 *     "Saved · v12". Fades to the idle state after the window.
 *   • Idle — neutral chip, save glyph, "v12".
 *
 * Positioned with `position: fixed` so it survives any ancestor
 * `overflow: hidden` and is robust to the editor's varying height.
 * Respects safe-area on mobile.
 */
function FloatingSaveStatus({ saving, version, savedAt }: { saving: boolean; version: number; savedAt: Date | null }) {
  // Fresh-save glow — green chip for 4 seconds after a save completes,
  // then fades back to the neutral idle state. Without this, the
  // badge would stay green forever, eventually losing its meaning.
  const [showJustSaved, setShowJustSaved] = useState(false);
  useEffect(() => {
    if (!savedAt || saving) {
      setShowJustSaved(false);
      return;
    }
    setShowJustSaved(true);
    const t = setTimeout(() => setShowJustSaved(false), 4000);
    return () => clearTimeout(t);
  }, [savedAt, saving]);

  // State → visuals. Tailwind classes resolved once per state so the
  // chip can transition smoothly between them via the wrapper's
  // `transition-colors`.
  let label: string;
  let chipClass: string;
  let Glyph: React.ElementType;
  let spin = false;
  if (saving) {
    label = "Saving…";
    chipClass = "bg-amber-50 text-amber-900 ring-amber-200";
    Glyph = Loader2;
    spin = true;
  } else if (showJustSaved) {
    label = `Saved · v${version}`;
    chipClass = "bg-emerald-50 text-emerald-800 ring-emerald-200";
    Glyph = Check;
  } else if (savedAt) {
    label = `v${version}`;
    chipClass = "bg-card-solid text-fg-muted ring-line";
    Glyph = Save;
  } else {
    label = "Auto-saves";
    chipClass = "bg-card-solid text-fg-muted ring-line";
    Glyph = Save;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      // Bottom-LEFT, deliberately: the global AutoPipette hint dock —
      // and this editor's own recovery panel — own the bottom-RIGHT
      // corner (both fixed there), so a bottom-right save badge stacked
      // on top of them. Living bottom-left keeps it clear of both. z-40
      // keeps it above editor content but below modals / toasters (z-50).
      className="fixed z-40 left-4 bottom-4 pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] pointer-events-none"
    >
      <span
        className={cn(
          "pointer-events-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full ring-1 shadow-md text-[11.5px] font-mono uppercase tracking-[0.16em] backdrop-blur-sm transition-colors duration-300",
          chipClass,
        )}
        title={savedAt ? `Last saved at ${savedAt.toLocaleTimeString()}` : "Edits save automatically as you type"}
      >
        <Glyph size={12} className={spin ? "animate-spin" : undefined} aria-hidden />
        {label}
      </span>
    </div>
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
  isDragging, isDragTarget, onDragStartBullet, onDragEndBullet, onDropOnBullet,
  onDropMasterBullet, onPromoteToMaster,
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
  /** Drag-to-reorder wiring. The grip handle is the drag source;
   *  the entire row is the drop target. Reorder is within-item
   *  only (see bulletDrag state in the parent). */
  isDragging: boolean;
  isDragTarget: boolean;
  onDragStartBullet: () => void;
  onDragEndBullet: () => void;
  onDropOnBullet: () => void;
  /** Master-bullet drop handler. Fires when a master bullet is
   *  dropped ON THIS ROW (not the surrounding bullets-list zone);
   *  the new bullet gets inserted at this row's position. */
  onDropMasterBullet: (masterBulletId: string) => void;
  /** Push the bullet's current body back to its source master bullet.
   *  Only meaningful when bullet.derivedFromMasterBulletId is set. */
  onPromoteToMaster: (masterBulletId: string, body: string) => void;
}) {
  const [showThread, setShowThread] = useState(false);
  // ── Promote-this-edit chip dismiss state ────────────────────────
  // Keyed by sessionStorage on `${bulletId}:${dismissedBody}` so the
  // chip stays hidden for the body the user just dismissed, but
  // reappears the moment they type one more character — that's the
  // intentional "keep reminding me on each edit" behaviour.
  const dismissKey = `bhn:promote-dismissed:${bullet.id}`;
  const [dismissedBody, setDismissedBody] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    try { return sessionStorage.getItem(dismissKey); } catch { return null; }
  });
  const openCount = comments.filter((c) => c.status === "open").length;
  const hasBody = bullet.body.trim().length > 0;
  // Promote chip surfaces when the bullet was pulled from master AND
  // the current body differs from the snapshot we took at pull-time
  // AND the user hasn't dismissed THIS body's reminder.
  const isDerivedAndEdited =
    !!bullet.derivedFromMasterBulletId
    && typeof bullet.derivedFromMasterBody === "string"
    && bullet.body.trim() !== bullet.derivedFromMasterBody.trim()
    && bullet.body.trim().length > 0;
  const showPromoteChip = isDerivedAndEdited && dismissedBody !== bullet.body;
  function dismissPromoteChip() {
    setDismissedBody(bullet.body);
    try { sessionStorage.setItem(dismissKey, bullet.body); } catch { /* ignore quota */ }
  }
  return (
    <div
      className={
        "space-y-1.5 rounded-md transition-all " +
        (isDragging ? "opacity-40 " : "") +
        (isDragTarget ? "ring-2 ring-brand-300 ring-offset-2 ring-offset-card-solid bg-brand-50/40 " : "")
      }
      onDragOver={(e) => {
        // Master-bullet drag — always accept on a row so the user
        // can target a specific insertion position.
        if (e.dataTransfer.types.includes(MASTER_DRAG_MIME)) {
          e.preventDefault();
          e.dataTransfer.dropEffect = "copy";
          return;
        }
        // Only show drop affordance if a sibling bullet is being
        // dragged (the parent flags this via isDragTarget).
        if (isDragTarget) e.preventDefault();
      }}
      onDrop={(e) => {
        // Master-bullet drop takes priority; stops the bullets-list
        // wrapper from also handling the same drop (append-at-end).
        if (e.dataTransfer.types.includes(MASTER_DRAG_MIME)) {
          const data = e.dataTransfer.getData("text/plain");
          if (data.startsWith("master:")) {
            e.preventDefault();
            e.stopPropagation();
            onDropMasterBullet(data.slice("master:".length));
            return;
          }
        }
        if (!isDragTarget) return;
        e.preventDefault();
        onDropOnBullet();
      }}
    >
      <div className="flex items-start gap-2">
        {/* Real drag handle. The 6-dot GripVertical icon used to be
            purely decorative — it looked like a drag affordance but
            did nothing. Now it's the actual drag-start surface:
            mousedown + drag picks up the bullet, drop on another
            bullet in the same item reorders. cursor-grab telegraphs
            the affordance even before the user picks it up. */}
        <span
          draggable
          onDragStart={(e) => {
            e.dataTransfer.effectAllowed = "move";
            // Some browsers refuse to start a drag unless data is
            // set. The value isn't read — we route via the parent's
            // bulletDrag state — but we have to put something here.
            e.dataTransfer.setData("text/plain", bullet.id);
            onDragStartBullet();
          }}
          onDragEnd={onDragEndBullet}
          title="Drag to reorder within this item"
          className="mt-1.5 shrink-0 inline-flex items-center justify-center w-4 h-5 rounded text-fg-subtle hover:text-fg hover:bg-elevated cursor-grab active:cursor-grabbing"
          aria-label="Drag to reorder bullet"
        >
          <GripVertical size={12} />
        </span>
        {bullet.derivedFromMasterBulletId && (
          <span
            title="This bullet came from your master library. Edits surface a 'promote to master' chip you can use to push improvements back."
            className="mt-1.5 shrink-0 inline-flex items-center justify-center w-4 h-5 rounded text-brand-700"
            aria-label="Pulled from master library"
          >
            <Library size={11} />
          </span>
        )}
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
            // Tooltip spells out what "open" means in plain English:
            // a comment a mentor / admin / instructor left on this
            // bullet that you haven't yet marked Resolved (you
            // chose not to act on it) or Applied (you took the
            // suggestion). Open ≈ "still needs your eyes".
            title={
              openCount > 0
                ? `${comments.length} comment${comments.length === 1 ? "" : "s"} on this bullet from mentors/instructors. ${openCount} still need${openCount === 1 ? "s" : ""} your reply — open the thread to mark each one Resolved or Applied.`
                : `${comments.length} comment${comments.length === 1 ? "" : "s"} on this bullet — all already handled. Click to view the history.`
            }
          >
            <MessageCircle size={9} /> {comments.length}
            {openCount > 0 && <span className="font-semibold">· {openCount} need{openCount === 1 ? "s" : ""} reply</span>}
          </button>
        )}
        <IconBtn onClick={onRemove} title="Remove bullet" danger><X size={11} /></IconBtn>
      </div>

      {/* Promote-this-edit chip — surfaces when the bullet was pulled
          from master and the user has edited the body away from the
          snapshot we took at pull-time. Two outs: Promote (pushes the
          new wording back to the master bullet) or Keep local only
          (suppresses the chip for this exact body string; further
          edits re-surface the chip — intentional). */}
      {showPromoteChip && bullet.derivedFromMasterBulletId && (
        <div className="ml-6 inline-flex items-start gap-2 rounded-md ring-1 ring-brand-200 bg-brand-50/60 px-2 py-1.5 text-[11px]">
          <ArrowUp size={11} className="mt-0.5 shrink-0 text-brand-700" />
          <div className="min-w-0 flex-1">
            <p className="text-[11px] text-fg leading-snug">
              <strong className="text-brand-900">Edited from master.</strong>
              <span className="text-fg-muted"> Push this wording back to your library so future drafts pick up the improvement?</span>
            </p>
            <div className="mt-1 flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => onPromoteToMaster(bullet.derivedFromMasterBulletId!, bullet.body)}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-brand-600 text-white text-[10px] font-bold uppercase tracking-[0.14em] hover:bg-brand-700 transition-colors"
                title="Update the source master bullet with this new body. A revision is recorded in the master's history."
              >
                <ArrowUp size={9} /> Promote to master
              </button>
              <button
                type="button"
                onClick={dismissPromoteChip}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-[0.14em] text-fg-muted ring-1 ring-line hover:bg-elevated"
                title="Hide this prompt until you edit the bullet again. The master library isn't touched."
              >
                Keep local only
              </button>
            </div>
          </div>
        </div>
      )}

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
          {(() => {
            const dirty = edited !== rewritten;
            return (
              <button
                type="button"
                onClick={() => onAccept(edited)}
                disabled={edited.trim().length === 0}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-brand-600 text-white text-[11px] font-semibold hover:bg-brand-700 transition-colors disabled:opacity-50"
                title={dirty
                  ? "Save your edited version to this bullet"
                  : "Accept the AI's suggested rewrite for this bullet"}
              >
                {dirty ? <Save size={11} /> : <CheckCircle2 size={11} />}
                {dirty ? "Save my edit" : "Accept AI rewrite"}
              </button>
            );
          })()}
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
  postings, postingId, onPostingId, busy, error, preview, edits, onEditRow, onApplyRow,
  onPreview, onApply, onClose, saveAsNew, onSaveAsNewChange,
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
  /** When true, Apply creates a new sibling resume; false → mutates
   *  this resume in place. */
  saveAsNew: boolean;
  onSaveAsNewChange: (v: boolean) => void;
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
          // Save-as-new toggle — visible only once there's a preview
          // ready to apply. Default on; user can untick to overwrite
          // the current resume in place. Tooltip spells out which
          // mode they're in so there's no surprise on click.
          <label className="inline-flex items-center gap-1.5 text-[11px] text-fg-muted cursor-pointer ml-1">
            <input
              type="checkbox"
              checked={saveAsNew}
              onChange={(e) => onSaveAsNewChange(e.target.checked)}
              className="rounded border-line text-brand-600 focus:ring-brand-300"
            />
            <span>
              Save as a new resume
              <span className="text-fg-subtle ml-1">
                ({saveAsNew ? "your current resume stays untouched" : "overwrites this resume"})
              </span>
            </span>
          </label>
        )}
        {preview && preview.length > 0 && (() => {
          // Count how many rows the user has edited from the AI's
          // original. The button label reflects the mix so it's clear
          // what's about to land.
          const editedCount = preview.reduce((n, r) => {
            const t = edits.get(r.id) ?? r.rewritten;
            return n + (t !== r.rewritten ? 1 : 0);
          }, 0);
          let label: string;
          if (editedCount === 0)             label = `Accept all ${preview.length} AI rewrites`;
          else if (editedCount === preview.length) label = `Save all ${preview.length} edits`;
          else                               label = `Apply all ${preview.length} (${editedCount} edited)`;
          return (
            <button
              type="button"
              onClick={onApply}
              disabled={busy !== null}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50 transition-colors"
            >
              {busy === "apply" ? <Loader2 size={11} className="animate-spin" /> : <CheckCircle2 size={11} />}
              {label}
            </button>
          );
        })()}
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
                    title={dirty
                      ? "Save your edited version to this bullet"
                      : "Accept the AI's suggested rewrite for this bullet"}
                  >
                    {dirty ? <Save size={10} /> : <CheckCircle2 size={10} />}
                    {dirty ? "Save my edit" : "Accept AI rewrite"}
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

/** Recovery panel — pinned to the viewport bottom-right whenever
 *  the removal stack has items. Two states:
 *
 *    • Collapsed (default) — one-line summary of the latest removal
 *      with an "Undo" button + a "Show all (N)" expand affordance
 *      when there's more than one in the stack.
 *
 *    • Expanded — scrollable list of every removed entity in the
 *      session, each with its own Restore button. "Dismiss all"
 *      footer button (confirms) clears the panel without restoring.
 *
 *  The earlier snackbar version had an X close button that quietly
 *  popped the most-recent entry off the stack — destructive and
 *  easy to misclick. This version has no such destructive close;
 *  the panel just stays put until the user explicitly restores items
 *  or clears the panel. Items survive across editor renders within
 *  a session and only clear on a remount (seed / clear / AI-parse /
 *  revert). */
function RecoveryPanel({
  stack, onUndoLatest, onRestore, onClearAll,
}: {
  stack: RemovalEntry[];
  onUndoLatest: () => void;
  onRestore: (stackIndex: number) => void;
  onClearAll: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  if (stack.length === 0) return null;
  const latest = stack[stack.length - 1];

  if (!expanded) {
    return (
      <div className="fixed bottom-4 right-4 z-50 max-w-sm rounded-xl border border-line bg-card-solid shadow-xl ring-1 ring-line/40 p-3 flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] uppercase tracking-[0.18em] font-bold text-fg-subtle">
            Recently removed{stack.length > 1 ? ` · ${stack.length} recoverable` : ""}
          </p>
          <p className="text-[12.5px] text-fg mt-0.5 truncate">{latest.label}</p>
        </div>
        <button
          type="button"
          onClick={onUndoLatest}
          className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-brand-600 text-white text-[11px] font-bold uppercase tracking-[0.16em] hover:bg-brand-700 transition-colors"
          title="Restore the most recent removal"
        >
          <RotateCcw size={10} /> Undo
        </button>
        {stack.length > 1 && (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="shrink-0 inline-flex items-center gap-1 px-2 py-1.5 rounded-md text-[10.5px] uppercase tracking-[0.14em] font-bold text-fg-muted ring-1 ring-line hover:bg-elevated"
            title="See all recoverable removals — restore any specific one"
          >
            Show all
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-[420px] max-w-[calc(100vw-2rem)] max-h-[70vh] rounded-xl border border-line bg-card-solid shadow-2xl ring-1 ring-line/40 flex flex-col">
      <header className="px-3 py-2.5 border-b border-line flex items-center justify-between gap-2">
        <div className="inline-flex items-center gap-1.5">
          <span className="inline-flex w-6 h-6 rounded-md bg-brand-50 text-brand-700 items-center justify-center">
            <RotateCcw size={11} />
          </span>
          <div>
            <p className="text-[12px] font-semibold text-fg leading-tight">Recovery panel</p>
            <p className="text-[10px] text-fg-muted">{stack.length} recoverable item{stack.length === 1 ? "" : "s"}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="p-1 rounded text-fg-muted hover:bg-elevated"
          title="Collapse to the small snackbar"
        >
          <ChevronDown size={12} />
        </button>
      </header>
      <ul className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {/* Render newest first — that's what the user just removed. */}
        {[...stack].reverse().map((entry, i) => {
          // The reverse() index needs translating back to the
          // canonical stack index so onRestore splices the right one.
          const stackIndex = stack.length - 1 - i;
          return (
            <li key={`${stackIndex}-${entry.label}`} className="flex items-start gap-2 rounded-md bg-bg/40 ring-1 ring-line/40 px-2 py-1.5">
              <div className="min-w-0 flex-1">
                <p className="text-[10px] uppercase tracking-[0.16em] font-bold text-fg-subtle">
                  {entry.type === "bullet" ? "Bullet" : entry.type === "item" ? "Item" : "Section"}
                </p>
                <p className="text-[12px] text-fg mt-0.5 break-words">{entry.label}</p>
              </div>
              <button
                type="button"
                onClick={() => onRestore(stackIndex)}
                className="shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-md bg-brand-600 text-white text-[10.5px] font-bold uppercase tracking-[0.14em] hover:bg-brand-700 transition-colors"
                title={`Restore this ${entry.type} to its original position`}
              >
                <RotateCcw size={10} /> Restore
              </button>
            </li>
          );
        })}
      </ul>
      <footer className="px-3 py-2 border-t border-line flex items-center justify-end">
        <button
          type="button"
          onClick={onClearAll}
          className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10.5px] uppercase tracking-[0.14em] font-bold text-fg-muted hover:text-rose-700 hover:bg-rose-50"
          title="Permanently dismiss every recoverable item (confirms first)"
        >
          <Trash2 size={10} /> Dismiss all
        </button>
      </footer>
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
