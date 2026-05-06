"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save, Calendar, Lock, Unlock, AlertCircle, Users } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Field";

interface Props {
  pathwayId: string;
  enrollmentStatus: string;
  enrollmentClosesAt: string | null;
  capacity: number | null;
  allowWaitlist: boolean;
}

export function PathwayEnrollmentSettings({
  pathwayId, enrollmentStatus, enrollmentClosesAt, capacity, allowWaitlist,
}: Props) {
  const router = useRouter();
  const [status, setStatus] = useState(enrollmentStatus);
  const [closes, setCloses] = useState(enrollmentClosesAt ? enrollmentClosesAt.slice(0, 16) : "");
  const [cap, setCap] = useState(capacity == null ? "" : String(capacity));
  const [waitlist, setWaitlist] = useState(allowWaitlist);
  const [busy, setBusy] = useState(false);
  const [ok, setOk] = useState(false);
  const [err, setErr] = useState("");

  async function save() {
    setBusy(true);
    setOk(false);
    setErr("");
    try {
      const res = await fetch(`/api/admin/pathways/${pathwayId}/enrollment-settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enrollmentStatus: status,
          enrollmentClosesAt: closes ? new Date(closes).toISOString() : null,
          capacity: cap === "" ? null : Number(cap),
          allowWaitlist: waitlist,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setErr(j.error ?? "Save failed");
        return;
      }
      setOk(true);
      setTimeout(() => setOk(false), 1800);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 mb-4">
        <Users size={18} className="text-brand-600" />
        <h3 className="font-semibold text-fg">Enrollment management</h3>
        <span className="text-xs text-subtle ml-auto">Admin only</span>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Field label="Enrollment window" hint="Closing prevents any new requests, including waitlist.">
          <Select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="open">Open — accepting requests</option>
            <option value="full">Full — new requests go to waitlist</option>
            <option value="closed">Closed — no new requests</option>
          </Select>
        </Field>
        <Field label="Auto-close at" hint="Optional. Past this time, no new requests are accepted.">
          <div className="relative">
            <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-subtle pointer-events-none" />
            <Input
              type="datetime-local"
              value={closes}
              onChange={(e) => setCloses(e.target.value)}
              className="pl-9"
            />
          </div>
        </Field>
        <Field label="Capacity" hint="Maximum approved enrollments. Empty = unlimited.">
          <Input
            type="number"
            min={0}
            value={cap}
            onChange={(e) => setCap(e.target.value)}
            placeholder="No limit"
          />
        </Field>
        <Field label="When at capacity">
          <label className="flex items-center gap-2 px-3 py-2.5 bg-card border border-line rounded-lg cursor-pointer text-sm">
            <input
              type="checkbox"
              checked={waitlist}
              onChange={(e) => setWaitlist(e.target.checked)}
              className="accent-brand-600"
            />
            Allow trainees to join the waitlist
          </label>
        </Field>
      </div>

      <div className="flex items-center gap-3 mt-4 justify-end">
        {err && (
          <p className="text-xs text-rose-600 inline-flex items-center gap-1 mr-auto">
            <AlertCircle size={12} /> {err}
          </p>
        )}
        {ok && (
          <p className="text-xs text-emerald-600 mr-auto">Saved.</p>
        )}
        <Button variant="ghost" onClick={() => setStatus("closed")} disabled={busy}>
          <Lock size={13} /> Close now
        </Button>
        <Button variant="ghost" onClick={() => setStatus("open")} disabled={busy}>
          <Unlock size={13} /> Reopen
        </Button>
        <Button onClick={save} loading={busy}>
          <Save size={13} /> Save
        </Button>
      </div>
    </Card>
  );
}
