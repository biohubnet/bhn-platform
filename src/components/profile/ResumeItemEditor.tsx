"use client";

/**
 * Kind-aware editor for a single ResumeItem.
 *
 * The fields shown depend on `section.kind` via the SECTION_HINTS
 * table — Experience surfaces Job title / Company / start/end dates /
 * Currently here / Description / Achievement bullets. Education
 * surfaces Degree / Institution / dates / GPA. Skills hides
 * everything except the bullet list. And so on.
 *
 * The component is presentational — it owns no state, it only emits
 * patch deltas via `onPatch`. Bullet edits route through a separate
 * `bullets` slot so the parent can keep wiring up the existing
 * comment-thread, AI rewrite, and per-bullet handlers.
 */

import type { ResumeItem, ResumeSectionKind } from "@/lib/resume/types";
import { SECTION_HINTS } from "@/lib/resume/types";
import { Trash2, ExternalLink } from "lucide-react";
import { RewriteableTextarea } from "./RewriteableTextarea";

interface Props {
  kind: ResumeSectionKind;
  item: ResumeItem;
  onPatch: (patch: Partial<ResumeItem>) => void;
  onRemove: () => void;
  /** Render the bullet list — passed in so the parent keeps owning
   *  bullet identity, comment threads, AI rewrite buttons. Hidden by
   *  the hints when the section doesn't use bullets (Certifications,
   *  Publications, Awards). */
  bulletsSlot: React.ReactNode;
}

export function ResumeItemEditor({ kind, item, onPatch, onRemove, bulletsSlot }: Props) {
  const h = SECTION_HINTS[kind];
  return (
    <div className="border border-line rounded-xl p-3 bg-card space-y-2.5">
      {/* Primary fields — title + subtitle */}
      {(h.titleLabel || h.subtitleLabel) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {h.titleLabel && (
            <Field
              label={h.titleLabel}
              value={item.title ?? ""}
              onChange={(v) => onPatch({ title: v })}
            />
          )}
          {h.subtitleLabel && (
            <Field
              label={h.subtitleLabel}
              value={item.subtitle ?? ""}
              onChange={(v) => onPatch({ subtitle: v })}
            />
          )}
        </div>
      )}

      {/* Dates + currently-here toggle.
       *
       * End date stays editable even when "Currently here" is checked
       * — for Education that's where the user types an *expected*
       * graduation date. The display layer (formatItemDates) does the
       * right thing with the combination:
       *
       *   start + end + current → "Sep 2022 – May 2026 (expected)"
       *   start + current       → "Sep 2022 – Present"
       *   end   + current       → "Expected: May 2026"
       *
       * Toggling the checkbox never clears endDate any more — that
       * was throwing away user typing on every accidental click. */}
      {h.showDates && (
        <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-2 items-end">
          <Field
            label="Start date"
            value={item.startDate ?? ""}
            onChange={(v) => onPatch({ startDate: v })}
            placeholder="May 2025"
          />
          <Field
            // Re-label by kind + "current" state so it's obvious what
            // the field means in context.
            label={endDateLabel(kind, item.current === true)}
            value={item.endDate ?? ""}
            onChange={(v) => onPatch({ endDate: v })}
            placeholder={endDatePlaceholder(kind, item.current === true)}
          />
          <label className="inline-flex items-center gap-2 text-[11px] text-fg-muted whitespace-nowrap pb-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={item.current === true}
              onChange={(e) => onPatch({ current: e.target.checked })}
              className="rounded border-line text-brand-600 focus:ring-brand-300"
            />
            {currentLabel(kind)}
          </label>
        </div>
      )}

      {/* Metric (kind-specific quantitative field) + URL */}
      {(h.metricLabel || h.showUrl) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {h.metricLabel && (
            <Field
              label={h.metricLabel}
              value={item.metric ?? ""}
              onChange={(v) => onPatch({ metric: v })}
              placeholder={metricPlaceholder(kind)}
            />
          )}
          {h.showUrl && (
            <Field
              label="URL"
              value={item.url ?? ""}
              onChange={(v) => onPatch({ url: v })}
              placeholder="https://…"
              suffix={
                item.url
                  ? (
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[10px] text-brand-700 hover:underline"
                    >
                      <ExternalLink size={9} /> open
                    </a>
                  )
                  : null
              }
            />
          )}
        </div>
      )}

      {/* Free-text description / intro paragraph — wrapped with the
          AI rewrite chip so the trainee can ask for a stronger version
          inline. Context fed to the prompt includes the item's
          title / subtitle so the rewrite stays grounded. */}
      {h.showDescription && (
        <RewriteableTextarea
          label="Description"
          value={item.description ?? ""}
          onChange={(v) => onPatch({ description: v })}
          rows={3}
          placeholder={
            kind === "summary"
              ? "Your professional summary — 2-3 sentences for the top of the resume"
              : "One-sentence context for this entry. The bullets below carry the achievements."
          }
          rewriteContext={
            kind === "summary"
              ? "Resume summary section — opening paragraph at the top of the resume"
              : `Description under ${[item.title, item.subtitle].filter(Boolean).join(" · ") || `${kind} item`}`
          }
          rewriteInstruction={
            kind === "summary"
              ? "Keep it 2-3 sentences. First sentence: what they do. Second: specialty. Third: what they're looking for."
              : "Keep it one short sentence — context for the bullets below, not a replacement for them."
          }
        />
      )}

      {/* Bullets (delegated to parent) */}
      {h.showBullets && bulletsSlot}

      <div className="flex justify-end pt-1">
        <button
          type="button"
          onClick={onRemove}
          title="Remove this item"
          className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10.5px] uppercase tracking-[0.16em] font-bold text-rose-700 hover:bg-rose-50"
        >
          <Trash2 size={11} /> Remove
        </button>
      </div>
    </div>
  );
}

