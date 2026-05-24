"use client";

/**
 * ScorecardBuilder — criteria editor for a posting's interview scorecard.
 *
 * Allows owners/managers to define up to 10 evaluation criteria (label,
 * optional description, scale of 4 or 5), save, and soft-lock the scorecard
 * once criteria are final.
 */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Plus, Trash2, ChevronUp, ChevronDown, Lock, AlertCircle, CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/Card";

// ── Types ─────────────────────────────────────────────────────────

export interface ScorecardData {
  id:       string;
  criteria: Array<{
    id:           string;
    label:        string;
    description?: string;
    scale:        4 | 5;
  }>;
  locked:   boolean;
}

interface Props {
  postingId: string;
  scorecard: ScorecardData | null;
}

interface CriterionDraft {
  id:          string;
  label:       string;
  description: string;
  scale:       4 | 5;
}

const MAX_CRITERIA = 10;

function newCriterion(): CriterionDraft {
  return {
    id:          `draft-${Math.random().toString(36).slice(2)}`,
    label:       "",
    description: "",
    scale:       5,
  };
}

// ── Component ────────────────────────────────────────────────────

export function ScorecardBuilder({ postingId, scorecard }: Props) {
  const router                    = useRouter();
  const [, startTransition]       = useTransition();

  const [criteria, setCriteria] = useState<CriterionDraft[]>(
    scorecard?.criteria.length
      ? scorecard.criteria.map((c) => ({
          id:          c.id,
          label:       c.label,
          description: c.description ?? "",
          scale:       c.scale,
        }))
      : [newCriterion()],
  );

  const [saving,         setSaving]         = useState(false);
  const [error,          setError]          = useState<string | null>(null);
  const [success,        setSuccess]        = useState<string | null>(null);
  const [lockConfirm,    setLockConfirm]    = useState(false);
  const [locking,        setLocking]        = useState(false);

  // ── Criteria list mutations ───────────────────────────────────

  function addCriterion() {
    if (criteria.length >= MAX_CRITERIA) return;
    setCriteria((prev) => [...prev, newCriterion()]);
  }

  function removeCriterion(idx: number) {
    setCriteria((prev) => prev.filter((_, i) => i !== idx));
  }

  function moveCriterion(idx: number, dir: -1 | 1) {
    const next = [...criteria];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    setCriteria(next);
  }

  function updateCriterion(idx: number, patch: Partial<CriterionDraft>) {
    setCriteria((prev) => prev.map((c, i) => (i === idx ? { ...c, ...patch } : c)));
  }

  // ── Save ──────────────────────────────────────────────────────

  async function handleSave() {
    setError(null);
    setSuccess(null);
    if (criteria.some((c) => !c.label.trim())) {
      setError("All criteria must have a label.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/employer/postings/${postingId}/scorecard`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          criteria: criteria.map((c) => ({
            id:          c.id,
            label:       c.label.trim(),
            description: c.description.trim() || undefined,
            scale:       c.scale,
          })),
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? "Failed to save scorecard.");
      }
      setSuccess("Scorecard saved.");
      startTransition(() => router.refresh());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Unexpected error.");
    } finally {
      setSaving(false);
    }
  }

  // ── Lock ──────────────────────────────────────────────────────

  async function handleLock() {
    setLocking(true);
    setError(null);
    try {
      const res = await fetch(`/api/employer/postings/${postingId}/scorecard`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ locked: true }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? "Failed to lock scorecard.");
      }
      setLockConfirm(false);
      startTransition(() => router.refresh());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Unexpected error.");
    } finally {
      setLocking(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────

  return (
    <Card className="p-5 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-subtle">
            Evaluation criteria
          </p>
          <p className="text-xs text-muted mt-0.5">
            Define what interviewers grade. Up to {MAX_CRITERIA} criteria.
          </p>
        </div>
        <span className="text-xs text-muted">
          {criteria.length} / {MAX_CRITERIA}
        </span>
      </div>

      {/* Criteria list */}
      <div className="space-y-3">
        {criteria.map((c, idx) => (
          <div
            key={c.id}
            className="rounded-xl border border-line bg-elevated/40 p-4 space-y-3"
          >
            <div className="flex items-start gap-3">
              {/* Index + reorder */}
              <div className="flex flex-col items-center gap-0.5 shrink-0 pt-1">
                <span className="text-[10px] font-bold text-subtle w-5 text-center">
                  {idx + 1}
                </span>
                <button
                  onClick={() => moveCriterion(idx, -1)}
                  disabled={idx === 0}
                  className="p-0.5 rounded text-muted hover:text-fg disabled:opacity-30 disabled:cursor-not-allowed"
                  aria-label="Move up"
                >
                  <ChevronUp size={13} />
                </button>
                <button
                  onClick={() => moveCriterion(idx, 1)}
                  disabled={idx === criteria.length - 1}
                  className="p-0.5 rounded text-muted hover:text-fg disabled:opacity-30 disabled:cursor-not-allowed"
                  aria-label="Move down"
                >
                  <ChevronDown size={13} />
                </button>
              </div>

              {/* Fields */}
              <div className="flex-1 min-w-0 space-y-2">
                <input
                  value={c.label}
                  onChange={(e) => updateCriterion(idx, { label: e.target.value })}
                  placeholder="Criterion label (e.g. Technical depth)"
                  className="w-full text-sm font-medium px-3 py-2 rounded-lg bg-card border border-line focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand text-fg placeholder:text-muted"
                />
                <input
                  value={c.description}
                  onChange={(e) => updateCriterion(idx, { description: e.target.value })}
                  placeholder="Optional hint for the interviewer…"
                  className="w-full text-xs px-3 py-2 rounded-lg bg-card border border-line focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand text-fg placeholder:text-muted"
                />
              </div>

              {/* Scale + delete */}
              <div className="flex items-start gap-2 shrink-0 pt-1">
                <select
                  value={c.scale}
                  onChange={(e) => updateCriterion(idx, { scale: Number(e.target.value) as 4 | 5 })}
                  className="text-xs px-2 py-1.5 rounded-lg bg-card border border-line focus:outline-none focus:ring-2 focus:ring-brand/40 text-fg"
                  aria-label="Rating scale"
                >
                  <option value={4}>1–4 scale</option>
                  <option value={5}>1–5 scale</option>
                </select>
                <button
                  onClick={() => removeCriterion(idx)}
                  className="p-1.5 rounded-lg text-muted hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors"
                  aria-label="Remove criterion"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add criterion */}
      {criteria.length < MAX_CRITERIA && (
        <button
          onClick={addCriterion}
          className="w-full flex items-center justify-center gap-2 text-sm text-muted hover:text-fg border border-dashed border-line hover:border-brand/40 rounded-xl py-3 transition-colors"
        >
          <Plus size={14} />
          Add criterion
        </button>
      )}

      {/* Feedback */}
      {error && (
        <div className="flex items-center gap-2 text-sm text-rose-700 bg-rose-50 rounded-lg px-3 py-2 ring-1 ring-inset ring-rose-200">
          <AlertCircle size={14} className="shrink-0" />
          {error}
        </div>
      )}
      {success && !error && (
        <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2 ring-1 ring-inset ring-emerald-200">
          <CheckCircle2 size={14} className="shrink-0" />
          {success}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3 pt-1">
        <button
          onClick={handleSave}
          disabled={saving}
          className="text-sm font-semibold px-4 py-2 rounded-lg bg-brand text-white hover:bg-brand/90 disabled:opacity-50 transition-colors"
        >
          {saving ? "Saving…" : "Save scorecard"}
        </button>

        {scorecard && (
          lockConfirm ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-amber-700 font-medium">
                Lock criteria permanently?
              </span>
              <button
                onClick={handleLock}
                disabled={locking}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50 transition-colors"
              >
                {locking ? "Locking…" : "Yes, lock it"}
              </button>
              <button
                onClick={() => setLockConfirm(false)}
                className="text-xs px-3 py-1.5 rounded-lg bg-elevated border border-line hover:bg-line transition-colors"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setLockConfirm(true)}
              className="inline-flex items-center gap-1.5 text-sm px-4 py-2 rounded-lg bg-elevated border border-line hover:bg-amber-50 hover:border-amber-200 hover:text-amber-700 text-muted transition-colors"
            >
              <Lock size={13} />
              Lock scorecard
            </button>
          )
        )}
      </div>
    </Card>
  );
}
