"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Loader2, AlertCircle, Trash2, CalendarX, MapPin, ExternalLink, X,
  RefreshCw, Info,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface PostingRow {
  id: string;
  title: string;
  location: string | null;
  status: string;
  createdAt: string;        // ISO from server
  deadline: string | null;  // ISO from server
}

/** Click-cycle order on the status pill. The user requested
 *  "cycling through it" — every click advances to the next state. */
const STATUS_CYCLE = ["active", "closed", "expired", "draft"] as const;
type Status = (typeof STATUS_CYCLE)[number];

function nextStatus(current: string): Status {
  const i = STATUS_CYCLE.indexOf(current as Status);
  return STATUS_CYCLE[(i + 1) % STATUS_CYCLE.length];
}

const STATUS_STYLE: Record<string, { label: string; cls: string }> = {
  active:  { label: "Active",  cls: "bg-emerald-100 text-emerald-800 ring-emerald-200" },
  closed:  { label: "Closed",  cls: "bg-slate-100 text-slate-800 ring-slate-200" },
  expired: { label: "Expired", cls: "bg-amber-100 text-amber-800 ring-amber-200" },
  draft:   { label: "Draft",   cls: "bg-sky-100 text-sky-800 ring-sky-200" },
};

/**
 * Triage table for employer postings.
 *
 * Per-row affordances
 *   • Checkbox        → select for bulk action
 *   • Title           → link to /employer/postings/[id] (the only
 *                       place edit lives; this listing is read-only
 *                       apart from status cycling + checkboxes)
 *   • Location        → link to Google Maps (when set)
 *   • Status pill     → click cycles active → closed → expired → draft
 *                       Optimistic; reverts on API failure.
 *   • Posted          → createdAt date
 *   • Expires         → deadline date; red when already past
 *
 * Bulk actions appear in a floating bar above the table whenever
 * at least one row is selected. Delete confirms inline (two-click
 * pattern) to avoid double-prompting via window.confirm.
 */
