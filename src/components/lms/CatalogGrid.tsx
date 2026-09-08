"use client";
import { useEffect, useState, useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Pencil, Save, X, Loader2, AlertCircle, CheckSquare, Square, Sparkles,
  GripVertical, CheckCircle2,
} from "lucide-react";
import { CourseCard } from "./CourseCard";
import type { CourseFilterOptions } from "./CourseFilters";
import { groupByTopic } from "@/lib/courses/group";
import { cn } from "@/lib/utils";

export interface CatalogCourse {
  id: string;
  code: string | null;
  title: string;
  description: string | null;
  category: string | null;
  thumbnail: string | null;
  /** Optional colour / gradient wash stamped from /admin/course-thumbnails. */
  thumbnailOverlay?: unknown;
  status: string;
  duration: number | null;
  creditCost: number;
  createdAt: string;
  topic: string | null;
  delivery: string | null;
  provider: string | null;
  isSpecial: boolean;
  requiresApproval: boolean;
  /** Cohort enrollment-deadline date (ISO string) — for In-Person /
   *  Hybrid courses with an application window. */
  enrollByDate: string | null;
  /** Cohort start / end dates (ISO strings) — for In-Person / Hybrid
   *  courses. When both set, the card renders a duration range. */
  cohortStartDate: string | null;
  cohortEndDate: string | null;
  /** Whether the signed-in user has hearted this course. Drives
   *  the filled-vs-outline state of the heart icon on the card. */
  isFavorite: boolean;
  instructor: { name: string | null } | null;
}