/** End-date field label, kind-aware. For Education we explicitly call
 *  out "Expected graduation" when the user is still in school so they
 *  know exactly what to type. For Certifications "End date" is the
 *  expiry; if Currently here is on it means "no expiry". */
function endDateLabel(kind: ResumeSectionKind, current: boolean): string {
  if (current) {
    if (kind === "education") return "Expected graduation (optional)";
    if (kind === "certifications") return "Expiry (leave empty if no expiry)";
    if (kind === "projects") return "Ongoing — expected end (optional)";
    return "End date (optional)";
  }
  if (kind === "education") return "End date / graduation";
  if (kind === "certifications") return "Expiry";
  return "End date";
}

/** Placeholder for the kind-specific "metric" field. Empty values
 *  are omitted from the rendered resume, so we let users know via
 *  the placeholder that nothing's required. */
function metricPlaceholder(kind: ResumeSectionKind): string {
  switch (kind) {
    case "education":      return "GPA 3.8 / 4.0  ·  optional, omitted if empty";
    case "certifications": return "Credential ID  ·  optional";
    case "awards":         return "Top 5%  ·  1st place  ·  optional";
    case "publications":   return "Nature Methods  ·  arXiv  ·  optional";
    default:               return "Optional";
  }
}

function endDatePlaceholder(kind: ResumeSectionKind, current: boolean): string {
  if (current && kind === "education") return "May 2026";
  if (current) return "";
  return "Aug 2025";
}

/** Checkbox label, kind-aware. "Currently here" reads weirdly for
 *  Certifications and Awards — let it mean something more specific
 *  per kind. */
function currentLabel(kind: ResumeSectionKind): string {
  switch (kind) {
    case "experience":     return "Currently working here";
    case "education":      return "Currently studying";
    case "volunteering":   return "Currently active";
    case "projects":       return "Ongoing project";
    case "certifications": return "No expiry";
    default:               return "Currently here";
  }
}

function Field({
  label, value, onChange, multiline, placeholder, disabled, suffix,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
  placeholder?: string;
  disabled?: boolean;
  suffix?: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-[10px] uppercase tracking-[0.22em] font-semibold text-fg-subtle inline-flex items-center justify-between w-full">
        <span>{label}</span>
        {suffix}
      </span>
      <div className="mt-1">
        {multiline ? (
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            disabled={disabled}
            rows={3}
            className="w-full bg-card-solid border border-line rounded-md px-2 py-1.5 text-sm focus:outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-100 disabled:opacity-50"
          />
        ) : (
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            disabled={disabled}
            className="w-full bg-card-solid border border-line rounded-md px-2 py-1.5 text-sm focus:outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-100 disabled:opacity-50"
          />
        )}
      </div>
    </label>
  );
}
