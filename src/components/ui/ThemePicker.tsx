"use client";
import { useEffect, useRef, useState } from "react";
import { Palette, Check, Sun, Moon, Waves, Sunset, Trees } from "lucide-react";
import { useTheme, THEMES, type ThemeId } from "@/components/ui/ThemeProvider";
import { cn } from "@/lib/utils";

const iconFor: Record<ThemeId, React.ElementType> = {
  light: Sun,
  dark: Moon,
  ocean: Waves,
  sunset: Sunset,
  forest: Trees,
};

const swatchFor: Record<ThemeId, string> = {
  light:  "linear-gradient(135deg,#3b6cef,#1e3499)",
  dark:   "linear-gradient(135deg,#0f1d3d,#060d1f)",
  ocean:  "linear-gradient(135deg,#22d3ee,#0e7490)",
  sunset: "linear-gradient(135deg,#fb923c,#9a3412)",
  forest: "linear-gradient(135deg,#34d399,#065f46)",
};

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

  const ActiveIcon = iconFor[theme];

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex items-center gap-2 rounded-lg text-sm transition-colors",
          compact
            ? "p-2 hover:bg-elevated text-muted hover:text-fg"
            : "px-3 py-2 w-full hover:bg-elevated text-muted hover:text-fg"
        )}
        aria-label="Change theme"
      >
        <Palette size={16} />
        {!compact && (
          <>
            <span className="flex-1 text-left">Theme</span>
            <span
              className="w-5 h-5 rounded-md border border-line shrink-0"
              style={{ background: swatchFor[theme] }}
            />
          </>
        )}
      </button>

      {open && (
        <div className="absolute bottom-full left-0 right-0 mb-2 bg-card border border-line rounded-xl shadow-xl p-2 z-30 min-w-[220px] animate-fade-in">
          <p className="px-2 py-1.5 text-[10px] font-semibold text-subtle uppercase tracking-wider">
            Interface theme
          </p>
          {THEMES.map((t) => {
            const Icon = iconFor[t.id];
            const active = theme === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setTheme(t.id);
                  setOpen(false);
                }}
                className={cn(
                  "w-full flex items-center gap-3 px-2 py-2 rounded-lg text-sm transition-colors",
                  active ? "bg-brand-50 text-brand-700" : "hover:bg-elevated text-muted hover:text-fg"
                )}
              >
                <span
                  className="w-7 h-7 rounded-lg shadow-sm flex items-center justify-center text-white shrink-0"
                  style={{ background: swatchFor[t.id] }}
                >
                  <Icon size={14} />
                </span>
                <span className="flex-1 text-left min-w-0">
                  <span className="block font-medium truncate">{t.name}</span>
                  <span className="block text-[11px] text-subtle truncate">{t.description}</span>
                </span>
                {active && <Check size={14} className="text-brand-600 shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** Small icon-only theme cycler for the public navbar. */
export function ThemeCycler() {
  const { theme, setTheme } = useTheme();
  function cycle() {
    const idx = THEMES.findIndex((t) => t.id === theme);
    setTheme(THEMES[(idx + 1) % THEMES.length].id);
  }
  const Icon = iconFor[theme];
  return (
    <button
      type="button"
      onClick={cycle}
      className="p-2 rounded-lg text-muted hover:bg-elevated hover:text-fg transition-colors"
      aria-label="Cycle theme"
      title={`Theme: ${theme}`}
    >
      <Icon size={16} />
    </button>
  );
}
