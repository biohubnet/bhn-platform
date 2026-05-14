"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Palette, Check, Sparkles, ArrowRight } from "lucide-react";
import {
  useTheme, THEMES, activeThemes, THEME_CATEGORIES,
  type ThemeId, type ThemeCategory,
} from "@/components/ui/ThemeProvider";
import { cn } from "@/lib/utils";

const SWATCH: Record<ThemeId, [string, string, string]> = {
  biohubnet:  ["#ffffff", "#1A8DB6", "#327A80"], // brand blue + teal — the canonical identity
  light:      ["#ffffff", "#1A8DB6", "#0F5F7C"], // realigned to BHN blue
  dark:       ["#0f1d3d", "#5e8ff7", "#eaf0fb"],
  scientific: ["#ffffff", "#0ea5e9", "#1e293b"],
  rosalind:   ["#fbf6ec", "#485940", "#a8625a"],
  hitech:     ["#06121f", "#00d4ff", "#e3f7ff"],
  sakura:     ["#fffaf9", "#d04c61", "#3a1f24"],
  icecream:   ["#fff8f3", "#c5234a", "#b8e0d2"],
  retro8bit:  ["#1a0d2e", "#ff4dff", "#00ffff"],
  greenwood:  ["#f7faf2", "#456224", "#c6a449"],
};

// Each theme picks its own corner-roundness for the swatch, mirroring
// its own --radius scale so the picker previews the silhouette too.
const SWATCH_RADIUS: Record<ThemeId, string> = {
  biohubnet:  "4px",     // tighter corners — the official identity is diamond/geometric, not soft
  light:      "10px",
  dark:       "10px",
  scientific: "8px",
  rosalind:   "14px",
  hitech:     "4px",
  sakura:     "14px",
  icecream:   "20px",
  retro8bit:  "0px",
  greenwood:  "14px",
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
        <ThemeMenu
          theme={theme}
          onPick={(id) => { setTheme(id); setOpen(false); }}
        />
      )}
    </div>
  );
}

/**
 * Grouped theme menu — renders the three category sections (Classic /
 * Flavours / Limited time) with a small header per group. Items
 * inside a section are shown in registry order.
 *
 * Pulled out as its own component so the menu logic (sections,
 * active state, limited pill) doesn't crowd the trigger button code.
 */
function ThemeMenu({
  theme, onPick,
}: {
  theme: ThemeId;
  onPick: (id: ThemeId) => void;
}) {
  const grouped = useMemo(() => {
    const out: Record<ThemeCategory, typeof THEMES[number][]> = {
      classic: [],
      flavour: [],
      limited: [],
    };
    for (const t of activeThemes()) {
      out[t.category as ThemeCategory].push(t);
    }
    return out;
  }, []);

  // Categories rendered in this fixed order.
  const order: ThemeCategory[] = ["classic", "flavour", "limited"];

  return (
    <div className="absolute bottom-full left-0 right-0 mb-2 popover p-1.5 z-30 min-w-[260px] max-h-[70vh] overflow-y-auto animate-fade-in">
      {order.map((cat) => {
        const items = grouped[cat];
        if (items.length === 0) return null;
        const meta = THEME_CATEGORIES[cat];
        return (
          <div key={cat} className="mb-2 last:mb-0">
            <div className="px-2 pt-1.5 pb-1">
              <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-subtle">
                {meta.label}
              </p>
              <p className="text-[10px] text-subtle/80 leading-tight">
                {meta.subtitle}
              </p>
            </div>
            {items.map((t) => {
              const active = theme === t.id;
              const isLimited = "limited" in t && t.limited;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => onPick(t.id)}
                  className={cn(
                    "group/themerow w-full flex items-center gap-3 px-2.5 py-2 rounded-xl text-left transition-all",
                    active ? "bg-brand-50 ring-1 ring-brand-200" : "hover:bg-elevated"
                  )}
                >
                  <Swatch id={t.id} size={26} />
                  <span className="flex-1 min-w-0">
                    <span className={cn(
                      "flex items-center gap-1.5 text-[13px] font-medium leading-tight",
                      active ? "text-brand-700" : "text-fg"
                    )}>
                      {t.name}
                      {isLimited && (
                        <span
                          className="inline-flex items-center gap-0.5 text-[9px] font-bold uppercase tracking-[0.18em] px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-700 border border-rose-200"
                          title="Limited-time theme"
                        >
                          <Sparkles size={9} /> Limited
                        </span>
                      )}
                    </span>
                    {/* Rolling description: at rest, the text is clipped by
                        overflow-hidden so long blurbs (Cold Brew, Retro 8-bit
                        — the ones that got truncated before) read as a
                        truncated headline. On hover/focus, the inline-flex
                        wrapper rolls left at a steady pace, and because the
                        text is duplicated the loop is seamless. Reduced-
                        motion users see the static truncated head. */}
                    <span className="block overflow-hidden text-[10px] text-subtle leading-tight mt-0.5">
                      <span className="inline-flex whitespace-nowrap group-hover/themerow:animate-roll-x group-focus-within/themerow:animate-roll-x">
                        <span className="pr-10">{t.description}</span>
                        <span className="pr-10" aria-hidden>{t.description}</span>
                      </span>
                    </span>
                  </span>
                  {active && <Check size={13} className="text-brand-600 shrink-0" />}
                </button>
              );
            })}
          </div>
        );
      })}

      {/* Discovery link — the /themes page is where users vote and
          propose new themes. We don't surface it in the sidebar
          (would just clutter the misc group); instead the link lives
          here, where users are already engaging with themes. Soft
          navigation closes the dropdown naturally as the page swaps. */}
      <div className="border-t border-line mt-2 pt-2 px-1">
        <Link
          href="/themes"
          className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-[12px] font-medium text-muted hover:bg-elevated hover:text-fg transition-colors"
        >
          <Sparkles size={12} className="text-brand-600 shrink-0" />
          <span className="flex-1">Vote on themes &amp; suggest a new one</span>
          <ArrowRight size={12} className="text-subtle shrink-0" />
        </Link>
      </div>
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
