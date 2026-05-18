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
  light:      ["#ffffff", "#3b6cef", "#0b1b3b"],
  rosalind:   ["#fbf6ec", "#485940", "#a8625a"],
  hitech:     ["#06121f", "#00d4ff", "#e3f7ff"],
  sakura:     ["#fffaf9", "#d04c61", "#3a1f24"],
  icecream:   ["#fff8f3", "#c5234a", "#b8e0d2"],
  greenwood:  ["#f7faf2", "#456224", "#c6a449"],
  atompunk:   ["#f3ead8", "#1a8a8a", "#0e1a3a"],
  aurora:     ["#0b0f24", "#6b21a8", "#f472b6"],
};

// Each theme picks its own corner-roundness for the swatch, mirroring
// its own --radius scale so the picker previews the silhouette too.
const SWATCH_RADIUS: Record<ThemeId, string> = {
  light:      "10px",
  rosalind:   "14px",
  hitech:     "4px",
  sakura:     "14px",
  icecream:   "20px",
  greenwood:  "14px",
  atompunk:   "2px",
  aurora:     "14px",
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
          // Compact mode uses min-h/min-w 44 px so the touch target
          // clears the WCAG 2.5.5 Level AAA threshold even though
          // the icon itself is 16 px.
          "flex items-center gap-2.5 rounded-xl text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-1",
          compact
            ? "min-h-[44px] min-w-[44px] justify-center p-2 hover:bg-elevated text-muted hover:text-fg"
            : "px-3 py-2 w-full hover:bg-elevated text-muted hover:text-fg"
        )}
        aria-label="Change theme"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Palette size={16} aria-hidden />
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

  // Pick the FIRST limited-time theme the user hasn't already
  // selected — that's the candidate for the featured "try this
  // limited-time theme" promo at the top of the menu. (Currently
  // Sakura through 31 May 2026.)
  const featured = grouped.limited.find((t) => t.id !== theme) ?? null;

  // Categories rendered in this fixed order.
  const order: ThemeCategory[] = ["classic", "flavour", "limited"];

  return (
    <div
      className="absolute bottom-full left-0 right-0 mb-2 popover p-1.5 z-30 min-w-[280px] max-h-[70vh] overflow-y-auto animate-fade-in"
      role="menu"
      aria-label="Choose theme"
    >
      {featured && (
        <FeaturedLimitedPromo
          theme={featured}
          onPick={onPick}
        />
      )}
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
                  role="menuitemradio"
                  aria-checked={active}
                  className={cn(
                    "group/themerow w-full flex items-center gap-3 px-2.5 py-2 rounded-xl text-left transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500",
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
                  {active && (
                    <>
                      <Check size={13} className="text-brand-600 shrink-0" aria-hidden />
                      <span className="sr-only">Currently selected</span>
                    </>
                  )}
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

/**
 * Featured promo card at the top of the picker dropdown for the
 * current limited-time theme. Replaces the dashboard's old
 * DailyThemeCard — discovery happens where the action does, so a
 * trainee who opens the palette sees the "try Sakura" CTA front-
 * and-centre instead of scrolling past it into the Limited
 * section. The card carries its own theme-coloured wash so it
 * pops on every base palette.
 */
function FeaturedLimitedPromo({
  theme: t,
  onPick,
}: {
  theme: typeof THEMES[number];
  onPick: (id: ThemeId) => void;
}) {
  const [card, accent, fg] = SWATCH[t.id];
  const endsOn = "endsOn" in t && t.endsOn ? t.endsOn : null;

  // "X days left" countdown — computed client-side from today's
  // calendar date so it stays accurate without a server round-trip.
  // Only renders inside the Try button (never as the headline copy)
  // so a stale value never becomes the focal text.
  let daysLeft: number | null = null;
  if (endsOn) {
    const end = new Date(endsOn + "T23:59:59").getTime();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffMs = end - today.getTime();
    daysLeft = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  }

  return (
    <div
      // Quieter ring + neutral card — the THEME's own accent does
      // the colour-work via the corner washes below, instead of a
      // global rose tint that fights the rest of the muted menu.
      className="relative mb-2 overflow-hidden rounded-2xl ring-1 ring-line bg-card"
      role="region"
      aria-label={`Featured limited-time theme: ${t.name}`}
    >
      {/* Theme-coloured corner washes — softened from before, so
          the card hints at the theme's palette without competing
          with the rest of the menu. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-10 -right-10 w-28 h-28 rounded-full blur-2xl opacity-30"
        style={{ background: accent }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-10 -left-10 w-24 h-24 rounded-full blur-2xl opacity-15"
        style={{ background: fg }}
      />

      <div className="relative p-3.5">
        <div className="flex items-start gap-3">
          {/* Bigger swatch — the visual hero of the card */}
          <span
            className="relative shrink-0 inline-block overflow-hidden border border-line shadow-sm"
            style={{
              width: 52, height: 52,
              background: card,
              borderRadius: SWATCH_RADIUS[t.id],
            }}
            aria-hidden
          >
            <span className="absolute inset-y-0 left-0" style={{ width: "45%", background: accent }} />
            <span className="absolute right-2 top-2 w-2 h-2 rounded-full" style={{ background: fg }} />
          </span>

          <div className="min-w-0 flex-1">
            {/* Limited-time pip is the only rose accent now — small
                enough to read as a tag, not as the card's mood. */}
            <span className="inline-flex items-center gap-0.5 text-[9px] font-bold uppercase tracking-[0.18em] px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-700 border border-rose-200">
              <Sparkles size={9} aria-hidden /> Limited time
            </span>
            <h3 className="text-sm font-bold text-fg leading-tight mt-1.5">
              Try {t.name}
            </h3>
            <p className="text-[11px] text-muted leading-snug mt-0.5 line-clamp-2">
              {t.description}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onPick(t.id)}
          // Now uses the BRAND tone so the CTA harmonises with the
          // rest of the picker's chrome (the active-theme highlight
          // is also brand-flavored).
          className="mt-3 w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-brand-600 hover:bg-brand-700 text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-1"
        >
          <Sparkles size={11} aria-hidden />
          <span>Try {t.name}</span>
          {daysLeft != null && (
            <span className="font-mono font-normal opacity-80">
              · {daysLeft === 0 ? "last day" : `${daysLeft}d left`}
            </span>
          )}
        </button>
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
      // Same 44 px floor as ThemePicker so the swatch button is a
      // legit touch target on mobile.
      className="min-h-[44px] min-w-[44px] justify-center p-2 rounded-xl text-muted hover:bg-elevated hover:text-fg transition-colors flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-1"
      aria-label="Cycle theme"
      title={`Theme: ${theme}`}
    >
      <Swatch id={theme} size={18} />
    </button>
  );
}
