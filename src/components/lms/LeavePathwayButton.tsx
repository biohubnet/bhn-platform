"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useConfirmDialog } from "@/components/ui/ConfirmDialog";

/**
 * Admin / superadmin fast-leave for a pathway enrollment.
 *
 * Two visual variants:
 *   • "light" (default) — rose-50 fill, rose-700 ink. Works on card
 *     bodies, list rows, anywhere on the lighter platform surfaces.
 *   • "onDark" — semi-transparent rose fill, rose-100 ink. Designed
 *     for the brand-gradient pathway detail hero where the surrounding
 *     surface is dark and the default would disappear.
 *
 * One branded ConfirmDialog → DELETE /api/pathways/[id]/enroll →
 * router.refresh(). For cohort-mode pathways the API also promotes
 * the next waitlist entry, so an admin withdrawing after testing
 * doesn't quietly leave an unused seat behind. Failures surface as
 * an inline chip beneath the button.
 *
 * Trainees use the regular flow (admin review / completion) — this
 * button is gated to staff at the parent so testing the
 * enrollment-state surfaces doesn't strand the admin's seat.
 */
export function LeavePathwayButton({
  pathwayId,
  pathwayTitle,
  tone = "light",
}: {
  pathwayId: string;
  pathwayTitle: string;
  tone?: "light" | "onDark";
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { confirmDialog, node: confirmNode } = useConfirmDialog();

  async function leave() {
    if (busy) return;
    const ok = await confirmDialog({
      title: `Leave "${pathwayTitle}"?`,
      description: "Any cohort waitlist will be advanced into your slot. You can re-enrol any time.",
      confirmLabel: "Leave pathway",
      cancelLabel: "Stay enrolled",
      tone: "warning",
    });
    if (!ok) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/pathways/${pathwayId}/enroll`, { method: "DELETE" });
      if (!res.ok) {
        setError("Couldn't leave the pathway. Please try again.");
        return;
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="inline-flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={leave}
        disabled={busy}
        title="Admin fast-leave — withdraws you from this pathway (cohort waitlist promoted automatically)"
        className={cn(
          "admin-glow inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg ring-1 ring-inset disabled:opacity-50 transition-colors",
          tone === "onDark"
            ? "text-rose-100 bg-rose-500/30 ring-rose-300/40 hover:bg-rose-500/50 hover:ring-rose-300/70"
            : "text-rose-700 bg-rose-50 ring-rose-200 hover:bg-rose-100 hover:ring-rose-300",
        )}
      >
        <LogOut size={11} />
        {busy ? "Leaving…" : "Leave (admin)"}
      </button>
      {error && (
        <p className="text-[11px] text-rose-700 bg-rose-50 border border-rose-200 rounded-md px-2 py-1 inline-flex items-center gap-1">
          <AlertCircle size={11} /> {error}
        </p>
      )}
      {confirmNode}
    </div>
  );
}
