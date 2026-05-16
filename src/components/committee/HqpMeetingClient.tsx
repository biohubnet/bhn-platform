"use client";
/**
 * Per-meeting client surface.
 *
 * Two roles:
 *   • member  — RSVP buttons, view agenda/notes, mark own action
 *               items in-progress / done.
 *   • admin   — edit agenda + notes inline, override attendance,
 *               create new action items, reassign.
 */
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2, Check, X, Pencil, Plus, AlertCircle, CalendarClock,
  ExternalLink, UserCheck, UserX, Hourglass, Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";

interface Attendance {
  id: string;
  userId: string;
  status: string;
  note: string | null;
  user: { id: string; name: string | null; email: string };
}

interface ActionItem {
  id: string;
  title: string;
  description: string | null;
  assignedToId: string | null;
  dueOn: string | Date | null;
  status: string;
  resolutionNote: string | null;
  assignedTo: { id: string; name: string | null } | null;
}

interface Meeting {
  id: string;
  title: string;
  scheduledAt: string | Date;
  durationMin: number;
  agenda: string | null;
  notes: string | null;
  status: string;
  meetingUrl: string | null;
}

interface Props {
  meeting: Meeting;
  attendance: Attendance[];
  actionItems: ActionItem[];
  members: Array<{ id: string; name: string | null }>;
  currentUserId: string;
  isAdmin: boolean;
}

export function HqpMeetingClient({ meeting, attendance, actionItems, members, currentUserId, isAdmin }: Props) {
  const router = useRouter();

  return (
    <div className="space-y-5">
      <MeetingHeader meeting={meeting} isAdmin={isAdmin} />
      <AgendaPanel meeting={meeting} isAdmin={isAdmin} />
      <AttendancePanel meeting={meeting} attendance={attendance} currentUserId={currentUserId} isAdmin={isAdmin} />
      <ActionItemsPanel meeting={meeting} actionItems={actionItems} members={members} currentUserId={currentUserId} isAdmin={isAdmin} />
      <NotesPanel meeting={meeting} isAdmin={isAdmin} />
    </div>
  );
}

