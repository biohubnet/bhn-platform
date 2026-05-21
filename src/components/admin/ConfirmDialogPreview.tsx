"use client";

/**
 * Tiny showcase for the ConfirmDialog component — lives on
 * /admin/design-system. Three demo buttons let a maintainer poke at
 * each tone (neutral / warning / destructive) without navigating
 * away from the design-system page.
 */
import { useState } from "react";
import { HelpCircle, AlertTriangle, AlertCircle } from "lucide-react";
import { useConfirmDialog } from "@/components/ui/ConfirmDialog";

export function ConfirmDialogPreview() {
  const { confirmDialog, node } = useConfirmDialog();
  const [lastResult, setLastResult] = useState<boolean | null>(null);

  async function open(opts: Parameters<typeof confirmDialog>[0]) {
    const v = await confirmDialog(opts);
    setLastResult(v);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => open({
            title: "Open the posting in a new tab?",
            description: "We'll show you the source description side-by-side with your draft. Your edits won't be lost.",
            confirmLabel: "Open posting",
            tone: "neutral",
          })}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-card-solid ring-1 ring-inset ring-line hover:bg-elevated"
        >
          <HelpCircle size={11} /> Neutral confirm
        </button>
        <button
          type="button"
          onClick={() => open({
            title: "Clear every field on this form?",
            description: "This wipes everything you've typed so far. It can't be undone — but the form's still here, so you can refill it.",
            confirmLabel: "Clear form",
            cancelLabel: "Keep what I've typed",
            tone: "warning",
          })}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-card-solid ring-1 ring-inset ring-line hover:bg-elevated"
        >
          <AlertTriangle size={11} /> Warning confirm
        </button>
        <button
          type="button"
          onClick={() => open({
            title: "Delete this comment thread?",
            description: "All replies on this bullet will be removed too. Mentors can't reach this thread again.",
            confirmLabel: "Delete thread",
            tone: "destructive",
          })}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-card-solid ring-1 ring-inset ring-line hover:bg-elevated"
        >
          <AlertCircle size={11} /> Destructive confirm
        </button>
      </div>
      {lastResult !== null && (
        <p className="text-[11px] text-fg-muted">
          Last result: <code className="font-mono bg-elevated px-1 rounded">{JSON.stringify(lastResult)}</code>
        </p>
      )}
      {node}
    </div>
  );
}
