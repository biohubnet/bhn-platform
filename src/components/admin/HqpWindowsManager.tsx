"use client";
/**
 * Admin manager for HQP application-window scheduling.
 * Mirrors the EquipDeadline manager pattern.
 */
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Lock, Unlock, Pencil, X, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/Badge";

interface Window {
  id: string;
  year: number;
  title: string;
  description: string | null;
  opensAt: string | Date;
  closesAt: string | Date;
  status: string;
  createdAt: string | Date;
}

interface Props {
  initial: Window[];
}

function fmt(d: string | Date) {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleString("en-US", {
    timeZone: "America/Toronto",
    month: "short", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit", hour12: true,
  });
}

export function HqpWindowsManager({ initial }: Props) {
  return (
    <div className="space-y-5">
      <NewWindowForm />
      <WindowsList rows={initial} />
    </div>
  );
}

function NewWindowForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [year, setYear] = useState<number>(new Date().getFullYear() + 1);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [opensAt, setOpensAt] = useState("");
  const [closesAt, setClosesAt] = useState("");
  const [error, setError] = useState<string | null>(null);

  function submit() {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/admin/committees/hqp/windows", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            year, title, description: description || undefined,
            opensAt: opensAt ? new Date(opensAt).toISOString() : null,
            closesAt: closesAt ? new Date(closesAt).toISOString() : null,
          }),
        });
        const j = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(j.error ?? "Failed to create window");
        setTitle(""); setDescription(""); setOpensAt(""); setClosesAt("");
        router.refresh();
      } catch (e) { setError((e as Error).message); }
    });
  }

  return (
    <section className="rounded-2xl border border-line bg-card p-5 surface-shadow">
      <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-subtle mb-3">Create a new open-call window</p>
      <div className="grid grid-cols-1 md:grid-cols-[120px_1fr_1fr_1fr] gap-2">
        <label className="block">
          <span className="text-[10px] uppercase tracking-wider font-bold text-subtle">Year</span>
          <input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} className="mt-1 w-full bg-card-solid border border-line rounded-lg px-2 py-2 text-sm" />
        </label>
        <label className="block">
          <span className="text-[10px] uppercase tracking-wider font-bold text-subtle">Title *</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="2027 HQP Advisory Committee — Open Call" className="mt-1 w-full bg-card-solid border border-line rounded-lg px-3 py-2 text-sm" />
        </label>
        <label className="block">
          <span className="text-[10px] uppercase tracking-wider font-bold text-subtle">Opens (local) *</span>
          <input type="datetime-local" value={opensAt} onChange={(e) => setOpensAt(e.target.value)} className="mt-1 w-full bg-card-solid border border-line rounded-lg px-2 py-2 text-sm font-mono" />
        </label>
        <label className="block">
          <span className="text-[10px] uppercase tracking-wider font-bold text-subtle">Closes (local) *</span>
          <input type="datetime-local" value={closesAt} onChange={(e) => setClosesAt(e.target.value)} className="mt-1 w-full bg-card-solid border border-line rounded-lg px-2 py-2 text-sm font-mono" />
        </label>
      </div>
      <div className="mt-2">
        <label className="block">
          <span className="text-[10px] uppercase tracking-wider font-bold text-subtle">Description (optional)</span>
          <textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What this cycle's committee focuses on." className="mt-1 w-full bg-card-solid border border-line rounded-lg px-3 py-2 text-sm" />
        </label>
      </div>
      <div className="mt-3 flex items-center justify-between">
        {error && <p className="text-[11px] text-rose-700 inline-flex items-center gap-1.5"><AlertCircle size={11} /> {error}</p>}
        <button type="button" onClick={submit} disabled={pending} className="ml-auto inline-flex items-center gap-1.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white text-sm font-bold px-4 py-2 rounded-xl">
          {pending ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
          Create window
        </button>
      </div>
    </section>
  );
}

function WindowsList({ rows }: { rows: Window[] }) {
  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-line bg-card p-12 text-center surface-shadow">
        <p className="font-medium text-fg">No windows scheduled yet</p>
        <p className="text-sm text-muted mt-1">Use the form above to schedule the next open call.</p>
      </div>
    );
  }
  return (
    <section className="rounded-2xl border border-line bg-card overflow-hidden surface-shadow">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-line text-left text-[10px] text-muted uppercase tracking-wide">
            <th className="px-5 py-3">Title</th>
            <th className="px-5 py-3">Year</th>
            <th className="px-5 py-3">Window (ET)</th>
            <th className="px-5 py-3">Status</th>
            <th className="px-5 py-3 w-px">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((w) => <WindowRow key={w.id} w={w} />)}
        </tbody>
      </table>
    </section>
  );
}

