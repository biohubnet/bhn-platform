"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Calendar, AlertCircle, CheckCircle2, Clock, ArrowRight, ListChecks,
  Rocket, Compass, ShieldAlert, Pencil, X, Loader2, Sparkles, Eye, EyeOff,
} from "lucide-react";
import {
  CATEGORY_LABELS,
  statusToRag,
  type ResolvedStatus,
  type ChecklistPhase,
} from "@/lib/launch/checklist";
import type { ReadinessSnapshot, ResolvedItem, PhaseSummary } from "@/lib/launch/load";

const STATUS_LABEL: Record<ResolvedStatus, string> = {
  not_started:    "Not started",
  in_progress:    "In progress",
  done:           "Done",
  blocked:        "Blocked",
  not_applicable: "Skipped",
};

const RAG_CLASSES: Record<"green" | "amber" | "red" | "grey", string> = {
  green: "bg-emerald-100 text-emerald-800 ring-emerald-200",
  amber: "bg-amber-100 text-amber-800 ring-amber-200",
  red:   "bg-rose-100 text-rose-800 ring-rose-200",
  grey:  "bg-elevated text-subtle ring-line",
};

const SEVERITY_CHIP: Record<ResolvedItem["severity"], string> = {
  critical: "bg-rose-100 text-rose-800 ring-rose-200",
  high:     "bg-amber-100 text-amber-800 ring-amber-200",
  medium:   "bg-sky-100 text-sky-800 ring-sky-200",
  low:      "bg-elevated text-subtle ring-line",
};

