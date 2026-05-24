"use client";
/**
 * MessageComposer — bulk email composer for selected applicants.
 *
 * Shown inline below the applicant list when ≥1 applicant is selected.
 * Composes a freeform email subject + body, then calls
 * POST /api/employer/applications/message.
 *
 * Uses a two-step confirm before firing (no window.confirm).
 */
import { useState } from "react";
import { Send, X, Loader2, CheckCircle2, AlertCircle, Mail } from "lucide-react";
import type { ApplicantData } from "./HrWorkspace";

interface Props {
  postingId: string;
  selectedIds: string[];            // applicationStatusId[]
  applicants: ApplicantData[];
  onClear: () => void;              // clear selection after send
}

export function MessageComposer({ postingId, selectedIds, applicants, onClear }: Props) {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [result, setResult] = useState<{ sent: number; failed: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (selectedIds.length === 0) return null;

  const selectedNames = applicants
    .filter((a) => a.applicationStatusId && selectedIds.includes(a.applicationStatusId))
    .map((a) => a.name ?? a.email)
    .slice(0, 3);
  const overflow = selectedIds.length - selectedNames.length;

  async function send() {
    if (!subject.trim() || body.trim().length < 20) {
      setError("Subject and a message body (at least 20 characters) are required.");
      return;
    }
    setSending(true);
    setError(null);
    setConfirm(false);
    try {
      const r = await fetch("/api/employer/applications/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postingId, applicationStatusIds: selectedIds, subject, body }),
      });
      const j = await r.json() as { ok?: boolean; sent?: number; failed?: number; error?: string };
      if (!r.ok || !j.ok) {
        setError(j.error ?? "Send failed.");
        return;
      }
      setResult({ sent: j.sent ?? 0, failed: j.failed ?? 0 });
      setSubject("");
      setBody("");
      setTimeout(() => {
        setResult(null);
        onClear();
      }, 3000);
    } finally {
      setSending(false);
    }
  }

  if (result) {
    return (
      <div className="px-5 py-4 bg-emerald-50 border-t border-emerald-200 flex items-center gap-3">
        <CheckCircle2 size={16} className="text-emerald-700 shrink-0" />
        <p className="text-sm text-emerald-900 font-semibold">
          Sent to {result.sent} candidate{result.sent !== 1 ? "s" : ""}.
          {result.failed > 0 && <span className="text-amber-800"> {result.failed} failed.</span>}
        </p>
      </div>
    );
  }

  return (
    <div className="border-t border-brand-200/60 bg-brand-50/30 p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-bold text-fg inline-flex items-center gap-1.5">
          <Mail size={12} className="text-brand-600" />
          Message {selectedIds.length} candidate{selectedIds.length !== 1 ? "s" : ""}
          <span className="font-normal text-muted">
            {" "}({selectedNames.join(", ")}{overflow > 0 ? ` +${overflow} more` : ""})
          </span>
        </p>
        <button
          type="button"
          onClick={onClear}
          className="text-muted hover:text-fg p-0.5 rounded"
          aria-label="Cancel messaging"
        >
          <X size={13} />
        </button>
      </div>

      <input
        type="text"
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
        placeholder="Subject line"
        className="w-full text-sm bg-card border border-line rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500/30 text-fg"
      />

      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={4}
        placeholder="Write your message… Use {{candidateFirstName}} to personalise."
        className="w-full text-sm bg-card border border-line rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500/30 text-fg resize-y"
      />

      {error && (
        <p className="text-xs text-rose-700 bg-rose-50 ring-1 ring-rose-200 rounded-lg px-3 py-2 inline-flex items-start gap-1.5">
          <AlertCircle size={11} className="mt-0.5 shrink-0" /> {error}
        </p>
      )}

      {!confirm ? (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setConfirm(true)}
            disabled={!subject.trim() || body.trim().length < 20}
            className="inline-flex items-center gap-1.5 text-xs font-bold rounded-lg bg-brand-600 text-white hover:bg-brand-700 px-3 py-1.5 disabled:opacity-50"
          >
            <Send size={11} /> Send to {selectedIds.length} candidate{selectedIds.length !== 1 ? "s" : ""}
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-end gap-2 rounded-xl bg-amber-50 ring-1 ring-amber-200 px-3 py-2">
          <p className="text-xs text-amber-900 font-semibold flex-1">
            Send this email to {selectedIds.length} candidate{selectedIds.length !== 1 ? "s" : ""}?
          </p>
          <button type="button" onClick={() => setConfirm(false)} className="text-xs text-muted hover:text-fg">
            Cancel
          </button>
          <button
            type="button"
            onClick={send}
            disabled={sending}
            className="inline-flex items-center gap-1 text-xs font-bold rounded-lg bg-brand-600 text-white hover:bg-brand-700 px-2.5 py-1.5 disabled:opacity-50"
          >
            {sending ? <Loader2 size={10} className="animate-spin" /> : <Send size={10} />}
            Yes, send
          </button>
        </div>
      )}
    </div>
  );
}
