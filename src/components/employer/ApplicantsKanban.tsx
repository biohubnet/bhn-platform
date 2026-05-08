"use client";
/**
 * Per-posting applicant kanban with skill-match scoring.
 *
 *   - Six columns: New / Reviewing / Shortlisted / Phone Screen /
 *     Onsite / Offer (Hired and Rejected collapsed at the bottom).
 *   - Each card shows score, top matched skills, completed-course count.
 *   - Click a card to open a side drawer with full skill breakdown,
 *     notes, rating, and the "schedule interview" launcher.
 */
import { useEffect, useMemo, useState } from "react";
import {
  Sparkles, ChevronRight, X, BookOpen, Star, Calendar, MessageSquare, GraduationCap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { InterviewSchedulerDialog } from "./InterviewSchedulerDialog";

interface Applicant {
  applicantId: string;
  submissionId: string;
  submittedAt: string;
  name: string | null;
  email: string;
  country: string | null;
  score: number;
  matched: number;
  missingRequired: number;
  completedCourses: number;
  status: string;
  rating: number | null;
  notes: string | null;
  interview: { status: string; acceptedSlot: string | null; proposedSlots: unknown } | null;
  topSkills: { name: string; category: string | null; level: number; source: string }[];
}

type StatusKey =
  | "new" | "reviewing" | "shortlisted" | "phone_screen"
  | "onsite" | "offer" | "hired" | "rejected" | "closed";

const COLUMNS: { id: StatusKey; label: string; tone: string }[] = [
  { id: "new",          label: "New",          tone: "bg-card-solid border-line text-muted" },
  { id: "reviewing",    label: "Reviewing",    tone: "bg-brand-50 border-brand-200 text-brand-700" },
  { id: "shortlisted",  label: "Shortlisted",  tone: "bg-emerald-50 border-emerald-200 text-emerald-700" },
  { id: "phone_screen", label: "Phone screen", tone: "bg-amber-50 border-amber-200 text-amber-800" },
  { id: "onsite",       label: "Onsite",       tone: "bg-amber-50 border-amber-200 text-amber-800" },
  { id: "offer",        label: "Offer",        tone: "bg-violet-50 border-violet-200 text-violet-700" },
];

const COLLAPSED: { id: StatusKey; label: string }[] = [
  { id: "hired",    label: "Hired" },
  { id: "rejected", label: "Rejected" },
  { id: "closed",   label: "Closed" },
];

export function ApplicantsKanban({ postingId }: { postingId: string }) {
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawer, setDrawer] = useState<Applicant | null>(null);
  const [interviewing, setInterviewing] = useState<Applicant | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const r = await fetch(`/api/employer/applications?postingId=${postingId}`, { cache: "no-store" });
      const j = await r.json();
      setApplicants(j.applicants ?? []);
    } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, [postingId]);

  const grouped = useMemo(() => {
    const m = new Map<StatusKey, Applicant[]>();
    for (const a of applicants) {
      const k = (a.status as StatusKey) ?? "new";
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(a);
    }
    return m;
  }, [applicants]);

  async function setStatus(a: Applicant, status: StatusKey) {
    setBusy(true);
    try {
      await fetch("/api/employer/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postingId, applicantId: a.applicantId, status }),
      });
      setApplicants((cur) => cur.map((c) => (c.applicantId === a.applicantId ? { ...c, status } : c)));
    } finally { setBusy(false); }
  }

  if (loading) {
    return <p className="text-sm text-muted text-center py-12">Loading applicants…</p>;
  }
  if (applicants.length === 0) {
    return (
      <div className="bg-card border border-line rounded-2xl p-12 text-center">
        <p className="text-sm text-muted">No applicants yet for this posting.</p>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto pb-4">
        <div className="inline-flex gap-3 min-w-full">
          {COLUMNS.map((col) => {
            const items = grouped.get(col.id) ?? [];
            return (
              <div key={col.id} className="w-[280px] shrink-0">
                <div className={cn("rounded-lg border px-3 py-2 mb-2 flex items-center justify-between", col.tone)}>
                  <span className="text-xs font-semibold uppercase tracking-wider">{col.label}</span>
                  <span className="text-xs tabular-nums opacity-80">{items.length}</span>
                </div>
                <div className="space-y-2">
                  {items.map((a) => (
                    <ApplicantCard
                      key={a.applicantId}
                      a={a}
                      onOpen={() => setDrawer(a)}
                      onMove={(s) => setStatus(a, s)}
                      busy={busy}
                    />
                  ))}
                  {items.length === 0 && (
                    <p className="text-[11px] text-subtle px-2 py-3 text-center italic">empty</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Collapsed terminal columns */}
      <details className="mt-4">
        <summary className="cursor-pointer text-xs text-muted hover:text-fg select-none">
          Closed: {COLLAPSED.reduce((acc, c) => acc + (grouped.get(c.id)?.length ?? 0), 0)} applicant(s)
        </summary>
        <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
          {COLLAPSED.map((col) => (
            <div key={col.id}>
              <p className="text-[10px] uppercase tracking-wider text-subtle font-semibold mb-1.5">{col.label}</p>
              <div className="space-y-1.5">
                {(grouped.get(col.id) ?? []).map((a) => (
                  <ApplicantCard key={a.applicantId} a={a} onOpen={() => setDrawer(a)} onMove={(s) => setStatus(a, s)} busy={busy} compact />
                ))}
              </div>
            </div>
          ))}
        </div>
      </details>

      {drawer && (
        <Drawer
          a={drawer}
          onClose={() => setDrawer(null)}
          onChange={(patch) => {
            setApplicants((cur) => cur.map((c) => (c.applicantId === drawer.applicantId ? { ...c, ...patch } : c)));
            setDrawer((d) => (d ? { ...d, ...patch } : d));
          }}
          postingId={postingId}
          onScheduleInterview={() => setInterviewing(drawer)}
        />
      )}

      {interviewing && (
        <InterviewSchedulerDialog
          postingId={postingId}
          applicantId={interviewing.applicantId}
          applicantName={interviewing.name ?? interviewing.email}
          onClose={() => setInterviewing(null)}
          onScheduled={() => { setInterviewing(null); load(); }}
        />
      )}
    </>
  );
}

function ApplicantCard({
  a, onOpen, onMove, busy, compact,
}: {
  a: Applicant;
  onOpen: () => void;
  onMove: (s: StatusKey) => void;
  busy: boolean;
  compact?: boolean;
}) {
  const tone = a.score >= 70 ? "emerald" : a.score >= 40 ? "amber" : "rose";
  return (
    <div
      className={cn(
        "bg-card border border-line rounded-lg p-2.5 hover:border-brand-200 transition-colors cursor-pointer group",
        compact && "p-2",
      )}
      onClick={onOpen}
    >
      <div className="flex items-center gap-2 mb-1">
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-white text-[10px] flex items-center justify-center font-bold shrink-0">
          {(a.name ?? a.email)[0]?.toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-fg truncate">{a.name ?? a.email}</p>
          {!compact && a.country && <p className="text-[11px] text-subtle truncate">{a.country}</p>}
        </div>
        <div className={cn(
          "rounded-md px-1.5 py-0.5 text-[11px] font-bold tabular-nums shrink-0",
          tone === "emerald" ? "bg-emerald-100 text-emerald-800"
        : tone === "amber"   ? "bg-amber-100 text-amber-800"
                             : "bg-rose-100 text-rose-700",
        )}>
          {a.score}
        </div>
      </div>
      {!compact && (
        <>
          <p className="text-[11px] text-muted mt-1.5">
            <Sparkles size={9} className="inline -mt-0.5 mr-0.5" /> {a.matched} skills
            {a.completedCourses > 0 && (
              <> · <BookOpen size={9} className="inline -mt-0.5 mr-0.5" /> {a.completedCourses} courses</>
            )}
            {a.interview && (
              <> · <Calendar size={9} className="inline -mt-0.5 mr-0.5 text-amber-700" /> interview</>
            )}
          </p>
          {a.topSkills.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {a.topSkills.slice(0, 3).map((s) => (
                <span key={s.name} className="text-[10px] bg-elevated text-muted border border-line rounded px-1.5 py-0.5">
                  {s.name}
                </span>
              ))}
              {a.topSkills.length > 3 && (
                <span className="text-[10px] text-subtle">+{a.topSkills.length - 3}</span>
              )}
            </div>
          )}
        </>
      )}
      <div className="mt-2 flex items-center justify-between gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <select
          value={a.status}
          onChange={(e) => { e.stopPropagation(); onMove(e.target.value as StatusKey); }}
          onClick={(e) => e.stopPropagation()}
          disabled={busy}
          className="text-[10px] bg-card-solid border border-line rounded px-1.5 py-0.5 focus:outline-none"
        >
          {[...COLUMNS, ...COLLAPSED].map((c) => (
            <option key={c.id} value={c.id}>{c.label}</option>
          ))}
        </select>
        <ChevronRight size={11} className="text-subtle" />
      </div>
    </div>
  );
}

function Drawer({
  a, onClose, onChange, postingId, onScheduleInterview,
}: {
  a: Applicant;
  onClose: () => void;
  onChange: (patch: Partial<Applicant>) => void;
  postingId: string;
  onScheduleInterview: () => void;
}) {
  const [notes, setNotes] = useState(a.notes ?? "");
  const [rating, setRating] = useState(a.rating ?? 0);
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    try {
      const r = await fetch("/api/employer/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postingId, applicantId: a.applicantId, notes, rating: rating || undefined }),
      });
      if (r.ok) onChange({ notes, rating: rating || null });
    } finally { setBusy(false); }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-stretch justify-end bg-backdrop animate-fade-in" onClick={onClose}>
      <div className="bg-card-solid w-full max-w-lg h-full overflow-y-auto p-6 border-l border-line animate-slide-up-in" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="text-subtle hover:text-fg float-right p-1"><X size={16} /></button>
        <h2 className="text-xl font-bold text-fg">{a.name ?? a.email}</h2>
        <p className="text-sm text-muted">{a.email}{a.country ? ` · ${a.country}` : ""}</p>

        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <div className="bg-elevated/60 rounded-lg p-2"><p className="text-2xl font-bold tabular-nums">{a.score}</p><p className="text-[10px] uppercase tracking-wider text-subtle">match</p></div>
          <div className="bg-elevated/60 rounded-lg p-2"><p className="text-2xl font-bold tabular-nums">{a.matched}</p><p className="text-[10px] uppercase tracking-wider text-subtle">skills hit</p></div>
          <div className="bg-elevated/60 rounded-lg p-2"><p className="text-2xl font-bold tabular-nums">{a.completedCourses}</p><p className="text-[10px] uppercase tracking-wider text-subtle">courses</p></div>
        </div>

        <div className="mt-5">
          <p className="text-[10px] uppercase tracking-[0.22em] text-subtle font-semibold mb-1.5 inline-flex items-center gap-1">
            <Sparkles size={10} className="text-brand-600" /> Top skills
          </p>
          <div className="flex flex-wrap gap-1.5">
            {a.topSkills.length === 0 && <p className="text-xs text-subtle">No skill profile yet.</p>}
            {a.topSkills.map((s) => (
              <span key={s.name} className="text-[11px] inline-flex items-center gap-1 bg-elevated text-fg rounded-full px-2 py-0.5 border border-line">
                {s.name}
                {s.source === "inferred" && <GraduationCap size={9} className="text-brand-600" />}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-5">
          <p className="text-[10px] uppercase tracking-[0.22em] text-subtle font-semibold mb-1.5">Rating</p>
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                onClick={() => setRating(rating === n ? 0 : n)}
                className="text-amber-500 hover:text-amber-600"
                aria-label={`${n} star${n === 1 ? "" : "s"}`}
              >
                <Star size={20} fill={n <= rating ? "currentColor" : "transparent"} />
              </button>
            ))}
            {rating > 0 && <button className="text-[10px] text-subtle ml-2 hover:text-fg" onClick={() => setRating(0)}>clear</button>}
          </div>
        </div>

        <div className="mt-5">
          <p className="text-[10px] uppercase tracking-[0.22em] text-subtle font-semibold mb-1.5 inline-flex items-center gap-1">
            <MessageSquare size={10} /> Private notes
          </p>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            placeholder="What stood out? Concerns? Questions for the screen call?"
            className="w-full text-sm bg-card border border-line rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
          />
        </div>

        <div className="mt-5 flex items-center gap-2">
          <button
            onClick={save}
            disabled={busy}
            className="text-xs font-semibold px-4 py-2 rounded-lg bg-brand-600 text-white border border-brand-700 hover:bg-brand-700 disabled:opacity-60"
          >
            Save
          </button>
          <button
            onClick={onScheduleInterview}
            className="text-xs font-semibold px-4 py-2 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 inline-flex items-center gap-1.5"
          >
            <Calendar size={12} /> Schedule interview
          </button>
        </div>

        {a.interview && (
          <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs">
            <p className="font-semibold text-amber-900">Interview {a.interview.status}</p>
            {a.interview.acceptedSlot && (
              <p className="text-amber-800 mt-0.5">Confirmed for {new Date(a.interview.acceptedSlot).toLocaleString()}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
