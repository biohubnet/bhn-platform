"use client";

/**
 * Start a new mock interview: role (required), optional focus / pasted job
 * description, and how many questions. Creates the session server-side
 * (questions are AI-generated) and navigates into the runner.
 */
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Loader2, Mic } from "lucide-react";
import { Card } from "@/components/ui/Card";

export function NewInterviewForm() {
  const router = useRouter();
  const [role, setRole] = useState("");
  const [context, setContext] = useState("");
  const [count, setCount] = useState(5);
  const [showContext, setShowContext] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    if (role.trim().length < 2) { setError("Enter the role you're practising for."); return; }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/mock-interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: role.trim(), context: context.trim(), count }),
      });
      const j = (await res.json().catch(() => ({}))) as { ok?: boolean; id?: string; error?: string };
      if (!res.ok || !j.ok || !j.id) { setError(j.error ?? "Couldn't start — try again."); setBusy(false); return; }
      router.push(`/mock-interview/${j.id}`);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  const input = "w-full rounded-lg border border-line bg-card-solid px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400";

  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 text-sm font-bold text-fg">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-700"><Mic size={15} /></span>
        Start a new practice interview
      </div>

      <div className="mt-4 space-y-3">
        <label className="block">
          <span className="text-[11px] font-bold uppercase tracking-wider text-subtle">Role you&apos;re practising for</span>
          <input
            value={role}
            onChange={(e) => setRole(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !showContext && start()}
            placeholder="e.g. Regulatory Affairs Associate · Product Manager · Research Scientist"
            maxLength={120}
            className={`mt-1 ${input}`}
          />
        </label>

        {showContext ? (
          <label className="block">
            <span className="text-[11px] font-bold uppercase tracking-wider text-subtle">Focus / job description (optional)</span>
            <textarea
              value={context}
              onChange={(e) => setContext(e.target.value)}
              rows={4}
              placeholder="Paste the job posting, or note what you want to focus on (e.g. leadership stories, a specific company)."
              className={`mt-1 resize-y ${input}`}
            />
          </label>
        ) : (
          <button type="button" onClick={() => setShowContext(true)} className="text-xs font-semibold text-brand-700 hover:text-brand-900">
            + Add a job description or focus (tailors the questions)
          </button>
        )}

        <div className="flex flex-wrap items-end justify-between gap-3">
          <label className="block">
            <span className="text-[11px] font-bold uppercase tracking-wider text-subtle">Questions</span>
            <select value={count} onChange={(e) => setCount(Number(e.target.value))} className={`mt-1 ${input} w-auto`}>
              {[3, 5, 7, 10].map((n) => <option key={n} value={n}>{n} questions</option>)}
            </select>
          </label>
          <button
            type="button"
            onClick={start}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {busy ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
            {busy ? "Generating questions…" : "Start interview"}
          </button>
        </div>
        {error && <p className="text-xs text-rose-700">{error}</p>}
      </div>
    </Card>
  );
}
