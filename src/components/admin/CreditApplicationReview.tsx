"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, X } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea } from "@/components/ui/Field";

interface Props {
  applicationId: string;
  requestedAmount: number;
}

export function CreditApplicationReview({ applicationId, requestedAmount }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [amount, setAmount] = useState(String(requestedAmount));
  const [mode, setMode] = useState<"none" | "approve" | "reject">("none");

  async function submit(decision: "approve" | "reject") {
    setBusy(true);
    try {
      const body: Record<string, unknown> = { decision, note: note || undefined };
      if (decision === "approve") body.approvedAmount = Number(amount);
      const res = await fetch(`/api/admin/credit-applications/${applicationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        alert(j.error ?? "Review failed");
        return;
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="p-5">
      <h3 className="text-xs font-semibold text-subtle uppercase tracking-wider mb-3">Decide</h3>

      {mode === "none" && (
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setMode("approve")}
            className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 px-4 rounded-xl shadow-md shadow-emerald-600/25 transition-all hover:-translate-y-0.5"
          >
            <Check size={16} /> Approve
          </button>
          <button
            onClick={() => setMode("reject")}
            className="flex items-center justify-center gap-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold py-3 px-4 rounded-xl shadow-md shadow-rose-600/25 transition-all hover:-translate-y-0.5"
          >
            <X size={16} /> Reject
          </button>
        </div>
      )}

      {mode === "approve" && (
        <div className="space-y-3">
          <Field
            label="Credits to grant"
            hint={`Default is the requested amount (${requestedAmount.toLocaleString()}). Lower it to grant a partial amount.`}
          >
            <Input
              type="number"
              min={1}
              max={50000}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </Field>
          <Field label="Note for the trainee" hint="Optional. Visible on their credits page.">
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder="" />
          </Field>
          <div className="flex items-center justify-end gap-2">
            <Button variant="ghost" onClick={() => setMode("none")}>Cancel</Button>
            <Button onClick={() => submit("approve")} loading={busy}>
              <Check size={14} /> Approve & grant {Number(amount).toLocaleString()} credits
            </Button>
          </div>
        </div>
      )}

      {mode === "reject" && (
        <div className="space-y-3">
          <Field
            label="Reason"
            required
            hint="Trainees can see this. Be specific so they know how to resubmit if they want to."
          >
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={4} placeholder="What was missing or didn't qualify?" />
          </Field>
          <div className="flex items-center justify-end gap-2">
            <Button variant="ghost" onClick={() => setMode("none")}>Cancel</Button>
            <Button
              onClick={() => submit("reject")}
              loading={busy}
              variant="danger"
              disabled={note.trim().length < 4}
            >
              <X size={14} /> Reject
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