function WindowRow({ w }: { w: Window }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(w.title);
  const [description, setDescription] = useState(w.description ?? "");
  const [opensAt, setOpensAt] = useState(typeof w.opensAt === "string" ? w.opensAt.slice(0, 16) : w.opensAt.toISOString().slice(0, 16));
  const [closesAt, setClosesAt] = useState(typeof w.closesAt === "string" ? w.closesAt.slice(0, 16) : w.closesAt.toISOString().slice(0, 16));
  const [error, setError] = useState<string | null>(null);

  function patch(payload: Record<string, unknown>) {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch(`/api/admin/committees/hqp/windows/${w.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const j = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(j.error ?? "Action failed");
        setEditing(false);
        router.refresh();
      } catch (e) { setError((e as Error).message); }
    });
  }

  return (
    <>
      <tr className="align-top">
        <td className="px-5 py-3">
          <p className="text-fg font-medium">{w.title}</p>
          {w.description && <p className="text-[11px] text-muted line-clamp-1">{w.description}</p>}
        </td>
        <td className="px-5 py-3 font-mono">{w.year}</td>
        <td className="px-5 py-3 text-muted text-xs">
          <p>{fmt(w.opensAt)}</p>
          <p>→ {fmt(w.closesAt)}</p>
        </td>
        <td className="px-5 py-3">
          {w.status === "open"   ? <Badge tone="success">Open</Badge> :
           w.status === "closed" ? <Badge tone="danger">Closed</Badge> :
                                   <Badge tone="neutral">{w.status}</Badge>}
        </td>
        <td className="px-5 py-3">
          <div className="flex items-center gap-2 flex-wrap">
            {w.status === "open" ? (
              <button type="button" onClick={() => patch({ action: "close" })} disabled={pending} className="text-xs text-rose-700 hover:text-rose-900 inline-flex items-center gap-1 disabled:opacity-50">
                {pending ? <Loader2 size={11} className="animate-spin" /> : <Lock size={11} />} Close
              </button>
            ) : (
              <button type="button" onClick={() => patch({ action: "reopen" })} disabled={pending} className="text-xs text-emerald-700 hover:text-emerald-900 inline-flex items-center gap-1 disabled:opacity-50">
                {pending ? <Loader2 size={11} className="animate-spin" /> : <Unlock size={11} />} Reopen
              </button>
            )}
            <button type="button" onClick={() => setEditing((v) => !v)} className="text-xs text-muted hover:text-fg inline-flex items-center gap-1">
              <Pencil size={11} />
            </button>
          </div>
          {error && <p className="text-[11px] text-rose-700 mt-1">{error}</p>}
        </td>
      </tr>
      {editing && (
        <tr><td colSpan={5} className="px-5 pb-4 bg-elevated/30">
          <div className="rounded-xl border border-line bg-card-solid p-3 space-y-2">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <label className="block">
                <span className="text-[10px] uppercase tracking-wider font-bold text-subtle">Title</span>
                <input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1 w-full bg-card-solid border border-line rounded-lg px-2 py-1.5 text-xs" />
              </label>
              <label className="block">
                <span className="text-[10px] uppercase tracking-wider font-bold text-subtle">Opens</span>
                <input type="datetime-local" value={opensAt} onChange={(e) => setOpensAt(e.target.value)} className="mt-1 w-full bg-card-solid border border-line rounded-lg px-2 py-1.5 text-xs font-mono" />
              </label>
              <label className="block">
                <span className="text-[10px] uppercase tracking-wider font-bold text-subtle">Closes</span>
                <input type="datetime-local" value={closesAt} onChange={(e) => setClosesAt(e.target.value)} className="mt-1 w-full bg-card-solid border border-line rounded-lg px-2 py-1.5 text-xs font-mono" />
              </label>
            </div>
            <label className="block">
              <span className="text-[10px] uppercase tracking-wider font-bold text-subtle">Description</span>
              <textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1 w-full bg-card-solid border border-line rounded-lg px-3 py-1.5 text-xs" />
            </label>
            <div className="flex items-center justify-end gap-2">
              <button type="button" onClick={() => setEditing(false)} className="text-xs text-muted hover:text-fg inline-flex items-center gap-1"><X size={11} /> Cancel</button>
              <button type="button" onClick={() => patch({ action: "update_meta", title, description, opensAt: opensAt ? new Date(opensAt).toISOString() : undefined, closesAt: closesAt ? new Date(closesAt).toISOString() : undefined })} disabled={pending} className="bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white text-xs font-bold px-3 py-1.5 rounded-lg">
                {pending ? <Loader2 size={11} className="animate-spin" /> : "Save"}
              </button>
            </div>
          </div>
        </td></tr>
      )}
    </>
  );
}
