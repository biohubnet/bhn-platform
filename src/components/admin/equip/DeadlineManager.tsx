"use client";
/**
 * Admin manager for Equip funding-window deadlines.
 *
 * Two views toggled by tab:
 *   • List view — table grouped by stream, sortable by date.
 *                 Per-row actions: extend / close / reopen / delete.
 *   • Calendar view — month-grid of upcoming windows. Click a
 *                 day to create a new deadline at that date
 *                 with the default 12:00 PM ET time.
 *
 * Both views call the same /api/admin/equip/deadlines endpoints.
 */
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2, Plus, Trash2, Lock, Unlock, FastForward, Pencil, X,
  Calendar, List, AlertCircle, ChevronLeft, ChevronRight,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { holidayDateSet } from "@/lib/equip/calendar";

interface Deadline {
  id: string;
  stream: string;
  deadlineAt: string | Date;
  originalDeadlineAt: string | Date;
  status: string;
  cycleLabel: string | null;
  note: string | null;
  closedAt: string | Date | null;
  extendedAt: string | Date | null;
  createdAt: string | Date;
}

interface Props {
  initial: Deadline[];
}

const STREAM_META: Record<string, { label: string; cap: string; tone: "brand" | "success" }> = {
  venture_connect: { label: "VentureConnect", cap: "≤$5,000 / monthly cycle",  tone: "brand" },
  venture_lift:    { label: "VentureLift",    cap: "≤$25,000 / quarterly cycle", tone: "success" },
};

/** Build the ISO string for noon Eastern on the given calendar date.
 *  Toronto is UTC-5 EST / UTC-4 EDT — we ask the browser to compute
 *  this so DST is handled automatically. The result is the same
 *  absolute UTC instant whether we ship it locally or on Vercel. */
/** Flatten the UOFT_HOLIDAYS list into a Record keyed by Toronto
 *  yyyy-mm-dd so the calendar's per-cell lookup is O(1).
 *  Memoised at module level — the holiday schedule is static
 *  data, no need to recompute per render. */
const _HOLIDAYS_BY_DATE: Record<string, { name: string; presidential?: boolean }> = (() => {
  const out: Record<string, { name: string; presidential?: boolean }> = {};
  const m = holidayDateSet();
  m.forEach((h, key) => {
    out[key] = { name: h.name, presidential: h.presidential };
  });
  return out;
})();
function holidaysByDateRecord() { return _HOLIDAYS_BY_DATE; }

function noonEasternIso(yyyymmdd: string): string {
  // Strategy: build a Date by interpreting "yyyy-mm-ddT12:00:00" in
  // the America/Toronto zone. We do this by:
  //   1. Construct a Date assuming local zone with the same wall
  //      clock.
  //   2. Get its Toronto offset via Intl.DateTimeFormat.
  //   3. Adjust.
  // Simpler: use the toLocaleString tz round-trip trick.
  const [y, m, d] = yyyymmdd.split("-").map((s) => parseInt(s, 10));
  // Start with "noon-ish" in UTC; we'll iterate-adjust if the
  // resulting Toronto wall-clock isn't 12:00.
  let candidate = new Date(Date.UTC(y, m - 1, d, 17, 0, 0)); // noon EST = 17:00 UTC
  // Verify by reading back what Toronto sees.
  const torontoHour = parseInt(
    candidate.toLocaleString("en-US", { timeZone: "America/Toronto", hour: "numeric", hourCycle: "h23" }),
    10,
  );
  // If DST in effect, Toronto sees 13:00 — back off by 1h.
  if (torontoHour === 13) {
    candidate = new Date(candidate.getTime() - 60 * 60 * 1000);
  } else if (torontoHour === 11) {
    candidate = new Date(candidate.getTime() + 60 * 60 * 1000);
  }
  return candidate.toISOString();
}

