"use client";

/**
 * EQUIP applicant-email gallery + editor.
 *
 *   • Toggle VentureConnect / VentureLift; each card shows the trigger, the
 *     subject, and a live sandboxed preview (snappy 0fr→1fr open/close).
 *   • Admins can EDIT each template: subject, heading, paragraphs, button
 *     label, footnote — plain text with {{placeholders}} and **bold**.
 *   • "AI rewrite": describe the change ("warmer, shorter") and the platform
 *     AI proposes new copy; it lands in the editor + preview, never saved
 *     until the admin hits Save. Reset returns to the shipped default.
 *   • Previews and live sends share one renderer, so WYSIWYG is exact.
 */
import { useState } from "react";
import {
  Mail, ChevronDown, Pencil, Sparkles, Loader2, RotateCcw, Check, X, Eye, BadgeCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface EditableFields {
  subject: string;
  heading: string;
  paras: string[];
  ctaLabel?: string;
  footnote?: string;
}
export interface PreviewItem {
  id: string;
  label: string;
  when: string;
  subject: string;
  html: string;
  fields: EditableFields;
  isCustomized: boolean;
}
export interface StreamPreview {
  key: "venture_connect" | "venture_lift";
  name: string;
  items: PreviewItem[];
}
export interface PlaceholderDoc { token: string; desc: string }

interface Draft {
  subject: string;
  heading: string;
  parasText: string;
  ctaLabel: string;
  footnote: string;
}

const toDraft = (f: EditableFields): Draft => ({
  subject: f.subject,
  heading: f.heading,
  parasText: f.paras.join("\n\n"),
  ctaLabel: f.ctaLabel ?? "",
  footnote: f.footnote ?? "",
});
const fromDraft = (d: Draft): EditableFields => ({
  subject: d.subject.trim(),
  heading: d.heading.trim(),
  paras: d.parasText.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean),
  ctaLabel: d.ctaLabel.trim() || undefined,
  footnote: d.footnote.trim() || undefined,
});