function MeetingHeader({ meeting, isAdmin }: { meeting: Meeting; isAdmin: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function setStatus(status: string) {
    startTransition(async () => {
      await fetch(`/api/admin/committees/hqp/meetings/${meeting.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      router.refresh();
    });
  }

  const when = new Date(meeting.scheduledAt).toLocaleString("en-US", {
    timeZone: "America/Toronto",
    weekday: "long", month: "long", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit", hour12: true, timeZoneName: "short",
  });

  return (
    <section className="rounded-2xl border border-line bg-card p-5 surface-shadow">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-violet-700 inline-flex items-center gap-1.5">
            <CalendarClock size={11} /> HQP committee meeting
            {meeting.status === "scheduled" ? <Badge tone="brand">Scheduled</Badge> :
             meeting.status === "held"      ? <Badge tone="success">Held</Badge> :
                                              <Badge tone="danger">Cancelled</Badge>}
          </p>
          <h2 className="text-xl font-bold tracking-tight text-fg mt-1">{meeting.title}</h2>
          <p className="text-sm text-muted mt-1">{when} · {meeting.durationMin} min</p>
          {meeting.meetingUrl && (
            <a href={meeting.meetingUrl} target="_blank" rel="noreferrer" className="text-[12px] font-mono text-brand-700 hover:text-brand-900 inline-flex items-center gap-1 mt-1">
              <ExternalLink size={11} /> {meeting.meetingUrl}
            </a>
          )}
        </div>
        {isAdmin && (
          <div className="flex items-center gap-2 shrink-0">
            {meeting.status === "scheduled" && (
              <>
                <button type="button" onClick={() => setStatus("held")} disabled={pending} className="text-xs text-emerald-700 hover:text-emerald-900">Mark held</button>
                <button type="button" onClick={() => setStatus("cancelled")} disabled={pending} className="text-xs text-rose-700 hover:text-rose-900">Cancel</button>
              </>
            )}
            {meeting.status !== "scheduled" && (
              <button type="button" onClick={() => setStatus("scheduled")} disabled={pending} className="text-xs text-brand-700 hover:text-brand-900">Re-schedule</button>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

function AgendaPanel({ meeting, isAdmin }: { meeting: Meeting; isAdmin: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(meeting.agenda ?? "");

  function save() {
    startTransition(async () => {
      await fetch(`/api/admin/committees/hqp/meetings/${meeting.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agenda: text }),
      });
      setEditing(false);
      router.refresh();
    });
  }

  return (
    <section className="rounded-2xl border border-line bg-card p-5 surface-shadow space-y-3">
      <header className="flex items-center justify-between">
        <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-subtle">Agenda</p>
        {isAdmin && !editing && (
          <button type="button" onClick={() => setEditing(true)} className="text-xs text-muted hover:text-fg inline-flex items-center gap-1">
            <Pencil size={11} /> Edit
          </button>
        )}
      </header>
      {editing ? (
        <div className="space-y-2">
          <textarea rows={6} value={text} onChange={(e) => setText(e.target.value)} placeholder="Markdown supported" className="w-full bg-card-solid border border-line rounded-lg px-3 py-2 text-sm font-mono" />
          <div className="flex items-center justify-end gap-2">
            <button type="button" onClick={() => { setEditing(false); setText(meeting.agenda ?? ""); }} className="text-xs text-muted hover:text-fg">Cancel</button>
            <button type="button" onClick={save} disabled={pending} className="bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white text-xs font-bold px-3 py-1.5 rounded-lg">
              {pending ? <Loader2 size={11} className="animate-spin" /> : "Save"}
            </button>
          </div>
        </div>
      ) : meeting.agenda ? (
        <pre className="text-sm text-fg whitespace-pre-wrap font-sans">{meeting.agenda}</pre>
      ) : (
        <p className="text-xs text-subtle italic">No agenda set yet.</p>
      )}
    </section>
  );
}

