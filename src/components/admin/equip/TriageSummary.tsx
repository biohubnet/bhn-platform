"use client";
/**
 * AI triage summary panel on /admin/equip/[id].
 *
 * Reviewer hits "Generate summary" → AI reads the application and
 * returns headline + strengths + concerns + verdict. Saves the
 * reviewer reading 800 words to triage in 30 seconds.
 *
 * No persistence — every generation is fresh. The reviewer always
 * makes the actual decision; this is just decision support.
 */
import { useState } from "react";
import { Loader2, Sparkles, AlertCircle, CheckCircle2, AlertTriangle, MinusCircle } from "lucide-react";

interface Triage {
  headline: string;
  strengths: string[];
  concerns: string[];
  verdict: "looks_promising" | "needs_more_info" | "weak_fit";
}

const VERDICT_META: Record<Triage["verdict"], { label: string; tone: string; icon: React.ComponentType<{ size?: number; className?: string }> }> = {
  looks_promising:  { label: "Looks promising",  tone: "emerald", icon: CheckCircle2 },
  needs_more_info:  { label: "Needs more info",  tone: "amber",   icon: AlertTriangle },
  weak_fit:         { label: "Weak fit",         tone: "rose",    icon: MinusCircle },
};

export function TriageSummary({ applicationId }: { applicationId: string }) {
  const [triage, setTriage] = useState<Triage | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/equip/applications/${applicationId}/triage`, { method: "POST" });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j as { error?: string }).error ?? "AI request failed");
      }
      const j = (await res.json()) as { triage: Triage };
      setTriage(j.triage);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl border border-line bg-brand-50/30 p-4 space-y-3 surface-shadow">
      <header className="flex items-center gap-2">
        <Sparkles size={14} className="text-brand-700" />
        <h3 className="text-sm font-bold text-fg">AI triage</h3>
        <span className="text-[10px] font-bold uppercase tracking-wider bg-brand-100 text-brand-800 ring-1 ring-brand-200 px-1.5 py-0.5 rounded">
          Decision support
        </span>
      </header>

      {!triage && !busy && (
        <>
          <p className="text-[11px] text-muted leading-snug">
            Generate a one-paragraph summary plus strengths / concerns / verdict.
            You always make the actual call — this is just to speed up the read.
          </p>
          <button
            type="button"
            onClick={generate}
            className="inline-flex items-center gap-1.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold px-3 py-2 rounded-lg"
          >
            <Sparkles size={11} /> Generate summary
          </button>
        </>
      )}

      {busy && (
        <p className="text-[11px] text-muted inline-flex items-center gap-1.5">
          <Loader2 size={11} className="animate-spin" /> Reading the application…
        </p>
      )}

      {error && (
        <p className="text-[11px] text-rose-700 inline-flex items-center gap-1.5">
          <AlertCircle size={11} /> {error}
        </p>
      )}

      {triage && (
        <div className="space-y-3">
          <VerdictPill verdict={triage.verdict} />
          <p className="text-sm text-fg leading-relaxed font-semibold">{triage.headline}</p>
          {triage.strengths.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-wider font-bold text-emerald-700 mb-1">Strengths</p>
              <ul className="text-xs text-fg space-y-0.5 list-disc pl-5">
                {triage.strengths.map((s, i) => <li key={i}>{s}</li>)}
              </ul>
            </div>
          )}
          {triage.concerns.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-wider font-bold text-amber-700 mb-1">Concerns</p>
              <ul className="text-xs text-fg space-y-0.5 list-disc pl-5">
                {triage.concerns.map((c, i) => <li key={i}>{c}</li>)}
              </ul>
            </div>
          )}
          <button
            type="button"
            onClick={generate}
            className="text-[11px] font-bold text-brand-700 hover:text-brand-800"
          >
            Regenerate
          </button>
        </div>
      )}
    </section>
  );
}

function VerdictPill({ verdict }: { verdict: Triage["verdict"] }) {
  const meta = VERDICT_META[verdict];
  const Icon = meta.icon;
  const toneCls =
    meta.tone === "emerald" ? "bg-emerald-50 text-emerald-800 ring-emerald-200" :
    meta.tone === "amber"   ? "bg-amber-50 text-amber-800 ring-amber-200" :
                               "bg-rose-50 text-rose-800 ring-rose-200";
  return (
    <span className={"inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ring-1 ring-inset " + toneCls}>
      <Icon size={11} /> {meta.label}
    </span>
  );
}
