"use client";

/**
 * "How your answer is analysed" — a transparency popup for the Mock Interview
 * tool. Sets honest expectations: what is measured directly from the
 * recording, what the AI estimates from those signals, and what is out of
 * scope. Opened from the runner header.
 */
import { useEffect } from "react";
import { X, Check, Sparkles, Minus } from "lucide-react";

const MEASURED = [
  "Speaking pace (words per minute)",
  "Filler words (count and frequency)",
  "Pauses between words",
  "Stumbles and restarts (repeated words)",
  "Pitch and pitch variation (monotone vs. expressive)",
  "Loudness variation (vocal projection and dynamics)",
  "Proportion of voiced speech",
  "Answer length and the words you said",
];

const ESTIMATED = [
  "Content quality — relevance, structure, and specificity",
  "Confidence",
  "Composure and signs of nerves",
  "Interpretation of your tone",
  "Coaching and what employers are looking for",
];

const NOT_ASSESSED = [
  "Emotional warmth or sentiment",
  "Body language, eye contact, and facial expression",
  "Specific emotional states",
  "Absolute volume or suitability for a room",
  "Pronunciation and accent",
  "Voice timbre (e.g. breathiness)",
  "The truthfulness or real-world merit of your examples",
];

export function AnalysisInfoModal({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-2xl border border-line bg-card-solid shadow-elevated">
        <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
          <div>
            <h2 className="text-base font-bold text-fg">How your answer is analysed</h2>
            <p className="mt-0.5 text-[12px] text-muted">
              What this tool measures, what it estimates, and what it does not assess.
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted hover:bg-elevated hover:text-fg">
            <X size={16} />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-4">
          <section>
            <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-emerald-700">
              <Check size={13} /> Measured directly
            </p>
            <p className="mt-0.5 text-[11.5px] text-muted">Computed from your recording and transcript.</p>
            <ul className="mt-2 space-y-1">
              {MEASURED.map((s) => (
                <li key={s} className="flex gap-2 text-[12.5px] leading-snug text-fg">
                  <Check size={13} className="mt-0.5 shrink-0 text-emerald-600" /> {s}
                </li>
              ))}
            </ul>
          </section>

          <section>
            <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-brand-700">
              <Sparkles size={13} /> Estimated by AI
            </p>
            <p className="mt-0.5 text-[11.5px] text-muted">
              Informed estimates based on the measured signals and your wording. Directional, not exact.
            </p>
            <ul className="mt-2 space-y-1">
              {ESTIMATED.map((s) => (
                <li key={s} className="flex gap-2 text-[12.5px] leading-snug text-fg">
                  <Sparkles size={13} className="mt-0.5 shrink-0 text-brand-600" /> {s}
                </li>
              ))}
            </ul>
          </section>

          <section>
            <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-subtle">
              <Minus size={13} /> Not assessed
            </p>
            <p className="mt-0.5 text-[11.5px] text-muted">Outside the scope of this tool.</p>
            <ul className="mt-2 space-y-1">
              {NOT_ASSESSED.map((s) => (
                <li key={s} className="flex gap-2 text-[12.5px] leading-snug text-muted">
                  <Minus size={13} className="mt-0.5 shrink-0 text-subtle" /> {s}
                </li>
              ))}
            </ul>
          </section>
        </div>

        <p className="border-t border-line px-5 py-3 text-[11.5px] leading-relaxed text-muted">
          Tone analysis runs in your browser and requires Chrome, Edge, or Firefox. Accuracy depends on
          microphone quality and background noise.
        </p>
      </div>
    </div>
  );
}