function formatTorontoForDisplay(dateLike: string | Date): string {
  const date = typeof dateLike === "string" ? new Date(dateLike) : dateLike;
  return date.toLocaleString("en-US", {
    timeZone: "America/Toronto",
    weekday: "short", month: "short", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit", hour12: true, timeZoneName: "short",
  });
}

export function DeadlineManager({ initial }: Props) {
  const [tab, setTab] = useState<"list" | "calendar">("list");

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        {([
          { id: "list",     icon: List,     label: "List" },
          { id: "calendar", icon: Calendar, label: "Calendar" },
        ] as const).map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={
                "inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors " +
                (active
                  ? "bg-brand-600 text-white border-brand-600"
                  : "bg-card text-muted border-line hover:border-line-strong")
              }
            >
              <Icon size={13} /> {t.label}
            </button>
          );
        })}
      </div>

      <NewDeadlineForm />

      {tab === "list"     ? <ListView     deadlines={initial} /> : null}
      {tab === "calendar" ? <CalendarView deadlines={initial} holidaysByDate={holidaysByDateRecord()} /> : null}
    </div>
  );
}

function NewDeadlineForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [stream, setStream] = useState("venture_connect");
  const [date, setDate] = useState<string>(() => {
    // Default to next-month-end for convenience.
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    return d.toISOString().slice(0, 10);
  });
  const [time, setTime] = useState("12:00");
  const [cycleLabel, setCycleLabel] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  function submit() {
    setError(null);
    let deadlineIso: string;
    if (time === "12:00") {
      deadlineIso = noonEasternIso(date);
    } else {
      // Custom time — interpret as Toronto local wall-clock by
      // building an ISO that we'll feed through the same tz-shift
      // adjustment as noonEasternIso.
      const [hh, mm] = time.split(":").map((s) => parseInt(s, 10));
      const [y, m, d] = date.split("-").map((s) => parseInt(s, 10));
      let candidate = new Date(Date.UTC(y, m - 1, d, hh + 5, mm, 0));
      const torontoHour = parseInt(
        candidate.toLocaleString("en-US", { timeZone: "America/Toronto", hour: "numeric", hourCycle: "h23" }),
        10,
      );
      if (torontoHour === hh + 1) {
        candidate = new Date(candidate.getTime() - 60 * 60 * 1000);
      } else if (torontoHour === hh - 1) {
        candidate = new Date(candidate.getTime() + 60 * 60 * 1000);
      }
      deadlineIso = candidate.toISOString();
    }
    startTransition(async () => {
      try {
        const res = await fetch("/api/admin/equip/deadlines", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ stream, deadlineAt: deadlineIso, cycleLabel: cycleLabel || undefined, note: note || undefined }),
        });
        const j = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(j.error ?? "Failed to create deadline.");
        setCycleLabel("");
        setNote("");
        router.refresh();
      } catch (e) {
        setError((e as Error).message);
      }
    });
  }

  return (
    <section className="rounded-2xl border border-line bg-card p-5 surface-shadow">
      <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-subtle mb-3">Create a new funding window</p>
      <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto_1fr_1fr_auto] gap-2 items-end">
        <label className="block">
          <span className="text-[10px] uppercase tracking-wider font-bold text-subtle">Stream</span>
          <select
            value={stream}
            onChange={(e) => setStream(e.target.value)}
            className="mt-1 w-full bg-card-solid border border-line rounded-lg px-2 py-2 text-sm"
          >
            <option value="venture_connect">VentureConnect</option>
            <option value="venture_lift">VentureLift</option>
          </select>
        </label>
        <label className="block">
          <span className="text-[10px] uppercase tracking-wider font-bold text-subtle">Date</span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="mt-1 w-full bg-card-solid border border-line rounded-lg px-2 py-2 text-sm"
          />
        </label>
        <label className="block">
          <span className="text-[10px] uppercase tracking-wider font-bold text-subtle">Time (ET)</span>
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="mt-1 w-full bg-card-solid border border-line rounded-lg px-2 py-2 text-sm font-mono"
          />
        </label>
        <label className="block">
          <span className="text-[10px] uppercase tracking-wider font-bold text-subtle">Cycle label (optional)</span>
          <input
            type="text"
            placeholder="May 2026 cycle"
            value={cycleLabel}
            onChange={(e) => setCycleLabel(e.target.value)}
            className="mt-1 w-full bg-card-solid border border-line rounded-lg px-3 py-2 text-sm"
          />
        </label>
        <label className="block">
          <span className="text-[10px] uppercase tracking-wider font-bold text-subtle">Note (optional)</span>
          <input
            type="text"
            placeholder="Moved from May 1 because of the holiday Monday"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="mt-1 w-full bg-card-solid border border-line rounded-lg px-3 py-2 text-sm"
          />
        </label>
        <button
          type="button"
          onClick={submit}
          disabled={pending}
          className="inline-flex items-center gap-1.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white text-sm font-bold px-4 py-2 rounded-xl"
        >
          {pending ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
          Add window
        </button>
      </div>
      {error && (
        <p className="text-[11px] text-rose-700 inline-flex items-center gap-1.5 mt-3">
          <AlertCircle size={11} /> {error}
        </p>
      )}
      <p className="text-[11px] text-subtle mt-3">
        Time defaults to <strong>12:00 PM Eastern</strong> on the chosen date — the standard noon-EST cut-off from the PDFs. Adjust the time field above if you need an off-hours deadline. DST is handled automatically.
      </p>
    </section>
  );
}

