"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, X, Save, RotateCcw, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Renders a string + (for staff) an inline pencil button that opens
 * a modal editor. Reads the server-resolved value as `defaultText`,
 * displays it as-is for everyone, and lets staff override it.
 *
 * Why a modal instead of inline contenteditable?
 *   • Parent containers can be a <p>, <h1>, dark-on-light hero — we
 *     don't want the editor inheriting (or fighting) whatever styles
 *     the parent applies.
 *   • The editor needs Save / Cancel / Reset-to-default + future
 *     extras (preview, length warnings) — a modal makes that natural.
 *   • Editing copy is infrequent. The extra click is fine.
 *
 * The displayed text is wrapped in a span carrying the staff-only
 * pencil; in non-staff render the wrapper is invisible (no extra
 * affordance, no layout shift).
 */

interface Props {
  copyKey: string;
  /** Server-resolved text — already the override if one exists, else the code default. */
  defaultText: string;
  isStaff: boolean;
  /** Optional className on the wrapper span. */
  className?: string;
  /** Single-line input vs multi-line textarea in the editor. Defaults to multiline. */
  multiline?: boolean;
  /**
   * If true, the rendered text accepts empty as a valid value
   * (e.g. the dashboard greeting that's empty by default). Default
   * is false: an empty resolved value renders nothing and the
   * pencil floats alone, which would feel like a bug if not opted in.
   */
  allowEmpty?: boolean;
}

export function EditableText({
  copyKey,
  defaultText,
  isStaff,
  className,
  multiline = true,
  allowEmpty = false,
}: Props) {
  const router = useRouter();
  const [text, setText] = useState(defaultText);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(defaultText);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Re-sync when the server-resolved text changes (after router.refresh
  // following a save, or when the parent's context changes).
  useEffect(() => { setText(defaultText); }, [defaultText]);

  // Auto-focus the field when the editor opens.
  useEffect(() => {
    if (!editing) return;
    const el = multiline ? textareaRef.current : inputRef.current;
    el?.focus();
    if (el && "select" in el) el.select();
  }, [editing, multiline]);

  function openEditor() {
    setDraft(text);
    setError(null);
    setEditing(true);
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/copy", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: copyKey, value: draft }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error ?? "Couldn't save. Please try again.");
        return;
      }
      setText(draft);
      setEditing(false);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function reset() {
    if (!window.confirm("Reset this text to the code default? You'll lose your current override.")) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/copy?key=${encodeURIComponent(copyKey)}`, { method: "DELETE" });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error ?? "Couldn't reset.");
        return;
      }
      setEditing(false);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  // Render the text. If empty and not staff, render nothing at all
  // (no orphan zero-width wrapper). If empty and staff, render a
  // muted placeholder so the pencil has something to anchor to.
  const visibleText = text || (isStaff ? "(empty — click pencil to set)" : "");
  const isPlaceholder = !text && isStaff;

  return (
    <>
      <span
        className={cn(
          "group/copy relative inline align-baseline",
          isPlaceholder && "italic opacity-60",
          className,
        )}
      >
        {(text || allowEmpty || isStaff) && visibleText}
        {isStaff && (
          <button
            type="button"
            onClick={openEditor}
            title={`Edit "${copyKey}"`}
            aria-label={`Edit copy: ${copyKey}`}
            className="admin-glow opacity-0 group-hover/copy:opacity-100 focus:opacity-100 transition-opacity inline-flex items-center justify-center w-5 h-5 ml-1 align-baseline rounded text-current/70 hover:text-current bg-current/10 hover:bg-current/20"
          >
            <Pencil size={10} />
          </button>
        )}
      </span>

      {editing && isStaff && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => !saving && setEditing(false)}
        >
          <div
            className="max-w-2xl w-full bg-card rounded-2xl border border-line shadow-xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-subtle">
                  Edit copy
                </p>
                <h3 className="text-base font-semibold text-fg mt-1 tracking-tight font-mono">
                  {copyKey}
                </h3>
              </div>
              <button
                onClick={() => setEditing(false)}
                disabled={saving}
                className="text-muted hover:text-fg p-1 rounded-lg hover:bg-elevated disabled:opacity-50"
                aria-label="Close"
              >
                <X size={14} />
              </button>
            </div>

            {multiline ? (
              <textarea
                ref={textareaRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                disabled={saving}
                rows={5}
                className="w-full text-sm leading-relaxed text-fg bg-elevated rounded-xl border border-line px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500/60 resize-y"
              />
            ) : (
              <input
                ref={inputRef}
                type="text"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                disabled={saving}
                className="w-full text-sm text-fg bg-elevated rounded-xl border border-line px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500/60"
              />
            )}

            {error && (
              <p className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2 mt-3">
                {error}
              </p>
            )}

            <div className="flex items-center justify-between gap-2 mt-4">
              <button
                type="button"
                onClick={reset}
                disabled={saving}
                className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg text-muted hover:text-fg hover:bg-elevated transition-colors disabled:opacity-50"
              >
                <RotateCcw size={12} />
                Reset to default
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  disabled={saving}
                  className="px-3 py-1.5 rounded-lg text-sm font-medium text-muted hover:text-fg hover:bg-elevated disabled:opacity-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={save}
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50 transition-colors"
                >
                  {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                  {saving ? "Saving…" : "Save"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