export function LaunchReadinessDashboard({ snapshot }: { snapshot: ReadinessSnapshot }) {
  const [editing, setEditing] = useState<ResolvedItem | null>(null);
  const [bossMode, setBossMode] = useState(true);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Top header — title + boss-mode toggle. Boss mode hides
          engineer-facing detail (probe evidence, item keys, source
          chips) so the page reads as a clean executive briefing. */}
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-subtle">Admin · Platform</p>
          <h1 className="text-2xl sm:text-3xl font-bold text-fg mt-1 tracking-tight inline-flex items-center gap-2">
            <Rocket size={22} className="text-brand-600" />
            Launch Readiness
          </h1>
          <p className="text-sm text-muted mt-2 max-w-3xl leading-snug">
            Single source of truth for go-live status. The system auto-detects
            what's done; the team checks off what it can't see. Toggle below
            for an exec-friendly view (no tech jargon) or the engineering view.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setBossMode((b) => !b)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-fg ring-1 ring-inset ring-line bg-card hover:bg-elevated transition-colors"
          title={bossMode ? "Show engineering detail" : "Hide engineering detail"}
        >
          {bossMode ? <Eye size={12} /> : <EyeOff size={12} />}
          {bossMode ? "Executive view" : "Engineering view"}
        </button>
      </header>

      {/* Hero — donut + headline numbers */}
      <Hero snapshot={snapshot} />

      {/* Phase ladder */}
      <PhaseLadder phases={snapshot.phases} bossMode={bossMode} />

      {/* Decisions needed (only renders when there are any) */}
      {snapshot.decisions.length > 0 && (
        <DecisionsPanel items={snapshot.decisions} onEdit={setEditing} />
      )}

      {/* Up-next actions */}
      <NextActions items={snapshot.nextActions} bossMode={bossMode} onEdit={setEditing} />

      {/* Risk panel */}
      <RiskPanel items={snapshot.risks} bossMode={bossMode} onEdit={setEditing} />

      {/* Detailed checklist by phase */}
      <ChecklistByPhase phases={snapshot.phases} bossMode={bossMode} onEdit={setEditing} />

      {/* Edit modal */}
      {editing && (
        <ItemEditDialog
          item={editing}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

/* ─── Hero — big numbers + donut ─────────────────────────────────── */

function Hero({ snapshot }: { snapshot: ReadinessSnapshot }) {
  const t = snapshot.totals;
  const target = snapshot.target;
  return (
    <section className="rounded-2xl border border-line bg-card p-6 sm:p-8 surface-shadow">
      <div className="grid grid-cols-1 lg:grid-cols-[auto_1fr] gap-8 items-center">
        <Donut percent={t.pctComplete} />
        <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Headline
            label="Days to launch"
            value={target.daysRemaining != null ? String(target.daysRemaining) : "—"}
            sub={target.date ? new Date(target.date).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "Set LAUNCH_TARGET_DATE"}
            icon={Calendar}
            tone={target.daysRemaining != null && target.daysRemaining < 14 ? "amber" : "neutral"}
          />
          <Headline
            label="Items done"
            value={`${t.done} / ${t.total - t.notApplicable}`}
            sub={`${t.autoDetected} auto-detected, ${t.total - t.autoDetected} manual`}
            icon={CheckCircle2}
            tone="green"
          />
          <Headline
            label="In progress"
            value={String(t.inProgress)}
            sub="Items the team is actively working on"
            icon={Clock}
            tone="neutral"
          />
          <Headline
            label="Blocked"
            value={String(t.blocked)}
            sub={t.blocked > 0 ? "Need attention — see Risks below" : "Nothing blocked"}
            icon={AlertCircle}
            tone={t.blocked > 0 ? "red" : "green"}
          />
        </div>
      </div>
    </section>
  );
}

function Donut({ percent }: { percent: number }) {
  // SVG circular progress. Inner number is large + brand-coloured.
  const size = 160;
  const stroke = 14;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - percent / 100);
  return (
    <div className="flex flex-col items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--color-line)" strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="var(--color-brand-600)"
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 600ms cubic-bezier(0.2, 0.8, 0.2, 1)" }}
        />
      </svg>
      <div className="-mt-[100px] text-center pointer-events-none">
        <p className="text-4xl font-bold text-fg tabular-nums tracking-tight">{percent}%</p>
        <p className="text-[10px] uppercase tracking-[0.22em] text-subtle font-semibold mt-1">Ready to launch</p>
      </div>
    </div>
  );
}

function Headline({
  label, value, sub, icon: Icon, tone,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  tone: "neutral" | "green" | "amber" | "red";
}) {
  const tones: Record<typeof tone, string> = {
    neutral: "text-fg",
    green:   "text-emerald-700",
    amber:   "text-amber-700",
    red:     "text-rose-700",
  };
  return (
    <div>
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] text-subtle font-bold">
        <Icon size={11} />
        {label}
      </div>
      <p className={`text-3xl sm:text-4xl font-bold tabular-nums leading-tight tracking-tight mt-1 ${tones[tone]}`}>
        {value}
      </p>
      {sub && <p className="text-xs text-muted mt-1 leading-snug">{sub}</p>}
    </div>
  );
}

/* ─── Phase ladder ───────────────────────────────────────────────── */

