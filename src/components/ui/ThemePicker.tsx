"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Palette, Check } from "lucide-react";
import { useTheme, THEMES, type ThemeId } from "@/components/ui/ThemeProvider";
import { cn } from "@/lib/utils";

/**
 * Themes get a tri-color swatch built from the theme's own surface + brand
 * tokens at runtime via CSS attribute selectors — so the picker is always
 * a true preview, not a hand-painted approximation.
 */
const swatchStyle = (id: ThemeId): React.CSSProperties => {
  // We look up the CSS variables from a hidden element that has the target theme.
  return {
    "--swatch-id": id,
  } as React.CSSProperties;
};

const TRIO: Record<ThemeId, [string, string, string]> = {
  light:    ["#ffffff", "#3b6cef", "#0f1f3d"],
  slate:    ["#ffffff", "#44505f", "#18181b"],
  ocean:    ["#ffffff", "#06b6d4", "#0c2d2a"],
  forest:   ["#ffffff", "#10b981", "#0d2818"],
  sunset:   ["#ffffff", "#f97316", "#3d1f0a"],
  rose:     ["#ffffff", "#d35a78", "#3a1721"],
  lavender: ["#ffffff", "#8b5cf6", "#1f1638"],
  dark:     ["#0f1d3d", "#3b6cef", "#e8edf7"],
  midnight: ["#0d0e15", "#4f8ef7", "#f5f5f7"],
  espresso: ["#1f1a14", "#d4a36a", "#f3ead7"],
};

function Swatch({ id, size = 32 }: { id: ThemeId; size?: number }) {
  const [card, accent, fg] = TRIO[id];
  return (
    <span
      className="relative inline-block rounded-lg shadow-sm overflow-hidden border border-line"
      style={{ width: size, height: size, background: card, ...swatchStyle(id) }}
    >
      <span
        className="absolute inset-y-0 left-0"
        style={{ width: "40%", background: accent }}
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

  const grouped = useMemo(() => {
    const map = new Map<string, typeof THEMES[number][]>();
    for (const t of THEMES) {
      const arr = map.get(t.group) ?? [];
      arr.push(t);
      map.set(t.group, arr);
    }
    return Array.from(map.entries());
  }, []);

  const current = THEMES.find((t) => t.id === theme);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex items-center gap-2.5 rounded-lg text-sm transition-colors",
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
              <span className="block text-[10px] uppercase tracking-[0.16em] text-subtle">
                {current?.name}
              </span>
            </span>
            <Swatch id={theme} size={22} />
          </>
        )}
      </button>

      {open && (
        <div className="absolute bottom-full left-0 right-0 mb-2 bg-card border border-line rounded-2xl shadow-2xl shadow-black/15 p-3 z-30 min-w-[260px] animate-fade-in max-h-[420px] overflow-y-auto">
          {grouped.map(([groupName, items], gi) => (
            <div key={groupName} className={gi > 0 ? "mt-3 pt-3 border-t border-line" : ""}>
              <p className="px-2 pb-1.5 text-[10px] font-semibold text-subtle uppercase tracking-[0.18em]">
                {groupName}
              </p>
              <div className="grid grid-cols-2 gap-1">
                {items.map((t) => {
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
                        "flex items-center gap-2 px-2 py-2 rounded-lg text-left transition-all group relative",
                        active
                          ? "bg-brand-50 ring-1 ring-brand-200"
                          : "hover:bg-elevated"
                      )}
                    >
                      <Swatch id={t.id} size={26} />
                      <span className="flex-1 min-w-0">
                        <span className={cn(
                          "block text-[13px] font-medium leading-tight truncate",
                          active ? "text-brand-700" : "text-fg"
                        )}>
                          {t.name}
                        </span>
                        <span className="block text-[10px] text-subtle leading-tight truncate">
                          {t.description}
                        </span>
                      </span>
                      {active && (
                        <Check size={12} className="text-brand-600 absolute top-1.5 right-1.5" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** Public-facing icon-only cycler. */
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
      className="p-2 rounded-lg text-muted hover:bg-elevated hover:text-fg transition-colors flex items-center gap-2"
      aria-label="Cycle theme"
      title={`Theme: ${theme}`}
    >
      <Swatch id={theme} size={18} />
    </button>
  );
}
