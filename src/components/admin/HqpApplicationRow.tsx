"use client";
/**
 * Per-row reviewer action for an HQP member application.
 * Approve / reject buttons with an inline note field.
 */
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Check, X, AlertCircle } from "lucide-react";

interface Props {
  applicationId: string;
  status: string;
}

export function HqpApplicationRow({ applicationId, status }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [mode, setMode] = useState<"idle" | "approve" | "reject">("idle");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  function act(action: "approve" | "reject") {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch(`/api/admin/committees/hqp/applications/${applicationId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, reviewerNote: note || undefined }),
        });
        const j = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(j.error ?? "Action failed");
        setMode("idle");
        setNote("");
        router.refresh();
      } catch (e) { setError((e as Error).message); }
    });
  }

  if (status !== "submitted") return <span className="text-[11px] text-subtle">—</span>;

  if (mode === "idle") {
    return (
      <div className="flex items-center gap-1">
        <button type="button" onClick={() => setMode("approve")} className="text-xs text-emerald-700 hover:text-emerald-900 inline-flex items-center gap-1">
          <Check size={11} /> Approve
        </button>
        <button type="button" onClick={() => setMode("reject")} className="text-xs text-rose-700 hover:text-rose-900 inline-flex items-center gap-1">
          <X size={11} /> Reject
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2 min-w-[260px]">
      <input
        type="text"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder={mode === "reject" ? "Required — rationale for the applicant" : "Optional welcome note"}
        className="w-full bg-card-solid border border-line rounded-lg px-2 py-1.5 text-xs"
      />
      <div className="flex items-center justify-end gap-1">
        <button type="button" onClick={() => setMode("idle")} className="text-xs text-muted hover:text-fg">Cancel</button>
        <button
          type="button"
          onClick={() => act(mode)}
          disabled={pending || (mode === "reject" && note.trim().length === 0)}
          className={
            "inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-lg disabled:opacity-50 text-white " +
            (mode === "approve" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600 hover:bg-rose-700")
          }
        >
          {pending ? <Loader2 size={11} className="animate-spin" /> : mode === "approve" ? <Check size={11} /> : <X size={11} />}
          {mode === "approve" ? "Confirm approve" : "Confirm reject"}
        </button>
      </div>
      {error && (
        <p className="text-[11px] text-rose-700 inline-flex items-center gap-1.5">
          <AlertCircle size={11} /> {error}
        </p>
      )}
    </div>
  );
}
