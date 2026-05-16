"use client";
/**
 * Admin manager for HQP feedback rounds.
 *
 * Left side: list of rounds with status, response count, jump to
 * aggregate. Right side: create-form with editable topic list
 * (defaults pre-filled from the BHN template).
 */
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, Plus, Trash2, Lock, Unlock, AlertCircle, GripVertical, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { DEFAULT_TOPICS, type FeedbackTopic } from "@/lib/hqp/rounds";

interface Round {
  id: string;
  title: string;
  description: string | null;
  status: string;
  opensAt: string | Date;
  closesAt: string | Date;
  responseCount: number;
}

interface Props {
  initial: Round[];
}

function makeId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function fmt(d: string | Date) {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleString("en-US", {
    timeZone: "America/Toronto",
    month: "short", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit", hour12: true,
  });
}

export function HqpRoundsManager({ initial }: Props) {
  return (
    <div className="space-y-5">
      <NewRoundForm />
      <RoundsList rows={initial} />
    </div>
  );
}

function NewRoundForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [opensAt, setOpensAt] = useState(() => new Date().toISOString().slice(0, 16));
  const [closesAt, setClosesAt] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().slice(0, 16);
  });
  const [topics, setTopics] = useState<FeedbackTopic[]>(DEFAULT_TOPICS);
  const [error, setError] = useState<string | null>(null);

  function addTopic() {
    setTopics((ts) => [...ts, { id: makeId(), label: "", question: "", order: ts.length }]);
  }
  function removeTopic(id: string) {
    setTopics((ts) => ts.filter((t) => t.id !== id));
  }
  function patchTopic(id: string, key: keyof FeedbackTopic, value: string) {
    setTopics((ts) => ts.map((t) => t.id === id ? { ...t, [key]: value } : t));
  }
  function loadDefaults() {
    setTopics(DEFAULT_TOPICS.map((t) => ({ ...t, id: makeId() })));
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/admin/committees/hqp/rounds", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title, description: description || undefined,
            opensAt: new Date(opensAt).toISOString(),
            closesAt: new Date(closesAt).toISOString(),
            topics,
          }),
        });
        const j = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(j.error ?? "Failed to create round");
        setTitle(""); setDescription("");
        router.refresh();
      } catch (e) { setError((e as Error).message); }
    });
  }

  return (
    <section className="rounded-2xl border border-line bg-card p-5 surface-shadow">
      <header className="flex items-center justify-between mb-3">
        <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-subtle">Create a new feedback round</p>
        <button type="button" onClick={loadDefaults} className="text-xs text-brand-700 hover:text-brand-900">Load default topics</button>
      </header>
      <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_1fr] gap-2">
        <label className="block">
          <span className="text-[10px] uppercase tracking-wider font-bold text-subtle">Title *</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="March 2026 feedback round" className="mt-1 w-full bg-card-solid border border-line rounded-lg px-3 py-2 text-sm" />
        </label>
        <label className="block">
          <span className="text-[10px] uppercase tracking-wider font-bold text-subtle">Opens *</span>
          <input type="datetime-local" value={opensAt} onChange={(e) => setOpensAt(e.target.value)} className="mt-1 w-full bg-card-solid border border-line rounded-lg px-2 py-2 text-sm font-mono" />
        </label>
        <label className="block">
          <span className="text-[10px] uppercase tracking-wider font-bold text-subtle">Closes *</span>
          <input type="datetime-local" value={closesAt} onChange={(e) => setClosesAt(e.target.value)} className="mt-1 w-full bg-card-solid border border-line rounded-lg px-2 py-2 text-sm font-mono" />
        </label>
      </div>
      <label className="block mt-2">
        <span className="text-[10px] uppercase tracking-wider font-bold text-subtle">Intro for members (optional)</span>
        <textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What's the focus of this round? Anything members should know up-front?" className="mt-1 w-full bg-card-solid border border-line rounded-lg px-3 py-2 text-sm" />
      </label>

      <div className="mt-4 space-y-2">
        <p className="text-[10px] uppercase tracking-wider font-bold text-subtle">Topics (each one becomes a question on the member form)</p>
        {topics.length === 0 && (
          <p className="text-xs text-subtle italic">No topics yet. Add some — or click <em>Load default topics</em> to start with BHN's standard set.</p>
        )}
        {topics.map((t) => (
          <div key={t.id} className="rounded-xl border border-line bg-card-solid p-3 space-y-2">
            <div className="flex items-center gap-2">
              <GripVertical size={14} className="text-subtle shrink-0" />
              <input
                placeholder="Short label, eg. Platform UX"
                value={t.label}
                onChange={(e) => patchTopic(t.id, "label", e.target.value)}
                className="flex-1 bg-card-solid border border-line rounded-lg px-2 py-1.5 text-xs font-semibold"
              />
              <button type="button" onClick={() => removeTopic(t.id)} className="text-rose-700 hover:text-rose-900">
                <Trash2 size={12} />
              </button>
            </div>
            <textarea
              rows={2}
              placeholder="The full question members will see and respond to."
              value={t.question}
              onChange={(e) => patchTopic(t.id, "question", e.target.value)}
              className="w-full bg-card-solid border border-line rounded-lg px-3 py-1.5 text-xs"
            />
          </div>
        ))}
        <button type="button" onClick={addTopic} className="inline-flex items-center gap-1 text-xs text-brand-700 hover:text-brand-900">
          <Plus size={11} /> Add topic
        </button>
      </div>

      <div className="mt-4 flex items-center justify-end gap-3">
        {error && <p className="text-[11px] text-rose-700 inline-flex items-center gap-1.5"><AlertCircle size={11} /> {error}</p>}
        <button type="button" onClick={submit} disabled={pending || !title.trim() || topics.length === 0} className="inline-flex items-center gap-1.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white text-sm font-bold px-4 py-2 rounded-xl">
          {pending ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
          Create round
        </button>
      </div>
    </section>
  );
}

