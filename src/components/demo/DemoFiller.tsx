"use client";
/**
 * "Fill with sample data" chip rendered next to long-form titles.
 *
 * Visible to admins, employer-HR / trainee accounts that are flagged as
 * sandbox or demo, and anyone explicitly granted the canFill prop. The
 * component itself is dumb — the parent passes a presets array and a
 * setter; clicking cycles through the presets so consecutive demos
 * don't all show the same data.
 *
 * Usage:
 *   <DemoFiller
 *     visible={isAdmin}
 *     presets={TALENT_APPLICATION_PRESETS}
 *     onFill={(preset) => setFormData(preset)}
 *   />
 */
import { useRef, useState } from "react";
import { Sparkles, Shuffle } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props<T> {
  visible: boolean;
  presets: { label: string; values: T }[];
  onFill: (values: T) => void;
  className?: string;
  /** Optional one-line tagline shown next to the chip. */
  hint?: string;
}

export function DemoFiller<T>({ visible, presets, onFill, className, hint }: Props<T>) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  if (!visible || presets.length === 0) return null;

  function pickPreset(preset: { label: string; values: T }) {
    onFill(preset.values);
    setActive(preset.label);
    setOpen(false);
    setTimeout(() => setActive(null), 1500);
  }

  function pickRandom() {
    const next = presets[Math.floor(Math.random() * presets.length)];
    pickPreset(next);
  }

  return (
    <div ref={ref} className={cn("inline-flex items-center gap-2", className)}>
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className={cn(
            "inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full border transition-colors",
            "bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100",
          )}
          title="Fill this form with sample data — admin/sandbox only"
        >
          <Sparkles size={11} /> Fill with sample
        </button>
        {open && (
          <div className="absolute top-full left-0 mt-1 popover p-1 z-30 min-w-[260px] animate-fade-in">
            <button
              type="button"
              onClick={pickRandom}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-left text-sm hover:bg-elevated text-fg"
            >
              <Shuffle size={12} className="text-amber-600" /> Random preset
            </button>
            <div className="h-px bg-line my-1" />
            {presets.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => pickPreset(p)}
                className="w-full px-3 py-2 rounded-md text-left text-sm hover:bg-elevated text-fg"
              >
                {p.label}
              </button>
            ))}
          </div>
        )}
      </div>
      {active && <span className="text-[10px] text-emerald-700 inline-flex items-center gap-1"><Sparkles size={9} /> filled with {active}</span>}
      {!active && hint && <span className="text-[10px] text-subtle">{hint}</span>}
    </div>
  );
}