export function PostingsTable({ postings: initialPostings }: { postings: PostingRow[] }) {
  const router = useRouter();
  const [rows, setRows] = useState<PostingRow[]>(initialPostings);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busyStatusId, setBusyStatusId] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState<"expire" | "delete" | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Re-sync the local table state when the parent (server component)
  // re-renders with a fresh `postings` prop. Without this, optimistic
  // edits live in `rows` forever and outside actions — demo
  // seed/clear tray, a route refresh, the admin nuking the page —
  // wouldn't surface in the table until the user reloaded by hand.
  // The deep-equality skip below avoids reset thrash on every render
  // when nothing actually changed.
  useEffect(() => {
    setRows((prev) => {
      if (prev.length === initialPostings.length
        && prev.every((p, i) => p.id === initialPostings[i].id
          && p.status === initialPostings[i].status
          && p.title === initialPostings[i].title)) {
        return prev;
      }
      return initialPostings;
    });
  }, [initialPostings]);

  // Pre-format dates once. Listing-scale data; no need to format
  // each row on every render.
  const formatted = useMemo(() => {
    return rows.map((r) => ({
      ...r,
      postedLabel: new Date(r.createdAt).toLocaleDateString(),
      deadlineDate: r.deadline ? new Date(r.deadline) : null,
    }));
  }, [rows]);

  const allChecked = rows.length > 0 && selected.size === rows.length;
  const someChecked = selected.size > 0 && selected.size < rows.length;

  function toggleAll() {
    if (allChecked) {
      setSelected(new Set());
    } else {
      setSelected(new Set(rows.map((r) => r.id)));
    }
  }
  function toggleOne(id: string) {
    setSelected((cur) => {
      const next = new Set(cur);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function cycleStatus(id: string, current: string) {
    const target = nextStatus(current);
    const prev = rows;
    setBusyStatusId(id);
    setError(null);
    // Optimistic
    setRows((cur) => cur.map((r) => (r.id === id ? { ...r, status: target } : r)));
    try {
      const res = await fetch(`/api/employer/postings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: target }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? "Status update failed");
      }
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
      setRows(prev);
    } finally {
      setBusyStatusId(null);
    }
  }

  async function bulkAction(action: "expire" | "delete") {
    if (selected.size === 0) return;
    const ids = Array.from(selected);
    setBulkBusy(action);
    setError(null);
    const prev = rows;
    // Optimistic UI updates
    if (action === "expire") {
      setRows((cur) =>
        cur.map((r) => (selected.has(r.id) ? { ...r, status: "expired" } : r)),
      );
    } else {
      setRows((cur) => cur.filter((r) => !selected.has(r.id)));
    }
    try {
      const res = await fetch("/api/employer/postings/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, action }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? "Bulk action failed");
      }
      setSelected(new Set());
      setConfirmingDelete(false);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
      setRows(prev);
    } finally {
      setBulkBusy(null);
    }
  }

  if (rows.length === 0) {
    return (
      <div className="bg-card border border-line rounded-2xl p-12 text-center">
        <div className="w-12 h-12 mx-auto rounded-xl bg-elevated text-muted flex items-center justify-center mb-3">
          <CalendarX size={20} />
        </div>
        <p className="font-medium text-muted">No postings yet</p>
        <p className="text-sm text-muted mt-1">
          Click &quot;New posting&quot; — paste the job description and the AI will fill in the fields for you.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Bulk-action bar — only visible when selection is non-empty */}
      {selected.size > 0 && (
        <div className="sticky top-3 z-10 rounded-xl bg-brand-50 border border-brand-300 px-4 py-3 flex flex-wrap items-center gap-3 surface-shadow">
          <p className="text-sm font-semibold text-brand-900">
            {selected.size} selected
          </p>
          <span className="flex-1" />
          <button
            type="button"
            onClick={() => bulkAction("expire")}
            disabled={bulkBusy !== null}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-amber-900 bg-amber-100 hover:bg-amber-200 ring-1 ring-inset ring-amber-300 disabled:opacity-50 transition-colors"
          >
            {bulkBusy === "expire" ? <Loader2 size={12} className="animate-spin" /> : <CalendarX size={12} />}
            Mark as expired
          </button>
          {!confirmingDelete ? (
            <button
              type="button"
              onClick={() => setConfirmingDelete(true)}
              disabled={bulkBusy !== null}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-700 ring-1 ring-inset ring-rose-300 hover:bg-rose-100 disabled:opacity-50 transition-colors"
            >
              <Trash2 size={12} /> Delete
            </button>
          ) : (
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-rose-100 ring-1 ring-inset ring-rose-300">
              <span className="text-xs font-semibold text-rose-900">
                Delete {selected.size}?
              </span>
              <button
                type="button"
                onClick={() => setConfirmingDelete(false)}
                disabled={bulkBusy !== null}
                className="text-xs text-rose-700 hover:text-rose-900 disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => bulkAction("delete")}
                disabled={bulkBusy !== null}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-40"
              >
                {bulkBusy === "delete" ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
                Yes
              </button>
            </span>
          )}
          <button
            type="button"
            onClick={() => { setSelected(new Set()); setConfirmingDelete(false); }}
            disabled={bulkBusy !== null}
            className="inline-flex items-center gap-1 text-xs font-semibold text-muted hover:text-fg disabled:opacity-40"
          >
            <X size={12} /> Cancel
          </button>
        </div>
      )}

      {error && (
        <div className="inline-flex items-start gap-2 text-xs text-rose-700 bg-rose-50 ring-1 ring-inset ring-rose-200 rounded-lg px-3 py-2">
          <AlertCircle size={11} className="mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      {/* Standing reminder so a new reviewer doesn't have to discover
          the cycle behaviour by hovering a tooltip. Lists the order
          left-to-right so the next-state on click is predictable. */}
      <div className="inline-flex items-start gap-2 text-[11px] text-muted bg-elevated/60 ring-1 ring-inset ring-line rounded-lg px-3 py-2">
        <Info size={11} className="mt-0.5 shrink-0 text-brand-700" />
        <span>
          <span className="font-semibold text-fg">Tip:</span>{" "}
          click any status pill to cycle through{" "}
          <StatusHint label="Active" cls={STATUS_STYLE.active.cls} />{" "}
          <span className="text-subtle">→</span>{" "}
          <StatusHint label="Closed" cls={STATUS_STYLE.closed.cls} />{" "}
          <span className="text-subtle">→</span>{" "}
          <StatusHint label="Expired" cls={STATUS_STYLE.expired.cls} />{" "}
          <span className="text-subtle">→</span>{" "}
          <StatusHint label="Draft" cls={STATUS_STYLE.draft.cls} />{" "}
          (loops back). Changes save instantly.
        </span>
      </div>

      <div className="bg-card border border-line rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-elevated/60 border-b border-line">
              <tr>
                <th className="px-4 py-3 w-10">
                  <input
                    type="checkbox"
                    aria-label={allChecked ? "Deselect all" : "Select all"}
                    checked={allChecked}
                    ref={(el) => {
                      if (el) el.indeterminate = someChecked;
                    }}
                    onChange={toggleAll}
                    className="rounded border-line text-brand-600 focus:ring-brand-500/30"
                  />
                </th>
                <Th>Title</Th>
                <Th>Location</Th>
                <th className="text-left text-[10px] font-semibold text-muted uppercase tracking-wider px-4 py-3">
                  <span className="inline-flex items-center gap-1">
                    Status
                    <RefreshCw
                      size={9}
                      className="text-brand-700"
                      aria-hidden
                    />
                    <span className="normal-case tracking-normal text-[9px] font-medium text-subtle">
                      click to cycle
                    </span>
                  </span>
                </th>
                <Th>Posted</Th>
                <Th>Expires</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {formatted.map((p) => {
                const isSel = selected.has(p.id);
                const statusStyle = STATUS_STYLE[p.status] ?? { label: p.status, cls: "bg-elevated text-fg ring-line" };
                const isPastDeadline =
                  p.deadlineDate !== null && p.deadlineDate.getTime() < Date.now();
                const mapHref = p.location
                  ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.location)}`
                  : null;
                return (
                  <tr
                    key={p.id}
                    className={cn(
                      "hover:bg-elevated/40 transition-colors",
                      isSel && "bg-brand-50/40",
                    )}
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        aria-label={`Select ${p.title}`}
                        checked={isSel}
                        onChange={() => toggleOne(p.id)}
                        className="rounded border-line text-brand-600 focus:ring-brand-500/30"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/employer/postings/${p.id}`}
                        className="font-medium text-fg hover:text-brand-700 hover:underline"
                      >
                        {p.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {p.location ? (
                        <a
                          href={mapHref ?? "#"}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 hover:text-fg hover:underline"
                          title="Open in Google Maps"
                        >
                          <MapPin size={11} className="text-subtle shrink-0" />
                          {p.location}
                          <ExternalLink size={9} className="text-subtle opacity-70" />
                        </a>
                      ) : (
                        <span className="text-subtle">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => cycleStatus(p.id, p.status)}
                        disabled={busyStatusId === p.id}
                        aria-label={`Status: ${statusStyle.label}. Click to change to ${STATUS_STYLE[nextStatus(p.status)].label}.`}
                        title={`Currently ${statusStyle.label}. Click to set ${STATUS_STYLE[nextStatus(p.status)].label} — keep clicking to cycle through all 4 states.`}
                        className={cn(
                          "group inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.16em] pl-2 pr-1.5 py-0.5 rounded-full ring-1 ring-inset transition-all cursor-pointer hover:ring-2 hover:ring-offset-1 hover:ring-offset-card disabled:opacity-50 disabled:cursor-not-allowed",
                          statusStyle.cls,
                        )}
                      >
                        {busyStatusId === p.id ? (
                          <Loader2 size={10} className="animate-spin" />
                        ) : (
                          <RefreshCw
                            size={9}
                            className="opacity-50 group-hover:opacity-100 group-hover:rotate-90 transition-all"
                            aria-hidden
                          />
                        )}
                        {statusStyle.label}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-xs text-subtle whitespace-nowrap">
                      {p.postedLabel}
                    </td>
                    <td className="px-4 py-3 text-xs whitespace-nowrap">
                      {p.deadlineDate ? (
                        <span className={isPastDeadline ? "text-rose-700 font-semibold" : "text-fg"}>
                          {p.deadlineDate.toLocaleDateString()}
                          {isPastDeadline && (
                            <span className="text-[10px] ml-1 uppercase tracking-wide">past</span>
                          )}
                        </span>
                      ) : (
                        <span className="text-subtle">No deadline</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="text-left text-[10px] font-semibold text-muted uppercase tracking-wider px-4 py-3">
      {children}
    </th>
  );
}

/** Inline mini-pill used in the "click to cycle" reminder banner.
 *  Matches the real status pill colours so the visual mapping is
 *  immediate ("oh, that's the same shape I click in the row"). */
function StatusHint({ label, cls }: { label: string; cls: string }) {
  return (
    <span
      className={cn(
        "inline-block text-[9px] font-bold uppercase tracking-[0.14em] px-1.5 py-px rounded-full ring-1 ring-inset align-middle",
        cls,
      )}
    >
      {label}
    </span>
  );
}
