"use client";
import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Pencil, Save, X, Loader2, AlertCircle, CheckSquare, Square, Sparkles,
} from "lucide-react";
import { CourseCard } from "./CourseCard";
import type { CourseFilterOptions } from "./CourseFilters";

export interface CatalogCourse {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  thumbnail: string | null;
  status: string;
  courseType: string;
  duration: number | null;
  creditCost: number;
  createdAt: string;
  topic: string | null;
  delivery: string | null;
  provider: string | null;
  isSpecial: boolean;
  instructor: { name: string | null } | null;
  _count: { enrollments: number; modules: number };
  scormPackage: { version: string } | null;
}

/**
 * Catalog grid with admin power-ups:
 *  - per-card selection checkbox + sticky bulk toolbar that PATCHes
 *    /api/admin/courses/batch-filters with one or more facets at once
 *  - per-card pencil opening a quick-edit dialog for the same facets
 *
 * Trainees and instructors below admin still see the cards but no
 * checkbox / pencil; the wrapper degrades cleanly.
 */
export function CatalogGrid({
  courses, role, options, isAdmin,
}: {
  courses: CatalogCourse[];
  role: string;
  options: CourseFilterOptions;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<CatalogCourse | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);

  function toggle(id: string) {
    setSelected((cur) => {
      const next = new Set(cur);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() { setSelected(new Set(courses.map((c) => c.id))); }
  function clearAll()  { setSelected(new Set()); }

  const allSelected = courses.length > 0 && selected.size === courses.length;

  return (
    <>
      {isAdmin && courses.length > 0 && (
        <div className="flex items-center gap-2 mb-3 text-xs">
          <button
            type="button"
            onClick={allSelected ? clearAll : selectAll}
            className="inline-flex items-center gap-1.5 text-muted hover:text-fg px-2 py-1 rounded transition-colors"
          >
            {allSelected ? <CheckSquare size={14} /> : <Square size={14} />}
            {allSelected ? "Deselect all" : "Select all"}
          </button>
          {selected.size > 0 && (
            <span className="text-subtle">· {selected.size} selected</span>
          )}
        </div>
      )}

      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
        {courses.map((c) => (
          <div key={c.id} className="relative group">
            {isAdmin && (
              <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5">
                <label className="cursor-pointer bg-card-solid border border-line rounded-md p-1 shadow-sm hover:border-brand-300 transition-colors">
                  <input
                    type="checkbox"
                    checked={selected.has(c.id)}
                    onChange={() => toggle(c.id)}
                    className="block accent-brand-600"
                    aria-label={`Select ${c.title}`}
                  />
                </label>
                <button
                  type="button"
                  onClick={() => setEditing(c)}
                  className="bg-card-solid border border-line text-muted hover:text-brand-700 hover:border-brand-300 rounded-md p-1.5 shadow-sm opacity-0 group-hover:opacity-100 transition-all"
                  title="Quick-edit filters"
                >
                  <Pencil size={13} />
                </button>
              </div>
            )}
            <CourseCard course={c} role={role} />
            {isAdmin && (c.topic || c.delivery || c.provider || c.isSpecial) && (
              <div className="mt-1.5 flex flex-wrap gap-1 px-1">
                {c.topic    && <Tag>{c.topic}</Tag>}
                {c.delivery && <Tag>{c.delivery}</Tag>}
                {c.provider && <Tag>{c.provider}</Tag>}
                {c.isSpecial && <Tag amber>Special</Tag>}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Sticky bulk toolbar — admin only */}
      {isAdmin && selected.size > 0 && (
        <BulkToolbar
          count={selected.size}
          onClear={clearAll}
          onApply={() => setBulkOpen(true)}
        />
      )}

      {/* Bulk apply dialog */}
      {bulkOpen && (
        <BulkApplyDialog
          ids={Array.from(selected)}
          options={options}
          onClose={() => setBulkOpen(false)}
          onSaved={(count) => {
            setBulkOpen(false);
            clearAll();
            router.refresh();
            return count;
          }}
        />
      )}

      {/* Single-card quick-edit dialog */}
      {editing && (
        <QuickEditDialog
          course={editing}
          options={options}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            router.refresh();
          }}
        />
      )}
    </>
  );
}

function Tag({ children, amber }: { children: React.ReactNode; amber?: boolean }) {
  return (
    <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border ${
      amber
        ? "bg-amber-50 text-amber-700 border-amber-200"
        : "bg-elevated text-muted border-line"
    }`}>{children}</span>
  );
}

function BulkToolbar({
  count, onClear, onApply,
}: {
  count: number;
  onClear: () => void;
  onApply: () => void;
}) {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 bg-card-solid border border-line-strong rounded-full shadow-2xl px-3 py-2">
      <span className="text-sm font-semibold text-fg pl-2">
        {count} selected
      </span>
      <span className="text-subtle">·</span>
      <button
        type="button"
        onClick={onApply}
        className="text-sm bg-brand-600 hover:bg-brand-700 text-white font-medium px-4 py-1.5 rounded-full inline-flex items-center gap-1.5"
      >
        <Sparkles size={13} /> Apply filters
      </button>
      <button
        type="button"
        onClick={onClear}
        className="text-sm text-muted hover:text-fg px-3 py-1.5 rounded-full"
      >
        Clear
      </button>
    </div>
  );
}

// ── Quick-edit (single course) ─────────────────────────────────────

function QuickEditDialog({
  course, options, onClose, onSaved,
}: {
  course: CatalogCourse;
  options: CourseFilterOptions;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [topic, setTopic] = useState(course.topic ?? "");
  const [delivery, setDelivery] = useState(course.delivery ?? "");
  const [provider, setProvider] = useState(course.provider ?? "");
  const [isSpecial, setIsSpecial] = useState(course.isSpecial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/courses/${course.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: topic || null,
          delivery: delivery || null,
          provider: provider || null,
          isSpecial,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError((j as { error?: string }).error ?? "Save failed.");
        return;
      }
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <DialogShell title={course.title} subtitle="Quick-edit filters" onClose={onClose}>
      <FilterFields
        options={options}
        topic={topic} setTopic={setTopic}
        delivery={delivery} setDelivery={setDelivery}
        provider={provider} setProvider={setProvider}
        isSpecial={isSpecial} setIsSpecial={setIsSpecial}
      />
      <DialogActions error={error}>
        <button type="button" onClick={onClose} className="text-sm text-muted hover:text-fg px-4 py-2 rounded-lg">
          Cancel
        </button>
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="text-sm bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white font-medium px-5 py-2 rounded-lg inline-flex items-center gap-2 shadow-sm shadow-brand-600/25"
        >
          {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
          {saving ? "Saving…" : "Save"}
        </button>
      </DialogActions>
    </DialogShell>
  );
}

// ── Bulk apply (many courses) ──────────────────────────────────────

function BulkApplyDialog({
  ids, options, onClose, onSaved,
}: {
  ids: string[];
  options: CourseFilterOptions;
  onClose: () => void;
  onSaved: (count: number) => number;
}) {
  // null = "don't change", "" = "clear", string = "set". Same shape
  // PATCH /batch-filters expects.
  const [topic,    setTopic]    = useState<string | null>(null);
  const [delivery, setDelivery] = useState<string | null>(null);
  const [provider, setProvider] = useState<string | null>(null);
  const [touchSpecial, setTouchSpecial] = useState(false);
  const [isSpecial, setIsSpecial] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function apply() {
    const body: Record<string, unknown> = { ids };
    if (topic    !== null) body.topic    = topic    || null;
    if (delivery !== null) body.delivery = delivery || null;
    if (provider !== null) body.provider = provider || null;
    if (touchSpecial)      body.isSpecial = isSpecial;
    if (Object.keys(body).length === 1) {
      setError("Pick at least one field to apply.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/courses/batch-filters", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = (await res.json().catch(() => ({}))) as {
        ok?: boolean; count?: number; error?: string;
      };
      if (!res.ok) {
        setError(j.error ?? "Update failed.");
        return;
      }
      onSaved(j.count ?? 0);
    } finally {
      setSaving(false);
    }
  }

  return (
    <DialogShell
      title={`Apply filters to ${ids.length} ${ids.length === 1 ? "course" : "courses"}`}
      subtitle="Leave a field as Don't change to keep its existing value across the selected courses."
      onClose={onClose}
    >
      <FilterFields
        options={options}
        topic={topic ?? "__nochange__"}
        setTopic={(v) => setTopic(v === "__nochange__" ? null : v)}
        delivery={delivery ?? "__nochange__"}
        setDelivery={(v) => setDelivery(v === "__nochange__" ? null : v)}
        provider={provider ?? "__nochange__"}
        setProvider={(v) => setProvider(v === "__nochange__" ? null : v)}
        isSpecial={isSpecial}
        setIsSpecial={(b) => { setIsSpecial(b); setTouchSpecial(true); }}
        bulk
      />
      {touchSpecial && (
        <button
          type="button"
          onClick={() => { setTouchSpecial(false); setIsSpecial(false); }}
          className="mt-2 text-xs text-subtle hover:text-fg underline"
        >
          Don&apos;t change &quot;Special&quot;
        </button>
      )}
      <DialogActions error={error}>
        <button type="button" onClick={onClose} className="text-sm text-muted hover:text-fg px-4 py-2 rounded-lg">
          Cancel
        </button>
        <button
          type="button"
          onClick={apply}
          disabled={saving}
          className="text-sm bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white font-medium px-5 py-2 rounded-lg inline-flex items-center gap-2 shadow-sm shadow-brand-600/25"
        >
          {saving ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
          {saving ? "Applying…" : `Apply to ${ids.length}`}
        </button>
      </DialogActions>
    </DialogShell>
  );
}

// ── Shared dialog bits ─────────────────────────────────────────────

function DialogShell({
  title, subtitle, children, onClose,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/55 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-card-solid rounded-2xl shadow-2xl border border-line w-full max-w-md p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="min-w-0">
            <h3 className="font-semibold text-fg truncate">{title}</h3>
            {subtitle && <p className="text-xs text-muted mt-0.5 leading-relaxed">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 -mr-1 rounded-lg text-subtle hover:bg-elevated hover:text-muted"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function DialogActions({
  error, children,
}: {
  error: string | null;
  children: React.ReactNode;
}) {
  return (
    <>
      {error && (
        <div className="mt-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg px-3 py-2 flex items-start gap-2">
          <AlertCircle size={13} className="mt-0.5 shrink-0" /> {error}
        </div>
      )}
      <div className="flex items-center justify-end gap-2 mt-5">{children}</div>
    </>
  );
}

function FilterFields({
  options, topic, setTopic, delivery, setDelivery, provider, setProvider, isSpecial, setIsSpecial, bulk,
}: {
  options: CourseFilterOptions;
  topic: string;     setTopic: (v: string) => void;
  delivery: string;  setDelivery: (v: string) => void;
  provider: string;  setProvider: (v: string) => void;
  isSpecial: boolean; setIsSpecial: (v: boolean) => void;
  bulk?: boolean;
}) {
  const cls = "w-full bg-card-solid text-fg placeholder:text-subtle border border-line rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30";

  // Bulk apply needs a tri-state (set / clear / don't change), which
  // only works as a <select>. Per-course edit allows custom values via
  // <input list=…>+<datalist>.
  if (bulk) {
    const dontChange = <option value="__nochange__">Don&apos;t change</option>;
    const clear = <option value="">— Clear value</option>;
    return (
      <div className="space-y-3">
        <Field label="Topic">
          <select className={cls} value={topic} onChange={(e) => setTopic(e.target.value)}>
            {dontChange}{clear}
            {options.topic.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Delivery">
            <select className={cls} value={delivery} onChange={(e) => setDelivery(e.target.value)}>
              {dontChange}{clear}
              {options.delivery.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </Field>
          <Field label="Provider">
            <select className={cls} value={provider} onChange={(e) => setProvider(e.target.value)}>
              {dontChange}{clear}
              {options.provider.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </Field>
        </div>
        <label className="flex items-center gap-2 text-sm text-muted cursor-pointer">
          <input type="checkbox" checked={isSpecial} onChange={(e) => setIsSpecial(e.target.checked)} className="accent-brand-600" />
          Special program / workshop (instructor-led, limited seats)
        </label>
      </div>
    );
  }

  // Per-course: input + datalist so admins can type a custom topic /
  // delivery / provider.
  return (
    <div className="space-y-3">
      <Field label="Topic">
        <input
          list="catalog-topic-options"
          className={cls}
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="Pick or type custom"
        />
        <datalist id="catalog-topic-options">
          {options.topic.map((o) => <option key={o} value={o} />)}
        </datalist>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Delivery">
          <input
            list="catalog-delivery-options"
            className={cls}
            value={delivery}
            onChange={(e) => setDelivery(e.target.value)}
            placeholder="Pick or type custom"
          />
          <datalist id="catalog-delivery-options">
            {options.delivery.map((o) => <option key={o} value={o} />)}
          </datalist>
        </Field>
        <Field label="Provider">
          <input
            list="catalog-provider-options"
            className={cls}
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
            placeholder="Pick or type custom"
          />
          <datalist id="catalog-provider-options">
            {options.provider.map((o) => <option key={o} value={o} />)}
          </datalist>
        </Field>
      </div>
      <label className="flex items-center gap-2 text-sm text-muted cursor-pointer">
        <input type="checkbox" checked={isSpecial} onChange={(e) => setIsSpecial(e.target.checked)} className="accent-brand-600" />
        Special program / workshop (instructor-led, limited seats)
      </label>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-muted mb-1">{label}</span>
      {children}
    </label>
  );
}
