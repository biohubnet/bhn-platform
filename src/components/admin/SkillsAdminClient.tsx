"use client";
/**
 * Skill ontology curation: list, search, filter by status, edit
 * (rename / category / description / aliases), merge two skills, mark
 * deprecated, delete (superadmin only). Mirrors the /admin/course-filters
 * UX so the admin pattern is consistent.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus, Search, Pencil, GitMerge, Trash2, X, Check, AlertCircle,
  CheckCircle2, EyeOff, Sparkles, Tags, CheckSquare, Square, Loader2, Eye, Archive,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { LaunchSwitch } from "@/components/ui/LaunchSwitch";

interface SkillRow {
  id: string;
  name: string;
  slug: string;
  category: string | null;
  description: string | null;
  status: string;
  mergedIntoId: string | null;
  createdAt: string;
  aliases: { id: string; alias: string }[];
  counts: { courses: number; users: number; postings: number };
}

const STATUS_CLS: Record<string, string> = {
  active:     "bg-emerald-50 text-emerald-700 border-emerald-200",
  review:     "bg-amber-50 text-amber-800 border-amber-200",
  deprecated: "bg-rose-50 text-rose-700 border-rose-200",
  merged:     "bg-elevated text-subtle border-line",
};

export function SkillsAdminClient({
  initialSkills,
  isSuperadmin = false,
}: {
  initialSkills: SkillRow[];
  /** Hard delete is server-gated to superadmin (see DELETE handler
   *  in /api/admin/skills/route.ts). The batch toolbar uses this
   *  flag to disable the Delete affordance for plain admins so they
   *  don't hit a 403 they can't act on. Status changes (active /
   *  review / deprecated) stay available for admin role. */
  isSuperadmin?: boolean;
}) {
  const router = useRouter();
  const [skills, setSkills] = useState<SkillRow[]>(initialSkills);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "review" | "deprecated">("all");
  const [editing, setEditing] = useState<SkillRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [merging, setMerging] = useState<SkillRow | null>(null);
  const [busy, setBusy] = useState(false);

  // Multi-select state — selected[id] = true. Filtering / sorting
  // doesn't drop ids from the selection so the user can move between
  // tabs without losing their queue.
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [batchBusy, setBatchBusy] = useState<null | "active" | "review" | "deprecated" | "delete">(null);

  function toggleSelected(id: string) {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function clearSelection() { setSelected(new Set()); }
  function selectAllFiltered() {
    setSelected((s) => {
      const next = new Set(s);
      for (const sk of filtered) next.add(sk.id);
      return next;
    });
  }

  async function batchSetStatus(status: "active" | "review" | "deprecated") {
    if (selected.size === 0) return;
    setBatchBusy(status);
    try {
      const ids = Array.from(selected);
      // Optimistic local update.
      setSkills((cur) => cur.map((s) => (ids.includes(s.id) ? { ...s, status } : s)));
      // Fire individual PATCHes in parallel — no batch endpoint yet,
      // but Promise.all is fine for the typical N=1..50 selection.
      await Promise.all(ids.map((id) =>
        fetch("/api/admin/skills", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, status }),
        }),
      ));
      clearSelection();
    } finally {
      setBatchBusy(null);
    }
  }

  async function batchDelete() {
    if (selected.size === 0) return;
    setBatchBusy("delete");
    try {
      const ids = Array.from(selected);
      setSkills((cur) => cur.filter((s) => !ids.includes(s.id)));
      await Promise.all(ids.map((id) =>
        fetch(`/api/admin/skills?id=${encodeURIComponent(id)}`, { method: "DELETE" }),
      ));
      clearSelection();
    } finally {
      setBatchBusy(null);
    }
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return skills.filter((s) => {
      if (statusFilter !== "all" && s.status !== statusFilter) return false;
      if (!q) return true;
      if (s.name.toLowerCase().includes(q)) return true;
      if (s.category?.toLowerCase().includes(q)) return true;
      if (s.aliases.some((a) => a.alias.includes(q))) return true;
      return false;
    });
  }, [skills, query, statusFilter]);

  const counts = useMemo(() => ({
    all: skills.length,
    active: skills.filter((s) => s.status === "active").length,
    review: skills.filter((s) => s.status === "review").length,
    deprecated: skills.filter((s) => s.status === "deprecated").length,
  }), [skills]);

  async function refresh() {
    const r = await fetch("/api/admin/skills", { cache: "no-store" });
    if (r.ok) {
      const j = await r.json();
      setSkills(j.skills);
    } else {
      router.refresh();
    }
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[260px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-subtle" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, alias, or category…"
            className="w-full pl-9 pr-3 py-2 bg-card-solid border border-line rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30"
          />
        </div>
        <StatusChip active={statusFilter === "all"}        onClick={() => setStatusFilter("all")}        label={`All ${counts.all}`} />
        <StatusChip active={statusFilter === "active"}     onClick={() => setStatusFilter("active")}     label={`Active ${counts.active}`} />
        <StatusChip active={statusFilter === "review"}     onClick={() => setStatusFilter("review")}     label={`Review ${counts.review}`} tone="amber" />
        <StatusChip active={statusFilter === "deprecated"} onClick={() => setStatusFilter("deprecated")} label={`Deprecated ${counts.deprecated}`} tone="rose" />
        <button
          onClick={() => setCreating(true)}
          className="ml-auto inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg bg-brand-600 text-white border border-brand-700 hover:bg-brand-700 transition-colors"
        >
          <Plus size={13} /> New skill
        </button>
      </div>

      {/* Batch toolbar — appears when 1+ skills are selected. Sticks
          to the top of the viewport so the user can scroll the grid
          freely without losing their action surface. */}
      {selected.size > 0 && (
        <div className="sticky top-2 z-30 rounded-xl border border-brand-300 bg-brand-50/95 backdrop-blur-sm shadow-md px-3 py-2 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded bg-brand-600 text-white">
              <CheckSquare size={13} />
            </span>
            <span className="text-sm font-semibold text-brand-900">
              {selected.size} selected
            </span>
            <button type="button" onClick={selectAllFiltered} className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] text-fg-muted hover:bg-fg/5" title="Select every skill in the current filter">
              + select all filtered
            </button>
            <button type="button" onClick={clearSelection} className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] text-fg-muted hover:bg-fg/5">
              <X size={11} /> Clear
            </button>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => batchSetStatus("active")}
              disabled={batchBusy !== null}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-800 ring-1 ring-inset ring-emerald-200 hover:bg-emerald-100 disabled:opacity-50"
            >
              {batchBusy === "active" ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
              Mark active
            </button>
            <button
              type="button"
              onClick={() => batchSetStatus("review")}
              disabled={batchBusy !== null}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-amber-50 text-amber-900 ring-1 ring-inset ring-amber-200 hover:bg-amber-100 disabled:opacity-50"
            >
              {batchBusy === "review" ? <Loader2 size={11} className="animate-spin" /> : <Eye size={11} />}
              Mark for review
            </button>
            <button
              type="button"
              onClick={() => batchSetStatus("deprecated")}
              disabled={batchBusy !== null}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-rose-50 text-rose-900 ring-1 ring-inset ring-rose-200 hover:bg-rose-100 disabled:opacity-50"
            >
              {batchBusy === "deprecated" ? <Loader2 size={11} className="animate-spin" /> : <Archive size={11} />}
              Deprecate
            </button>
            {isSuperadmin && (
              <LaunchSwitch
                label="DELETE"
                ariaLabel={`Hard-delete ${selected.size} skill${selected.size === 1 ? "" : "s"}`}
                onFire={batchDelete}
              />
            )}
          </div>
        </div>
      )}

      {/* Cards — wave effect on mousemove. Each card watches the
          cursor position; the closer the cursor, the more it lifts +
          tints. Movement across the grid leaves a temporary wave of
          highlighted cards behind. */}
      <SkillsCardGrid
        skills={filtered}
        selected={selected}
        onToggleSelect={toggleSelected}
        onEdit={setEditing}
        onMerge={setMerging}
      />
      {filtered.length === 0 && (
        <p className="px-6 py-12 text-center text-muted text-sm bg-card border border-line rounded-2xl">
          No skills match. Add one with the button above.
        </p>
      )}

      {(creating || editing) && (
        <SkillEditor
          skill={editing}
          onClose={() => { setEditing(null); setCreating(false); }}
          onSaved={async () => { setEditing(null); setCreating(false); await refresh(); }}
        />
      )}

      {merging && (
        <MergeDialog
          loser={merging}
          candidates={skills.filter((s) => s.id !== merging.id && s.status === "active")}
          onClose={() => setMerging(null)}
          onMerged={async () => { setMerging(null); await refresh(); }}
          busy={busy}
          setBusy={setBusy}
        />
      )}
    </div>
  );
}

