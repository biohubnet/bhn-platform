"use client";

import { useMemo, useState, useTransition } from "react";
import { Search, CheckCircle2, Circle, UserX, AlertTriangle } from "lucide-react";

export interface RegistrationRow {
  id: string;
  name: string | null;
  email: string;
  attendeeType: string;
  registrationStatus: string;
  paymentStatus: string;
  includesSymposiumDay: boolean;
  dietaryRestrictions: string | null;
  accessibilityNeeds: string | null;
  /** ISO string or null */
  checkedInAt: string | null;
  /** ISO string */
  createdAt: string;
}

type StatusFilter = "all" | "pending" | "confirmed" | "cancelled" | "checked-in" | "not-checked-in";

/**
 * Client-side registrations table.
 *
 *   • Search across name + email (case-insensitive substring).
 *   • Filter chips for registration status and check-in state.
 *   • Per-row check-in toggle — POSTs to the toggle API and
 *     optimistically flips the row. On API failure the row reverts
 *     and we show an inline banner; the row stays editable.
 *   • Dietary / accessibility cells expose a tiny indicator chip;
 *     hovering exposes the full text.
 */
export function RegistrationsTable({
  slug,
  rows: initialRows,
}: {
  slug: string;
  rows: RegistrationRow[];
}) {
  const [rows, setRows] = useState<RegistrationRow[]>(initialRows);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [error, setError] = useState<string | null>(null);
  const [busy, startTransition] = useTransition();
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (q) {
        const hay = `${r.name ?? ""} ${r.email}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      switch (status) {
        case "pending":
        case "confirmed":
        case "cancelled":
          return r.registrationStatus === status;
        case "checked-in":
          return r.checkedInAt !== null;
        case "not-checked-in":
          return r.checkedInAt === null && r.registrationStatus === "confirmed";
        default:
          return true;
      }
    });
  }, [rows, query, status]);

  async function toggleCheckIn(row: RegistrationRow) {
    const desired = row.checkedInAt === null;
    // Optimistic update.
    setBusyIds((s) => new Set(s).add(row.id));
    setRows((prev) =>
      prev.map((r) =>
        r.id === row.id
          ? { ...r, checkedInAt: desired ? new Date().toISOString() : null }
          : r,
      ),
    );
    setError(null);

    try {
      const res = await fetch(
        `/api/admin/events/${slug}/registrations/${row.id}/check-in`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ checkedIn: desired }),
        },
      );
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? `Toggle failed (${res.status})`);
      }
      const data = (await res.json()) as {
        ok: boolean;
        registration: { id: string; checkedInAt: string | null };
      };
      // Reconcile with server's authoritative timestamp.
      setRows((prev) =>
        prev.map((r) =>
          r.id === row.id ? { ...r, checkedInAt: data.registration.checkedInAt } : r,
        ),
      );
    } catch (err) {
      // Roll back.
      setRows((prev) =>
        prev.map((r) =>
          r.id === row.id ? { ...r, checkedInAt: row.checkedInAt } : r,
        ),
      );
      setError((err as Error).message);
    } finally {
      setBusyIds((s) => {
        const next = new Set(s);
        next.delete(row.id);
        return next;
      });
    }
  }

  return (
    <div className="space-y-3">
      {/* Search + filter */}
      <div className="flex flex-wrap items-center gap-3">
        <label className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-subtle" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name or email…"
            className="w-full bg-card border border-line rounded-xl pl-8 pr-3 py-2 text-sm"
          />
        </label>
        <div className="flex flex-wrap gap-1.5">
          {(
            [
              ["all", "All"],
              ["confirmed", "Confirmed"],
              ["pending", "Pending"],
              ["cancelled", "Cancelled"],
              ["checked-in", "Checked in"],
              ["not-checked-in", "Not checked in"],
            ] as [StatusFilter, string][]
          ).map(([key, label]) => {
            const active = status === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setStatus(key)}
                className={`text-xs font-semibold rounded-full px-3 py-1 ring-1 ring-inset transition-colors ${
                  active
                    ? "bg-brand-600 text-white ring-brand-600"
                    : "bg-card text-muted ring-line hover:text-fg"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
        <p className="ml-auto text-xs text-subtle tabular-nums font-mono">
          {filtered.length} / {rows.length}
        </p>
      </div>

      {error && (
        <div className="rounded-xl bg-rose-50 ring-1 ring-inset ring-rose-200 px-4 py-3 flex items-start gap-2">
          <AlertTriangle size={14} className="text-rose-700 shrink-0 mt-0.5" />
          <p className="text-sm text-rose-900 leading-snug">{error}</p>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-line bg-card p-10 text-center">
          <div className="w-10 h-10 mx-auto rounded-xl bg-elevated text-muted flex items-center justify-center mb-3">
            <UserX size={16} />
          </div>
          <p className="text-sm font-medium text-muted">No registrations match your filter.</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-line bg-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-elevated text-[10px] uppercase tracking-[0.16em] font-bold text-subtle">
              <tr>
                <th className="text-left px-4 py-2.5">Attendee</th>
                <th className="text-left px-4 py-2.5">Type</th>
                <th className="text-left px-4 py-2.5">Status</th>
                <th className="text-left px-4 py-2.5">Payment</th>
                <th className="text-left px-4 py-2.5">Needs</th>
                <th className="text-left px-4 py-2.5">Check-in</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {filtered.map((r) => {
                const isCheckedIn = r.checkedInAt !== null;
                const cancelled = r.registrationStatus === "cancelled";
                return (
                  <tr key={r.id} className={cancelled ? "opacity-60" : ""}>
                    <td className="px-4 py-2.5 align-top">
                      <div className="font-semibold text-fg">{r.name ?? <span className="text-subtle italic">No name</span>}</div>
                      <div className="text-xs text-muted">{r.email}</div>
                    </td>
                    <td className="px-4 py-2.5 align-top">
                      <span className="text-xs font-mono text-fg">{r.attendeeType}</span>
                      {!r.includesSymposiumDay && (
                        <span className="block text-[10px] text-amber-700 font-bold uppercase tracking-wider mt-0.5">
                          Workshops only
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 align-top">
                      <RegStatusChip status={r.registrationStatus} />
                    </td>
                    <td className="px-4 py-2.5 align-top">
                      <span className="text-xs text-fg font-mono">{r.paymentStatus}</span>
                    </td>
                    <td className="px-4 py-2.5 align-top">
                      <div className="flex flex-wrap gap-1">
                        {r.dietaryRestrictions && (
                          <NeedChip label="Diet" detail={r.dietaryRestrictions} />
                        )}
                        {r.accessibilityNeeds && (
                          <NeedChip label="Access" detail={r.accessibilityNeeds} />
                        )}
                        {!r.dietaryRestrictions && !r.accessibilityNeeds && (
                          <span className="text-xs text-subtle">—</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 align-top">
                      <button
                        type="button"
                        disabled={cancelled || busyIds.has(r.id) || busy}
                        onClick={() => startTransition(() => { void toggleCheckIn(r); })}
                        className={`inline-flex items-center gap-1.5 text-xs font-bold rounded-full px-3 py-1 ring-1 ring-inset transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                          isCheckedIn
                            ? "bg-emerald-100 text-emerald-800 ring-emerald-200 hover:bg-emerald-200"
                            : "bg-card text-muted ring-line hover:text-fg hover:border-brand-300"
                        }`}
                        title={
                          isCheckedIn
                            ? `Checked in ${new Date(r.checkedInAt!).toLocaleString()}`
                            : "Click to check in"
                        }
                      >
                        {isCheckedIn ? <CheckCircle2 size={12} /> : <Circle size={12} />}
                        {isCheckedIn ? "Checked in" : "Check in"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function RegStatusChip({ status }: { status: string }) {
  const tints: Record<string, string> = {
    pending: "bg-amber-100 text-amber-800 ring-amber-200",
    confirmed: "bg-emerald-100 text-emerald-800 ring-emerald-200",
    cancelled: "bg-slate-100 text-slate-700 ring-slate-200",
  };
  return (
    <span
      className={`inline-flex items-center text-[10px] font-bold uppercase tracking-[0.16em] px-2 py-0.5 rounded-full ring-1 ring-inset ${tints[status] ?? tints.pending}`}
    >
      {status}
    </span>
  );
}

function NeedChip({ label, detail }: { label: string; detail: string }) {
  return (
    <span
      className="inline-flex items-center text-[10px] font-bold uppercase tracking-[0.14em] px-1.5 py-0.5 rounded ring-1 ring-inset bg-amber-50 text-amber-800 ring-amber-200 cursor-help"
      title={detail}
    >
      {label}
    </span>
  );
}
