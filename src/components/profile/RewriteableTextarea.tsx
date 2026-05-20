"use client";

/**
 * Reusable text field that wraps a textarea with an AI-rewrite chip
 * and an inline diff card (Original | Proposed editable). Used for
 * any free-text resume field that benefits from AI suggestions —
 * header.summary, item.description, etc.
 *
 * Bullets have their own per-bullet rewrite path because they
 * additionally support comment-driven rewrites + revision snapshots
 * server-side. This component is the lighter-weight cousin for plain
 * text fields where preview-then-accept-into-local-state is enough
 * (auto-save persists through the existing PATCH path).
 */

import { useState, useTransition } from "react";
import { Wand2, Loader2, CheckCircle2, X } from "lucide-react";

interface Props {
  value: string;
  onChange: (v: string) => void;
  label?: string;
  placeholder?: string;
  rows?: number;
  /** Disable the rewrite chip when the user typed nothing yet. */
  rewriteDisabled?: boolean;
  /** Surrounding context fed to the AI prompt — "Description under
   *  STEMCELL · Manufacturing Process Intern" yields better rewrites
   *  than a context-free string. */
  rewriteContext?: string;
  /** Optional steering instruction — "tighten to 2 sentences",
   *  "first-person → past tense", etc. */
  rewriteInstruction?: string;
}

export function RewriteableTextarea({
  value, onChange, label, placeholder, rows = 3,
  rewriteDisabled, rewriteContext, rewriteInstruction,
}: Props) {
  const [preview, setPreview] = useState<{ original: string; rewritten: string } | null>(null);
  const [edited, setEdited] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function runRewrite() {
    setError(null);
    if (!value.trim()) return;
    startTransition(async () => {
      try {
        const r = await fetch("/api/profile/resume/structure/rewrite-text", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            original: value,
            context: rewriteContext,
            instruction: rewriteInstruction,
          }),
        });
        const j = (await r.json().catch(() => ({}))) as {
          ok?: boolean; error?: string; original?: string; rewritten?: string; changed?: boolean;
        };
        if (!r.ok || !j.ok || !j.rewritten || !j.original) {
          setError(j.error ?? "AI rewrite failed.");
          return;
        }
        if (j.changed === false) {
          setError("AI returned an essentially identical version.");
          return;
        }
        setPreview({ original: j.original, rewritten: j.rewritten });
        setEdited(j.rewritten);
      } catch (e) {
        setError((e as Error).message);
      }
    });
  }

  function accept() {
    const finalText = edited.trim();
    if (!finalText) return;
    onChange(finalText);
    setPreview(null);
    setEdited("");
  }
  function dismiss() {
    setPreview(null);
    setEdited("");
    setError(null);
  }

  return (
    <div className="space-y-1.5">
      {label && (
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-[0.22em] font-semibold text-fg-subtle">{label}</span>
          <button
            type="button"
            onClick={runRewrite}
            disabled={pending || rewriteDisabled || !value.trim()}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] uppercase tracking-[0.16em] font-bold bg-brand-50 text-brand-800 ring-1 ring-inset ring-brand-200 hover:bg-brand-100 disabled:opacity-40 transition-colors"
            title="Rewrite this text with AI"
          >
            {pending ? <Loader2 size={9} className="animate-spin" /> : <Wand2 size={9} />}
            Rewrite
          </button>
        </div>
      )}
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full bg-card-solid border border-line rounded-md px-2 py-1.5 text-sm focus:outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-100"
      />
      {/* When there's no label, render the chip below the textarea so
          the wrapper still surfaces a Rewrite affordance. */}
      {!label && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={runRewrite}
            disabled={pending || rewriteDisabled || !value.trim()}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] uppercase tracking-[0.16em] font-bold bg-brand-50 text-brand-800 ring-1 ring-inset ring-brand-200 hover:bg-brand-100 disabled:opacity-40 transition-colors"
          >
            {pending ? <Loader2 size={9} className="animate-spin" /> : <Wand2 size={9} />}
            Rewrite
          </button>
        </div>
      )}

      {error && !preview && (
        <div className="text-[11px] text-rose-700 inline-flex items-center gap-1.5">
          {error}
          <button type="button" onClick={dismiss} className="underline">dismiss</button>
        </div>
      )}

      {preview && (
        <div className="rounded-xl border border-brand-200 bg-brand-50/40 p-3 space-y-2">
          <p className="text-[10px] font-mono uppercase tracking-[0.22em] font-bold text-brand-800 inline-flex items-center gap-1.5">
            <Wand2 size={10} /> AI rewrite — edit before accepting
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="rounded-md bg-card-solid border border-line p-2">
              <p className="text-[10px] uppercase tracking-[0.18em] font-semibold text-fg-subtle mb-1">Original</p>
              <p className="text-sm text-fg leading-snug whitespace-pre-wrap">{preview.original}</p>
            </div>
            <div className="rounded-md bg-card-solid border border-brand-300 p-2">
              <p className="text-[10px] uppercase tracking-[0.18em] font-semibold text-brand-700 mb-1">Proposed (editable)</p>
              <textarea
                value={edited}
                onChange={(e) => setEdited(e.target.value)}
                rows={Math.max(3, Math.min(8, Math.ceil(edited.length / 60)))}
                className="w-full bg-card-solid border border-line rounded-md px-2 py-1.5 text-sm leading-snug focus:outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-100 resize-y"
                onKeyDown={(e) => {
                  if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                    e.preventDefault();
                    accept();
                  }
                }}
              />
            </div>
          </div>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setEdited(preview.rewritten)}
              disabled={edited === preview.rewritten}
              className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium text-fg-muted hover:bg-fg/5 disabled:opacity-50"
              title="Restore the AI's original wording"
            >
              Reset to AI
            </button>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={dismiss}
                className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium text-fg-muted hover:bg-fg/5"
              >
                <X size={11} /> Dismiss
              </button>
              <button
                type="button"
                onClick={accept}
                disabled={edited.trim().length === 0}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-brand-600 text-white text-[11px] font-semibold hover:bg-brand-700 disabled:opacity-50 transition-colors"
              >
                <CheckCircle2 size={11} /> Accept
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