function StatusChip({ active, onClick, label, tone }: { active: boolean; onClick: () => void; label: string; tone?: "amber" | "rose" }) {
  const activeCls =
    tone === "amber" ? "bg-amber-50 text-amber-800 border-amber-200"
  : tone === "rose"  ? "bg-rose-50 text-rose-700 border-rose-200"
                     : "bg-brand-50 text-brand-700 border-brand-200";
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "text-xs font-medium px-3 py-1.5 rounded-full border transition-colors",
        active ? activeCls : "bg-card-solid border-line text-muted hover:text-fg",
      )}
    >
      {label}
    </button>
  );
}

function IconBtn({ icon: Icon, title, onClick }: { icon: React.ElementType; title: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className="p-1.5 rounded-md text-muted hover:bg-elevated hover:text-fg transition-colors"
    >
      <Icon size={14} />
    </button>
  );
}

// ── Editor dialog ────────────────────────────────────────────────
function SkillEditor({ skill, onClose, onSaved }: { skill: SkillRow | null; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(skill?.name ?? "");
  const [category, setCategory] = useState(skill?.category ?? "");
  const [description, setDescription] = useState(skill?.description ?? "");
  const [status, setStatus] = useState(skill?.status ?? "active");
  const [newAlias, setNewAlias] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function save() {
    setBusy(true); setErr(null);
    try {
      if (skill) {
        const r = await fetch("/api/admin/skills", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: skill.id, name, category, description, status }),
        });
        if (!r.ok) {
          const j = await r.json().catch(() => ({}));
          setErr(j.error ?? "Save failed"); return;
        }
      } else {
        const r = await fetch("/api/admin/skills", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, category, description }),
        });
        if (!r.ok) {
          const j = await r.json().catch(() => ({}));
          setErr(j.error ?? "Create failed"); return;
        }
      }
      onSaved();
    } finally { setBusy(false); }
  }

  async function addAlias() {
    if (!skill || !newAlias.trim()) return;
    setBusy(true); setErr(null);
    try {
      const r = await fetch("/api/admin/skills", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: skill.id, addAlias: newAlias.trim() }),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        setErr(j.error ?? "Alias failed");
      } else {
        setNewAlias("");
        onSaved();
      }
    } finally { setBusy(false); }
  }

  async function removeAlias(aliasId: string) {
    if (!skill) return;
    setBusy(true);
    try {
      await fetch("/api/admin/skills", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: skill.id, removeAliasId: aliasId }),
      });
      onSaved();
    } finally { setBusy(false); }
  }

  return (
    <Modal title={skill ? `Edit ${skill.name}` : "New skill"} onClose={onClose}>
      <div className="space-y-3">
        <Field label="Name *">
          <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} placeholder="e.g. Aseptic Technique" />
        </Field>
        <Field label="Category">
          <input value={category} onChange={(e) => setCategory(e.target.value)} className={inputCls} placeholder="Bioprocess · Quality · Analytical · …" />
        </Field>
        <Field label="Description">
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className={cn(inputCls, "resize-y")} placeholder="What does this skill cover?" />
        </Field>
        {skill && (
          <Field label="Status">
            <select value={status} onChange={(e) => setStatus(e.target.value)} className={inputCls}>
              <option value="active">Active</option>
              <option value="review">Review</option>
              <option value="deprecated">Deprecated</option>
            </select>
          </Field>
        )}
        {skill && (
          <Field label="Aliases (synonyms / acronyms)">
            <div className="flex flex-wrap gap-1.5 mb-2">
              {skill.aliases.map((a) => (
                <span key={a.id} className="inline-flex items-center gap-1 text-[11px] bg-elevated rounded-full px-2 py-0.5 text-muted">
                  {a.alias}
                  <button onClick={() => removeAlias(a.id)} className="text-subtle hover:text-rose-700"><X size={10} /></button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input value={newAlias} onChange={(e) => setNewAlias(e.target.value)} placeholder="add alias…" className={inputCls} />
              <button onClick={addAlias} disabled={busy || !newAlias.trim()} className="text-xs font-semibold px-3 py-2 rounded-lg bg-brand-50 text-brand-700 border border-brand-200 hover:bg-brand-100 disabled:opacity-50">Add</button>
            </div>
          </Field>
        )}
        {err && (
          <div className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2 inline-flex items-center gap-1.5">
            <AlertCircle size={12} /> {err}
          </div>
        )}
      </div>
      <ModalFooter>
        <button onClick={onClose} className="text-xs font-medium px-3 py-2 rounded-lg text-muted hover:bg-elevated">Cancel</button>
        <button onClick={save} disabled={busy || !name.trim()} className="text-xs font-semibold px-3 py-2 rounded-lg bg-brand-600 text-white border border-brand-700 hover:bg-brand-700 disabled:opacity-60">
          {skill ? "Save changes" : "Create skill"}
        </button>
      </ModalFooter>
    </Modal>
  );
}

// ── Merge dialog ─────────────────────────────────────────────────
function MergeDialog({
  loser, candidates, onClose, onMerged, busy, setBusy,
}: {
  loser: SkillRow;
  candidates: SkillRow[];
  onClose: () => void;
  onMerged: () => void;
  busy: boolean;
  setBusy: (b: boolean) => void;
}) {
  const [winnerId, setWinnerId] = useState<string>("");
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return candidates.slice(0, 30);
    return candidates.filter((c) => c.name.toLowerCase().includes(q) || c.aliases.some((a) => a.alias.includes(q))).slice(0, 30);
  }, [candidates, query]);

  async function doMerge() {
    if (!winnerId) return;
    setBusy(true);
    try {
      const r = await fetch("/api/admin/skills/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ loserId: loser.id, winnerId }),
      });
      if (r.ok) onMerged();
    } finally { setBusy(false); }
  }

  return (
    <Modal title={`Merge "${loser.name}" into…`} onClose={onClose}>
      <p className="text-xs text-muted mb-3">
        All tags and aliases on <strong>{loser.name}</strong> will move to the winner. The loser becomes inactive (kept for the audit trail). This is reversible only by manual SQL — pick carefully.
      </p>
      <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search the survivor…" className={inputCls + " mb-2"} />
      <div className="max-h-60 overflow-y-auto border border-line rounded-lg divide-y divide-line">
        {filtered.map((c) => (
          <label key={c.id} className={cn("flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-elevated", winnerId === c.id && "bg-brand-50")}>
            <input type="radio" checked={winnerId === c.id} onChange={() => setWinnerId(c.id)} className="accent-brand-600" />
            <span className="flex-1 text-sm">
              <span className="font-medium text-fg">{c.name}</span>
              {c.category && <span className="text-[11px] text-subtle ml-2">{c.category}</span>}
            </span>
            <span className="text-[11px] text-subtle">{c.counts.courses}c · {c.counts.users}u · {c.counts.postings}p</span>
          </label>
        ))}
        {filtered.length === 0 && <p className="px-3 py-4 text-xs text-muted">No matches.</p>}
      </div>
      <ModalFooter>
        <button onClick={onClose} className="text-xs font-medium px-3 py-2 rounded-lg text-muted hover:bg-elevated">Cancel</button>
        <button onClick={doMerge} disabled={!winnerId || busy} className="text-xs font-semibold px-3 py-2 rounded-lg bg-rose-600 text-white border border-rose-700 hover:bg-rose-700 disabled:opacity-50">
          <GitMerge size={12} className="inline -mt-0.5 mr-1" /> Merge
        </button>
      </ModalFooter>
    </Modal>
  );
}

