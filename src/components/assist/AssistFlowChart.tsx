/**
 * AssistFlowChart — a plain (server-renderable) "how it works" diagram
 * for the AutoPipette behaviour-assist system.
 *
 * Lives at the end of /profile/assist-history (the trust artifact) so a
 * user — or an IT / privacy reviewer — can see the full data path at a
 * glance: what's captured, when AI is involved, where it's stored, and
 * the controls that bound it. Purely presentational + self-contained,
 * so it can also headline a no-login evaluation page.
 */
import {
  MousePointerClick,
  Send,
  Gauge,
  Sparkles,
  MessageSquareText,
  Layers,
  ShieldCheck,
  EyeOff,
  Lock,
  Clock,
  Trash2,
} from "lucide-react";

interface Step {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  title: string;
  body: string;
}

const STEPS: Step[] = [
  {
    icon: MousePointerClick,
    title: "1 · You use the platform",
    body: "A lightweight script notes intent-level signals only — clicks, time-on-page, form focus, errors, and repeated/dead clicks. Never your keystrokes, field values, or page content.",
  },
  {
    icon: Send,
    title: "2 · Signals batch to the server",
    body: "Events are sent in small batches every ~15 seconds. If you haven't consented, they're dropped the moment they arrive — nothing is stored.",
  },
  {
    icon: Gauge,
    title: "3 · A fast rule check scores “stuck”",
    body: "A cheap, fixed-weight scorer rates your last ~15 minutes for stuck signals (rage-clicks, error loops, long dwell). No AI runs at this step.",
  },
  {
    icon: Sparkles,
    title: "4 · AI reads intent — only when you're clearly stuck",
    body: "Then, and only then, the model infers what you're trying to do and writes one specific next step. It's budget-capped (≤20/day, 1 per 5 min) and any link it suggests is restricted to known in-app routes.",
  },
  {
    icon: MessageSquareText,
    title: "5 · A single hint appears",
    body: "You see one dismissible chip — never a pile-up. Dismiss it and that nudge won't keep coming back.",
  },
  {
    icon: Layers,
    title: "6 · Aggregated, then aged out",
    body: "Overnight, raw events roll up into daily aggregates and weekly summaries. Raw events expire after 90 days; aggregates are kept longer but hold no per-action detail.",
  },
  {
    icon: ShieldCheck,
    title: "7 · You stay in control",
    body: "Everything on file is shown on this page. Adjust the hint sensitivity, pause collection, or delete all of it in one click — any time.",
  },
];

const GUARANTEES: { icon: React.ComponentType<{ size?: number; className?: string }>; label: string }[] = [
  { icon: EyeOff, label: "No keystrokes or field values" },
  { icon: Lock, label: "Consent-gated — off means nothing stored" },
  { icon: Clock, label: "Raw events auto-expire (90 days)" },
  { icon: Trash2, label: "One-click delete, any time" },
];

export function AssistFlowChart() {
  return (
    <section className="rounded-2xl border border-line bg-card p-5 sm:p-6">
      <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-subtle">
        How it works
      </p>
      <h2 className="text-lg font-bold text-fg mt-1 tracking-tight">
        What AutoPipette does with your activity
      </h2>
      <p className="text-sm text-muted mt-1.5 leading-relaxed max-w-2xl">
        The full path, end to end — what&apos;s captured, when (and whether) AI
        is involved, where it&apos;s stored, and the controls that bound it.
      </p>

      {/* Vertical flow */}
      <ol className="mt-5">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          const last = i === STEPS.length - 1;
          return (
            <li key={s.title} className={`relative flex gap-4 ${last ? "" : "pb-5"}`}>
              {/* connector line down to the next node */}
              {!last && (
                <span
                  aria-hidden
                  className="absolute left-[19px] top-10 bottom-0 w-px bg-line"
                />
              )}
              <span className="relative z-10 shrink-0 w-10 h-10 rounded-xl bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-100 flex items-center justify-center">
                <Icon size={16} />
              </span>
              <div className="min-w-0 pt-1.5">
                <p className="text-sm font-bold text-fg leading-snug">{s.title}</p>
                <p className="text-xs text-muted mt-1 leading-relaxed">{s.body}</p>
              </div>
            </li>
          );
        })}
      </ol>

      {/* Privacy guarantees */}
      <div className="mt-5 pt-4 border-t border-line">
        <p className="text-[10px] uppercase tracking-[0.18em] font-bold text-subtle mb-2.5">
          Guaranteed by design
        </p>
        <ul className="flex flex-wrap gap-2">
          {GUARANTEES.map((g) => {
            const Icon = g.icon;
            return (
              <li
                key={g.label}
                className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 text-emerald-800 ring-1 ring-inset ring-emerald-200 px-2.5 py-1 text-[11px] font-semibold"
              >
                <Icon size={12} />
                {g.label}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