export function EquipEmailGallery({
  streams: initialStreams,
  placeholders,
  canEdit,
}: {
  streams: StreamPreview[];
  placeholders: PlaceholderDoc[];
  canEdit: boolean;
}) {
  const [streams, setStreams] = useState(initialStreams);
  const [active, setActive] = useState(initialStreams[0]?.key ?? "venture_connect");
  const [open, setOpen] = useState<string | null>(initialStreams[0]?.items[0]?.id ?? null);
  // Editor state (one template edited at a time)
  const [editing, setEditing] = useState<string | null>(null); // item id on the active stream
  const [draft, setDraft] = useState<Draft | null>(null);
  const [draftPreview, setDraftPreview] = useState<{ subject: string; html: string } | null>(null);
  const [aiInstruction, setAiInstruction] = useState("");
  const [busy, setBusy] = useState<"preview" | "save" | "ai" | "reset" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const current = streams.find((s) => s.key === active) ?? streams[0];

  function patchItem(id: string, patch: Partial<PreviewItem>) {
    setStreams((cur) =>
      cur.map((s) =>
        s.key !== active ? s : { ...s, items: s.items.map((it) => (it.id === id ? { ...it, ...patch } : it)) },
      ),
    );
  }
  function closeEditor() {
    setEditing(null);
    setDraft(null);
    setDraftPreview(null);
    setAiInstruction("");
    setError(null);
    setNotice(null);
  }
  function startEdit(it: PreviewItem) {
    setEditing(it.id);
    setDraft(toDraft(it.fields));
    setDraftPreview(null);
    setAiInstruction("");
    setError(null);
    setNotice(null);
  }

  async function api(path: string, init: RequestInit) {
    const res = await fetch(path, { headers: { "Content-Type": "application/json" }, ...init });
    const j = (await res.json().catch(() => ({}))) as Record<string, unknown> & { error?: string };
    if (!res.ok) throw new Error(j.error ?? "Request failed.");
    return j;
  }

  async function updatePreview() {
    if (!draft || !editing) return;
    setBusy("preview");
    setError(null);
    try {
      const j = await api("/api/admin/equip/email-templates/preview", {
        method: "POST",
        body: JSON.stringify({ id: editing, stream: active, fields: fromDraft(draft) }),
      });
      setDraftPreview({ subject: j.subject as string, html: j.html as string });
      setNotice(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function askAi() {
    if (!draft || !editing) return;
    setBusy("ai");
    setError(null);
    try {
      const j = await api("/api/admin/equip/email-templates/assist", {
        method: "POST",
        body: JSON.stringify({ id: editing, stream: active, instruction: aiInstruction, fields: fromDraft(draft) }),
      });
      setDraft(toDraft(j.fields as EditableFields));
      setDraftPreview({ subject: j.subject as string, html: j.html as string });
      setNotice("AI draft loaded — review the preview, tweak if needed, then Save.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function save() {
    if (!draft || !editing) return;
    setBusy("save");
    setError(null);
    try {
      const j = await api("/api/admin/equip/email-templates", {
        method: "PATCH",
        body: JSON.stringify({ id: editing, stream: active, fields: fromDraft(draft) }),
      });
      patchItem(editing, {
        fields: j.fields as EditableFields,
        subject: j.subject as string,
        html: j.html as string,
        isCustomized: true,
      });
      closeEditor();
    } catch (e) {
      setError((e as Error).message);
      setBusy(null);
    }
  }

  async function resetToDefault(it: PreviewItem) {
    if (!confirm(`Reset “${it.label}” (${current.name}) to the shipped default copy?`)) return;
    setBusy("reset");
    setError(null);
    try {
      const j = await api(`/api/admin/equip/email-templates?id=${it.id}&stream=${active}`, { method: "DELETE" });
      patchItem(it.id, {
        fields: j.fields as EditableFields,
        subject: j.subject as string,
        html: j.html as string,
        isCustomized: false,
      });
      closeEditor();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  const inputCls =
    "w-full rounded-md border border-line bg-card-solid px-2.5 py-1.5 text-[13px] focus:outline-none focus:ring-2 focus:ring-brand-400";
  const labelCls = "block text-[10px] font-bold uppercase tracking-wider text-subtle";

  return (
    <div className="space-y-4">
      {/* Stream toggle */}
      <div className="inline-flex items-center gap-1 rounded-lg bg-elevated/60 p-1">
        {streams.map((s) => (
          <button
            key={s.key}
            type="button"
            onClick={() => { setActive(s.key); setOpen(s.items[0]?.id ?? null); closeEditor(); }}
            className={cn(
              "rounded-md px-4 py-1.5 text-xs font-bold transition-colors",
              active === s.key ? "bg-card-solid text-fg shadow-card-rest" : "text-muted hover:text-fg",
            )}
          >
            {s.name}
            <span className="ml-1.5 rounded-full bg-elevated px-1.5 text-[10px] tabular-nums text-subtle">{s.items.length}</span>
          </button>
        ))}
      </div>

      <ul className="space-y-3">
        {current.items.map((it) => {
          const isOpen = open === it.id;
          const isEditing = editing === it.id;
          const shownSubject = isEditing && draftPreview ? draftPreview.subject : it.subject;
          const shownHtml = isEditing && draftPreview ? draftPreview.html : it.html;
          return (
            <li key={it.id} className="overflow-hidden rounded-xl border border-line bg-card-solid">
              <button
                type="button"
                onClick={() => { setOpen(isOpen ? null : it.id); if (isOpen) closeEditor(); }}
                className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-elevated/40"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
                  <Mail size={15} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2 text-sm font-bold text-fg">
                    {it.label}
                    {it.isCustomized && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-semibold text-brand-700">
                        <BadgeCheck size={10} /> Customized
                      </span>
                    )}
                  </span>
                  <span className="block text-[11.5px] text-muted">Sends when: {it.when}</span>
                </span>
                <ChevronDown size={16} className={cn("shrink-0 text-muted transition-transform", isOpen && "rotate-180")} />
              </button>

              {/* Snappy open/close: grid-rows 0fr→1fr + quick opacity lift. */}
              <div
                className={cn(
                  "grid transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none",
                  isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
                )}
              >
                <div className="overflow-hidden">
                  <div
                    className={cn(
                      "border-t border-line transition-opacity duration-150 ease-out",
                      isOpen ? "opacity-100" : "opacity-0",
                    )}
                  >
                    {/* Subject + actions row */}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-4 py-2.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-subtle">Subject</span>
                      <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-fg">{shownSubject}</span>
                      {canEdit && !isEditing && (
                        <span className="flex items-center gap-2">
                          {it.isCustomized && (
                            <button
                              type="button"
                              onClick={() => resetToDefault(it)}
                              disabled={busy !== null}
                              className="inline-flex items-center gap-1.5 rounded-md border border-line bg-card-solid px-2.5 py-1.5 text-[11px] font-semibold text-muted hover:bg-elevated hover:text-fg disabled:opacity-50"
                            >
                              <RotateCcw size={11} /> Reset to default
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => startEdit(it)}
                            className="inline-flex items-center gap-1.5 rounded-md bg-brand-600 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-brand-700"
                          >
                            <Pencil size={11} /> Edit template
                          </button>
                        </span>
                      )}
                    </div>

                    {/* Editor panel */}
                    {isEditing && draft && (
                      <div className="space-y-3 border-t border-line bg-elevated/30 px-4 py-4">
                        {/* AI assist */}
                        <div className="rounded-lg border border-brand-200 bg-brand-50/60 p-3">
                          <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-brand-700">
                            <Sparkles size={12} /> AI rewrite
                          </p>
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <input
                              value={aiInstruction}
                              onChange={(e) => setAiInstruction(e.target.value)}
                              onKeyDown={(e) => e.key === "Enter" && busy === null && askAi()}
                              placeholder="e.g. Make it warmer and shorter · Add a sentence about reimbursement timelines"
                              className="min-w-[16rem] flex-1 rounded-md border border-brand-200 bg-card-solid px-2.5 py-1.5 text-[13px] focus:outline-none focus:ring-2 focus:ring-brand-400"
                            />
                            <button
                              type="button"
                              onClick={askAi}
                              disabled={busy !== null || aiInstruction.trim().length < 3}
                              className="inline-flex items-center gap-1.5 rounded-md bg-brand-600 px-3.5 py-1.5 text-[12px] font-bold text-white hover:bg-brand-700 disabled:opacity-50"
                            >
                              {busy === "ai" ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                              Rewrite
                            </button>
                          </div>
                          <p className="mt-1.5 text-[11px] leading-relaxed text-brand-900/70">
                            The AI proposes copy into the fields below — nothing sends until you Save.
                          </p>
                        </div>

                        {/* Fields */}
                        <div className="grid gap-3 sm:grid-cols-2">
                          <label className="block sm:col-span-2">
                            <span className={labelCls}>Subject</span>
                            <input value={draft.subject} onChange={(e) => setDraft({ ...draft, subject: e.target.value })} className={cn(inputCls, "mt-1")} />
                          </label>
                          <label className="block">
                            <span className={labelCls}>Heading</span>
                            <input value={draft.heading} onChange={(e) => setDraft({ ...draft, heading: e.target.value })} className={cn(inputCls, "mt-1")} />
                          </label>
                          <label className="block">
                            <span className={labelCls}>Button label</span>
                            <input value={draft.ctaLabel} onChange={(e) => setDraft({ ...draft, ctaLabel: e.target.value })} placeholder="(no button if empty)" className={cn(inputCls, "mt-1")} />
                          </label>
                          <label className="block sm:col-span-2">
                            <span className={labelCls}>Body — one paragraph per blank line</span>
                            <textarea
                              value={draft.parasText}
                              onChange={(e) => setDraft({ ...draft, parasText: e.target.value })}
                              rows={8}
                              className={cn(inputCls, "mt-1 resize-y font-mono text-[12.5px] leading-relaxed")}
                            />
                          </label>
                          <label className="block sm:col-span-2">
                            <span className={labelCls}>Footnote (small print, optional)</span>
                            <input value={draft.footnote} onChange={(e) => setDraft({ ...draft, footnote: e.target.value })} className={cn(inputCls, "mt-1")} />
                          </label>
                        </div>

                        {/* Placeholders helper */}
                        <details className="rounded-lg border border-line bg-card-solid px-3 py-2">
                          <summary className="cursor-pointer text-[11.5px] font-semibold text-muted hover:text-fg">
                            Placeholders you can use ( {"{{firstName}}"}, {"{{streamName}}"}, … ) + **bold**
                          </summary>
                          <ul className="mt-2 grid gap-x-6 gap-y-1 sm:grid-cols-2">
                            {placeholders.map((p) => (
                              <li key={p.token} className="text-[11.5px] text-muted">
                                <code className="rounded bg-elevated px-1 py-0.5 font-mono text-[10.5px] text-fg">{p.token}</code> — {p.desc}
                              </li>
                            ))}
                          </ul>
                          <p className="mt-2 text-[11px] text-subtle">
                            Reviewer / disbursement notes are appended automatically when present. The button's destination is fixed; only its label is editable.
                          </p>
                        </details>

                        {error && <p className="text-[12px] font-medium text-rose-700">{error}</p>}
                        {notice && <p className="text-[12px] font-medium text-brand-700">{notice}</p>}

                        {/* Actions */}
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={updatePreview}
                            disabled={busy !== null}
                            className="inline-flex items-center gap-1.5 rounded-md border border-line bg-card-solid px-3.5 py-2 text-[12px] font-semibold text-fg hover:bg-elevated disabled:opacity-50"
                          >
                            {busy === "preview" ? <Loader2 size={13} className="animate-spin" /> : <Eye size={13} />}
                            Update preview
                          </button>
                          <button
                            type="button"
                            onClick={save}
                            disabled={busy !== null}
                            className="inline-flex items-center gap-1.5 rounded-md bg-brand-600 px-4 py-2 text-[12px] font-bold text-white hover:bg-brand-700 disabled:opacity-50"
                          >
                            {busy === "save" ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                            Save template
                          </button>
                          <button
                            type="button"
                            onClick={closeEditor}
                            disabled={busy === "save"}
                            className="inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-[12px] font-semibold text-muted hover:text-fg disabled:opacity-50"
                          >
                            <X size={13} /> Cancel
                          </button>
                        </div>
                      </div>
                    )}

                    <iframe
                      title={`${it.label} preview`}
                      srcDoc={shownHtml}
                      sandbox=""
                      loading="lazy"
                      className="h-[560px] w-full border-0 bg-[#f1f5f9]"
                    />
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