function RoundsList({ rows }: { rows: Round[] }) {
  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-line bg-card p-12 text-center surface-shadow">
        <p className="font-medium text-fg">No rounds yet</p>
        <p className="text-sm text-muted mt-1">Create one above. Members will see it on <code className="font-mono">/committee/hqp</code> as soon as it opens.</p>
      </div>
    );
  }
  return (
    <section className="rounded-2xl border border-line bg-card overflow-hidden surface-shadow">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-line text-left text-[10px] text-muted uppercase tracking-wide">
            <th className="px-5 py-3">Round</th>
            <th className="px-5 py-3">Window (ET)</th>
            <th className="px-5 py-3">Status</th>
            <th className="px-5 py-3">Responses</th>
            <th className="px-5 py-3 w-px">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((r) => <RoundRow key={r.id} r={r} />)}
        </tbody>
      </table>
    </section>
  );
}

function RoundRow({ r }: { r: Round }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function act(action: string) {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch(`/api/admin/committees/hqp/rounds/${r.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        });
        const j = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(j.error ?? "Action failed");
        router.refresh();
      } catch (e) { setError((e as Error).message); }
    });
  }

  return (
    <tr className="align-top">
      <td className="px-5 py-3">
        <p className="font-medium text-fg">{r.title}</p>
        {r.description && <p className="text-[11px] text-muted line-clamp-1">{r.description}</p>}
      </td>
      <td className="px-5 py-3 text-muted text-xs">
        <p>{fmt(r.opensAt)}</p>
        <p>→ {fmt(r.closesAt)}</p>
      </td>
      <td className="px-5 py-3">
        {r.status === "open" ? <Badge tone="success">Open</Badge> : <Badge tone="danger">Closed</Badge>}
      </td>
      <td className="px-5 py-3 font-mono text-fg">{r.responseCount}</td>
      <td className="px-5 py-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Link href={`/admin/committees/hqp/rounds/${r.id}`} className="text-xs text-brand-700 hover:text-brand-900 inline-flex items-center gap-1">
            Aggregate <ChevronRight size={11} />
          </Link>
          {r.status === "open" ? (
            <button type="button" onClick={() => act("close")} disabled={pending} className="text-xs text-rose-700 hover:text-rose-900 inline-flex items-center gap-1 disabled:opacity-50">
              {pending ? <Loader2 size={11} className="animate-spin" /> : <Lock size={11} />} Close
            </button>
          ) : (
            <button type="button" onClick={() => act("reopen")} disabled={pending} className="text-xs text-emerald-700 hover:text-emerald-900 inline-flex items-center gap-1 disabled:opacity-50">
              {pending ? <Loader2 size={11} className="animate-spin" /> : <Unlock size={11} />} Reopen
            </button>
          )}
        </div>
        {error && <p className="text-[11px] text-rose-700 mt-1">{error}</p>}
      </td>
    </tr>
  );
}
