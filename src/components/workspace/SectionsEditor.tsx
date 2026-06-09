"use client";

/**
 * Structured-sections editor (Option A). The script is a list of titled
 * markdown blocks. Each section has a heading + a markdown body with a
 * preview toggle; sections can be added, reordered, and removed. Controlled
 * by the parent (ScriptStudio) which owns the array + the Save action.
 */
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { Plus, Trash2, ArrowUp, ArrowDown, Eye, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";

export interface EditorSection {
  heading: string;
  body: string;
}

export function SectionsEditor({
  sections,
  onChange,
  disabled,
}: {
  sections: EditorSection[];
  onChange: (s: EditorSection[]) => void;
  disabled?: boolean;
}) {
  const [previewIdx, setPreviewIdx] = useState<number | null>(null);

  const update = (i: number, patch: Partial<EditorSection>) =>
    onChange(sections.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  const add = () => onChange([...sections, { heading: "New section", body: "" }]);
  const remove = (i: number) => onChange(sections.filter((_, idx) => idx !== i));
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= sections.length) return;
    const next = [...sections];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };

  const iconBtn =
    "inline-flex h-7 w-7 items-center justify-center rounded-md text-muted hover:text-fg hover:bg-elevated disabled:opacity-40";

  return (
    <div className="space-y-3">
      {sections.map((s, i) => (
        <div key={i} className="rounded-xl border border-line bg-card-solid p-3">
          <div className="mb-2 flex items-center gap-1.5">
            <input
              value={s.heading}
              disabled={disabled}
              onChange={(e) => update(i, { heading: e.target.value })}
              placeholder="Section heading"
              className="flex-1 border-b border-line bg-transparent px-1 py-1 text-sm font-semibold text-fg focus:border-brand-400 focus:outline-none"
            />
            <button
              type="button"
              title={previewIdx === i ? "Edit" : "Preview markdown"}
              onClick={() => setPreviewIdx(previewIdx === i ? null : i)}
              className={iconBtn}
            >
              {previewIdx === i ? <Pencil size={14} /> : <Eye size={14} />}
            </button>
            <button type="button" title="Move up" disabled={disabled || i === 0} onClick={() => move(i, -1)} className={iconBtn}>
              <ArrowUp size={14} />
            </button>
            <button type="button" title="Move down" disabled={disabled || i === sections.length - 1} onClick={() => move(i, 1)} className={iconBtn}>
              <ArrowDown size={14} />
            </button>
            <button type="button" title="Remove section" disabled={disabled} onClick={() => remove(i)} className={cn(iconBtn, "hover:text-rose-700")}>
              <Trash2 size={14} />
            </button>
          </div>
          {previewIdx === i ? (
            <div className="markdown-body min-h-[90px] rounded-md bg-elevated/40 px-3 py-2 text-sm leading-relaxed text-fg [&_h3]:mt-3 [&_h3]:font-semibold [&_li]:ml-4 [&_li]:list-disc [&_p]:my-1.5">
              <ReactMarkdown>{s.body || "_(empty)_"}</ReactMarkdown>
            </div>
          ) : (
            <textarea
              value={s.body}
              disabled={disabled}
              onChange={(e) => update(i, { body: e.target.value })}
              rows={Math.max(4, s.body.split("\n").length + 1)}
              placeholder="Write this section… markdown supported (**bold**, - bullets, ### sub-heading)"
              className="min-h-[90px] w-full resize-y bg-transparent text-sm leading-relaxed text-fg focus:outline-none"
            />
          )}
        </div>
      ))}
      <button
        type="button"
        onClick={add}
        disabled={disabled}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-700 hover:text-brand-900 disabled:opacity-50"
      >
        <Plus size={14} /> Add section
      </button>
    </div>
  );
}
