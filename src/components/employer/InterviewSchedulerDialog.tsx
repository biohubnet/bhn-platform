"use client";
/**
 * Lightweight interview scheduler — employer proposes 1–3 datetime
 * slots, picks a format (phone / video / onsite), writes a short note,
 * and sends. The applicant gets the choice on their dashboard. No
 * external calendar OAuth in v1 — just a single row in the Interview
 * table.
 */
import { useState } from "react";
import { X, Calendar, Plus, Trash2, AlertCircle } from "lucide-react";

interface Props {
  postingId: string;
  applicantId: string;
  applicantName: string;
  onClose: () => void;
  onScheduled: () => void;
}

export function InterviewSchedulerDialog({ postingId, applicantId, applicantName, onClose, onScheduled }: Props) {
  const [slots, setSlots] = useState<string[]>([defaultSlot(0), defaultSlot(1)]);
  const [format, setFormat] = useState<"video" | "phone" | "onsite">("video");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function defaultSlot(daysOut: number) {
    const d = new Date();
    d.setDate(d.getDate() + 3 + daysOut);
    d.setHours(10 + daysOut, 0, 0, 0);
    // toISOString → YYYY-MM-DDTHH:mm:ss.sssZ; <input type=datetime-local>
    // wants YYYY-MM-DDTHH:mm  (local, not UTC). Convert.
    const off = d.getTimezoneOffset();
    const local = new Date(d.getTime() - off * 60 * 1000);
    return local.toISOString().slice(0, 16);
  }

  function setSlot(i: number, v: string) {
    setSlots((cur) => cur.map((s, idx) => (idx === i ? v : s)));
  }
  function addSlot() {
    if (slots.length >= 5) return;
    setSlots((cur) => [...cur, defaultSlot(cur.length)]);
  }
  function removeSlot(i: number) {
    if (slots.length <= 1) return;
    setSlots((cur) => cur.filter((_, idx) => idx !== i));
  }

  async function send() {
    setErr(null);
    const valid = slots.filter((s) => s && !isNaN(Date.parse(s)));
    if (valid.length === 0) { setErr("Pick at least one valid time."); return; }
    setBusy(true);
    try {
      const r = await fetch("/api/interviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postingId,
          applicantId,
          proposedSlots: valid.map((s) => new Date(s).toISOString()),
          format,
          location: location.trim() || null,
          notes: notes.trim() || null,
        }),
      });
      const j = await r.json();
      if (!r.ok) { setErr(j.error ?? "Schedule failed"); return; }
      onScheduled();
    } finally { setBusy(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-backdrop animate-fade-in" onClick={onClose}>
      <div className="popover w-full max-w-md p-5 animate-slide-up-in" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-fg flex items-center gap-2">
            <Calendar size={16} className="text-brand-600" />
            Schedule interview
          </h3>
          <button onClick={onClose} className="text-subtle hover:text-fg p-1"><X size={14} /></button>
        </div>
        <p className="text-xs text-muted mb-4">
          Propose up to 5 times for <strong className="text-fg">{applicantName}</strong>. They pick one (or decline) from their dashboard. We send no calendar invites yet — copy the chosen time into your calendar.
        </p>

        <div className="space-y-2 mb-4">
          <p className="text-[10px] uppercase tracking-[0.22em] text-subtle font-semibold">Time slots</p>
          {slots.map((s, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="datetime-local"
                value={s}
                onChange={(e) => setSlot(i, e.target.value)}
                className="flex-1 bg-card-solid border border-line rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30"
              />
              <button
                onClick={() => removeSlot(i)}
                disabled={slots.length <= 1}
                className="p-1.5 rounded-md text-muted hover:bg-rose-50 hover:text-rose-700 disabled:opacity-40"
                title="Remove"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
          {slots.length < 5 && (
            <button
              onClick={addSlot}
              className="text-xs text-brand-600 hover:text-brand-700 inline-flex items-center gap-1"
            >
              <Plus size={11} /> Add another time
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 mb-3">
          <label className="block">
            <span className="block text-[10px] uppercase tracking-[0.22em] text-subtle font-semibold mb-1.5">Format</span>
            <select
              value={format}
              onChange={(e) => setFormat(e.target.value as "video" | "phone" | "onsite")}
              className="w-full bg-card-solid border border-line rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30"
            >
              <option value="video">Video</option>
              <option value="phone">Phone</option>
              <option value="onsite">Onsite</option>
            </select>
          </label>
          <label className="block">
            <span className="block text-[10px] uppercase tracking-[0.22em] text-subtle font-semibold mb-1.5">{format === "onsite" ? "Address" : "Meeting link / number"}</span>
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder={format === "onsite" ? "Office address" : "https://… or +1…"}
              className="w-full bg-card-solid border border-line rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30"
            />
          </label>
        </div>

        <label className="block mb-3">
          <span className="block text-[10px] uppercase tracking-[0.22em] text-subtle font-semibold mb-1.5">Note to applicant (optional)</span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Quick context: who they'll meet, what to prepare…"
            className="w-full bg-card-solid border border-line rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30"
          />
        </label>

        {err && (
          <div className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2 mb-3 inline-flex items-center gap-1.5">
            <AlertCircle size={12} /> {err}
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="text-xs font-medium px-3 py-2 rounded-lg text-muted hover:bg-elevated">Cancel</button>
          <button onClick={send} disabled={busy} className="text-xs font-semibold px-4 py-2 rounded-lg bg-brand-600 text-white border border-brand-700 hover:bg-brand-700 disabled:opacity-60 inline-flex items-center gap-1.5">
            <Calendar size={12} /> Send proposed times
          </button>
        </div>
      </div>
    </div>
  );
}