// ── Tiny shared bits ─────────────────────────────────────────────
const inputCls = "w-full bg-card-solid border border-line rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-muted mb-1.5">{label}</span>
      {children}
    </label>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-backdrop animate-fade-in" onClick={onClose}>
      <div className="popover w-full max-w-md p-5 animate-slide-up-in" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-fg">{title}</h3>
          <button onClick={onClose} className="text-subtle hover:text-fg p-1 rounded"><X size={14} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ModalFooter({ children }: { children: React.ReactNode }) {
  return <div className="mt-4 flex justify-end gap-2">{children}</div>;
}

/** Skills rendered as a dense card grid with a mouse-driven wave.
 *
 * Each card subscribes to the grid container's mousemove and reads
 * `--mx, --my` (the cursor's pixel position inside the grid). A CSS
 * radial gradient + small lift transform are driven by the distance
 * between the card's centre and the cursor. The closer the cursor,
 * the more the card lifts + tints. As the cursor moves across the
 * grid, the lift ripples — a wave of highlighted cards travels with
 * the cursor, with a soft fade-out as it moves on.
 *
 * Pure CSS — no JS animation loop. Mousemove writes CSS custom
 * properties on the grid; each card computes its own offset to the
 * cursor via the same vars and a fixed per-card centre offset.
 *
 * Cards stay clickable + keyboard-navigable. The wave is decorative;
 * `prefers-reduced-motion: reduce` zeroes it out via globals.css. */
