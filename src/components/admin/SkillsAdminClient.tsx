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
  CheckCircle2, EyeOff, Sparkles, Tags,
} from "lucide-react";
import { cn } from "@/lib/utils";

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

export function SkillsAdminClient({ initialSkills }: { initialSkills: SkillRow[] }) {
  const router = useRouter();
  const [skills, setSkills] = useState<SkillRow[]>(initialSkills);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "review" | "deprecated">("all");
  const [editing, setEditing] = useState<SkillRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [merging, setMerging] = useState<SkillRow | null>(null);
  const [busy, setBusy] = useState(false);

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

      {/* Cards — wave effect on mousemove. Each card watches the
          cursor position; the closer the cursor, the more it lifts +
          tints. Movement across the grid leaves a temporary wave of
          highlighted cards behind. */}
      <SkillsCardGrid
        skills={filtered}
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
  skills, onEdit, onMerge,
}: {
  skills: SkillRow[];
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
      className="skills-wave-grid relative grid gap-2.5 grid-cols-[repeat(auto-fill,minmax(160px,1fr))]"
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
  skill, onEdit, onMerge,
}: {
  skill: SkillRow;
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
      className="skill-card relative rounded-xl border border-line bg-card-solid p-3 cursor-default overflow-hidden"
    >
      <div className="flex items-start justify-between gap-1.5">
        <p className="text-[13px] font-semibold text-fg leading-tight line-clamp-2 break-words">
          {skill.name}
        </p>
        <span
          className={cn(
            "shrink-0 text-[9px] uppercase tracking-[0.14em] px-1.5 py-0.5 rounded border",
            STATUS_CLS[skill.status] ?? STATUS_CLS.active,
          )}
        >
          {skill.status}
        </span>
      </div>
      {skill.category && (
        <p className="mt-1 text-[10.5px] text-fg-muted">{skill.category}</p>
      )}
      {skill.aliases.length > 0 && (
        <p className="mt-1.5 text-[10.5px] text-fg-subtle line-clamp-2">
          <Tags size={9} className="inline -mt-0.5 mr-1" />
          {skill.aliases.map((a) => a.alias).slice(0, 4).join(" · ")}
          {skill.aliases.length > 4 && ` +${skill.aliases.length - 4}`}
        </p>
      )}
      <div className="mt-2 pt-2 border-t border-line/60 flex items-center justify-between text-[10px] text-fg-subtle">
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
