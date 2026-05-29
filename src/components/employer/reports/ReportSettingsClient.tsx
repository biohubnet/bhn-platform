"use client";

/**
 * Report settings — set hiring targets (OKRs), enter recruiting costs,
 * and toggle DEI reporting. All writes go through the gated
 * /api/employer/reports/* routes (manager+ for targets/costs, owner for
 * DEI). On success we router.refresh() to re-read server state.
 */
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, ShieldAlert } from "lucide-react";
import { Card } from "@/components/ui/Card";

type MetricOpt = { key: string; label: string; unit: string; comparator: string; hint: string };
type TargetRow = { id: string; metricKey: string; label: string; targetValue: number; comparator: string; period: string };
type CostRow = { id: string; costType: string; amount: number; currency: string; incurredAt: string };

const COST_TYPES = [
  { key: "advertising", label: "Advertising" },
  { key: "agency_fee", label: "Agency fees" },
  { key: "referral_bonus", label: "Referral bonus" },
  { key: "tooling", label: "Tooling" },
  { key: "events", label: "Events" },
  { key: "relocation", label: "Relocation" },
  { key: "other", label: "Other" },
];

const H2 = "text-[10px] font-bold uppercase tracking-[0.18em] text-subtle mb-3";
const INPUT = "text-sm px-3 py-2 rounded-lg bg-card border border-line focus:outline-none focus:ring-2 focus:ring-brand-400 text-fg placeholder:text-muted";

