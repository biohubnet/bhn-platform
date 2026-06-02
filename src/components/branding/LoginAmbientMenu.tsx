"use client";

/**
 * Ambient-effects menu for the /login stage.
 *
 * A small popover (lives beside the ThemeCycler in the login header)
 * that lets a visitor switch the two decorative layers on or off:
 *   • Floating molecules  → <LoginFloaters />
 *   • Sparkles ("bling")  → <DeepSeaStars />
 *
 * Controlled component — the page owns the booleans + localStorage
 * persistence and conditionally renders each layer. This file is only
 * the trigger button + popover + the two accessible switches.
 */

import { useEffect, useRef, useState } from "react";
import { Sparkles, Atom } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  floaters: boolean;
  bling: boolean;
  onToggleFloaters: (v: boolean) => void;
  onToggleBling: (v: boolean) => void;
}

export function LoginAmbientMenu({
  floaters,
  bling,
  onToggleFloaters,
  onToggleBling,
}: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  // Close on outside-click or Escape; Escape returns focus to the trigger.
  useEffect(() => {
    if (!open) return;
    function onPointer(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        btnRef.current?.focus();
      }
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label="Ambient effects"
        title="Ambient effects"
        className="min-h-[44px] min-w-[44px] justify-center p-2 rounded-xl text-white/70 hover:bg-white/10 hover:text-white transition-colors flex items-center focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-1 focus-visible:ring-offset-transparent"
    >
        <Sparkles size={18} aria-hidden />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Ambient effects"
          className="absolute right-0 top-full mt-2 z-30 w-60 rounded-2xl bg-slate-900/90 ring-1 ring-white/15 shadow-2xl shadow-black/50 backdrop-blur-md p-2 animate-fade-in"
        >
          <p className="px-2 pt-1 pb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/45">
            Ambient effects
          </p>

          <SwitchRow
            icon={<Atom size={15} aria-hidden className="text-sky-300" />}
            label="Floating molecules"
            checked={floaters}
            onChange={onToggleFloaters}
          />
          <SwitchRow
            icon={<Sparkles size={15} aria-hidden className="text-amber-300" />}
            label="Sparkles"
            checked={bling}
            onChange={onToggleBling}
          />

          <p className="px-2 pt-1.5 pb-0.5 text-[10px] leading-snug text-white/35">
            Saved on this device.
          </p>
        </div>
      )}
    </div>
  );
}

function SwitchRow({
  icon,
  label,
  checked,
  onChange,
}: {
  icon: React.ReactNode;
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg px-2 py-2 hover:bg-white/5 transition-colors">
      <span className="flex items-center gap-2 text-sm text-white/85">
        {icon}
        {label}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={`${label}: ${checked ? "on" : "off"}`}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative h-5 w-9 shrink-0 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900",
          checked ? "bg-emerald-400/90" : "bg-white/20"
        )}
      >
        <span
          aria-hidden
          className={cn(
            "absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform",
            checked ? "translate-x-4" : "translate-x-0"
          )}
        />
      </button>
    </div>
  );
}