function PhaseLadder({ phases, bossMode }: { phases: PhaseSummary[]; bossMode: boolean }) {
  return (
    <section className="rounded-2xl border border-line bg-card p-5 sm:p-6 surface-shadow">
      <h2 className="text-sm font-semibold text-fg mb-4 inline-flex items-center gap-2">
        <Compass size={14} className="text-brand-600" />
        Phases
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
        {phases.map((p, i) => {
          const allDone = p.pctComplete === 100;
          const fillTone = allDone ? "bg-emerald-500" : p.blocked > 0 ? "bg-rose-500" : "bg-brand-600";
          return (
            <div
              key={p.key}
              className={`relative rounded-xl border p-3 ${allDone ? "border-emerald-300 bg-emerald-50" : "border-line bg-elevated"}`}
            >
              <span className="absolute -top-2 left-3 inline-flex items-center justify-center w-6 h-6 rounded-full bg-card ring-1 ring-line text-[10px] font-bold text-fg">
                {i + 1}
              </span>
              <p className="text-sm font-semibold text-fg mt-2 leading-tight">
                {bossMode ? p.bossLabel : p.label}
              </p>
              <p className="text-[10px] text-subtle leading-snug mt-1 line-clamp-2">{p.description}</p>
              <div className="mt-2.5">
                <div className="h-1.5 bg-card rounded-full overflow-hidden">
                  <div
                    className={`h-full ${fillTone} transition-all`}
                    style={{ width: `${p.pctComplete}%` }}
                  />
                </div>
                <div className="flex items-center justify-between mt-1.5 text-[10px] text-subtle">
                  <span className="font-mono tabular-nums">{p.done} / {p.total}</span>
                  <span className="font-semibold text-fg tabular-nums">{p.pctComplete}%</span>
                </div>
              </div>
              {p.blocked > 0 && (
                <p className="text-[10px] text-rose-700 font-semibold mt-1.5 inline-flex items-center gap-1">
                  <AlertCircle size={10} /> {p.blocked} blocked
                </p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ─── Decisions panel ────────────────────────────────────────────── */

function DecisionsPanel({ items, onEdit }: { items: ResolvedItem[]; onEdit: (i: ResolvedItem) => void }) {
  return (
    <section className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-5 sm:p-6">
      <h2 className="text-sm font-bold text-amber-900 mb-3 inline-flex items-center gap-2">
        <AlertCircle size={14} />
        Decisions needed from you
      </h2>
      <ul className="space-y-2">
        {items.map((it) => (
          <li key={it.key} className="flex items-start gap-3">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-700 mt-2 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-amber-900">{it.bossLabel}</p>
              <p className="text-xs text-amber-800 leading-snug">{it.bossExplain}</p>
              {it.notes && <p className="text-xs text-amber-700 mt-1">Note: {it.notes}</p>}
            </div>
            <button
              type="button"
              onClick={() => onEdit(it)}
              className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-amber-900 bg-card ring-1 ring-amber-300 hover:bg-amber-100 transition-colors"
            >
              <Pencil size={11} /> Update
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ─── Up-next actions ────────────────────────────────────────────── */

function NextActions({
  items, bossMode, onEdit,
}: {
  items: ResolvedItem[];
  bossMode: boolean;
  onEdit: (i: ResolvedItem) => void;
}) {
  return (
    <section className="rounded-2xl border border-line bg-card p-5 sm:p-6 surface-shadow">
      <h2 className="text-sm font-semibold text-fg mb-3 inline-flex items-center gap-2">
        <ListChecks size={14} className="text-brand-600" />
        What to do next
      </h2>
      {items.length === 0 ? (
        <p className="text-sm text-muted">Nothing left in the queue. 🎉</p>
      ) : (
        <ul className="space-y-3">
          {items.map((it, idx) => (
            <li
              key={it.key}
              className="flex items-start gap-3 rounded-xl border border-line bg-elevated p-3"
            >
              <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-brand-600 text-white text-xs font-bold shrink-0">
                {idx + 1}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <p className="text-sm font-semibold text-fg">
                    {bossMode ? it.bossLabel : it.title}
                  </p>
                  <SeverityChip severity={it.severity} />
                  <span className="text-[10px] uppercase tracking-[0.16em] text-subtle font-semibold">
                    {it.phase}
                  </span>
                </div>
                <p className="text-xs text-muted leading-snug mt-1">{it.bossExplain}</p>
                {!bossMode && it.evidence && (
                  <p className="text-[11px] text-subtle mt-1 font-mono">→ {it.evidence}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => onEdit(it)}
                className="shrink-0 px-2.5 py-1 rounded-lg text-xs font-semibold text-fg bg-card ring-1 ring-inset ring-line hover:bg-elevated transition-colors inline-flex items-center gap-1"
              >
                <Pencil size={11} /> Update
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/* ─── Risks ──────────────────────────────────────────────────────── */

function RiskPanel({
  items, bossMode, onEdit,
}: {
  items: ResolvedItem[];
  bossMode: boolean;
  onEdit: (i: ResolvedItem) => void;
}) {
  if (items.length === 0) {
    return (
      <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
        <h2 className="text-sm font-bold text-emerald-900 inline-flex items-center gap-2">
          <ShieldAlert size={14} /> No critical risks open
        </h2>
        <p className="text-xs text-emerald-800 mt-1 leading-snug">
          No blocked items, no critical items still outstanding. Everything's
          either done or progressing on its track.
        </p>
      </section>
    );
  }
  return (
    <section className="rounded-2xl border border-line bg-card p-5 sm:p-6 surface-shadow">
      <h2 className="text-sm font-semibold text-fg mb-3 inline-flex items-center gap-2">
        <ShieldAlert size={14} className="text-rose-600" />
        Top risks
      </h2>
      <ul className="space-y-2">
        {items.map((it) => (
          <li key={it.key} className="flex items-start gap-3 rounded-lg border border-line bg-elevated p-3">
            <RagPip status={it.status} />
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-baseline gap-2">
                <p className="text-sm font-semibold text-fg">{bossMode ? it.bossLabel : it.title}</p>
                <SeverityChip severity={it.severity} />
                <span className="text-[10px] uppercase tracking-[0.16em] text-subtle font-semibold">
                  {STATUS_LABEL[it.status]}
                </span>
              </div>
              <p className="text-xs text-muted leading-snug mt-0.5">{it.bossExplain}</p>
              {it.notes && <p className="text-xs text-rose-700 mt-1">Note: {it.notes}</p>}
            </div>
            <button
              type="button"
              onClick={() => onEdit(it)}
              className="shrink-0 px-2 py-1 rounded text-xs text-muted hover:text-fg hover:bg-card transition-colors"
            >
              <Pencil size={11} />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ─── Checklist by phase ─────────────────────────────────────────── */

function ChecklistByPhase({
  phases, bossMode, onEdit,
}: {
  phases: PhaseSummary[];
  bossMode: boolean;
  onEdit: (i: ResolvedItem) => void;
}) {
  // Local state — admins can collapse phases that are 100% done so
  // the focus is on what's still moving.
  const [closed, setClosed] = useState<Set<ChecklistPhase>>(
    () => new Set(phases.filter((p) => p.pctComplete === 100).map((p) => p.key)),
  );

  return (
    <section className="space-y-4">
      <h2 className="text-sm font-semibold text-fg inline-flex items-center gap-2">
        <ListChecks size={14} className="text-brand-600" />
        Detailed checklist
      </h2>
      {phases.map((p) => {
        const isClosed = closed.has(p.key);
        return (
          <article
            key={p.key}
            className="rounded-2xl border border-line bg-card surface-shadow overflow-hidden"
          >
            <button
              type="button"
              onClick={() => setClosed((s) => {
                const n = new Set(s);
                if (n.has(p.key)) n.delete(p.key);
                else n.add(p.key);
                return n;
              })}
              className="w-full flex items-center justify-between px-5 py-3 hover:bg-elevated transition-colors text-left"
            >
              <div>
                <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-subtle">{p.label}</p>
                <p className="text-base font-bold text-fg tracking-tight mt-0.5">
                  {bossMode ? p.bossLabel : p.label}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono tabular-nums text-fg">
                  {p.done} / {p.total}
                </span>
                <span className="text-xs font-bold text-fg tabular-nums">{p.pctComplete}%</span>
                <ArrowRight size={14} className={`text-subtle transition-transform ${isClosed ? "" : "rotate-90"}`} />
              </div>
            </button>
            {!isClosed && p.items.length > 0 && (
              <ul className="divide-y divide-line border-t border-line">
                {p.items.map((it) => (
                  <ChecklistRow key={it.key} item={it} bossMode={bossMode} onEdit={onEdit} />
                ))}
              </ul>
            )}
          </article>
        );
      })}
    </section>
  );
}

function ChecklistRow({
  item, bossMode, onEdit,
}: {
  item: ResolvedItem;
  bossMode: boolean;
  onEdit: (i: ResolvedItem) => void;
}) {
  return (
    <li className="px-5 py-3 flex items-start gap-3">
      <RagPip status={item.status} />
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <p className="text-sm font-semibold text-fg">{bossMode ? item.bossLabel : item.title}</p>
          <SeverityChip severity={item.severity} />
          <span className="text-[10px] uppercase tracking-[0.16em] text-subtle font-semibold">
            {CATEGORY_LABELS[item.category]}
          </span>
          {!bossMode && (
            <>
              <span
                className={`text-[10px] font-bold uppercase tracking-[0.14em] px-1.5 py-0.5 rounded ${
                  item.kind === "auto"
                    ? "bg-sky-100 text-sky-800 ring-1 ring-inset ring-sky-200"
                    : "bg-elevated text-subtle ring-1 ring-inset ring-line"
                }`}
                title={item.kind === "auto" ? "System detects status automatically" : "Admin marks status"}
              >
                {item.kind === "auto" ? "Auto" : "Manual"}
              </span>
              {item.source === "manual_override" && (
                <span className="text-[10px] font-bold uppercase tracking-[0.14em] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 ring-1 ring-inset ring-amber-200" title="Auto status was overridden by an admin">
                  Override
                </span>
              )}
            </>
          )}
        </div>
        <p className="text-xs text-muted leading-snug mt-0.5">{item.bossExplain}</p>
        {!bossMode && item.evidence && (
          <p className="text-[11px] text-subtle font-mono mt-1">→ {item.evidence}</p>
        )}
        {item.metric && item.metric.total != null && (
          <div className="mt-1.5 max-w-xs">
            <div className="h-1 bg-elevated rounded-full overflow-hidden">
              <div
                className="h-full bg-brand-600 transition-all"
                style={{ width: `${Math.min(100, (item.metric.value / item.metric.total) * 100)}%` }}
              />
            </div>
            <p className="text-[10px] text-subtle mt-0.5 font-mono tabular-nums">
              {item.metric.value} / {item.metric.total} {item.metric.suffix ?? ""}
            </p>
          </div>
        )}
        {(item.notes || item.ownerName || item.targetDate) && (
          <div className="mt-1.5 flex flex-wrap gap-3 text-[11px] text-subtle">
            {item.ownerName && <span>👤 {item.ownerName}</span>}
            {item.targetDate && <span>🎯 {new Date(item.targetDate).toLocaleDateString()}</span>}
            {item.notes && <span>📝 {item.notes.slice(0, 80)}{item.notes.length > 80 ? "…" : ""}</span>}
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={() => onEdit(item)}
        className="shrink-0 px-2 py-1 rounded text-xs text-muted hover:text-fg hover:bg-elevated transition-colors"
        aria-label="Edit"
      >
        <Pencil size={11} />
      </button>
    </li>
  );
}

/* ─── Atoms ──────────────────────────────────────────────────────── */

function RagPip({ status }: { status: ResolvedStatus }) {
  const rag = statusToRag(status);
  return (
    <span
      className={`inline-flex items-center justify-center w-5 h-5 rounded-full ring-1 ring-inset shrink-0 mt-0.5 ${RAG_CLASSES[rag]}`}
      title={STATUS_LABEL[status]}
    >
      {status === "done" ? <CheckCircle2 size={11} /> :
       status === "blocked" ? <AlertCircle size={11} /> :
       status === "in_progress" ? <Clock size={11} /> :
       status === "not_applicable" ? <X size={11} /> :
       <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />}
    </span>
  );
}

function SeverityChip({ severity }: { severity: ResolvedItem["severity"] }) {
  return (
    <span className={`text-[10px] font-bold uppercase tracking-[0.14em] px-1.5 py-0.5 rounded ring-1 ring-inset ${SEVERITY_CHIP[severity]}`}>
      {severity}
    </span>
  );
}

/* ─── Edit dialog ────────────────────────────────────────────────── */

const STATUS_OPTIONS: { value: ResolvedStatus | "auto"; label: string }[] = [
  { value: "auto",           label: "Use auto-detected (no override)" },
  { value: "not_started",    label: "Not started" },
  { value: "in_progress",    label: "In progress" },
  { value: "done",           label: "Done" },
  { value: "blocked",        label: "Blocked" },
  { value: "not_applicable", label: "Skipped (N/A for us)" },
];

function ItemEditDialog({ item, onClose }: { item: ResolvedItem; onClose: () => void }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initialOverride = useMemo(
    () => (item.source === "manual_override" ? (item.status as ResolvedStatus) : "auto"),
    [item],
  );

  const [manualStatus, setManualStatus] = useState<ResolvedStatus | "auto">(initialOverride);
  const [notes, setNotes] = useState(item.notes ?? "");
  const [targetDate, setTargetDate] = useState(item.targetDate ? item.targetDate.slice(0, 10) : "");
  const [decisionNeeded, setDecisionNeeded] = useState(item.decisionNeeded);

  async function save() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/launch-readiness/${encodeURIComponent(item.key)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          manualStatus: manualStatus === "auto" ? null : manualStatus,
          notes: notes.trim() === "" ? null : notes.trim(),
          targetDate: targetDate ? new Date(targetDate).toISOString() : null,
          decisionNeeded,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? "Save failed.");
      }
      onClose();
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div onClick={busy ? undefined : onClose} className="absolute inset-0 bg-backdrop animate-fade-in" />
      <div className="relative w-full sm:max-w-lg max-h-[90vh] overflow-y-auto popover p-5 sm:p-6 animate-slide-up-in">
        <button
          type="button"
          onClick={busy ? undefined : onClose}
          className="absolute top-3 right-3 p-1.5 rounded-lg text-muted hover:bg-elevated hover:text-fg disabled:opacity-40"
          aria-label="Close"
        >
          <X size={16} />
        </button>

        <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-subtle">Update item</p>
        <h2 className="text-lg font-bold text-fg mt-1 tracking-tight">{item.bossLabel}</h2>
        <p className="text-xs text-muted mt-1 leading-snug">{item.bossExplain}</p>

        {item.kind === "auto" && (
          <div className="mt-3 text-[11px] bg-sky-50 ring-1 ring-inset ring-sky-200 text-sky-900 rounded-lg px-3 py-2 leading-snug">
            <Sparkles size={11} className="inline -mt-0.5 mr-1" />
            <span className="font-semibold">Auto-detected:</span>{" "}
            {STATUS_LABEL[item.autoStatus ?? "not_started"]}.
            {item.evidence && <> <span className="font-mono text-[10px]">{item.evidence}</span></>}
          </div>
        )}

        <div className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-fg mb-1">Status</label>
            <select
              value={manualStatus}
              onChange={(e) => setManualStatus(e.target.value as ResolvedStatus | "auto")}
              className="w-full px-3 py-2 rounded-lg bg-card border border-line text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/60"
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-fg mb-1">Target date (optional)</label>
            <input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-card border border-line text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/60"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-fg mb-1">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              maxLength={2000}
              placeholder="What's the status? What's blocking? Link to ticket?"
              className="w-full px-3 py-2 rounded-lg bg-card border border-line text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/60 resize-none"
            />
          </div>

          <label className="flex items-start gap-2 text-xs text-fg cursor-pointer">
            <input
              type="checkbox"
              checked={decisionNeeded}
              onChange={(e) => setDecisionNeeded(e.target.checked)}
              className="mt-0.5"
            />
            <span>
              <span className="font-semibold">Needs leadership decision.</span>{" "}
              <span className="text-muted">Surfaces this item in the "Decisions needed" panel at the top.</span>
            </span>
          </label>

          {error && (
            <p className="text-xs text-rose-700 bg-rose-50 ring-1 ring-inset ring-rose-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="px-3 py-2 rounded-lg text-sm text-muted hover:text-fg hover:bg-elevated transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={save}
              disabled={busy}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 disabled:opacity-50 transition-colors"
            >
              {busy ? <Loader2 size={13} className="animate-spin" /> : null}
              {busy ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
