"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Field, Textarea } from "@/components/ui/Field";

interface Props {
  pathwayId: string;
  windowState?: "open" | "closed" | "full";
  windowReason?: string | null;
  allowWaitlist?: boolean;
  reapply?: boolean;
}

export function PathwayEnrollButton({ pathwayId, windowState = "open", windowReason, allowWaitlist = true, reapply }: Props) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const closed = windowState === "closed";
  const full = windowState === "full";
  const canJoinWaitlist = full && allowWaitlist;

  if (closed) {
    return (
      <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl px-4 py-3 min-w-[220px] text-center">
        <p className="text-xs uppercase tracking-wider text-rose-200 mb-1">Enrollment closed</p>
        {windowReason && <p className="text-xs text-brand-100">{windowReason}</p>}
      </div>
    );
  }
  if (full && !allowWaitlist) {
    return (
      <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl px-4 py-3 min-w-[220px] text-center">
        <p className="text-xs uppercase tracking-wider text-rose-200 mb-1">Pathway full</p>
        <p className="text-xs text-brand-100">No waitlist available.</p>
      </div>
    );
  }

  async function submit() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/pathways/${pathwayId}/enroll`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reason.trim() || undefined }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error ?? "Couldn't submit");
        return;
      }
      setOpen(false);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  const cta =
    reapply ? "Re-apply" :
    canJoinWaitlist ? "Join the waitlist" :
    "Request enrollment";

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        className={
          canJoinWaitlist
            ? "bg-white/15 text-white border border-white/20 hover:bg-white/25"
            : "bg-card text-brand-700 hover:bg-brand-50"
        }
      >
        {cta}
      </Button>

      <Modal
        open={open}
        onClose={() => !busy && setOpen(false)}
        size="sm"
        title={canJoinWaitlist ? "Join the pathway waitlist" : "Request to enroll in this pathway"}
        description={
          canJoinWaitlist
            ? "We'll add you to the queue and let you know when a seat opens up."
            : "An admin will review your request. Tell them briefly why you'd like to take this pathway."
        }
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={busy}>Cancel</Button>
            <Button onClick={submit} loading={busy}>{cta}</Button>
          </>
        }
      >
        <Field label="Reason or learning goal" hint="Optional but helpful — admins read this before deciding.">
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={4}
            placeholder="e.g. I'm transitioning into upstream bioprocessing and want a structured intro to GMP cleanrooms."
          />
        </Field>
        {error && (
          <p className="mt-3 text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{error}</p>
        )}
      </Modal>
    </>
  );
}
