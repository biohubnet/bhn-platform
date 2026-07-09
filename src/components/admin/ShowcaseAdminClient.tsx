"use client";

/**
 * ShowcaseAdminClient — grid of showcase submissions on
 * /admin/showcase.
 *
 * Each row carries: headshot thumbnail, name, LinkedIn link,
 * created date, last-downloaded date (if any), and three actions —
 *   Download    — opens the photo URL + the LinkedIn URL in new
 *                 tabs; on success calls the mark-downloaded API
 *                 (so the row records who/when).
 *   Mark done   — explicit toggle (sets/clears last-downloaded
 *                 manually, in case the auto-mark missed).
 *   Delete      — hard-deletes the row + drops the R2 object.
 *
 * Filtering: program tab + a "show only undownloaded" toggle.
 */

import { useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Download, Trash2, CheckCircle2, Circle, ExternalLink, Filter, AlertCircle,
  Plus, X, Check, Wrench, Layers, Hash,
} from "lucide-react";
import { useConfirmDialog } from "@/components/ui/ConfirmDialog";

type PillKind = "workshop" | "pathway" | "cohort";
interface Pill { kind: PillKind; label: string; sub?: string }

const PILL_KINDS: PillKind[] = ["workshop", "pathway", "cohort"];
const PILL_META: Record<PillKind, { label: string; cls: string; Icon: typeof Wrench }> = {
  workshop: { label: "Workshop", cls: "bg-amber-50 text-amber-800 ring-amber-200", Icon: Wrench },
  pathway:  { label: "Pathway",  cls: "bg-violet-50 text-violet-800 ring-violet-200", Icon: Layers },
  cohort:   { label: "Cohort",   cls: "bg-emerald-50 text-emerald-800 ring-emerald-200", Icon: Hash },
};

interface Submission {
  id: string;
  programSlug: string;
  name: string;
  linkedinHandle: string;
  linkedinUrl: string | null;
  photoUrl: string;
  photoKey: string;
  submittedFromIp: string | null;
  submittedFromUa: string | null;
  createdAt: string;
  lastDownloadedAt: string | null;
  lastDownloadedBy: string | null;
  adminNote: string | null;
  pills: Pill[];
}

interface Props {
  initialSubmissions: Submission[];
  adminName: string;
  workshopOptions: string[];
  pathwayOptions: string[];
}

