"use client";
/**
 * COI disclosure panel — current user's disclosures with a form
 * to add a new one. Members manage their own; admins view all
 * (admin aggregate view can come later).
 */
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, X, AlertCircle, ShieldCheck } from "lucide-react";

interface Disclosure {
  id: string;
  scope: string;
  description: string;
  active: boolean;
  declaredAt: string | Date;
  resolvedAt: string | Date | null;
}

interface Props {
  disclosures: Disclosure[];
}

export function HqpCoiPanel({ disclosures }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [creating, setCreating] = useState(false);
  const [scope, setScope] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);

  function create() {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/committee/hqp/coi", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ scope, description }),
        });
        const j = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(j.error ?? "Failed to record");
        setScope(""); setDescription("");
        setCreating(false);
        router.refresh();
      } catch (e) { setError((e as Error).message); }
    });
  }

  function resolve(id: string) {
    startTransition(async () => {
      await fetch("/api/committee/hqp/coi", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      router.refresh();
    });
  }

  const active = disclosures.filter((d) => d.active);
  const resolved = disclosures.filter((d) => !d.active);

  return (
    <section className="rounded-2xl border border-line bg-card p-5 surface-shadow space-y-3">
      <header className="flex items-center justify-between">
        <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-subtle inline-flex items-center gap-1.5">
          <ShieldCheck size={11} /> Conflict-of-interest disclosures (Charter §8)
        </p>
        {!creating && (
          <button type="button" onClick={() => setCreating(true)} className="text-xs text-brand-700 hover:text-brand-900 inline-flex items-center gap-1">
            <Plus size={11} /> Disclose
          </button>
        )}
      </header>

      {creating && (
        <div className="rounded-xl border border-line bg-card-solid p-3 space-y-2">
          <label className="block">
            <span className="text-[10px] uppercase tracking-wider font-bold text-subtle">Scope * (one short line)</span>
            <input value={scope} onChange={(e) => setScope(e.target.value)} placeholder="e.g. Affiliated with company X / Spouse works at Y / Past advisor on Z" className="mt-1 w-full bg-card-solid border border-line rounded-lg px-3 py-1.5 text-sm" />
          </label>
          <label className="block">
            <span className="text-[10px] uppercase tracking-wider font-bold text-subtle">Description *</span>
            <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Why this might constitute a COI for committee discussions." className="mt-1 w-full bg-card-solid border border-line rounded-lg px-3 py-1.5 text-sm" />
          </label>
          <div className="flex items-center justify-end gap-2">
            {error && <p className="text-[11px] text-rose-700 inline-flex items-center gap-1.5"><AlertCircle size={11} /> {error}</p>}
            <button type="button" onClick={() => setCreating(false)} className="text-xs text-muted hover:text-fg inline-flex items-center gap-1"><X size={11} /> Cancel</button>
            <button type="button" onClick={create} disabled={pending || !scope.trim() || !description.trim()} className="bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white text-xs font-bold px-3 py-1.5 rounded-lg">
              {pending ? <Loader2 size={11} className="animate-spin" /> : "Record"}
            </button>
          </div>
        </div>
      )}

      {active.length === 0 && resolved.length === 0 ? (
        <p className="text-xs text-subtle italic">No disclosures on file. The Charter expects members to record actual or potential conflicts when they arise.</p>
      ) : (
        <ul className="space-y-1.5">
          {active.map((d) => (
            <li key={d.id} className="rounded-xl bg-elevated/40 border border-line p-3">
              <p className="text-sm font-semibold text-fg">{d.scope}</p>
              <p className="text-xs text-muted mt-0.5">{d.description}</p>
              <div className="flex items-center justify-between mt-2">
                <span className="text-[10px] text-subtle font-mono">Declared {new Date(d.declaredAt).toLocaleDateString()}</span>
                <button type="button" onClick={() => resolve(d.id)} disabled={pending} className="text-[11px] text-emerald-700 hover:text-emerald-900">Mark resolved</button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {resolved.length > 0 && (
        <details>
          <summary className="text-xs text-muted cursor-pointer hover:text-fg">Resolved ({resolved.length})</summary>
          <ul className="mt-2 space-y-1.5">
            {resolved.map((d) => (
              <li key={d.id} className="rounded-xl bg-elevated/20 border border-line p-3 opacity-70">
                <p className="text-sm font-semibold text-fg">{d.scope}</p>
                <p className="text-xs text-muted mt-0.5">{d.description}</p>
                <p className="text-[10px] text-subtle font-mono mt-1">
                  Declared {new Date(d.declaredAt).toLocaleDateString()}
                  {d.resolvedAt && ` · resolved ${new Date(d.resolvedAt).toLocaleDateString()}`}
                </p>
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
