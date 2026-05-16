"use client";
/**
 * Milestone tracker for funded EquipApplications.
 *
 * Surfaces on both the applicant's post-fund view and the admin
 * review detail. Either side can update a milestone's status (the
 * admin sees an extra "ack" affordance to acknowledge applicant
 * updates without flipping status themselves).
 *
 * Status legend:
 *   pending     — scheduled, not yet started
 *   in_progress — work underway
 *   complete    — done; admin signs off implicitly by leaving as is
 *   blocked     — needs help; reviewer sees this in the queue
 */
import { useState } from "react";
import { Loader2, Check, CircleDot, AlertTriangle, Clock } from "lucide-react";
import type { EquipMilestone } from "@/lib/equip/types";
import { progress } from "@/lib/equip/milestones";

interface Props {
  applicationId: string;
  initial: EquipMilestone[];
  canEdit: boolean;
}

const STATUS_OPTIONS: { id: EquipMilestone["status"]; label: string; tone: string; icon: React.ComponentType<{ size?: number; className?: string }> }[] = [
  { id: "pending",     label: "Pending",     tone: "neutral", icon: Clock },
  { id: "in_progress", label: "In progress", tone: "brand",   icon: CircleDot },
  { id: "complete",    label: "Complete",    tone: "emerald", icon: Check },
  { id: "blocked",     label: "Blocked",     tone: "rose",    icon: AlertTriangle },
];

export function MilestoneTracker({ applicationId, initial, canEdit }: Props) {
  const [milestones, setMilestones] = useState<EquipMilestone[]>(initial);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function update(id: string, patch: Partial<Pick<EquipMilestone, "status" | "note">>) {
    setBusy(id);
    setError(null);
    try {
      const res = await fetch(`/api/equip/applications/${applicationId}/milestones`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...patch }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j as { error?: string }).error ?? "Update failed");
      }
      const j = (await res.json()) as { milestones: EquipMilestone[] };
      setMilestones(j.milestones);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  }

  const p = progress(milestones);

  return (
    <section className="rounded-2xl border border-line bg-card p-4 space-y-3 surface-shadow">
      <header className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-fg">Milestones</h3>
        <span className="text-[11px] text-muted tabular-nums">
          {p.done} / {p.total} complete
        </span>
      </header>

      {/* Progress bar */}
      <div className="h-1.5 rounded-full bg-elevated overflow-hidden">
        <div
          className="h-full bg-brand-500 transition-all"
          style={{ width: `${Math.round(p.fraction * 100)}%` }}
        />
      </div>

      <ul className="space-y-2">
        {milestones.map((m) => (
          <MilestoneRow
            key={m.id}
            milestone={m}
            canEdit={canEdit}
            busy={busy === m.id}
            onUpdate={(patch) => update(m.id, patch)}
          />
        ))}
      </ul>

      {error && <p className="text-[11px] text-rose-700">{error}</p>}
      {!canEdit && (
        <p className="text-[10px] text-subtle">Read-only view. The applicant + reviewers can change status.</p>
      )}
    </section>
  );
}

function MilestoneRow({
  milestone, canEdit, busy, onUpdate,
}: {
  milestone: EquipMilestone;
  canEdit: boolean;
  busy: boolean;
  onUpdate: (patch: Partial<Pick<EquipMilestone, "status" | "note">>) => void;
}) {
  const [editingNote, setEditingNote] = useState(false);
  const [noteDraft, setNoteDraft] = useState(milestone.note ?? "");
  const tone = STATUS_OPTIONS.find((s) => s.id === milestone.status)?.tone ?? "neutral";

  const due = new Date(milestone.dueOn);
  const overdue = milestone.status !== "complete" && due.getTime() < Date.now();

  return (
    <li
      className={
        "rounded-xl border p-3 space-y-2 " +
        (tone === "emerald" ? "border-emerald-200 bg-emerald-50/30" :
         tone === "rose"    ? "border-rose-200 bg-rose-50/30" :
         tone === "brand"   ? "border-brand-200 bg-brand-50/30" :
         "border-line bg-card-solid")
      }
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-fg">{milestone.title}</p>
          <p className="text-[10px] text-subtle font-mono">
            Due {due.toISOString().slice(0, 10)}
            {overdue && <span className="text-rose-700 font-bold ml-1">· overdue</span>}
          </p>
        </div>
        {canEdit ? (
          <select
            value={milestone.status}
            disabled={busy}
            onChange={(e) => onUpdate({ status: e.target.value as EquipMilestone["status"] })}
            className="text-xs bg-card-solid border border-line rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-brand-500/30 shrink-0"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </select>
        ) : (
          <StatusPill status={milestone.status} />
        )}
        {busy && <Loader2 size={12} className="animate-spin text-muted shrink-0" />}
      </div>

      {/* Note */}
      {milestone.note && !editingNote && (
        <p className="text-[11px] text-muted leading-snug whitespace-pre-wrap">
          {milestone.note}
        </p>
      )}
      {canEdit && (
        editingNote ? (
          <div className="space-y-2">
            <textarea
              rows={2}
              value={noteDraft}
              onChange={(e) => setNoteDraft(e.target.value)}
              className="w-full text-xs bg-card-solid border border-line rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
              placeholder="Optional note — what's the latest?"
            />
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => { setEditingNote(false); setNoteDraft(milestone.note ?? ""); }}
                className="text-[11px] font-semibold text-muted hover:text-fg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => { onUpdate({ note: noteDraft }); setEditingNote(false); }}
                className="text-[11px] font-bold text-brand-700 hover:text-brand-800"
              >
                Save note
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setEditingNote(true)}
            className="text-[10px] font-bold text-brand-700 hover:text-brand-800"
          >
            {milestone.note ? "Edit note" : "Add note"}
          </button>
        )
      )}
    </li>
  );
}

function StatusPill({ status }: { status: EquipMilestone["status"] }) {
  const meta = STATUS_OPTIONS.find((s) => s.id === status);
  if (!meta) return null;
  const Icon = meta.icon;
  const toneCls =
    meta.tone === "emerald" ? "bg-emerald-100 text-emerald-800 ring-emerald-200" :
    meta.tone === "rose"    ? "bg-rose-100 text-rose-800 ring-rose-200" :
    meta.tone === "brand"   ? "bg-brand-100 text-brand-800 ring-brand-200" :
                               "bg-elevated text-muted ring-line";
  return (
    <span className={"inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ring-1 ring-inset " + toneCls}>
      <Icon size={10} /> {meta.label}
    </span>
  );
}
