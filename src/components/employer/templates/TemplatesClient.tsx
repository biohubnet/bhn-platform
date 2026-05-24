"use client";

/**
 * TemplatesClient — interactive email template manager.
 *
 * Renders templates grouped by kind with inline create/edit form
 * (slide-down panel, no dialog), merge-variable chips, and two-step
 * inline delete confirm.
 */

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Plus, Pencil, Trash2, ChevronDown, ChevronUp, X, AlertCircle, Star,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/Card";

// ── Types ─────────────────────────────────────────────────────────

export interface EmailTemplateRow {
  id:        string;
  name:      string;
  kind:      string;
  subject:   string;
  body:      string;
  isStarter: boolean;
  createdAt: string;
}

interface Props {
  companyId: string;
  templates: EmailTemplateRow[];
  canEdit:   boolean;
}

// ── Constants ────────────────────────────────────────────────────

const KINDS = ["rejection", "interview_invite", "offer", "follow_up", "general"] as const;
type Kind = (typeof KINDS)[number];

const KIND_LABELS: Record<Kind, string> = {
  rejection:       "Rejection",
  interview_invite:"Interview invite",
  offer:           "Offer",
  follow_up:       "Follow-up",
  general:         "General",
};

const KIND_DESCRIPTIONS: Record<Kind, string> = {
  rejection:        "Sent when a candidate is passed or rejected.",
  interview_invite: "Sent when proposing interview slots.",
  offer:            "The formal offer letter email.",
  follow_up:        "Post-interview follow-up or status update.",
  general:          "Ad-hoc templates for other occasions.",
};

const MERGE_VARS = [
  "candidateFirstName",
  "candidateLastName",
  "postingTitle",
  "companyName",
  "interviewerName",
  "interviewDateTime",
  "senderFirstName",
  "senderSignature",
] as const;

// ── Inline form state ────────────────────────────────────────────

interface FormState {
  templateId: string | null; // null = creating new
  kind:       Kind;
  name:       string;
  subject:    string;
  body:       string;
}

function emptyForm(kind: Kind): FormState {
  return { templateId: null, kind, name: "", subject: "", body: "" };
}

// ── Component ────────────────────────────────────────────────────

