"use client";

/**
 * Danger-zone button on the simulation editor. Hard-deletes a Simulation
 * via DELETE /api/admin/simulations/[id] after a typed-out confirm that
 * surfaces the cascade (every attempt against it goes too). On success
 * we route back to the request queue — the editor page would 404.
 */
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2 } from "lucide-react";
import { useConfirmDialog } from "@/components/ui/ConfirmDialog";

export function DeleteSimulationButton({
  simulationId,
  jobTitle,
  totalAttempts,
  attemptsInProgress,
}: {
  simulationId: string;
  jobTitle: string;
  totalAttempts: number;
  attemptsInProgress: number;
}) {
  const router = useRouter();
  const { confirmDialog, node } = useConfirmDialog();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onDelete() {
    const attemptsLine =
      totalAttempts > 0
        ? `${totalAttempts} attempt${totalAttempts === 1 ? "" : "s"}${
            attemptsInProgress > 0 ? ` (${attemptsInProgress} in progress)` : ""
          } will be permanently deleted along with it.`
        : "No trainee has played it yet.";
    const ok = await confirmDialog({
      title: `Delete “${jobTitle}”?`,
      description: `This permanently removes the simulation from the trainee catalog so no one can launch it again. ${attemptsLine} Any request that was fulfilled by it keeps its row but loses the link. This can't be undone.`,
      confirmLabel: "Delete simulation",
      cancelLabel: "Keep it",
      tone: "destructive",
    });
    if (!ok) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/simulations/${simulationId}`, {
        method: "DELETE",
      });
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(j.error ?? `Delete failed (HTTP ${res.status}).`);
        return;
      }
      // The row is gone — back to the queue (this detail page would 404).
      router.push("/admin/simulator-requests");
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-rose-200 bg-rose-50/40 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-rose-900">Delete this simulation</p>
          <p className="mt-0.5 text-[12px] leading-relaxed text-rose-800/80">
            Removes it from the trainee catalog. Every attempt against it
            {" ("}
            {totalAttempts.toLocaleString()}
            {attemptsInProgress > 0 ? `, ${attemptsInProgress} in progress` : ""}
            {") "}
            is deleted too. Can&apos;t be undone.
          </p>
        </div>
        <button
          type="button"
          onClick={onDelete}
          disabled={busy}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-rose-700 disabled:opacity-50"
        >
          {busy ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
          Delete
        </button>
      </div>
      {error && <p className="mt-2 text-[12px] font-medium text-rose-700">{error}</p>}
      {node}
    </div>
  );
}