export function ShowcaseAdminClient({ initialSubmissions, adminName, workshopOptions, pathwayOptions }: Props) {
  const router = useRouter();
  const { confirmDialog, node: confirmNode } = useConfirmDialog();
  const [submissions, setSubmissions] = useState(initialSubmissions);
  const [onlyUndownloaded, setOnlyUndownloaded] = useState(false);
  const [programFilter, setProgramFilter] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const programs = Array.from(new Set(submissions.map((s) => s.programSlug)));
  const visible = submissions.filter((s) => {
    if (onlyUndownloaded && s.lastDownloadedAt) return false;
    if (programFilter && s.programSlug !== programFilter) return false;
    return true;
  });

  async function markDownloaded(s: Submission, mark: boolean) {
    setBusyId(s.id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/showcase/${s.id}/mark-downloaded`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mark }),
      });
      const j = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        submission?: Submission;
        error?: string;
      };
      if (!res.ok || !j.submission) {
        setError(j.error ?? `Update failed (HTTP ${res.status}).`);
        return;
      }
      setSubmissions((cur) => cur.map((x) => (x.id === s.id ? j.submission! : x)));
    } finally {
      setBusyId(null);
    }
  }

  async function deleteRow(s: Submission) {
    const ok = await confirmDialog({
      title: `Delete ${s.name}'s submission?`,
      description: "Removes the row AND deletes the headshot from storage. Cannot be undone.",
      confirmLabel: "Delete",
      cancelLabel: "Keep it",
      tone: "destructive",
    });
    if (!ok) return;
    setBusyId(s.id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/showcase/${s.id}`, { method: "DELETE" });
      const j = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !j.ok) {
        setError(j.error ?? `Delete failed (HTTP ${res.status}).`);
        return;
      }
      setSubmissions((cur) => cur.filter((x) => x.id !== s.id));
    } finally {
      setBusyId(null);
    }
  }

  function downloadPhoto(s: Submission) {
    // Open the photo URL in a new tab — browser handles the actual
    // save. Then in the background, mark this row as downloaded.
    window.open(s.photoUrl, "_blank");
    startTransition(() => {
      void markDownloaded(s, true);
    });
  }

  /** Persist a card's membership pills (add / edit / remove). Optimistic:
   *  updates local state first, reverts if the PATCH fails. */
  async function savePills(s: Submission, pills: Pill[]) {
    const prev = s.pills;
    setError(null);
    setSubmissions((cur) => cur.map((x) => (x.id === s.id ? { ...x, pills } : x)));
    try {
      const res = await fetch(`/api/admin/showcase/${s.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pills }),
      });
      const j = (await res.json().catch(() => ({}))) as { ok?: boolean; pills?: Pill[]; error?: string };
      if (!res.ok || !j.ok) {
        setError(j.error ?? `Saving tags failed (HTTP ${res.status}).`);
        setSubmissions((cur) => cur.map((x) => (x.id === s.id ? { ...x, pills: prev } : x)));
        return;
      }
      // Trust the server-sanitised set (labels trimmed / capped).
      if (Array.isArray(j.pills)) {
        setSubmissions((cur) => cur.map((x) => (x.id === s.id ? { ...x, pills: j.pills! } : x)));
      }
    } catch {
      setError("Saving tags failed — check your connection.");
      setSubmissions((cur) => cur.map((x) => (x.id === s.id ? { ...x, pills: prev } : x)));
    }
  }

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-line/70 bg-card-solid px-4 py-2.5">
        <div className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.16em] font-bold text-fg-subtle">
          <Filter size={11} /> Filters
        </div>
        <button
          type="button"
          onClick={() => setProgramFilter(null)}
          className={
            "text-[11.5px] px-2 py-1 rounded-md transition-colors " +
            (programFilter === null
              ? "bg-brand-600 text-white font-semibold"
              : "text-fg-muted hover:text-fg hover:bg-elevated")
          }
        >
          All ({submissions.length})
        </button>
        {programs.map((p) => {
          const n = submissions.filter((s) => s.programSlug === p).length;
          return (
            <button
              key={p}
              type="button"
              onClick={() => setProgramFilter(p)}
              className={
                "text-[11.5px] px-2 py-1 rounded-md transition-colors " +
                (programFilter === p
                  ? "bg-brand-600 text-white font-semibold"
                  : "text-fg-muted hover:text-fg hover:bg-elevated")
              }
            >
              {p} ({n})
            </button>
          );
        })}
        <span className="text-line">·</span>
        <label className="inline-flex items-center gap-1.5 text-[11.5px] text-fg-muted">
          <input
            type="checkbox"
            checked={onlyUndownloaded}
            onChange={(e) => setOnlyUndownloaded(e.target.checked)}
            className="accent-brand-600"
          />
          Only show un-downloaded
        </label>
        <div className="flex-1" />
        <p className="text-[11px] text-fg-subtle">
          Signed in as <span className="font-semibold">{adminName}</span>
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="inline-flex items-start gap-2 rounded-lg bg-rose-50 ring-1 ring-inset ring-rose-200 px-3 py-2 text-[12px] text-rose-900">
          <AlertCircle size={14} className="shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Empty state */}
      {visible.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line p-10 text-center text-[13px] text-fg-subtle">
          {submissions.length === 0
            ? "No submissions yet. Share /showcase/regulatory-affairs and they'll appear here."
            : "No submissions match the current filter."}
        </div>
      ) : (
        <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((s) => (
            <li key={s.id}>
              <SubmissionCard
                submission={s}
                busy={busyId === s.id}
                onDownload={() => downloadPhoto(s)}
                onToggleMark={() => markDownloaded(s, !s.lastDownloadedAt)}
                onDelete={() => deleteRow(s)}
                onSavePills={(pills) => savePills(s, pills)}
                workshopOptions={workshopOptions}
                pathwayOptions={pathwayOptions}
              />
            </li>
          ))}
        </ol>
      )}

      <p className="text-[11.5px] text-fg-muted italic">
        Public submission URL: <code className="text-fg-subtle">/showcase/regulatory-affairs</code>
        {" · "}
        <button
          type="button"
          onClick={() => router.refresh()}
          className="font-semibold hover:underline"
        >
          Refresh list
        </button>
      </p>
      {confirmNode}
    </div>
  );
}

