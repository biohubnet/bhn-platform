"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  CheckCircle2, XCircle, Clock, BookOpen, Layers, Ghost, AlertTriangle,
} from "lucide-react";

export interface PendingRequest {
  id: string;
  kind: "course" | "pathway";
  targetId: string;
  targetTitle: string;
  /** ISO */
  requestedAt: string;
  requestReason: string | null;
  user: {
    id: string;
    name: string | null;
    email: string;
    accountKind: string;
  };
}

/**
 * Pool of users requesting enrolment, grouped by what they're
 * requesting. Two flat groupings — Course requests + Pathway
 * requests — each broken down by the target item with collapsible
 * detail. Per-row approve / reject.
 *
 * Reject does the same thing for both kinds: flip to "withdrawn".
 * Approve uses different endpoints because the side effects
 * (credit deduction for course; waitlist promotion for cohort
 * pathways) live in different services.
 */
export function PendingEnrollmentRequests({
  initialRequests,
}: {
  initialRequests: PendingRequest[];
}) {
  const router = useRouter();
  const [requests, setRequests] = useState(initialRequests);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function setFlashAuto(s: string) {
    setFlash(s);
    setTimeout(() => setFlash(null), 4000);
  }

  async function decide(r: PendingRequest, action: "approve" | "reject") {
    setBusyId(r.id); setError(null);
    try {
      // Course review uses POST .../[id]/review with body { action }.
      // Pathway review reuses the existing PATCH .../[id] with body
      // { decision } — kept as-is so the long-standing review queue
      // and this new surface share the same review pipeline.
      const isCourse = r.kind === "course";
      const url = isCourse
        ? `/api/admin/enrollments/${r.id}/review`
        : `/api/admin/pathway-enrollments/${r.id}`;
      const method = isCourse ? "POST" : "PATCH";
      const body = isCourse
        ? { action }
        : { decision: action };
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "Action failed");
      setRequests((prev) => prev.filter((x) => x.id !== r.id));
      setFlashAuto(
        action === "approve"
          ? `Approved ${r.user.name ?? r.user.email} → ${r.targetTitle}.`
          : `Rejected ${r.user.name ?? r.user.email} → ${r.targetTitle}.`,
      );
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  const courseRequests  = requests.filter((r) => r.kind === "course");
  const pathwayRequests = requests.filter((r) => r.kind === "pathway");

  // Group by target.
  const groupByTarget = (rs: PendingRequest[]) => {
    const m = new Map<string, { targetId: string; targetTitle: string; rows: PendingRequest[] }>();
    for (const r of rs) {
      const entry = m.get(r.targetId) ?? { targetId: r.targetId, targetTitle: r.targetTitle, rows: [] };
      entry.rows.push(r);
      m.set(r.targetId, entry);
    }
    return Array.from(m.values()).sort((a, b) => b.rows.length - a.rows.length);
  };
  const courseGroups  = groupByTarget(courseRequests);
  const pathwayGroups = groupByTarget(pathwayRequests);

  return (
    <section className="space-y-4">
      <header>
        <h2 className="text-lg font-bold text-fg tracking-tight inline-flex items-center gap-2">
          <Clock size={18} className="text-brand-600" />
          Pending enrollment requests
          <span className="text-xs font-mono tabular-nums text-subtle">{requests.length}</span>
        </h2>
        <p className="text-sm text-muted mt-1 leading-snug">
          Trainees who've requested enrollment in a course (if marked "requires
          approval") or any learning pathway. Grouped by what they're
          requesting. Approve to admit them; reject to close out.
        </p>
      </header>

      {error && (
        <div className="rounded-xl bg-rose-50 ring-1 ring-inset ring-rose-200 px-3 py-2 flex items-start gap-2 text-xs text-rose-900">
          <AlertTriangle size={11} className="text-rose-700 shrink-0 mt-0.5" /> {error}
        </div>
      )}
      {flash && (
        <div className="rounded-xl bg-emerald-50 ring-1 ring-inset ring-emerald-200 px-3 py-2 flex items-start gap-2 text-xs text-emerald-900">
          <CheckCircle2 size={11} className="text-emerald-700 shrink-0 mt-0.5" /> {flash}
        </div>
      )}

      {requests.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-card p-10 text-center">
          <Clock size={24} className="mx-auto text-muted mb-2" />
          <p className="text-sm font-medium text-muted">No pending requests right now.</p>
          <p className="text-xs text-subtle mt-1.5 max-w-md mx-auto leading-relaxed">
            Spawn demo phantoms below to see this section in action, or wait for
            real trainees to request approval-required enrollments.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <GroupedColumn
            title="Course requests"
            icon={BookOpen}
            groups={courseGroups}
            onDecide={(r, a) => startTransition(() => { void decide(r, a); })}
            busyId={busyId}
            emptyText="No course-enrollment requests pending."
            targetHref={(id) => `/courses/${id}`}
          />
          <GroupedColumn
            title="Pathway requests"
            icon={Layers}
            groups={pathwayGroups}
            onDecide={(r, a) => startTransition(() => { void decide(r, a); })}
            busyId={busyId}
            emptyText="No pathway-enrollment requests pending."
            targetHref={(id) => `/pathways/${id}`}
          />
        </div>
      )}
    </section>
  );
}

