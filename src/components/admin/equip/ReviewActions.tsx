"use client";
/**
 * Reviewer action panel for an Equip application.
 *
 * State-machine drives which buttons are available:
 *   submitted    → "Claim" (transitions to under_review)
 *   under_review → "Approve" + "Not selected"
 *   approved     → "Mark funded"
 *
 * All actions hit PATCH /api/admin/equip/applications/[id] with
 * the target status. Note + approved amount are captured inline
 * via the disclosure form.
 */
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Check, X, Sparkles, AlertCircle } from "lucide-react";
import type { EquipStatus } from "@/lib/equip/types";

interface Props {
  applicationId: string;
  currentStatus: EquipStatus;
  requestedAmount: number | null;
  approvedAmount: number | null;
  /** VC only — remaining cumulative cap for this applicant.
   *  Null on VL or when no cap applies. When set, the approve
   *  flow clamps its default + shows a warning if the reviewer
   *  exceeds it. */
  remainingCap?: number | null;
}

export function ReviewActions({ applicationId, currentStatus, requestedAmount, approvedAmount, remainingCap }: Props) {
  const router = useRouter();
  const [mode, setMode] = useState<"idle" | "approve" | "reject" | "fund">("idle");
  const [note, setNote] = useState("");
  // Default the approve amount to min(requestedAmount, remainingCap)
  // so the field opens with a number the server will accept.
  const [amount, setAmount] = useState<number>(() => {
    const requested = approvedAmount ?? requestedAmount ?? 0;
    if (typeof remainingCap === "number") return Math.min(requested, remainingCap);
    return requested;
  });
  const [disbursement, setDisbursement] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function act(target: EquipStatus, payload: Record<string, unknown> = {}) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/equip/applications/${applicationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: target, ...payload }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j as { error?: string }).error ?? "Action failed");
      }
      router.refresh();
      setMode("idle");
      setNote("");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  // Render different button sets based on the current status.
  const canClaim    = currentStatus === "submitted";
  const canDecide   = currentStatus === "under_review";
  const canFund     = currentStatus === "approved";
  const terminal    = currentStatus === "rejected" || currentStatus === "funded";

  return (
    <section className="rounded-2xl border border-line bg-card p-4 space-y-3 surface-shadow">
      <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-subtle">Reviewer actions</p>

      {/* Idle button row */}
      {mode === "idle" && (
        <div className="flex flex-wrap items-center gap-2">
          {canClaim && (
            <button
              type="button"
              onClick={() => act("under_review")}
              disabled={busy}
              className="inline-flex items-center gap-1.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white text-sm font-bold px-4 py-2 rounded-xl"
            >
              {busy ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
              Claim for review
            </button>
          )}
          {canDecide && (
            <>
              <button
                type="button"
                onClick={() => setMode("approve")}
                className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold px-4 py-2 rounded-xl"
              >
                <Check size={13} /> Approve
              </button>
              <button
                type="button"
                onClick={() => setMode("reject")}
                className="inline-flex items-center gap-1.5 bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold px-4 py-2 rounded-xl"
              >
                <X size={13} /> Not selected
              </button>
            </>
          )}
          {canFund && (
            <button
              type="button"
              onClick={() => setMode("fund")}
              className="inline-flex items-center gap-1.5 bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold px-4 py-2 rounded-xl"
            >
              <Sparkles size={13} /> Mark funded
            </button>
          )}
          {terminal && (
            <p className="text-[11px] text-muted">This application is closed. No further actions.</p>
          )}
        </div>
      )}

      {/* Approve form */}
      {mode === "approve" && (
        <div className="space-y-3">
          <label className="block">
            <span className="text-[10px] uppercase tracking-wider font-bold text-subtle">Approved amount ($)</span>
            <input
              type="number"
              min={0}
              max={typeof remainingCap === "number" ? remainingCap : undefined}
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="mt-1 w-full bg-card-solid border border-line rounded-lg px-3 py-2 text-sm font-mono tabular-nums"
            />
            {typeof remainingCap === "number" && amount > remainingCap && (
              <span className="text-[11px] text-rose-700 inline-flex items-center gap-1.5 mt-1">
                <AlertCircle size={11} /> Exceeds the applicant&apos;s remaining ${remainingCap.toLocaleString()} cap. Server will reject.
              </span>
            )}
          </label>
          <label className="block">
            <span className="text-[10px] uppercase tracking-wider font-bold text-subtle">Reviewer note (optional)</span>
            <textarea
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="What stood out? Any conditions?"
              className="mt-1 w-full bg-card-solid border border-line rounded-lg px-3 py-2 text-sm"
            />
          </label>
          <ActionRow
            primaryLabel="Confirm approval"
            primaryTone="emerald"
            onPrimary={() => act("approved", { approvedAmount: amount, reviewerNote: note || undefined })}
            onCancel={() => setMode("idle")}
            busy={busy}
          />
        </div>
      )}

      {/* Reject form */}
      {mode === "reject" && (
        <div className="space-y-3">
          <label className="block">
            <span className="text-[10px] uppercase tracking-wider font-bold text-subtle">Reviewer note</span>
            <textarea
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="What's the rationale? The applicant will see this."
              className="mt-1 w-full bg-card-solid border border-line rounded-lg px-3 py-2 text-sm"
            />
          </label>
          <ActionRow
            primaryLabel="Confirm — not selected"
            primaryTone="rose"
            onPrimary={() => act("rejected", { reviewerNote: note || undefined })}
            onCancel={() => setMode("idle")}
            busy={busy}
            disabled={note.trim().length === 0}
          />
        </div>
      )}

      {/* Fund form */}
      {mode === "fund" && (
        <div className="space-y-3">
          <label className="block">
            <span className="text-[10px] uppercase tracking-wider font-bold text-subtle">Disbursement note</span>
            <textarea
              rows={3}
              value={disbursement}
              onChange={(e) => setDisbursement(e.target.value)}
              placeholder="Reference number, transfer date, anything else worth recording."
              className="mt-1 w-full bg-card-solid border border-line rounded-lg px-3 py-2 text-sm"
            />
          </label>
          <ActionRow
            primaryLabel="Confirm — funded"
            primaryTone="violet"
            onPrimary={() => act("funded", { disbursementNote: disbursement || undefined })}
            onCancel={() => setMode("idle")}
            busy={busy}
          />
        </div>
      )}

      {error && (
        <p className="text-[11px] text-rose-700 inline-flex items-center gap-1.5">
          <AlertCircle size={11} /> {error}
        </p>
      )}
    </section>
  );
}

function ActionRow({
  primaryLabel, primaryTone, onPrimary, onCancel, busy, disabled,
}: {
  primaryLabel: string;
  primaryTone: "emerald" | "rose" | "violet";
  onPrimary: () => void;
  onCancel: () => void;
  busy: boolean;
  disabled?: boolean;
}) {
  const toneCls =
    primaryTone === "emerald" ? "bg-emerald-600 hover:bg-emerald-700" :
    primaryTone === "rose"    ? "bg-rose-600 hover:bg-rose-700" :
                                 "bg-violet-600 hover:bg-violet-700";
  return (
    <div className="flex items-center justify-end gap-2">
      <button
        type="button"
        onClick={onCancel}
        className="text-xs font-semibold text-muted hover:text-fg px-3 py-1.5"
      >
        Cancel
      </button>
      <button
        type="button"
        onClick={onPrimary}
        disabled={busy || disabled}
        className={`inline-flex items-center gap-1.5 ${toneCls} disabled:opacity-50 text-white text-sm font-bold px-4 py-2 rounded-xl transition-colors`}
      >
        {busy ? <Loader2 size={13} className="animate-spin" /> : null}
        {primaryLabel}
      </button>
    </div>
  );
}