function SubmissionCard({
  submission, busy, onDownload, onToggleMark, onDelete, onSavePills, workshopOptions, pathwayOptions,
}: {
  submission: Submission;
  busy: boolean;
  onDownload: () => void;
  onToggleMark: () => void;
  onDelete: () => void;
  onSavePills: (pills: Pill[]) => void;
  workshopOptions: string[];
  pathwayOptions: string[];
}) {
  const downloaded = !!submission.lastDownloadedAt;
  return (
    <article
      className={
        "relative rounded-xl border bg-card-solid overflow-hidden " +
        (downloaded ? "border-line opacity-90" : "border-brand-200 ring-1 ring-brand-100/50")
      }
    >
      {/* Status strip across the top */}
      <span
        aria-hidden
        className="absolute top-0 left-0 right-0 h-[3px]"
        style={{ backgroundColor: downloaded ? "var(--fg-subtle)" : "var(--brand-500)" }}
      />

      <div className="p-3.5 flex gap-3">
        {/* Headshot */}
        <a
          href={submission.photoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 w-20 h-20 rounded-full overflow-hidden ring-2 ring-line bg-elevated"
          title="Open full-size"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={submission.photoUrl}
            alt={`${submission.name}'s headshot`}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </a>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-semibold text-fg leading-tight truncate">
            {submission.name}
          </p>
          {submission.linkedinUrl && (
            <a
              href={submission.linkedinUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-flex items-center gap-1 text-[11.5px] text-brand-700 hover:underline truncate"
            >
              {submission.linkedinHandle} <ExternalLink size={9} />
            </a>
          )}
          <p className="mt-1.5 text-[11px] text-fg-subtle">
            Submitted {new Date(submission.createdAt).toLocaleString()}
          </p>
          {downloaded && (
            <p className="text-[10.5px] text-fg-subtle italic">
              Downloaded {new Date(submission.lastDownloadedAt!).toLocaleDateString()} by {submission.lastDownloadedBy ?? "—"}
            </p>
          )}
        </div>
      </div>

      {/* Membership pills — workshop / pathway / cohort tags */}
      <div className="px-3.5 pb-3 -mt-0.5">
        <CardPills
          pills={submission.pills}
          onChange={onSavePills}
          workshopOptions={workshopOptions}
          pathwayOptions={pathwayOptions}
          disabled={busy}
        />
      </div>

      {/* Action row */}
      <div className="flex items-center gap-1 border-t border-line/60 px-3 py-2">
        <button
          type="button"
          onClick={onDownload}
          disabled={busy}
          className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11.5px] font-semibold text-brand-700 hover:bg-brand-50 disabled:opacity-50"
          title="Open the headshot in a new tab + mark this row as downloaded"
        >
          <Download size={11} /> Download
        </button>
        <button
          type="button"
          onClick={onToggleMark}
          disabled={busy}
          className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11.5px] font-semibold text-fg-muted hover:bg-elevated disabled:opacity-50"
          title={downloaded ? "Mark as not-yet-downloaded" : "Manually mark as downloaded"}
        >
          {downloaded ? <CheckCircle2 size={11} /> : <Circle size={11} />}
          {downloaded ? "Mark undone" : "Mark done"}
        </button>
        <button
          type="button"
          onClick={onDelete}
          disabled={busy}
          className="ml-auto inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11.5px] font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50"
          title="Delete this row + the headshot file"
        >
          <Trash2 size={11} /> Delete
        </button>
      </div>
    </article>
  );
}

/**
 * CardPills — the editable membership tags on a submission card.
 *
 * Each pill is { kind: workshop | pathway | cohort, label }. Admins can
 *   • add    — pick a kind, type/choose a value (workshop & pathway offer
 *              autocomplete from real records; cohort takes a number),
 *   • edit   — click a pill's label to rename it inline,
 *   • remove — the × on each pill.
 * Every change sends the full desired set up to `onChange`, which PATCHes
 * it and reconciles state. The parent owns the data; this component only
 * holds transient UI state (which form is open, what's being typed).
 */