function NotesPanel({ meeting, isAdmin }: { meeting: Meeting; isAdmin: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(meeting.notes ?? "");

  function save() {
    startTransition(async () => {
      await fetch(`/api/admin/committees/hqp/meetings/${meeting.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: text }),
      });
      setEditing(false);
      router.refresh();
    });
  }

  return (
    <section className="rounded-2xl border border-line bg-card p-5 surface-shadow space-y-3">
      <header className="flex items-center justify-between">
        <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-subtle">Meeting notes</p>
        {isAdmin && !editing && (
          <button type="button" onClick={() => setEditing(true)} className="text-xs text-muted hover:text-fg inline-flex items-center gap-1">
            <Pencil size={11} /> Edit
          </button>
        )}
      </header>
      {editing ? (
        <div className="space-y-2">
          <textarea rows={10} value={text} onChange={(e) => setText(e.target.value)} placeholder="Markdown supported. Capture the discussion + any decisions made." className="w-full bg-card-solid border border-line rounded-lg px-3 py-2 text-sm font-mono" />
          <div className="flex items-center justify-end gap-2">
            <button type="button" onClick={() => { setEditing(false); setText(meeting.notes ?? ""); }} className="text-xs text-muted hover:text-fg">Cancel</button>
            <button type="button" onClick={save} disabled={pending} className="bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white text-xs font-bold px-3 py-1.5 rounded-lg">
              {pending ? <Loader2 size={11} className="animate-spin" /> : "Save"}
            </button>
          </div>
        </div>
      ) : meeting.notes ? (
        <pre className="text-sm text-fg whitespace-pre-wrap font-sans">{meeting.notes}</pre>
      ) : (
        <p className="text-xs text-subtle italic">No notes posted yet — they go up after the meeting.</p>
      )}
    </section>
  );
}

function AttendancePanel({ meeting, attendance, currentUserId, isAdmin }: { meeting: Meeting; attendance: Attendance[]; currentUserId: string; isAdmin: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function rsvp(userId: string, status: string) {
    startTransition(async () => {
      await fetch(`/api/committee/hqp/meetings/${meeting.id}/attendance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, userId: isAdmin ? userId : undefined }),
      });
      router.refresh();
    });
  }

  const myRow = attendance.find((a) => a.userId === currentUserId);
  const myStatus = myRow?.status ?? "invited";

  return (
    <section className="rounded-2xl border border-line bg-card p-5 surface-shadow space-y-3">
      <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-subtle">Attendance</p>

      {/* RSVP buttons for the current user */}
      <div className="rounded-xl bg-elevated/40 border border-line p-3 flex items-center justify-between gap-3 flex-wrap">
        <p className="text-xs text-fg">
          You: <strong>{statusLabel(myStatus)}</strong>
        </p>
        <div className="flex items-center gap-1">
          {(["attending", "declined", "attended"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => rsvp(currentUserId, s)}
              disabled={pending}
              className={
                "text-xs font-semibold px-3 py-1.5 rounded-lg disabled:opacity-50 " +
                (myStatus === s ? "bg-violet-600 text-white" : "bg-card text-fg border border-line hover:border-line-strong")
              }
            >
              {s === "attending" ? "I'm in" : s === "declined" ? "Can't make it" : "Attended"}
            </button>
          ))}
        </div>
      </div>

      <ul className="space-y-1.5">
        {attendance.map((a) => (
          <li key={a.id} className="flex items-center gap-3 text-sm">
            <span className="text-fg flex-1 truncate">{a.user.name ?? a.user.email}</span>
            {a.status === "attending" && <Badge tone="brand">Attending</Badge>}
            {a.status === "attended"  && <Badge tone="success">Attended</Badge>}
            {a.status === "declined"  && <Badge tone="danger">Declined</Badge>}
            {a.status === "absent"    && <Badge tone="warning">Absent</Badge>}
            {a.status === "invited"   && <Badge tone="neutral">Invited</Badge>}
            {isAdmin && (
              <div className="flex items-center gap-1">
                <button type="button" onClick={() => rsvp(a.userId, "attended")} className="text-emerald-700 hover:text-emerald-900" title="Mark attended"><UserCheck size={12} /></button>
                <button type="button" onClick={() => rsvp(a.userId, "absent")} className="text-rose-700 hover:text-rose-900" title="Mark absent"><UserX size={12} /></button>
                <button type="button" onClick={() => rsvp(a.userId, "invited")} className="text-muted hover:text-fg" title="Reset"><Hourglass size={12} /></button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

function statusLabel(s: string): string {
  if (s === "attending") return "Attending";
  if (s === "attended")  return "Attended";
  if (s === "declined")  return "Declined";
  if (s === "absent")    return "Absent";
  return "Invited";
}

function ActionItemsPanel({
  meeting, actionItems, members, currentUserId, isAdmin,
}: {
  meeting: Meeting; actionItems: ActionItem[]; members: Array<{ id: string; name: string | null }>; currentUserId: string; isAdmin: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [assigned, setAssigned] = useState<string>("");
  const [dueOn, setDueOn] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  function create() {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/admin/committees/hqp/action-items", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title, description: desc || undefined,
            meetingId: meeting.id,
            assignedToId: assigned || undefined,
            dueOn: dueOn || undefined,
          }),
        });
        const j = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(j.error ?? "Failed to create");
        setTitle(""); setDesc(""); setAssigned(""); setDueOn("");
        setCreating(false);
        router.refresh();
      } catch (e) { setError((e as Error).message); }
    });
  }

  function setStatus(id: string, status: string) {
    startTransition(async () => {
      await fetch(`/api/committee/hqp/action-items/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      router.refresh();
    });
  }

  return (
    <section className="rounded-2xl border border-line bg-card p-5 surface-shadow space-y-3">
      <header className="flex items-center justify-between">
        <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-subtle">Action items</p>
        {isAdmin && !creating && (
          <button type="button" onClick={() => setCreating(true)} className="text-xs text-brand-700 hover:text-brand-900 inline-flex items-center gap-1">
            <Plus size={11} /> Add action item
          </button>
        )}
      </header>

      {creating && (
        <div className="rounded-xl border border-line bg-card-solid p-3 space-y-2">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" className="w-full bg-card-solid border border-line rounded-lg px-3 py-1.5 text-sm" />
          <textarea rows={2} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Description (optional)" className="w-full bg-card-solid border border-line rounded-lg px-3 py-1.5 text-xs" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <select value={assigned} onChange={(e) => setAssigned(e.target.value)} className="w-full bg-card-solid border border-line rounded-lg px-2 py-1.5 text-xs">
              <option value="">— Unassigned —</option>
              {members.map((m) => <option key={m.id} value={m.id}>{m.name ?? m.id}</option>)}
            </select>
            <input type="date" value={dueOn} onChange={(e) => setDueOn(e.target.value)} className="w-full bg-card-solid border border-line rounded-lg px-2 py-1.5 text-xs font-mono" />
          </div>
          <div className="flex items-center justify-end gap-2">
            {error && <p className="text-[11px] text-rose-700">{error}</p>}
            <button type="button" onClick={() => setCreating(false)} className="text-xs text-muted hover:text-fg">Cancel</button>
            <button type="button" onClick={create} disabled={pending || !title.trim()} className="bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white text-xs font-bold px-3 py-1.5 rounded-lg">
              {pending ? <Loader2 size={11} className="animate-spin" /> : "Create"}
            </button>
          </div>
        </div>
      )}

      {actionItems.length === 0 ? (
        <p className="text-xs text-subtle italic">No action items captured yet.</p>
      ) : (
        <ul className="space-y-2">
          {actionItems.map((a) => {
            const isMine = a.assignedToId === currentUserId;
            const canEdit = isAdmin || isMine;
            return (
              <li key={a.id} className="rounded-xl border border-line bg-card-solid p-3 flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-fg">{a.title}</p>
                    {a.status === "open"        && <Badge tone="amber">Open</Badge>}
                    {a.status === "in_progress" && <Badge tone="brand">In progress</Badge>}
                    {a.status === "done"        && <Badge tone="success">Done</Badge>}
                    {a.status === "cancelled"   && <Badge tone="danger">Cancelled</Badge>}
                  </div>
                  {a.description && <p className="text-[12px] text-muted mt-1">{a.description}</p>}
                  <p className="text-[11px] text-subtle font-mono mt-1">
                    Assigned to {a.assignedTo?.name ?? "—"}
                    {a.dueOn && ` · due ${new Date(a.dueOn).toLocaleDateString()}`}
                  </p>
                </div>
                {canEdit && a.status !== "done" && a.status !== "cancelled" && (
                  <div className="flex items-center gap-1 shrink-0">
                    {a.status === "open" && (
                      <button type="button" onClick={() => setStatus(a.id, "in_progress")} disabled={pending} className="text-xs text-brand-700 hover:text-brand-900">Start</button>
                    )}
                    <button type="button" onClick={() => setStatus(a.id, "done")} disabled={pending} className="text-xs text-emerald-700 hover:text-emerald-900 inline-flex items-center gap-1">
                      <Check size={11} /> Done
                    </button>
                    {isAdmin && (
                      <button type="button" onClick={() => setStatus(a.id, "cancelled")} disabled={pending} className="text-xs text-rose-700 hover:text-rose-900 inline-flex items-center gap-1">
                        <Trash2 size={11} />
                      </button>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