/**
 * Catalog grid, grouped by topic.
 *
 * Sixty-odd cards in one flat grid gave no way to see the shape of the
 * catalogue without filtering first, so the default view breaks them
 * into topic sections with a heading and a count each (ordering lives
 * in lib/courses/group.ts). "All courses" flattens it back for anyone
 * who would rather scan one list; the toggle only appears when there
 * is more than one topic on screen, so a filtered-to-one-topic view
 * does not sprout a control that changes nothing.
 *
 * Admin power-ups on top of that:
 *  - per-card selection checkbox + sticky bulk toolbar that PATCHes
 *    /api/admin/courses/batch-filters with one or more facets at once
 *  - per-card pencil opening a quick-edit dialog for the same facets
 *  - drag-to-reorder. While grouped, a drop is only accepted onto a
 *    card in the SAME topic: `displayOrder` is one flat sequence, so a
 *    cross-topic drag would reorder the underlying list and then be
 *    regrouped straight back to where it started — a control that
 *    appears to do something and does nothing.
 *
 * Trainees and instructors below admin still see the cards but no
 * checkbox / pencil / grip; the wrapper degrades cleanly.
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

  // Local reorder state — initialised from props, updated optimistically
  // on drop. router.refresh() after the persistence call pulls the
  // canonical server order back in via the useEffect below.
  const [localOrder, setLocalOrder] = useState<CatalogCourse[]>(courses);
  useEffect(() => { setLocalOrder(courses); }, [courses]);

  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [reorderFlash, setReorderFlash] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  // Topic sections. On by default — see the file header.
  const [grouped, setGrouped] = useState(true);
  const groups = useMemo(() => groupByTopic(localOrder), [localOrder]);
  // One group means the headings would just restate the active topic
  // filter, so both the sections and their toggle stand down.
  const showGroups = grouped && groups.length > 1;

  const topicOf = (id: string) =>
    localOrder.find((c) => c.id === id)?.topic?.trim() || null;

  function toggle(id: string) {
    setSelected((cur) => {
      const next = new Set(cur);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() { setSelected(new Set(localOrder.map((c) => c.id))); }
  function clearAll()  { setSelected(new Set()); }

  const allSelected = localOrder.length > 0 && selected.size === localOrder.length;

  // ── Drag-and-drop handlers ─────────────────────────────────────
  function onDragStart(e: React.DragEvent<HTMLElement>, id: string) {
    setDragId(id);
    e.dataTransfer.effectAllowed = "move";
    // Some browsers need data to be set or dragenter never fires.
    e.dataTransfer.setData("text/plain", id);
  }
  function onDragOver(e: React.DragEvent<HTMLElement>, id: string) {
    if (!dragId || dragId === id) return;
    // No preventDefault ⇒ the browser shows "not allowed" and never
    // fires drop. Cross-topic moves are a no-op once regrouped.
    if (showGroups && topicOf(dragId) !== topicOf(id)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (overId !== id) setOverId(id);
  }
  function onDragLeave() {
    setOverId(null);
  }
  async function onDrop(e: React.DragEvent<HTMLElement>, dropOnId: string) {
    e.preventDefault();
    if (!dragId || dragId === dropOnId) {
      setDragId(null); setOverId(null);
      return;
    }
    if (showGroups && topicOf(dragId) !== topicOf(dropOnId)) {
      setDragId(null); setOverId(null);
      return;
    }
    const next = [...localOrder];
    const from = next.findIndex((c) => c.id === dragId);
    const to   = next.findIndex((c) => c.id === dropOnId);
    if (from < 0 || to < 0) {
      setDragId(null); setOverId(null);
      return;
    }
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setLocalOrder(next);
    setDragId(null); setOverId(null);

    // Persist. We send EVERY id (in current order) so the server can
    // assign clean integer slots and ties with off-page courses don't
    // matter.
    try {
      const res = await fetch("/api/admin/courses/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderedIds: next.map((c) => c.id) }),
      });
      if (!res.ok) {
        // Roll back if server rejected
        setLocalOrder(localOrder);
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setReorderFlash(`Reorder failed: ${data.error ?? res.status}`);
      } else {
        setReorderFlash("Order saved.");
      }
    } catch (err) {
      setLocalOrder(localOrder);
      setReorderFlash(`Reorder failed: ${(err as Error).message}`);
    } finally {
      setTimeout(() => setReorderFlash(null), 2500);
      startTransition(() => router.refresh());
    }
  }

  function renderCard(c: CatalogCourse) {
    const isDragging = dragId === c.id;
    const isDropTarget = overId === c.id && dragId !== c.id;
    return (
      <div
        key={c.id}
        className={`relative group transition-all h-full flex flex-col ${
          isDragging ? "opacity-40" : ""
        } ${
          isDropTarget ? "ring-2 ring-brand-400 ring-offset-2 ring-offset-bg rounded-[var(--radius-lg)]" : ""
        }`}
        onDragOver={isAdmin ? (e) => onDragOver(e, c.id) : undefined}
        onDragLeave={isAdmin ? onDragLeave : undefined}
        onDrop={isAdmin ? (e) => { void onDrop(e, c.id); } : undefined}
      >
        {isAdmin && (
          <>
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
            {/* Drag grip — admin only. The handle is the
                draggable element so the underlying Link inside
                CourseCard stays clickable for navigation. */}
            <div
              draggable
              onDragStart={(e) => onDragStart(e, c.id)}
              onDragEnd={() => { setDragId(null); setOverId(null); }}
              title={showGroups ? "Drag to reorder within this topic" : "Drag to reorder"}
              className="admin-glow absolute top-3 right-3 z-10 bg-card-solid border border-line text-muted rounded-md p-1.5 shadow-sm opacity-0 group-hover:opacity-100 transition-all cursor-grab active:cursor-grabbing hover:text-brand-700 hover:border-brand-300"
            >
              <GripVertical size={13} />
            </div>
          </>
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
    );
  }

  const gridCls = "grid sm:grid-cols-2 xl:grid-cols-3 gap-5";

  return (
    <>
      {(groups.length > 1 || (isAdmin && localOrder.length > 0)) && (
        <div className="flex items-center gap-2 mb-3 text-xs flex-wrap">
          {isAdmin && localOrder.length > 0 && (
            <>
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
              <span className="text-subtle inline-flex items-center gap-1">
                <GripVertical size={11} />
                {showGroups
                  ? "Drag the grip on any tile to rearrange it within its topic."
                  : "Drag the grip on any tile to rearrange."}
              </span>
              {reorderFlash && (
                <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                  <CheckCircle2 size={11} /> {reorderFlash}
                </span>
              )}
            </>
          )}

          {groups.length > 1 && (
            <div
              role="group"
              aria-label="Course arrangement"
              className="ml-auto inline-flex items-center gap-0.5 rounded-full border border-line bg-elevated p-0.5"
            >
              <ArrangeTab active={grouped} onClick={() => setGrouped(true)}>
                By topic
              </ArrangeTab>
              <ArrangeTab active={!grouped} onClick={() => setGrouped(false)}>
                All courses
              </ArrangeTab>
            </div>
          )}
        </div>
      )}

      {showGroups ? (
        <div className="space-y-9">
          {groups.map((g) => (
            <section key={g.key} aria-labelledby={`topic-${slugify(g.key)}`}>
              {/* Heading, count, then a rule running to the right edge.
                  Full-weight foreground at 17px: this is the label people
                  navigate the page by, so it is not a quiet eyebrow. */}
              <div className="mb-3.5 flex items-center gap-3">
                <h3
                  id={`topic-${slugify(g.key)}`}
                  className="text-[17px] font-bold tracking-tight text-fg"
                >
                  {g.label}
                </h3>
                <span className="text-[12px] font-semibold tabular-nums text-muted whitespace-nowrap">
                  {g.items.length} {g.items.length === 1 ? "course" : "courses"}
                </span>
                <span aria-hidden className="h-px flex-1 bg-line-strong" />
              </div>
              <div className={gridCls}>{g.items.map(renderCard)}</div>
            </section>
          ))}
        </div>
      ) : (
        <div className={gridCls}>{localOrder.map(renderCard)}</div>
      )}

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

/** Topic string → a value safe for an `id` / `aria-labelledby` pair.
 *  Topics carry slashes, parens and spaces ("Quality Control/Assurance",
 *  "Industry Fundamentals (GxPs)"), none of which belong in an id. */
function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "other";
}

