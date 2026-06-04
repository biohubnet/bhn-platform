"use client";

/**
 * Per-enrollment attendance control for /admin/pathway-enrollments.
 * A checkbox ("Attended") plus an optional sessions-attended count, each
 * persisted to /api/admin/pathway-enrollments/[id]/attendance. Optimistic
 * with rollback on failure. Only rendered for approved / completed rows.
 */
import { useState } from "react";

export function AttendanceToggle({
  enrollmentId,
  attended: initialAttended,
  sessionsAttended: initialSessions,
}: {
  enrollmentId: string;
  attended: boolean;
  sessionsAttended: number;
}) {
  const [attended, setAttended] = useState(initialAttended);
  const [sessions, setSessions] = useState(initialSessions);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function save(next: { attended?: boolean; sessionsAttended?: number }) {
    setSaving(true);
    setErr(null);
    const prevA = attended;
    const prevS = sessions;
    if (next.attended !== undefined) setAttended(next.attended);
    if (next.sessionsAttended !== undefined) setSessions(next.sessionsAttended);
    try {
      const r = await fetch(
        `/api/admin/pathway-enrollments/${enrollmentId}/attendance`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(next),
        },
      );
      if (!r.ok) {
        const j = (await r.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error || "Couldn't save");
      }
    } catch (e) {
      setAttended(prevA);
      setSessions(prevS);
      setErr(e instanceof Error ? e.message : "Couldn't save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={attended}
          disabled={saving}
          onChange={(e) => save({ attended: e.target.checked })}
          className="h-4 w-4 rounded border-line accent-brand-600"
        />
        <span
          className={
            "text-xs font-medium " +
            (attended ? "text-emerald-700" : "text-subtle")
          }
        >
          {attended ? "Attended" : "Mark attended"}
        </span>
      </label>
      {attended && (
        <input
          type="number"
          min={0}
          value={sessions}
          disabled={saving}
          onChange={(e) =>
            setSessions(Math.max(0, parseInt(e.target.value || "0", 10) || 0))
          }
          onBlur={() => {
            if (sessions !== initialSessions) save({ sessionsAttended: sessions });
          }}
          title="Sessions attended"
          className="w-14 text-xs px-1.5 py-1 rounded border border-line bg-card text-fg"
        />
      )}
      {err && <span className="text-[10px] text-rose-600">{err}</span>}
    </div>
  );
}