function ListView({ deadlines }: { deadlines: Deadline[] }) {
  const byStream = useMemo(() => {
    const acc: Record<string, Deadline[]> = { venture_connect: [], venture_lift: [] };
    for (const d of deadlines) {
      (acc[d.stream] ?? (acc[d.stream] = [])).push(d);
    }
    return acc;
  }, [deadlines]);

  if (deadlines.length === 0) {
    return (
      <div className="rounded-2xl border border-line bg-card p-12 text-center surface-shadow">
        <p className="font-medium text-fg">No deadlines yet</p>
        <p className="text-sm text-muted mt-1">Create your first funding window using the form above.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {Object.entries(byStream).map(([stream, rows]) => {
        if (rows.length === 0) return null;
        const meta = STREAM_META[stream] ?? { label: stream, cap: "", tone: "brand" as const };
        return (
          <section key={stream} className="rounded-2xl border border-line bg-card overflow-hidden surface-shadow">
            <header className="px-5 py-3 border-b border-line flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-fg">{meta.label}</h3>
                <p className="text-[11px] text-subtle">{meta.cap}</p>
              </div>
              <Badge tone={meta.tone}>{rows.length}</Badge>
            </header>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-[10px] text-muted uppercase tracking-wide">
                  <th className="px-5 py-3">Deadline (ET)</th>
                  <th className="px-5 py-3">Cycle</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Note</th>
                  <th className="px-5 py-3 w-px">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((d) => (
                  <DeadlineRow key={d.id} d={d} />
                ))}
              </tbody>
            </table>
          </section>
        );
      })}
    </div>
  );
}

