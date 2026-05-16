"use client";
/**
 * Admin manager for HQP committee meetings.
 *
 * Renders a creation form + table of meetings with quick links
 * into per-meeting detail (agenda / attendance / notes / actions).
 */
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, Plus, AlertCircle, ChevronRight, CalendarClock } from "lucide-react";
import { Badge } from "@/components/ui/Badge";

interface Meeting {
  id: string;
  title: string;
  scheduledAt: string | Date;
  durationMin: number;
  status: string;
  attendanceCount: number;
  actionItemCount: number;
}

interface Props {
  initial: Meeting[];
}

function fmt(d: string | Date) {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleString("en-US", { timeZone: "America/Toronto", weekday: "short", month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true });
}

export function HqpMeetingsManager({ initial }: Props) {
  return (
    <div className="space-y-5">
      <NewMeetingForm />
      <MeetingsList rows={initial} />
    </div>
  );
}

function NewMeetingForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [title, setTitle] = useState("");
  const [scheduledAt, setScheduledAt] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    d.setMinutes(0, 0, 0);
    return d.toISOString().slice(0, 16);
  });
  const [durationMin, setDurationMin] = useState(60);
  const [meetingUrl, setMeetingUrl] = useState("");
  const [agenda, setAgenda] = useState("");
  const [error, setError] = useState<string | null>(null);

  function submit() {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/admin/committees/hqp/meetings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title, scheduledAt: new Date(scheduledAt).toISOString(),
            durationMin, meetingUrl: meetingUrl || undefined,
            agenda: agenda || undefined,
          }),
        });
        const j = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(j.error ?? "Failed to create meeting");
        setTitle(""); setMeetingUrl(""); setAgenda("");
        router.refresh();
      } catch (e) { setError((e as Error).message); }
    });
  }

  return (
    <section className="rounded-2xl border border-line bg-card p-5 surface-shadow">
      <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-subtle mb-3">Schedule a new meeting</p>
      <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr_120px_2fr] gap-2">
        <label className="block">
          <span className="text-[10px] uppercase tracking-wider font-bold text-subtle">Title *</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="March 2026 HQP committee meeting" className="mt-1 w-full bg-card-solid border border-line rounded-lg px-3 py-2 text-sm" />
        </label>
        <label className="block">
          <span className="text-[10px] uppercase tracking-wider font-bold text-subtle">Date / time *</span>
          <input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} className="mt-1 w-full bg-card-solid border border-line rounded-lg px-2 py-2 text-sm font-mono" />
        </label>
        <label className="block">
          <span className="text-[10px] uppercase tracking-wider font-bold text-subtle">Duration (min)</span>
          <input type="number" min={15} max={480} value={durationMin} onChange={(e) => setDurationMin(Number(e.target.value))} className="mt-1 w-full bg-card-solid border border-line rounded-lg px-2 py-2 text-sm font-mono" />
        </label>
        <label className="block">
          <span className="text-[10px] uppercase tracking-wider font-bold text-subtle">Meeting URL</span>
          <input value={meetingUrl} onChange={(e) => setMeetingUrl(e.target.value)} placeholder="https://meet.google.com/abc-defg-hij" className="mt-1 w-full bg-card-solid border border-line rounded-lg px-3 py-2 text-sm font-mono" />
        </label>
      </div>
      <label className="block mt-2">
        <span className="text-[10px] uppercase tracking-wider font-bold text-subtle">Agenda (markdown, optional)</span>
        <textarea rows={3} value={agenda} onChange={(e) => setAgenda(e.target.value)} className="mt-1 w-full bg-card-solid border border-line rounded-lg px-3 py-2 text-sm" />
      </label>
      <div className="mt-3 flex items-center justify-end gap-3">
        {error && <p className="text-[11px] text-rose-700 inline-flex items-center gap-1.5"><AlertCircle size={11} /> {error}</p>}
        <button type="button" onClick={submit} disabled={pending || !title.trim()} className="inline-flex items-center gap-1.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white text-sm font-bold px-4 py-2 rounded-xl">
          {pending ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
          Schedule meeting
        </button>
      </div>
      <p className="text-[10px] text-subtle mt-2">Every active HQP member is automatically invited (status = invited). Members RSVP on the meeting page.</p>
    </section>
  );
}

function MeetingsList({ rows }: { rows: Meeting[] }) {
  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-line bg-card p-12 text-center surface-shadow">
        <CalendarClock size={28} className="text-subtle mx-auto mb-3" />
        <p className="font-medium text-fg">No meetings scheduled yet</p>
        <p className="text-sm text-muted mt-1">Use the form above to schedule the first one.</p>
      </div>
    );
  }
  return (
    <section className="rounded-2xl border border-line bg-card overflow-hidden surface-shadow">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-line text-left text-[10px] text-muted uppercase tracking-wide">
            <th className="px-5 py-3">Meeting</th>
            <th className="px-5 py-3">When (ET)</th>
            <th className="px-5 py-3">Status</th>
            <th className="px-5 py-3">Attendees / actions</th>
            <th className="px-5 py-3 w-px" />
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((m) => (
            <tr key={m.id} className="align-top">
              <td className="px-5 py-3 text-fg font-medium">{m.title}</td>
              <td className="px-5 py-3 text-muted text-xs">{fmt(m.scheduledAt)} · {m.durationMin}m</td>
              <td className="px-5 py-3">
                {m.status === "scheduled" ? <Badge tone="brand">Scheduled</Badge> :
                 m.status === "held"      ? <Badge tone="success">Held</Badge> :
                                            <Badge tone="danger">Cancelled</Badge>}
              </td>
              <td className="px-5 py-3 text-[11px] text-muted font-mono">
                {m.attendanceCount} attendees · {m.actionItemCount} action items
              </td>
              <td className="px-5 py-3">
                <Link href={`/admin/committees/hqp/meetings/${m.id}`} className="text-xs text-brand-700 hover:text-brand-900 inline-flex items-center gap-1">
                  Open <ChevronRight size={11} />
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