/** One half of the By topic / All courses switch. Solid brand fill when
 *  active — not `bg-fg text-bg`, which generates no rule for the text
 *  colour and silently leaves an unreadable tab. */
function ArrangeTab({
  active, onClick, children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors",
        active
          ? "bg-brand-600 text-white shadow-sm"
          : "text-muted hover:text-fg hover:bg-raised",
      )}
    >
      {children}
    </button>
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
  // ── Catalog-card fields ──────────────────────────────────────
  const [code, setCode] = useState(course.code ?? "");
  const [creditCost, setCreditCost] = useState<number>(course.creditCost ?? 0);
  const [requiresApproval, setRequiresApproval] = useState(course.requiresApproval);
  const [enrollByDate, setEnrollByDate] = useState(toDateInput(course.enrollByDate));
  const [cohortStartDate, setCohortStartDate] = useState(toDateInput(course.cohortStartDate));
  const [cohortEndDate, setCohortEndDate] = useState(toDateInput(course.cohortEndDate));
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
          code: code || null,
          creditCost,
          requiresApproval,
          enrollByDate: enrollByDate || null,
          cohortStartDate: cohortStartDate || null,
          cohortEndDate: cohortEndDate || null,
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
    <DialogShell title={course.title} subtitle="Quick-edit catalog card" onClose={onClose}>
      <CatalogCardFields
        code={code} setCode={setCode}
        creditCost={creditCost} setCreditCost={setCreditCost}
        requiresApproval={requiresApproval} setRequiresApproval={setRequiresApproval}
        enrollByDate={enrollByDate} setEnrollByDate={setEnrollByDate}
        cohortStartDate={cohortStartDate} setCohortStartDate={setCohortStartDate}
        cohortEndDate={cohortEndDate} setCohortEndDate={setCohortEndDate}
      />
      <div className="my-4 border-t border-line" />
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

/** Format an ISO timestamp for the value of a `<input type="date">`.
 *  Returns "" if the input is null so the field is clearable. */
function toDateInput(iso: string | null | undefined): string {
  if (!iso) return "";
  return new Date(iso).toISOString().slice(0, 10);
}

/** Catalog-card fields shown above the catalog filter fields in
 *  the QuickEdit dialog. Covers the four columns added in the
 *  2026-06-30 migration plus credit-cost + requires-approval
 *  (already present, but surfaced here for one-stop card editing). */
function CatalogCardFields({
  code, setCode,
  creditCost, setCreditCost,
  requiresApproval, setRequiresApproval,
  enrollByDate, setEnrollByDate,
  cohortStartDate, setCohortStartDate,
  cohortEndDate, setCohortEndDate,
}: {
  code: string;            setCode: (v: string) => void;
  creditCost: number;      setCreditCost: (v: number) => void;
  requiresApproval: boolean; setRequiresApproval: (v: boolean) => void;
  enrollByDate: string;    setEnrollByDate: (v: string) => void;
  cohortStartDate: string; setCohortStartDate: (v: string) => void;
  cohortEndDate: string;   setCohortEndDate: (v: string) => void;
}) {
  const cls = "w-full bg-card-solid text-fg placeholder:text-subtle border border-line rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30";
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Code">
          <input
            className={cls}
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="e.g. BIOP210"
            maxLength={16}
          />
        </Field>
        <Field label="Credit cost (0 = Free)">
          <input
            type="number"
            min={0}
            step={50}
            className={cls}
            value={creditCost}
            onChange={(e) => setCreditCost(Number(e.target.value) || 0)}
            placeholder="0"
          />
        </Field>
      </div>
      <Field label="Enroll by (deadline)">
        <input
          type="date"
          className={cls}
          value={enrollByDate}
          onChange={(e) => setEnrollByDate(e.target.value)}
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Cohort start">
          <input
            type="date"
            className={cls}
            value={cohortStartDate}
            onChange={(e) => setCohortStartDate(e.target.value)}
          />
        </Field>
        <Field label="Cohort end">
          <input
            type="date"
            className={cls}
            value={cohortEndDate}
            onChange={(e) => setCohortEndDate(e.target.value)}
          />
        </Field>
      </div>
      <label className="flex items-center gap-2 text-sm text-muted cursor-pointer">
        <input
          type="checkbox"
          checked={requiresApproval}
          onChange={(e) => setRequiresApproval(e.target.checked)}
          className="accent-brand-600"
        />
        Requires approval — card button reads &quot;Request to Enroll&quot;
      </label>
    </div>
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