function CardPills({
  pills, onChange, workshopOptions, pathwayOptions, disabled,
}: {
  pills: Pill[];
  onChange: (pills: Pill[]) => void;
  workshopOptions: string[];
  pathwayOptions: string[];
  disabled: boolean;
}) {
  const [adding, setAdding] = useState(false);
  const [kind, setKind] = useState<PillKind>("workshop");
  const [value, setValue] = useState("");
  const [subValue, setSubValue] = useState("");
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [editPart, setEditPart] = useState<"label" | "sub">("label");
  const [editValue, setEditValue] = useState("");
  // Identity of the pill captured when editing starts. If the pills array is
  // replaced under us (e.g. an optimistic save reverts on failure), this lets
  // commitEdit bail instead of relabelling whoever now sits at that index.
  const [editSig, setEditSig] = useState<string | null>(null);
  const dlId = useId();

  const options = kind === "workshop" ? workshopOptions : kind === "pathway" ? pathwayOptions : [];

  // A bare number reads better as "Cohort N" (applied to cohort labels + sub-tags).
  const asCohort = (raw: string) => (/^\d+$/.test(raw) ? `Cohort ${raw}` : raw);
  const sig = (p: Pill) => `${p.kind} ${p.label} ${p.sub ?? ""}`;

  function addPill() {
    const raw = value.trim();
    if (!raw) return;
    const label = kind === "cohort" ? asCohort(raw) : raw;
    // Sub-tags only apply to workshop / pathway pills (a cohort is a leaf);
    // gating here also drops any stale sub left after switching kind.
    const sub = kind === "cohort" ? "" : asCohort(subValue.trim());
    const pill: Pill = { kind, label };
    if (sub) pill.sub = sub;
    onChange([...pills, pill]);
    setValue("");
    setSubValue("");
  }
  function removePill(i: number) {
    onChange(pills.filter((_, idx) => idx !== i));
  }
  function startEdit(i: number, part: "label" | "sub") {
    if (disabled) return;
    setEditIdx(i);
    setEditPart(part);
    setEditSig(sig(pills[i]));
    setEditValue(part === "label" ? pills[i].label : (pills[i].sub ?? ""));
  }
  function cancelEdit() {
    setEditIdx(null);
    setEditPart("label");
    setEditValue("");
    setEditSig(null);
  }
  function commitEdit() {
    if (editIdx === null) return;
    const cur = pills[editIdx];
    // Bail if the pill at this index isn't the one we started editing — never
    // relabel a different pill if the array changed under us.
    if (!cur || sig(cur) !== editSig) { cancelEdit(); return; }
    const raw = editValue.trim();
    if (editPart === "label") {
      if (raw && raw !== cur.label) {
        onChange(pills.map((p, idx) => (idx === editIdx ? { ...p, label: raw } : p)));
      }
    } else {
      const nextSub = raw ? asCohort(raw) : undefined;
      if (nextSub !== cur.sub) {
        onChange(pills.map((p, idx) => {
          if (idx !== editIdx) return p;
          const np: Pill = { kind: p.kind, label: p.label };
          if (nextSub) np.sub = nextSub;
          return np;
        }));
      }
    }
    cancelEdit();
  }

  // Shared inline edit input (label + sub edits). Sibling controls (×, sub)
  // use onMouseDown preventDefault so this doesn't blur-and-reflow before the
  // click lands on them.
  const editInput = (widthCls: string, ariaLabel: string) => (
    // eslint-disable-next-line jsx-a11y/no-autofocus
    <input
      autoFocus
      aria-label={ariaLabel}
      value={editValue}
      onChange={(e) => setEditValue(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") commitEdit();
        if (e.key === "Escape") cancelEdit();
      }}
      onBlur={commitEdit}
      className={widthCls + " bg-transparent font-medium outline-none"}
    />
  );

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {pills.map((p, i) => {
        const meta = PILL_META[p.kind] ?? PILL_META.workshop;
        const Icon = meta.Icon;
        const editingLabel = editIdx === i && editPart === "label";
        const editingSub = editIdx === i && editPart === "sub";
        return (
          <span
            key={i}
            className={"inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-medium ring-1 ring-inset " + meta.cls}
          >
            <Icon size={9} className="opacity-70" />
            {editingLabel ? (
              editInput("w-24", "Edit tag name")
            ) : (
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => startEdit(i, "label")}
                disabled={disabled}
                title="Click to rename"
                className="max-w-[130px] truncate hover:underline disabled:no-underline"
              >
                {p.label}
              </button>
            )}

            {editingSub || p.sub ? (
              <>
                <span className="-mx-0.5 opacity-45" aria-hidden>›</span>
                {editingSub ? (
                  editInput("w-20", "Edit sub-tag")
                ) : (
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => startEdit(i, "sub")}
                    disabled={disabled}
                    title="Click to edit sub-tag (clear it to remove)"
                    className="max-w-[100px] truncate italic opacity-90 hover:underline disabled:no-underline"
                  >
                    {p.sub}
                  </button>
                )}
              </>
            ) : (
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => startEdit(i, "sub")}
                disabled={disabled}
                title="Add a sub-tag (e.g. Cohort 1)"
                className="opacity-40 transition hover:opacity-90 disabled:opacity-30"
              >
                <Plus size={9} />
              </button>
            )}

            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => removePill(i)}
              disabled={disabled}
              title="Remove tag"
              className="-mr-0.5 opacity-50 transition hover:opacity-100"
            >
              <X size={9} />
            </button>
          </span>
        );
      })}

      {adding ? (
        <span className="inline-flex items-center gap-1 rounded-full bg-elevated px-1.5 py-0.5 ring-1 ring-inset ring-line">
          <select
            value={kind}
            onChange={(e) => {
              const k = e.target.value as PillKind;
              setKind(k);
              // Cohort pills carry no sub-tag; clear any typed sub when switching
              // to cohort so a hidden value can't ride along.
              if (k === "cohort") setSubValue("");
            }}
            className="bg-transparent text-[10.5px] font-semibold text-fg outline-none"
            aria-label="Tag type"
          >
            {PILL_KINDS.map((k) => (
              <option key={k} value={k}>{PILL_META[k].label}</option>
            ))}
          </select>
          {/* eslint-disable-next-line jsx-a11y/no-autofocus */}
          <input
            autoFocus
            list={options.length ? dlId : undefined}
            type={kind === "cohort" ? "number" : "text"}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); addPill(); }
              if (e.key === "Escape") { setAdding(false); setValue(""); setSubValue(""); }
            }}
            placeholder={kind === "cohort" ? "e.g. 2" : `${PILL_META[kind].label} name`}
            className="w-28 bg-transparent text-[11px] text-fg outline-none placeholder:text-fg-subtle"
          />
          {options.length > 0 && (
            <datalist id={dlId}>
              {options.map((o) => <option key={o} value={o} />)}
            </datalist>
          )}
          {kind !== "cohort" && (
            <>
              <span className="opacity-45" aria-hidden>›</span>
              <input
                type="text"
                aria-label="Sub-tag"
                value={subValue}
                onChange={(e) => setSubValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") { e.preventDefault(); addPill(); }
                  if (e.key === "Escape") { setAdding(false); setValue(""); setSubValue(""); }
                }}
                placeholder="sub e.g. Cohort 1"
                className="w-24 bg-transparent text-[11px] italic text-fg outline-none placeholder:text-fg-subtle"
              />
            </>
          )}
          <button
            type="button"
            onClick={addPill}
            disabled={disabled || !value.trim()}
            title="Add tag"
            className="text-brand-700 transition hover:text-brand-800 disabled:opacity-40"
          >
            <Check size={12} />
          </button>
          <button
            type="button"
            onClick={() => { setAdding(false); setValue(""); setSubValue(""); }}
            title="Done"
            className="text-fg-subtle transition hover:text-fg"
          >
            <X size={12} />
          </button>
        </span>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          disabled={disabled}
          className="inline-flex items-center gap-0.5 rounded-full border border-dashed border-line px-2 py-0.5 text-[10.5px] font-medium text-fg-subtle transition hover:border-brand-300 hover:text-brand-700 disabled:opacity-50"
        >
          <Plus size={10} /> Tag
        </button>
      )}
    </div>
  );
}