export function TemplatesClient({ companyId, templates, canEdit }: Props) {
  const router    = useRouter();
  const [pending, startTransition] = useTransition();

  // Active inline form: keyed by kind, null = closed
  const [openForm, setOpenForm]   = useState<FormState | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving]       = useState(false);

  // Two-step delete state: { [templateId]: "confirm" | "deleting" }
  const [deleteState, setDeleteState] = useState<Record<string, "confirm" | "deleting">>({});

  // Ref for the body textarea (used by merge-var cursor insert)
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  // ── Helpers ───────────────────────────────────────────────────

  function openCreate(kind: Kind) {
    setOpenForm(emptyForm(kind));
    setFormError(null);
  }

  function openEdit(t: EmailTemplateRow) {
    setOpenForm({
      templateId: t.id,
      kind:       t.kind as Kind,
      name:       t.name,
      subject:    t.subject,
      body:       t.body,
    });
    setFormError(null);
  }

  function closeForm() {
    setOpenForm(null);
    setFormError(null);
  }

  function insertMergeVar(variable: string) {
    const el = bodyRef.current;
    if (!el || !openForm) return;
    const start = el.selectionStart ?? el.value.length;
    const end   = el.selectionEnd   ?? el.value.length;
    const token = `{{${variable}}}`;
    const newBody =
      openForm.body.slice(0, start) + token + openForm.body.slice(end);
    setOpenForm({ ...openForm, body: newBody });
    // Restore cursor after the inserted token
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + token.length, start + token.length);
    });
  }

  async function handleSave() {
    if (!openForm) return;
    if (!openForm.name.trim())    { setFormError("Name is required."); return; }
    if (!openForm.subject.trim()) { setFormError("Subject is required."); return; }
    setSaving(true);
    setFormError(null);
    try {
      const isEdit = !!openForm.templateId;
      const url = isEdit
        ? `/api/employer/companies/${companyId}/templates/${openForm.templateId}`
        : `/api/employer/companies/${companyId}/templates`;
      const res = await fetch(url, {
        method:  isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          name:    openForm.name,
          kind:    openForm.kind,
          subject: openForm.subject,
          body:    openForm.body,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? "Failed to save template.");
      }
      closeForm();
      startTransition(() => router.refresh());
    } catch (e: unknown) {
      setFormError(e instanceof Error ? e.message : "Unexpected error.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(templateId: string) {
    setDeleteState((s) => ({ ...s, [templateId]: "deleting" }));
    try {
      const res = await fetch(
        `/api/employer/companies/${companyId}/templates/${templateId}`,
        { method: "DELETE" },
      );
      if (!res.ok) throw new Error();
      startTransition(() => router.refresh());
    } catch {
      setDeleteState((s) => {
        const next = { ...s };
        delete next[templateId];
        return next;
      });
    }
  }

  // ── Render ────────────────────────────────────────────────────

  const byKind = (kind: Kind) => templates.filter((t) => t.kind === kind);

  return (
    <div className="space-y-6">
      {KINDS.map((kind) => {
        const list       = byKind(kind);
        const isThisOpen = openForm?.kind === kind;

        return (
          <section key={kind}>
            {/* Kind header */}
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-subtle">
                    {KIND_LABELS[kind]}
                  </span>
                  <span className="text-[10px] text-muted bg-elevated px-1.5 py-0.5 rounded-md border border-line">
                    {list.length}
                  </span>
                </div>
                <p className="text-xs text-muted mt-0.5">{KIND_DESCRIPTIONS[kind]}</p>
              </div>
              {canEdit && (
                <button
                  onClick={() => isThisOpen && openForm?.templateId === null ? closeForm() : openCreate(kind)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-brand text-white hover:bg-brand/90 transition-colors"
                >
                  <Plus size={13} />
                  New template
                </button>
              )}
            </div>

            {/* Template cards */}
            <Card className="divide-y divide-line overflow-hidden">
              {list.length === 0 && !(isThisOpen && !openForm?.templateId) && (
                <div className="px-5 py-8 text-center text-sm text-muted">
                  No templates yet.{canEdit && " Click “New template” to create one."}
                </div>
              )}

              {list.map((t) => {
                const isEditing  = openForm?.templateId === t.id;
                const delState   = deleteState[t.id];

                return (
                  <div key={t.id}>
                    {/* Row */}
                    <div className="px-5 py-3.5 flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-fg">{t.name}</span>
                          {t.isStarter && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200">
                              <Star size={9} />
                              Starter
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted truncate mt-0.5">
                          {t.subject}
                        </p>
                      </div>

                      {canEdit && (
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => isEditing ? closeForm() : openEdit(t)}
                            className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg bg-elevated hover:bg-line border border-line text-fg transition-colors"
                          >
                            {isEditing ? <X size={12} /> : <Pencil size={12} />}
                            {isEditing ? "Cancel" : "Edit"}
                          </button>

                          {!t.isStarter && (
                            delState === "confirm" ? (
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs text-rose-600 font-medium">Delete?</span>
                                <button
                                  onClick={() => handleDelete(t.id)}
                                  disabled={delState === "confirm" && saving}
                                  className="text-xs font-semibold px-2 py-1 rounded-lg bg-rose-600 text-white hover:bg-rose-700 transition-colors"
                                >
                                  Yes, delete
                                </button>
                                <button
                                  onClick={() => setDeleteState((s) => { const n = {...s}; delete n[t.id]; return n; })}
                                  className="text-xs px-2 py-1 rounded-lg bg-elevated border border-line hover:bg-line transition-colors"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setDeleteState((s) => ({ ...s, [t.id]: "confirm" }))}
                                className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg bg-elevated hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 border border-line text-muted transition-colors"
                              >
                                <Trash2 size={12} />
                                Delete
                              </button>
                            )
                          )}
                        </div>
                      )}
                    </div>

                    {/* Inline edit form */}
                    {isEditing && canEdit && (
                      <InlineForm
                        form={openForm!}
                        onChange={setOpenForm}
                        onSave={handleSave}
                        onCancel={closeForm}
                        onInsertVar={insertMergeVar}
                        bodyRef={bodyRef}
                        error={formError}
                        saving={saving}
                        lockKind
                      />
                    )}
                  </div>
                );
              })}

              {/* New template form at the bottom of the section */}
              {isThisOpen && !openForm?.templateId && canEdit && (
                <InlineForm
                  form={openForm!}
                  onChange={setOpenForm}
                  onSave={handleSave}
                  onCancel={closeForm}
                  onInsertVar={insertMergeVar}
                  bodyRef={bodyRef}
                  error={formError}
                  saving={saving}
                  lockKind={kind !== "general"}
                />
              )}
            </Card>
          </section>
        );
      })}
    </div>
  );
}

// ── Inline form sub-component ────────────────────────────────────

interface InlineFormProps {
  form:         FormState;
  onChange:     (f: FormState) => void;
  onSave:       () => void;
  onCancel:     () => void;
  onInsertVar:  (v: string) => void;
  bodyRef:      React.RefObject<HTMLTextAreaElement | null>;
  error:        string | null;
  saving:       boolean;
  lockKind:     boolean;
}

function InlineForm({
  form, onChange, onSave, onCancel, onInsertVar, bodyRef, error, saving, lockKind,
}: InlineFormProps) {
  return (
    <div className="px-5 py-5 bg-elevated/40 border-t border-line space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Name */}
        <div>
          <label className="block text-xs font-semibold text-fg mb-1.5">
            Template name <span className="text-rose-500">*</span>
          </label>
          <input
            value={form.name}
            onChange={(e) => onChange({ ...form, name: e.target.value })}
            placeholder="e.g. Early-stage rejection"
            className="w-full text-sm px-3 py-2 rounded-lg bg-card border border-line focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand text-fg placeholder:text-muted"
          />
        </div>

        {/* Kind */}
        <div>
          <label className="block text-xs font-semibold text-fg mb-1.5">
            Category
          </label>
          {lockKind ? (
            <div className="w-full text-sm px-3 py-2 rounded-lg bg-elevated border border-line text-muted">
              {KIND_LABELS[form.kind]}
            </div>
          ) : (
            <select
              value={form.kind}
              onChange={(e) => onChange({ ...form, kind: e.target.value as Kind })}
              className="w-full text-sm px-3 py-2 rounded-lg bg-card border border-line focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand text-fg"
            >
              {KINDS.map((k) => (
                <option key={k} value={k}>{KIND_LABELS[k]}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Subject */}
      <div>
        <label className="block text-xs font-semibold text-fg mb-1.5">
          Subject line <span className="text-rose-500">*</span>
        </label>
        <input
          value={form.subject}
          onChange={(e) => onChange({ ...form, subject: e.target.value })}
          placeholder="e.g. Update on your application to {{postingTitle}}"
          className="w-full text-sm px-3 py-2 rounded-lg bg-card border border-line focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand text-fg placeholder:text-muted"
        />
      </div>

      {/* Merge variable chips */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-subtle mb-2">
          Insert merge variable
        </p>
        <div className="flex flex-wrap gap-1.5">
          {MERGE_VARS.map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => onInsertVar(v)}
              className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-card border border-line hover:bg-brand/10 hover:border-brand/40 hover:text-brand text-muted transition-colors"
            >
              {`{{${v}}}`}
            </button>
          ))}
        </div>
      </div>

      {/* Body */}
      <div>
        <label className="block text-xs font-semibold text-fg mb-1.5">
          Body
        </label>
        <textarea
          ref={bodyRef}
          value={form.body}
          onChange={(e) => onChange({ ...form, body: e.target.value })}
          rows={10}
          placeholder="Write your email body here. Use merge variables above to personalise."
          className="w-full text-sm font-mono px-3 py-2 rounded-lg bg-card border border-line focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand text-fg placeholder:text-muted resize-y leading-relaxed"
        />
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 text-sm text-rose-700 bg-rose-50 rounded-lg px-3 py-2 ring-1 ring-inset ring-rose-200">
          <AlertCircle size={14} className="shrink-0" />
          {error}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 justify-end">
        <button
          onClick={onCancel}
          className="text-sm px-4 py-2 rounded-lg bg-elevated border border-line hover:bg-line text-fg transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={onSave}
          disabled={saving}
          className="text-sm font-semibold px-4 py-2 rounded-lg bg-brand text-white hover:bg-brand/90 disabled:opacity-50 transition-colors"
        >
          {saving ? "Saving…" : form.templateId ? "Save changes" : "Create template"}
        </button>
      </div>
    </div>
  );
}
