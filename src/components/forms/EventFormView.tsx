"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Pencil, Save, X, Plus, Trash2, Check, AlertCircle, Loader2, ListChecks,
  ChevronUp, ChevronDown, Type, Mail, Link as LinkIcon, AlignLeft, ListChecks as RadioIcon, Heading,
} from "lucide-react";
import {
  type FormField,
  type ChoiceField,
  type InputField,
  isChoiceField,
  isInputField,
  isSectionField,
} from "@/lib/forms/types";

interface Props {
  slug: string;
  title: string;
  description: string | null;
  fields: FormField[];
  active: boolean;
  isStaff: boolean;
  userEmail: string | null;
  previousData: Record<string, string | string[]> | null;
  previousAt: string | null;
}

type Mode = "view" | "edit";

export function EventFormView({
  slug,
  title,
  description,
  fields: initialFields,
  active,
  isStaff,
  userEmail,
  previousData,
  previousAt,
}: Props) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("view");

  // Schema (only mutated in edit mode). Source of truth for view mode too,
  // so a successful save reflects immediately without a router.refresh().
  const [schema, setSchema] = useState<FormField[]>(initialFields);
  const [draft, setDraft] = useState<FormField[]>(initialFields);
  const [savingSchema, setSavingSchema] = useState(false);
  const [schemaError, setSchemaError] = useState<string | null>(null);

  // Submission state
  const [values, setValues] = useState<Record<string, string>>(() => {
    const v: Record<string, string> = {};
    if (previousData) {
      for (const k in previousData) {
        const x = previousData[k];
        v[k] = Array.isArray(x) ? x.join(", ") : (x ?? "");
      }
    }
    return v;
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const enterEdit = () => {
    setDraft(JSON.parse(JSON.stringify(schema)));
    setSchemaError(null);
    setMode("edit");
  };
  const cancelEdit = () => {
    setDraft(schema);
    setSchemaError(null);
    setMode("view");
  };

  async function saveSchema() {
    setSavingSchema(true);
    setSchemaError(null);
    try {
      const res = await fetch(`/api/forms/${slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fields: draft }),
      });
      const j = (await res.json().catch(() => ({}))) as {
        error?: string; ok?: boolean;
      };
      if (!res.ok) {
        setSchemaError(j.error ?? "Save failed.");
        return;
      }
      setSchema(draft);
      setMode("view");
    } finally {
      setSavingSchema(false);
    }
  }

  function patchField(id: string, patch: Partial<FormField>) {
    setDraft((cur) =>
      cur.map((f) => (f.id === id ? ({ ...f, ...patch } as FormField) : f))
    );
  }

  function removeField(id: string) {
    setDraft((cur) => cur.filter((f) => f.id !== id));
  }

  function moveField(id: string, dir: -1 | 1) {
    setDraft((cur) => {
      const i = cur.findIndex((f) => f.id === id);
      if (i < 0) return cur;
      const j = i + dir;
      if (j < 0 || j >= cur.length) return cur;
      const next = [...cur];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }

  function newId() {
    return typeof crypto !== "undefined" && "randomUUID" in crypto
      ? `f_${crypto.randomUUID().slice(0, 8)}`
      : `f_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
  }

  function addField(type: FormField["type"]) {
    const id = newId();
    let f: FormField;
    if (type === "section") {
      f = { id, type, label: "Section heading" };
    } else if (type === "radio" || type === "select" || type === "checkbox") {
      f = { id, type, label: "New choice", required: false, options: ["Option 1"] };
    } else {
      f = { id, type, label: "New field", required: false };
    }
    setDraft((cur) => [...cur, f]);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    // Client-side required check
    for (const f of schema) {
      if (isSectionField(f)) continue;
      if (f.required && !values[f.id]?.trim()) {
        setSubmitError(`Please complete: ${f.label}`);
        return;
      }
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/forms/${slug}/submissions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: values }),
      });
      const j = (await res.json().catch(() => ({}))) as {
        error?: string; ok?: boolean;
      };
      if (!res.ok) {
        setSubmitError(j.error ?? "Submission failed.");
        return;
      }
      setSubmitted(true);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-8 text-center">
          <div className="w-12 h-12 rounded-full bg-emerald-500 text-white flex items-center justify-center mx-auto mb-3">
            <Check size={22} />
          </div>
          <h2 className="text-xl font-semibold text-emerald-900">
            Registration submitted
          </h2>
          <p className="text-sm text-emerald-800 mt-1">
            Thanks{userEmail ? `, ${userEmail}` : ""}. We&apos;ll be in touch.
          </p>
          <button
            onClick={() => {
              setSubmitted(false);
              setValues({});
            }}
            className="mt-4 text-sm text-emerald-700 hover:text-emerald-900 underline"
          >
            Submit another response
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-start justify-between gap-3 mb-6">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-fg">{title}</h1>
          {description && (
            <p className="text-sm text-muted mt-1.5 leading-relaxed">{description}</p>
          )}
        </div>
        {isStaff && mode === "view" && (
          <div className="shrink-0 flex gap-2">
            <a
              href={`/admin/forms/${slug}`}
              className="text-xs px-3 py-2 rounded-lg border border-line hover:bg-elevated text-muted hover:text-fg transition-colors inline-flex items-center gap-1.5"
            >
              <ListChecks size={14} /> Submissions
            </a>
            <button
              type="button"
              onClick={enterEdit}
              className="text-xs px-3 py-2 rounded-lg bg-brand-50 text-brand-700 hover:bg-brand-100 inline-flex items-center gap-1.5 font-medium"
            >
              <Pencil size={14} /> Edit form
            </button>
          </div>
        )}
        {isStaff && mode === "edit" && (
          <div className="shrink-0 flex gap-2">
            <button
              type="button"
              onClick={cancelEdit}
              disabled={savingSchema}
              className="text-xs px-3 py-2 rounded-lg border border-line hover:bg-elevated text-muted hover:text-fg transition-colors inline-flex items-center gap-1.5"
            >
              <X size={14} /> Cancel
            </button>
            <button
              type="button"
              onClick={saveSchema}
              disabled={savingSchema}
              className="text-xs px-3 py-2 rounded-lg bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-60 inline-flex items-center gap-1.5 font-medium"
            >
              {savingSchema ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              {savingSchema ? "Saving…" : "Save changes"}
            </button>
          </div>
        )}
      </div>

      {!active && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-4 text-sm text-amber-900">
          This form is currently inactive. New submissions are not accepted.
        </div>
      )}

      {previousAt && mode === "view" && (
        <div className="bg-elevated border border-line rounded-xl px-4 py-3 mb-4 text-sm text-muted">
          You submitted this form on{" "}
          <strong className="text-fg">
            {new Date(previousAt).toLocaleString()}
          </strong>
          . Submitting again will create a new entry.
        </div>
      )}

      {schemaError && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 mb-4 text-sm text-rose-700 flex items-start gap-2">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          {schemaError}
        </div>
      )}

      <div className="bg-card border border-line rounded-2xl p-6 space-y-5">
        {mode === "edit" ? (
          <>
            <p className="text-xs text-muted -mt-1 mb-2">
              Edit, reorder, add, or remove fields. Click Save when done.
            </p>
            {draft.map((f, i) => (
              <FieldEditor
                key={f.id}
                field={f}
                index={i}
                total={draft.length}
                onPatch={patchField}
                onRemove={removeField}
                onMove={moveField}
              />
            ))}
            <AddFieldPanel onAdd={addField} />
          </>
        ) : (
          <form onSubmit={submit} className="space-y-5">
            {schema.map((f) => (
              <FieldRender
                key={f.id}
                field={f}
                value={values[f.id] ?? ""}
                onChange={(v) => setValues((cur) => ({ ...cur, [f.id]: v }))}
              />
            ))}
            {submitError && (
              <div className="bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 text-sm text-rose-700 flex items-start gap-2">
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                {submitError}
              </div>
            )}
            <button
              type="submit"
              disabled={submitting || !active}
              className="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white font-medium py-2.5 px-4 rounded-lg transition-colors shadow-md shadow-brand-600/25 text-sm flex items-center justify-center gap-2"
            >
              {submitting && <Loader2 size={14} className="animate-spin" />}
              {submitting ? "Submitting…" : "Submit"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

// ── Field renderers ────────────────────────────────────────────────────

function FieldRender({
  field, value, onChange,
}: {
  field: FormField;
  value: string;
  onChange: (v: string) => void;
}) {
  if (isSectionField(field)) {
    return (
      <h3 className="text-sm font-semibold text-fg uppercase tracking-wider pt-2 first:pt-0 border-b border-line pb-2">
        {field.label}
      </h3>
    );
  }
  return (
    <div>
      <label className="block text-sm font-medium text-fg mb-1.5">
        {field.label}
        {field.required && <span className="text-rose-600 ml-0.5">*</span>}
      </label>
      {field.hint && <p className="text-xs text-subtle mb-1.5">{field.hint}</p>}
      <FieldInput field={field} value={value} onChange={onChange} />
    </div>
  );
}

function FieldInput({
  field, value, onChange,
}: {
  field: InputField | ChoiceField;
  value: string;
  onChange: (v: string) => void;
}) {
  const cls =
    "w-full bg-card-solid border border-line rounded-lg px-3 py-2 text-sm text-fg placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-all";
  if (isInputField(field)) {
    if (field.type === "textarea") {
      return (
        <textarea
          required={field.required}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={4}
          placeholder={field.placeholder}
          className={cls}
        />
      );
    }
    return (
      <input
        type={field.type}
        required={field.required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.placeholder}
        className={cls}
      />
    );
  }
  // Choice fields
  if (field.type === "select") {
    return (
      <select
        required={field.required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cls}
      >
        <option value="">Select…</option>
        {field.options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    );
  }
  // radio (checkbox treated as radio for now — single-choice)
  return (
    <div className="space-y-1.5">
      {field.options.map((o) => (
        <label
          key={o}
          className="flex items-start gap-2.5 px-3 py-2 rounded-lg border border-line hover:bg-elevated cursor-pointer transition-colors"
        >
          <input
            type="radio"
            name={field.id}
            value={o}
            required={field.required}
            checked={value === o}
            onChange={(e) => onChange(e.target.value)}
            className="mt-0.5 accent-brand-600"
          />
          <span className="text-sm text-fg">{o}</span>
        </label>
      ))}
    </div>
  );
}

// ── Edit-mode controls ────────────────────────────────────────────────

function FieldEditor({
  field, index, total, onPatch, onRemove, onMove,
}: {
  field: FormField;
  index: number;
  total: number;
  onPatch: (id: string, patch: Partial<FormField>) => void;
  onRemove: (id: string) => void;
  onMove: (id: string, dir: -1 | 1) => void;
}) {
  if (isSectionField(field)) {
    return (
      <div className="border-b border-line pb-2 pt-2 first:pt-0">
        <div className="flex items-center gap-2 mb-1">
          <p className="text-[10px] uppercase tracking-[0.18em] text-subtle">
            Section heading
          </p>
          <FieldOrderRemove
            index={index}
            total={total}
            onMove={(d) => onMove(field.id, d)}
            onRemove={() => onRemove(field.id)}
          />
        </div>
        <input
          value={field.label}
          onChange={(e) => onPatch(field.id, { label: e.target.value })}
          className="w-full text-sm font-semibold text-fg bg-transparent border-b border-line focus:outline-none focus:border-brand-500 py-1"
        />
      </div>
    );
  }
  return (
    <div className="rounded-xl border border-line p-3 space-y-2.5 bg-elevated/30">
      <div className="flex items-center gap-2">
        <p className="text-[10px] uppercase tracking-[0.18em] text-subtle">
          {field.type}
        </p>
        <label className="ml-auto inline-flex items-center gap-1.5 text-xs text-muted cursor-pointer">
          <input
            type="checkbox"
            checked={field.required}
            onChange={(e) =>
              onPatch(field.id, { required: e.target.checked } as Partial<FormField>)
            }
            className="accent-brand-600"
          />
          Required
        </label>
        <FieldOrderRemove
          index={index}
          total={total}
          onMove={(d) => onMove(field.id, d)}
          onRemove={() => onRemove(field.id)}
        />
      </div>
      <input
        value={field.label}
        onChange={(e) => onPatch(field.id, { label: e.target.value })}
        className="w-full bg-card-solid border border-line rounded-lg px-3 py-2 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
        placeholder="Label"
      />
      <input
        value={field.hint ?? ""}
        onChange={(e) =>
          onPatch(field.id, { hint: e.target.value || undefined } as Partial<FormField>)
        }
        className="w-full bg-card-solid border border-line rounded-lg px-3 py-2 text-xs text-muted focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
        placeholder="Hint (optional)"
      />
      {isChoiceField(field) && (
        <ChoiceOptionsEditor
          value={field.options}
          onChange={(opts) =>
            onPatch(field.id, { options: opts } as Partial<FormField>)
          }
        />
      )}
    </div>
  );
}

function ChoiceOptionsEditor({
  value, onChange,
}: {
  value: string[];
  onChange: (v: string[]) => void;
}) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.18em] text-subtle mb-1.5">
        Options
      </p>
      <div className="space-y-1.5">
        {value.map((opt, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              value={opt}
              onChange={(e) => {
                const next = [...value];
                next[i] = e.target.value;
                onChange(next);
              }}
              className="flex-1 bg-card-solid border border-line rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30"
            />
            <button
              type="button"
              onClick={() => onChange(value.filter((_, j) => j !== i))}
              disabled={value.length <= 1}
              className="text-subtle hover:text-rose-600 disabled:opacity-30 disabled:hover:text-subtle p-1"
              aria-label="Remove option"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => onChange([...value, ""])}
          className="text-xs text-brand-600 hover:underline inline-flex items-center gap-1"
        >
          <Plus size={12} /> Add option
        </button>
      </div>
    </div>
  );
}

function FieldOrderRemove({
  index, total, onMove, onRemove,
}: {
  index: number;
  total: number;
  onMove: (dir: -1 | 1) => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex items-center gap-0.5 text-subtle">
      <button
        type="button"
        onClick={() => onMove(-1)}
        disabled={index === 0}
        aria-label="Move up"
        className="p-1 rounded hover:bg-elevated hover:text-fg disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-subtle"
      >
        <ChevronUp size={13} />
      </button>
      <button
        type="button"
        onClick={() => onMove(1)}
        disabled={index === total - 1}
        aria-label="Move down"
        className="p-1 rounded hover:bg-elevated hover:text-fg disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-subtle"
      >
        <ChevronDown size={13} />
      </button>
      <button
        type="button"
        onClick={onRemove}
        aria-label="Remove field"
        className="p-1 rounded hover:bg-rose-50 hover:text-rose-600"
      >
        <Trash2 size={13} />
      </button>
    </div>
  );
}

const ADD_TYPES: { type: FormField["type"]; label: string; Icon: typeof Type }[] = [
  { type: "text",     label: "Text",       Icon: Type },
  { type: "textarea", label: "Long text",  Icon: AlignLeft },
  { type: "email",    label: "Email",      Icon: Mail },
  { type: "url",      label: "URL",        Icon: LinkIcon },
  { type: "radio",    label: "Choice",     Icon: RadioIcon },
  { type: "section",  label: "Section",    Icon: Heading },
];

function AddFieldPanel({ onAdd }: { onAdd: (t: FormField["type"]) => void }) {
  return (
    <div className="rounded-xl border border-dashed border-line p-3">
      <p className="text-[10px] uppercase tracking-[0.18em] text-subtle mb-2">
        Add a field
      </p>
      <div className="flex flex-wrap gap-1.5">
        {ADD_TYPES.map((a) => {
          const Icon = a.Icon;
          return (
            <button
              key={a.type}
              type="button"
              onClick={() => onAdd(a.type)}
              className="text-xs px-3 py-1.5 rounded-lg border border-line bg-card-solid hover:border-brand-300 hover:text-brand-700 text-muted transition-colors inline-flex items-center gap-1.5"
            >
              <Icon size={12} /> {a.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