function SkillsCardGrid({
  skills, selected, onToggleSelect, onEdit, onMerge,
}: {
  skills: SkillRow[];
  selected: Set<string>;
  onToggleSelect: (id: string) => void;
  onEdit: (s: SkillRow) => void;
  onMerge: (s: SkillRow) => void;
}) {
  const gridRef = useRef<HTMLDivElement>(null);

  // Throttled via rAF so we never call setProperty more than once per
  // frame even if mousemove fires 60+ times.
  const frame = useRef<number | null>(null);
  function handleMove(e: React.MouseEvent<HTMLDivElement>) {
    const el = gridRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    if (frame.current !== null) return;
    frame.current = requestAnimationFrame(() => {
      // Unitless on purpose — CSS calc() can multiply unitless
      // numbers but not lengths (px * px is invalid). We append px
      // only at the final consumption point inside the CSS.
      el.style.setProperty("--mx", `${x}`);
      el.style.setProperty("--my", `${y}`);
      el.style.setProperty("--in", "1");
      frame.current = null;
    });
  }
  function handleLeave() {
    const el = gridRef.current;
    if (!el) return;
    el.style.setProperty("--in", "0");
  }

  return (
    <div
      ref={gridRef}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      className="skills-wave-grid relative grid gap-3.5 grid-cols-[repeat(auto-fill,minmax(220px,1fr))]"
      style={{
        // Unitless defaults — see comment on handleMove for why.
        "--mx": "-9999",
        "--my": "-9999",
        "--in": "0",
      } as React.CSSProperties}
    >
      {skills.map((s) => (
        <SkillCard
          key={s.id}
          skill={s}
          isSelected={selected.has(s.id)}
          onToggleSelect={() => onToggleSelect(s.id)}
          onEdit={() => onEdit(s)}
          onMerge={() => onMerge(s)}
        />
      ))}
      {/* Scoped CSS for the wave. Lives next to the component so the
          two stay in sync as we tune the feel. */}
      <style jsx>{`
        .skills-wave-grid :global(.skill-card) {
          /* All distance variables are UNITLESS. CSS calc() can
             multiply unitless numbers (--dx * --dx) but cannot
             multiply lengths (px * px is invalid). We append units
             only at the final consumption point — px on translateY,
             px on the gradient centre, etc.
             Defaults fall back to 99999 so a not-yet-measured card
             stays off-screen-far and shows zero proximity. */
          --dx: calc(var(--mx) - var(--cx, 99999));
          --dy: calc(var(--my) - var(--cy, 99999));
          /* 1 / (1 + d²/k²) — soft Gaussian-ish falloff. k tunes the
             wave radius; ~160 means the lift drops to half at ~160px. */
          --d2: calc((var(--dx) * var(--dx) + var(--dy) * var(--dy)) / (160 * 160));
          --proximity: calc(var(--in) / (1 + var(--d2)));
          transform: translateY(calc(var(--proximity) * -3px));
          box-shadow:
            0 calc(var(--proximity) * 8px) calc(var(--proximity) * 24px) calc(var(--proximity) * -8px) rgba(56, 189, 248, calc(var(--proximity) * 0.45)),
            0 1px 0 0 var(--line);
          background-image: radial-gradient(
            circle at calc(var(--mx) * 1px) calc(var(--my) * 1px),
            color-mix(in oklab, var(--brand-100) calc(var(--proximity) * 60%), transparent),
            transparent 60%
          );
          transition: transform 200ms ease-out, box-shadow 200ms ease-out;
        }
        @media (prefers-reduced-motion: reduce) {
          .skills-wave-grid :global(.skill-card) {
            transform: none !important;
            background-image: none !important;
          }
        }
      `}</style>
    </div>
  );
}

