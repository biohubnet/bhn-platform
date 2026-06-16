"use client";

/** Control surface for the triage agent: kill switch, run-now, before/after
 *  throughput metric, and recent runs. */
import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Power, Play, Loader2, Gauge, Clock, ListChecks, ShieldCheck } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

export interface AgentRunRow {
  id: string;
  trigger: string;
  startedAt: string;
  itemsProcessed: number;
  itemsProposed: number;
  durationMs: number | null;
  ok: boolean;
  summary: string;
}

const fmt = (iso: string) => {
  try { return new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }); }
  catch { return iso; }
};

export function AiAgentPanel({
  enabled: initialEnabled, baselineSec, agentSecPerItem, savedPerItem, totalProcessed, hoursSaved, openQueue, runs,
}: {
  enabled: boolean;
  baselineSec: number;
  agentSecPerItem: number | null;
  savedPerItem: number | null;
  totalProcessed: number;
  hoursSaved: number | null;
  openQueue: number;
  runs: AgentRunRow[];
}) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(initialEnabled);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [baseline, setBaseline] = useState(String(baselineSec));

  async function post(body: Record<string, unknown>): Promise<{ ok?: boolean; result?: { processed: number; proposed: number; skipped?: string }; error?: string }> {
    const res = await fetch("/api/admin/ai-agent", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    return res.json().catch(() => ({}));
  }

  async function toggle() {
    setBusy("toggle");
    const next = !enabled;
    await post({ action: next ? "enable" : "disable" });
    setEnabled(next);
    setBusy(null);
    setMsg(next ? "Agent enabled." : "Agent disabled (kill switch).");
    router.refresh();
  }
  async function runNow() {
    setBusy("run");
    setMsg(null);
    const j = await post({ action: "run" });
    setBusy(null);
    if (j.result?.skipped) setMsg(`Skipped: ${j.result.skipped}`);
    else if (j.result) setMsg(`Ran: triaged ${j.result.processed}, proposed ${j.result.proposed}.`);
    else setMsg(j.error ?? "Run failed.");
    router.refresh();
  }
  async function saveBaseline() {
    const n = Number(baseline);
    if (!Number.isFinite(n) || n <= 0) return;
    setBusy("baseline");
    await post({ action: "baseline", baselineSeconds: n });
    setBusy(null);
    setMsg("Baseline saved.");
    router.refresh();
  }

  const metric = (label: string, value: string, icon: React.ReactNode, sub?: string) => (
    <div className="rounded-xl border border-line bg-card-solid p-4">
      <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-subtle">{icon} {label}</p>
      <p className="mt-1 text-xl font-bold text-fg">{value}</p>
      {sub && <p className="mt-0.5 text-[11px] text-muted">{sub}</p>}
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Status + controls */}
      <Card className="flex flex-wrap items-center justify-between gap-4 p-5">
        <div className="flex items-center gap-3">
          <span className={cn("flex h-10 w-10 items-center justify-center rounded-full", enabled ? "bg-emerald-50 text-emerald-700" : "bg-elevated text-muted")}>
            <ShieldCheck size={18} />
          </span>
          <div>
            <p className="font-semibold text-fg">{enabled ? "Agent is on" : "Agent is off"}</p>
            <p className="text-[12px] text-muted">{openQueue} open in the review queue · scheduled every 6h via Inngest</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={runNow}
            disabled={busy !== null}
            className="inline-flex items-center gap-1.5 rounded-md border border-line bg-card-solid px-3.5 py-2 text-xs font-semibold text-fg hover:bg-elevated disabled:opacity-50"
          >
            {busy === "run" ? <Loader2 size={13} className="animate-spin" /> : <Play size={13} />} Run now
          </button>
          <button
            type="button"
            onClick={toggle}
            disabled={busy !== null}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-4 py-2 text-xs font-bold text-white disabled:opacity-50",
              enabled ? "bg-rose-600 hover:bg-rose-700" : "bg-emerald-600 hover:bg-emerald-700",
            )}
          >
            {busy === "toggle" ? <Loader2 size={13} className="animate-spin" /> : <Power size={13} />} {enabled ? "Disable (kill switch)" : "Enable"}
          </button>
        </div>
      </Card>

      {msg && <p className="text-xs font-semibold text-brand-700">{msg}</p>}

      {/* Before / after throughput */}
      <div>
        <h2 className="mb-2 text-sm font-semibold text-fg">Before / after — manual vs agent</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {metric("Manual baseline", `${baselineSec}s`, <Clock size={12} />, "per answer triaged by hand")}
          {metric("Agent", agentSecPerItem == null ? "—" : `${agentSecPerItem}s`, <Gauge size={12} />, agentSecPerItem == null ? "no runs yet" : "per answer")}
          {metric("Saved / answer", savedPerItem == null ? "—" : `${Math.round(savedPerItem)}s`, <Clock size={12} />, savedPerItem == null ? "—" : `${baselineSec ? Math.round((savedPerItem / baselineSec) * 100) : 0}% faster`)}
          {metric("Time saved", hoursSaved == null ? "—" : `${hoursSaved} h`, <ListChecks size={12} />, `${totalProcessed} answers triaged`)}
        </div>
        <div className="mt-3 flex items-end gap-2">
          <label className="block">
            <span className="mb-1 block text-[11px] font-semibold text-subtle">Manual baseline (seconds / answer)</span>
            <input
              value={baseline}
              onChange={(e) => setBaseline(e.target.value)}
              inputMode="numeric"
              className="w-44 rounded-md border border-line bg-card-solid px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
            />
          </label>
          <button type="button" onClick={saveBaseline} disabled={busy !== null} className="rounded-md border border-line bg-card-solid px-3 py-1.5 text-xs font-semibold text-fg hover:bg-elevated disabled:opacity-50">Save</button>
        </div>
      </div>

      {/* Recent runs */}
      <div className="overflow-x-auto rounded-xl border border-line bg-card-solid">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-line text-[10px] uppercase tracking-wide text-subtle">
              <th className="px-3 py-2">When</th><th className="px-3 py-2">Trigger</th><th className="px-3 py-2">Processed</th><th className="px-3 py-2">Proposed</th><th className="px-3 py-2">Duration</th><th className="px-3 py-2">Summary</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {runs.map((r) => (
              <tr key={r.id}>
                <td className="whitespace-nowrap px-3 py-2 text-muted">{fmt(r.startedAt)}</td>
                <td className="px-3 py-2"><span className="rounded-full bg-elevated px-2 py-0.5 text-[10px] font-mono text-subtle">{r.trigger}</span></td>
                <td className="px-3 py-2 tabular-nums">{r.itemsProcessed}</td>
                <td className="px-3 py-2 tabular-nums">{r.itemsProposed}</td>
                <td className="px-3 py-2 tabular-nums">{r.durationMs == null ? "—" : `${(r.durationMs / 1000).toFixed(1)}s`}</td>
                <td className="px-3 py-2 text-muted">{r.summary}</td>
              </tr>
            ))}
            {runs.length === 0 && <tr><td colSpan={6} className="px-3 py-8 text-center text-muted">No runs yet. Enable the agent and hit Run now.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
