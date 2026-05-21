"use client";

/**
 * Tiny showcase for the InputDialog component — lives on
 * /admin/design-system. Two demo buttons let a maintainer poke at
 * the dialog without leaving the design-system page.
 */
import { useState } from "react";
import { Pencil, FolderPlus, MessageCircle } from "lucide-react";
import { useInputDialog } from "@/components/ui/InputDialog";

export function InputDialogPreview() {
  const { inputDialog, node } = useInputDialog();
  const [lastResult, setLastResult] = useState<string | null>(null);

  async function open(opts: Parameters<typeof inputDialog>[0]) {
    const v = await inputDialog(opts);
    setLastResult(v);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => open({
            title: "New job folder",
            description: "One folder per role you're pursuing — usually \"Company · Role\".",
            label: "Folder name",
            placeholder: "STEMCELL · Process Engineer Intern",
            defaultValue: "",
            confirmLabel: "Create",
            icon: FolderPlus,
          })}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-card-solid ring-1 ring-inset ring-line hover:bg-elevated"
        >
          <FolderPlus size={11} /> Open create dialog
        </button>
        <button
          type="button"
          onClick={() => open({
            title: "Rename resume",
            label: "Resume name",
            defaultValue: "Main resume",
            confirmLabel: "Rename",
            icon: Pencil,
          })}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-card-solid ring-1 ring-inset ring-line hover:bg-elevated"
        >
          <Pencil size={11} /> Open rename dialog
        </button>
        <button
          type="button"
          onClick={() => open({
            title: "Snapshot now",
            description: "Captures the current resume as a named version in the history.",
            label: "Snapshot name",
            placeholder: "Before restructuring",
            defaultValue: "Before restructuring",
            confirmLabel: "Snapshot",
            allowEmpty: true,
            icon: MessageCircle,
          })}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-card-solid ring-1 ring-inset ring-line hover:bg-elevated"
        >
          <MessageCircle size={11} /> Open snapshot dialog (allowEmpty)
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