function DeadlineRow({ d }: { d: Deadline }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [mode, setMode] = useState<"idle" | "extend" | "close" | "edit">("idle");
  const [newDate, setNewDate] = useState(() => {
    const next = new Date(d.deadlineAt);
    next.setDate(next.getDate() + 7);
    return next.toISOString().slice(0, 10);
  });
  const [newTime, setNewTime] = useState("12:00");
  const [closeNote, setCloseNote] = useState("");
  const [cycleLabel, setCycleLabel] = useState(d.cycleLabel ?? "");
  const [note, setNote] = useState(d.note ?? "");
  const [error, setError] = useState<string | null>(null);

  const past = new Date(d.deadlineAt).getTime() < Date.now();

  function mutate(body: Record<string, unknown>) {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch(`/api/admin/equip/deadlines/${d.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const j = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(j.error ?? "Action failed");
        setMode("idle");
        router.refresh();
      } catch (e) {
        setError((e as Error).message);
      }
    });
  }

  function del() {
    if (!confirm("Delete this deadline? This is permanent. Any audit trail in the audit log survives.")) return;
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch(`/api/admin/equip/deadlines/${d.id}`, { method: "DELETE" });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j.error ?? "Delete failed");
        }
        router.refresh();
      } catch (e) {
        setError((e as Error).message);
      }
    });
  }

  const statusBadge =
    d.status === "open"     ? <Badge tone="success">Open</Badge> :
    d.status === "extended" ? <Badge tone="brand">Extended</Badge> :
    d.status === "closed"   ? <Badge tone="danger">Closed</Badge> :
                              <Badge tone="neutral">{d.status}</Badge>;

  return (
    <>
      <tr className={"align-top " + (past && d.status !== "closed" ? "opacity-70" : "")}>
        <td className="px-5 py-3">
          <p className="text-fg font-medium">{formatTorontoForDisplay(d.deadlineAt)}</p>
          {d.extendedAt && (
            <p className="text-[11px] text-subtle">
              Originally {formatTorontoForDisplay(d.originalDeadlineAt)}
            </p>
          )}
        </td>
        <td className="px-5 py-3 text-muted">{d.cycleLabel ?? "—"}</td>
        <td className="px-5 py-3">{statusBadge}{past && d.status !== "closed" && <span className="ml-2 text-[10px] text-subtle">(date passed)</span>}</td>
        <td className="px-5 py-3 text-muted text-xs max-w-xs">
          <p className="line-clamp-2">{d.note ?? "—"}</p>
        </td>
        <td className="px-5 py-3">
          <div className="flex items-center gap-1 flex-wrap">
            {d.status !== "closed" && (
              <button
                type="button"
                onClick={() => setMode(mode === "extend" ? "idle" : "extend")}
                className="text-xs text-brand-700 hover:text-brand-900 inline-flex items-center gap-1"
                title="Extend the deadline"
              >
                <FastForward size={11} /> Extend
              </button>
            )}
            {d.status !== "closed" ? (
              <button
                type="button"
                onClick={() => setMode(mode === "close" ? "idle" : "close")}
                className="text-xs text-rose-700 hover:text-rose-900 inline-flex items-center gap-1"
                title="Close this window"
              >
                <Lock size={11} /> Close
              </button>
            ) : (
              <button
                type="button"
                onClick={() => mutate({ action: "reopen" })}
                disabled={pending}
                className="text-xs text-emerald-700 hover:text-emerald-900 inline-flex items-center gap-1 disabled:opacity-50"
              >
                {pending ? <Loader2 size={11} className="animate-spin" /> : <Unlock size={11} />}
                Reopen
              </button>
            )}
            <button
              type="button"
              onClick={() => setMode(mode === "edit" ? "idle" : "edit")}
              className="text-xs text-muted hover:text-fg inline-flex items-center gap-1"
              title="Edit cycle label / note"
            >
              <Pencil size={11} />
            </button>
            <button
              type="button"
              onClick={del}
              disabled={pending}
              className="text-xs text-rose-700 hover:text-rose-900 inline-flex items-center gap-1 disabled:opacity-50"
              title="Delete this deadline"
            >
              <Trash2 size={11} />
            </button>
          </div>
          {error && (
            <p className="text-[11px] text-rose-700 mt-1 inline-flex items-center gap-1.5">
              <AlertCircle size={11} /> {error}
            </p>
          )}
        </td>
      </tr>

      {mode === "extend" && (
        <tr><td colSpan={5} className="px-5 pb-4 bg-elevated/30">
          <div className="rounded-xl border border-line bg-card-solid p-3 space-y-2">
            <p className="text-[11px] text-subtle">New deadline (ET). Must be after the current deadline.</p>
            <div className="grid grid-cols-[1fr_1fr_auto_auto] gap-2 items-end">
              <input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} className="bg-card-solid border border-line rounded-lg px-2 py-1.5 text-sm" />
              <input type="time" value={newTime} onChange={(e) => setNewTime(e.target.value)} className="bg-card-solid border border-line rounded-lg px-2 py-1.5 text-sm font-mono" />
              <button
                type="button"
                onClick={() => {
                  const iso = newTime === "12:00" ? noonEasternIso(newDate) : new Date(`${newDate}T${newTime}:00-05:00`).toISOString();
                  mutate({ action: "extend", deadlineAt: iso });
                }}
                disabled={pending}
                className="bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white text-xs font-bold px-3 py-1.5 rounded-lg"
              >
                {pending ? <Loader2 size={11} className="animate-spin" /> : "Extend"}
              </button>
              <button type="button" onClick={() => setMode("idle")} className="text-xs text-muted hover:text-fg inline-flex items-center gap-1">
                <X size={11} />
              </button>
            </div>
          </div>
        </td></tr>
      )}

      {mode === "close" && (
        <tr><td colSpan={5} className="px-5 pb-4 bg-elevated/30">
          <div className="rounded-xl border border-line bg-card-solid p-3 space-y-2">
            <label className="block">
              <span className="text-[10px] uppercase tracking-wider font-bold text-subtle">Close note (optional)</span>
              <input
                type="text"
                value={closeNote}
                onChange={(e) => setCloseNote(e.target.value)}
                placeholder="Reason for early close — applicants see this on /equip"
                className="mt-1 w-full bg-card-solid border border-line rounded-lg px-3 py-1.5 text-sm"
              />
            </label>
            <div className="flex items-center justify-end gap-2">
              <button type="button" onClick={() => setMode("idle")} className="text-xs text-muted hover:text-fg">Cancel</button>
              <button
                type="button"
                onClick={() => mutate({ action: "close", note: closeNote || undefined })}
                disabled={pending}
                className="bg-rose-600 hover:bg-rose-700 disabled:opacity-60 text-white text-xs font-bold px-3 py-1.5 rounded-lg"
              >
                {pending ? <Loader2 size={11} className="animate-spin" /> : "Confirm close"}
              </button>
            </div>
          </div>
        </td></tr>
      )}

      {mode === "edit" && (
        <tr><td colSpan={5} className="px-5 pb-4 bg-elevated/30">
          <div className="rounded-xl border border-line bg-card-solid p-3 space-y-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <label className="block">
                <span className="text-[10px] uppercase tracking-wider font-bold text-subtle">Cycle label</span>
                <input
                  type="text"
                  value={cycleLabel}
                  onChange={(e) => setCycleLabel(e.target.value)}
                  className="mt-1 w-full bg-card-solid border border-line rounded-lg px-3 py-1.5 text-sm"
                />
              </label>
              <label className="block">
                <span className="text-[10px] uppercase tracking-wider font-bold text-subtle">Note</span>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="mt-1 w-full bg-card-solid border border-line rounded-lg px-3 py-1.5 text-sm"
                />
              </label>
            </div>
            <div className="flex items-center justify-end gap-2">
              <button type="button" onClick={() => setMode("idle")} className="text-xs text-muted hover:text-fg">Cancel</button>
              <button
                type="button"
                onClick={() => mutate({ action: "update_meta", cycleLabel, note })}
                disabled={pending}
                className="bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white text-xs font-bold px-3 py-1.5 rounded-lg"
              >
                {pending ? <Loader2 size={11} className="animate-spin" /> : "Save"}
              </button>
            </div>
          </div>
        </td></tr>
      )}
    </>
  );
}

function CalendarView({ deadlines, holidaysByDate }: { deadlines: Deadline[]; holidaysByDate: Record<string, { name: string; presidential?: boolean }> }) {
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const byDay = useMemo(() => {
    const acc: Record<string, Deadline[]> = {};
    for (const d of deadlines) {
      const key = new Date(d.deadlineAt).toLocaleDateString("en-CA", { timeZone: "America/Toronto" });
      (acc[key] ?? (acc[key] = [])).push(d);
    }
    return acc;
  }, [deadlines]);

  // Build day grid (always 6 rows × 7 cols = 42 cells)
  const firstWeekday = new Date(month.getFullYear(), month.getMonth(), 1).getDay();
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells: Array<{ date: Date | null; key: string }> = [];
  for (let i = 0; i < firstWeekday; i++) cells.push({ date: null, key: `pad-${i}` });
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(month.getFullYear(), month.getMonth(), d);
    cells.push({ date, key: date.toISOString() });
  }
  while (cells.length < 42) cells.push({ date: null, key: `tail-${cells.length}` });

  const monthLabel = month.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return (
    <section className="rounded-2xl border border-line bg-card p-5 surface-shadow">
      <header className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-fg">{monthLabel}</h3>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
            className="text-muted hover:text-fg p-1 rounded-lg hover:bg-elevated"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            onClick={() => { const now = new Date(); setMonth(new Date(now.getFullYear(), now.getMonth(), 1)); }}
            className="text-xs text-muted hover:text-fg px-2"
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
            className="text-muted hover:text-fg p-1 rounded-lg hover:bg-elevated"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </header>

      <div className="grid grid-cols-7 gap-1 text-[10px] uppercase tracking-wider font-bold text-subtle mb-1">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d} className="px-2 py-1">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((c) => {
          if (!c.date) return <div key={c.key} className="aspect-square rounded-lg bg-elevated/20" />;
          const key = c.date.toLocaleDateString("en-CA", { timeZone: "America/Toronto" });
          const rows = byDay[key] ?? [];
          const isToday = c.date.toDateString() === new Date().toDateString();
          const holiday = holidaysByDate[key];
          // Holiday cells get a soft rose/sky wash so they're
          // visually distinct from working days. Presidential
          // closures use sky (university-internal); statutory
          // holidays use rose.
          const holidayBg = holiday
            ? (holiday.presidential
              ? "border-sky-200 bg-sky-50/40"
              : "border-rose-200 bg-rose-50/40")
            : "";
          return (
            <div
              key={c.key}
              className={
                "aspect-square rounded-lg border p-1.5 flex flex-col gap-0.5 " +
                (isToday
                  ? "border-brand-500 bg-brand-50/40"
                  : holiday
                    ? holidayBg
                    : "border-line bg-card-solid")
              }
              title={holiday ? holiday.name : undefined}
            >
              <span className={"text-[11px] font-bold " + (isToday ? "text-brand-700" : holiday ? (holiday.presidential ? "text-sky-700" : "text-rose-700") : "text-fg")}>
                {c.date.getDate()}
              </span>
              {holiday && (
                <span className={"text-[9px] uppercase tracking-wider font-bold truncate " + (holiday.presidential ? "text-sky-700/70" : "text-rose-700/70")}>
                  {holiday.name}
                </span>
              )}
              {rows.slice(0, 2).map((r) => {
                const meta = STREAM_META[r.stream] ?? { label: r.stream, tone: "brand" as const, cap: "" };
                return (
                  <span
                    key={r.id}
                    className={
                      "text-[10px] font-semibold rounded px-1 py-0.5 truncate " +
                      (r.status === "closed"
                        ? "bg-rose-100 text-rose-700 line-through"
                        : meta.tone === "success"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-brand-100 text-brand-700")
                    }
                    title={`${meta.label} · ${r.cycleLabel ?? ""}`}
                  >
                    {meta.label}
                  </span>
                );
              })}
              {rows.length > 2 && (
                <span className="text-[10px] text-subtle">+{rows.length - 2} more</span>
              )}
            </div>
          );
        })}
      </div>
      <p className="text-[11px] text-subtle mt-3">
        Click <strong>List</strong> tab to add / edit / close individual deadlines. Calendar view is read-only for now.
      </p>
    </section>
  );
}

