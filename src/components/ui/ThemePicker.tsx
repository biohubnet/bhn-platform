"use client";
import { useEffect, useRef, useState } from "react";
import { Palette, Check } from "lucide-react";
import { useTheme, THEMES, type ThemeId } from "@/components/ui/ThemeProvider";
import { cn } from "@/lib/utils";

const SWATCH: Record<ThemeId, [string, string, string]> = {
  light:      ["#ffffff", "#3b6cef", "#0b1b3b"],
  dark:       ["#0f1d3d", "#5e8ff7", "#eaf0fb"],
  aurora:     ["#fbf6fb", "#a855f7", "#1f1430"],
  modern:     ["#ffffff", "#ef4444", "#18181b"],
  scientific: ["#ffffff", "#0ea5e9", "#1e293b"],
  hitech:     ["#0d1929", "#06b6d4", "#d6f5f5"],
  pink:       ["#fffaff", "#ec4899", "#500724"],
  lab:        ["#ffffff", "#10b981", "#0f172a"],
  labmouse:   ["#fffaf3", "#ec4899", "#431407"],
};

// Each theme picks its own corner-roundness for the swatch, mirroring
// its own --radius scale so the picker previews the silhouette too.
const SWATCH_RADIUS: Record<ThemeId, string> = {
  light:      "10px",
  dark:       "10px",
  aurora:     "9999px",
  modern:     "3px",
  scientific: "8px",
  hitech:     "4px",
  pink:       "14px",
  lab:        "12px",
  labmouse:   "16px",
};

function Swatch({ id, size = 24 }: { id: ThemeId; size?: number }) {
  const [card, accent, fg] = SWATCH[id];
  const radius = SWATCH_RADIUS[id];
  return (
    <span
      className="relative inline-block overflow-hidden border border-line shadow-sm"
      style={{ width: size, height: size, background: card, borderRadius: radius }}
    >
      <span
        className="absolute inset-y-0 left-0"
        style={{ width: "45%", background: accent }}
      />
      <span
        className="absolute right-1 top-1 w-1.5 h-1.5 rounded-full"
        style={{ background: fg }}
      />
    </span>
  );
}

export function ThemePicker({ compact = false }: { compact?: boolean }) {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const current = THEMES.find((t) => t.id === theme);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex items-center gap-2.5 rounded-xl text-sm transition-colors",
          compact
            ? "p-2 hover:bg-elevated text-muted hover:text-fg"
            : "px-3 py-2 w-full hover:bg-elevated text-muted hover:text-fg"
        )}
        aria-label="Change theme"
      >
        <Palette size={16} />
        {!compact && (
          <>
            <span className="flex-1 text-left">
              <span className="block leading-tight">Theme</span>
              <span className="block text-[10px] uppercase tracking-[0.18em] text-subtle">
                {current?.name}
              </span>
            </span>
            <Swatch id={theme} size={22} />
          </>
        )}
      </button>

      {open && (
        <div className="absolute bottom-full left-0 right-0 mb-2 surface p-1.5 z-30 min-w-[240px] animate-fade-in">
          {THEMES.map((t) => {
            const active = theme === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => { setTheme(t.id); setOpen(false); }}
                className={cn(
                  "w-full flex items-center gap-3 px-2.5 py-2.5 rounded-xl text-left transition-all",
                  active ? "bg-brand-50 ring-1 ring-brand-200" : "hover:bg-elevated"
                )}
              >
                <Swatch id={t.id} size={28} />
                <span className="flex-1 min-w-0">
                  <span className={cn(
                    "block text-[13px] font-medium leading-tight",
                    active ? "text-brand-700" : "text-fg"
                  )}>{t.name}</span>
                  <span className="block text-[10px] text-subtle leading-tight">{t.description}</span>
                </span>
                {active && <Check size={13} className="text-brand-600" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function ThemeCycler() {
  const { theme, setTheme } = useTheme();
  function cycle() {
    const idx = THEMES.findIndex((t) => t.id === theme);
    setTheme(THEMES[(idx + 1) % THEMES.length].id);
  }
  return (
    <button
      type="button"
      onClick={cycle}
      className="p-2 rounded-xl text-muted hover:bg-elevated hover:text-fg transition-colors flex items-center gap-2"
      aria-label="Cycle theme"
      title={`Theme: ${theme}`}
    >
      <Swatch id={theme} size={18} />
    </button>
  );
}