export function ReportSettingsClient({
  metricOptions,
  targets,
  costs,
  deiEnabled,
  isOwner,
}: {
  metricOptions: MetricOpt[];
  targets: TargetRow[];
  costs: CostRow[];
  deiEnabled: boolean;
  isOwner: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [tMetric, setTMetric] = useState(metricOptions[0]?.key ?? "");
  const [tValue, setTValue] = useState("");
  const [cType, setCType] = useState("advertising");
  const [cAmount, setCAmount] = useState("");
  const [cDate, setCDate] = useState("");

  async function call(url: string, method: string, body?: unknown) {
    setBusy(true);
    setErr(null);
    try {
      const r = await fetch(url, {
        method,
        headers: { "content-type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || "Something went wrong.");
      router.refresh();
      return true;
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Something went wrong.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  const selectedMetric = metricOptions.find((m) => m.key === tMetric);

  return (
    <div className="space-y-5">
      {err && (
        <div className="flex items-start gap-2 rounded-lg bg-rose-50 ring-1 ring-inset ring-rose-200 px-3 py-2 text-[12px] text-[#881337]">
          <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" /> <span>{err}</span>
        </div>
      )}

      {/* Targets */}
      <Card className="p-5">
        <h2 className={H2}>Hiring targets (OKRs)</h2>
        {targets.length > 0 ? (
          <ul className="divide-y divide-line mb-4">
            {targets.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-3 py-2.5">
                <span className="text-sm text-fg">
                  {t.label}{" "}
                  <span className="text-muted">
                    — {t.comparator === "lte" ? "≤" : "≥"} {t.targetValue} <span className="text-[10px] uppercase">/ {t.period}</span>
                  </span>
                </span>
                <button
                  onClick={() => call(`/api/employer/reports/targets/${t.id}`, "DELETE")}
                  disabled={busy}
                  className="text-muted hover:text-rose-600 disabled:opacity-50"
                  aria-label="Remove target"
                >
                  <Trash2 size={15} />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted mb-4">No targets set. Add one to light up RAG status across the reports.</p>
        )}

        <div className="flex flex-wrap items-end gap-2">
          <select value={tMetric} onChange={(e) => setTMetric(e.target.value)} className={INPUT}>
            {metricOptions.map((m) => (
              <option key={m.key} value={m.key}>{m.label}</option>
            ))}
          </select>
          <input
            type="number"
            value={tValue}
            onChange={(e) => setTValue(e.target.value)}
            placeholder={selectedMetric?.unit === "percent" ? "%" : selectedMetric?.unit === "currency" ? "$" : "value"}
            className={`${INPUT} w-28`}
          />
          <button
            onClick={async () => {
              if (await call("/api/employer/reports/targets", "POST", { metricKey: tMetric, targetValue: Number(tValue), comparator: selectedMetric?.comparator })) setTValue("");
            }}
            disabled={busy || !tValue}
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg bg-brand-600 text-white disabled:opacity-50"
          >
            <Plus size={13} /> Set target
          </button>
        </div>
        {selectedMetric && (
          <p className="mt-2 text-[11px] text-muted">
            {selectedMetric.hint} · {selectedMetric.comparator === "lte" ? "lower is better" : "higher is better"}.
          </p>
        )}
      </Card>

      {/* Costs */}
      <Card className="p-5">
        <h2 className={H2}>Recruiting costs</h2>
        {costs.length > 0 ? (
          <ul className="divide-y divide-line mb-4 max-h-64 overflow-y-auto">
            {costs.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3 py-2.5">
                <span className="text-sm text-fg">
                  {COST_TYPES.find((t) => t.key === c.costType)?.label ?? c.costType}{" "}
                  <span className="text-muted">— {new Intl.NumberFormat("en-CA", { style: "currency", currency: c.currency, maximumFractionDigits: 0 }).format(c.amount)} · {c.incurredAt.slice(0, 10)}</span>
                </span>
                <button
                  onClick={() => call(`/api/employer/reports/costs/${c.id}`, "DELETE")}
                  disabled={busy}
                  className="text-muted hover:text-rose-600 disabled:opacity-50"
                  aria-label="Remove cost"
                >
                  <Trash2 size={15} />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted mb-4">No costs recorded. Add spend to compute cost-per-hire.</p>
        )}

        <div className="flex flex-wrap items-end gap-2">
          <select value={cType} onChange={(e) => setCType(e.target.value)} className={INPUT}>
            {COST_TYPES.map((t) => (
              <option key={t.key} value={t.key}>{t.label}</option>
            ))}
          </select>
          <input type="number" value={cAmount} onChange={(e) => setCAmount(e.target.value)} placeholder="Amount" className={`${INPUT} w-28`} />
          <input type="date" value={cDate} onChange={(e) => setCDate(e.target.value)} className={INPUT} />
          <button
            onClick={async () => {
              if (await call("/api/employer/reports/costs", "POST", { costType: cType, amount: Number(cAmount), incurredAt: cDate || undefined })) {
                setCAmount("");
                setCDate("");
              }
            }}
            disabled={busy || !cAmount}
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg bg-brand-600 text-white disabled:opacity-50"
          >
            <Plus size={13} /> Add cost
          </button>
        </div>
      </Card>

      {/* DEI toggle */}
      <Card className="p-5">
        <h2 className={H2}>Diversity (DEI) reporting</h2>
        <p className="text-sm text-muted mb-3">
          When enabled, applicants may <strong>voluntarily</strong> self-identify at apply time, and the diversity report
          shows aggregate, small-count-suppressed representation by stage. Off by default — enable only after legal /
          privacy sign-off. Never shows individuals.
        </p>
        {isOwner ? (
          <button
            onClick={() => call("/api/employer/reports/dei", "POST", { enabled: !deiEnabled })}
            disabled={busy}
            className={`text-xs font-semibold px-3 py-2 rounded-lg disabled:opacity-50 ${
              deiEnabled ? "bg-rose-600 text-white" : "bg-brand-600 text-white"
            }`}
          >
            {deiEnabled ? "Disable DEI reporting" : "Enable DEI reporting"}
          </button>
        ) : (
          <p className="text-[11px] text-muted">Only a company owner can change this.</p>
        )}
        <p className="mt-2 text-[11px] text-muted">
          Currently <strong className={deiEnabled ? "text-emerald-600" : "text-muted"}>{deiEnabled ? "enabled" : "disabled"}</strong>.
        </p>
      </Card>
    </div>
  );
}