/** A single skill rendered as a compact card. Owns its position-
 *  measurement effect that writes --cx/--cy onto the card so the
 *  parent's wave CSS knows where the card sits inside the grid. */
function SkillCard({
  skill, isSelected, onToggleSelect, onEdit, onMerge,
}: {
  skill: SkillRow;
  isSelected: boolean;
  onToggleSelect: () => void;
  onEdit: () => void;
  onMerge: () => void;
}) {
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    function measure() {
      if (!el) return;
      // offsetLeft/offsetTop are relative to the nearest positioned
      // ancestor — which is the grid wrapper (position: relative).
      // Unitless so the CSS calc() can multiply --dx * --dx.
      const cx = el.offsetLeft + el.offsetWidth / 2;
      const cy = el.offsetTop + el.offsetHeight / 2;
      el.style.setProperty("--cx", `${cx}`);
      el.style.setProperty("--cy", `${cy}`);
    }
    measure();
    // Also re-measure when the GRID resizes (cards reflow on
    // column-count changes when the window resizes).
    const grid = el.parentElement;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    if (grid) ro.observe(grid);
    return () => ro.disconnect();
  }, []);

  return (
    <div
      ref={cardRef}
      className={cn(
        "skill-card relative rounded-xl border bg-card-solid p-4 cursor-default overflow-hidden min-h-[140px] flex flex-col",
        isSelected
          ? "border-brand-400 ring-1 ring-brand-300 bg-brand-50/40"
          : "border-line",
      )}
    >
      {/* Selection checkbox — top-right corner. Click flips selection
          without triggering edit. Larger hit target than a native
          checkbox for tap-friendliness. */}
      <button
        type="button"
        onClick={onToggleSelect}
        aria-label={isSelected ? "Deselect" : "Select for batch action"}
        title={isSelected ? "Deselect" : "Select for batch action"}
        className="absolute top-2 right-2 z-10 inline-flex items-center justify-center w-6 h-6 rounded text-fg-muted hover:text-fg hover:bg-elevated"
      >
        {isSelected ? <CheckSquare size={16} className="text-brand-700" /> : <Square size={16} />}
      </button>

      <div className="flex items-start gap-2 pr-7">
        <p className="text-[15px] font-semibold text-fg leading-tight break-words flex-1">
          {skill.name}
        </p>
      </div>

      {/* Category + status sit on the same line under the title now,
          giving them more room to breathe than the prior crammed
          right-aligned chip + tiny status pill. */}
      <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
        {skill.category && (
          <span className="text-[11px] text-fg-muted px-1.5 py-0.5 rounded bg-elevated/60">
            {skill.category}
          </span>
        )}
        <span
          className={cn(
            "text-[10px] uppercase tracking-[0.14em] px-1.5 py-0.5 rounded border",
            STATUS_CLS[skill.status] ?? STATUS_CLS.active,
          )}
        >
          {skill.status}
        </span>
      </div>

      {/* Description gets surfaced if present — was hidden previously,
          which made similar-named skills hard to tell apart. */}
      {skill.description && (
        <p className="mt-2 text-[12px] text-fg-muted leading-snug line-clamp-2">
          {skill.description}
        </p>
      )}

      {skill.aliases.length > 0 && (
        <p className="mt-2 text-[11px] text-fg-subtle line-clamp-2">
          <Tags size={10} className="inline -mt-0.5 mr-1" />
          {skill.aliases.map((a) => a.alias).slice(0, 5).join(" · ")}
          {skill.aliases.length > 5 && ` +${skill.aliases.length - 5}`}
        </p>
      )}

      <div className="mt-auto pt-3 border-t border-line/60 flex items-center justify-between text-[11px] text-fg-subtle">
        <span title="Courses · Users · Postings tagged" className="font-mono tabular-nums">
          {skill.counts.courses}c · {skill.counts.users}u · {skill.counts.postings}p
        </span>
        <div className="flex items-center gap-0.5">
          <IconBtn icon={Pencil} title="Edit" onClick={onEdit} />
          <IconBtn icon={GitMerge} title="Merge" onClick={onMerge} />
        </div>
      </div>
    </div>
  );
}