function GroupedColumn({
  title, icon: Icon, groups, onDecide, busyId, emptyText, targetHref,
}: {
  title: string;
  icon: React.ElementType;
  groups: { targetId: string; targetTitle: string; rows: PendingRequest[] }[];
  onDecide: (r: PendingRequest, a: "approve" | "reject") => void;
  busyId: string | null;
  emptyText: string;
  targetHref: (id: string) => string;
}) {
  return (
    <div className="rounded-2xl border border-line bg-card p-4 surface-shadow space-y-3">
      <h3 className="text-sm font-bold text-fg inline-flex items-center gap-2">
        <Icon size={14} className="text-brand-600" />
        {title}
        <span className="text-xs font-mono tabular-nums text-subtle">
          {groups.reduce((s, g) => s + g.rows.length, 0)}
        </span>
      </h3>

      {groups.length === 0 ? (
        <p className="text-xs text-muted italic">{emptyText}</p>
      ) : (
        groups.map((g) => (
          <div key={g.targetId} className="rounded-xl bg-bg border border-line">
            <div className="px-3 py-2 border-b border-line bg-elevated/40 flex items-center justify-between gap-2">
              <Link
                href={targetHref(g.targetId)}
                className="text-sm font-bold text-fg hover:text-brand-700 truncate"
              >
                {g.targetTitle}
              </Link>
              <span className="text-xs font-mono tabular-nums text-subtle">
                {g.rows.length} pending
              </span>
            </div>
            <ul className="divide-y divide-line">
              {g.rows.map((r) => (
                <li key={r.id} className="px-3 py-2.5 flex items-start gap-2">
                  {r.user.accountKind === "phantom" && (
                    <span title="Demo phantom" className="shrink-0 mt-0.5 inline-flex">
                      <Ghost size={12} className="text-amber-600" />
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-fg truncate">
                      {r.user.name ?? <span className="italic text-muted">No name</span>}
                    </p>
                    <p className="text-[11px] text-muted font-mono truncate">{r.user.email}</p>
                    {r.requestReason && (
                      <p className="text-[11px] text-subtle italic mt-1 line-clamp-2">"{r.requestReason}"</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      disabled={busyId === r.id}
                      onClick={() => onDecide(r, "approve")}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:bg-emerald-50 px-2 py-1 rounded disabled:opacity-50"
                    >
                      <CheckCircle2 size={10} /> Approve
                    </button>
                    <button
                      type="button"
                      disabled={busyId === r.id}
                      onClick={() => onDecide(r, "reject")}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 hover:bg-rose-50 px-2 py-1 rounded disabled:opacity-50"
                    >
                      <XCircle size={10} /> Reject
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))
      )}
    </div>
  );
}
