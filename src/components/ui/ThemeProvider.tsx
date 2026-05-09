"use client";
import { createContext, useContext, useEffect, useState, ReactNode } from "react";

/**
 * Theme registry. Each entry has:
 *   • id          — DOM data-theme attribute, also localStorage value
 *   • name        — user-facing label
 *   • description — picker tooltip
 *   • category    — "classic" / "flavour" / "limited" — drives the
 *                   picker's section grouping
 *   • endsOn      — optional ISO date; theme is hidden after that day
 *                   (used for limited-time / seasonal themes like Sakura)
 *   • limited     — optional flag rendered as a pill in the picker
 */
export const THEMES = [
  // Classic — foundational themes, always present.
  { id: "light",      name: "Daylight",   description: "Calm, near-white tech surfaces", category: "classic" },
  { id: "dark",       name: "Nightfall",  description: "Deep navy with electric accents", category: "classic" },
  { id: "scientific", name: "Scientific", description: "Cool sky-blue, paper-like surfaces", category: "classic" },
  { id: "rosalind",   name: "Rosalind",   description: "Parchment, sage, italic serif — herbarium-academic", category: "classic" },
  { id: "mist",       name: "Mist",       description: "Translucent glass panels in a calm atmosphere — visionOS-inspired", category: "classic" },
  { id: "hitech",     name: "Hi-Tech",    description: "Neon cyan on near-black", category: "classic" },

  // Flavours — sensory / atmospheric themes.
  { id: "coldbrew",   name: "Cold Brew",  description: "Oat-milk cream + dark roast espresso — coffee-shop warmth", category: "flavour" },
  { id: "icecream",   name: "Summer Ice Cream", description: "Pastel scoops on a vanilla cone — playful and bright", category: "flavour" },
  { id: "dryice",     name: "Dry Ice",    description: "Frosty fog over deep teal-black — cold, mysterious, dramatic", category: "flavour" },
  { id: "retro8bit",  name: "Retro 8-bit", description: "NES boss screen — magenta + cyan on CRT-purple, scanlines, pixel font", category: "flavour" },
  { id: "salty",      name: "Salty",      description: "Sea-fog and weathered driftwood — coastal calm", category: "flavour" },
  { id: "chilli",     name: "Chilli",     description: "Charred earth + paprika flame — warm, bold, spicy dark mode", category: "flavour" },

  // Limited-time / seasonal.
  {
    id: "sakura",
    name: "Sakura",
    description: "Cherry-blossom blush + cream — limited time, expires end of May 2026",
    category: "limited",
    endsOn: "2026-05-31",
    limited: true,
  },
] as const;

/** Display labels for each category — surfaced as section headers
 *  in the theme picker. */
export const THEME_CATEGORIES = {
  classic:  { label: "Classic",   subtitle: "The foundation library" },
  flavour:  { label: "Flavours",  subtitle: "Sensory and atmospheric" },
  limited:  { label: "Limited time", subtitle: "Available for a while" },
} as const;
export type ThemeCategory = keyof typeof THEME_CATEGORIES;

export type ThemeId = (typeof THEMES)[number]["id"];

/** Themes still inside their availability window. Expired limited-time
 *  themes drop out (so the picker doesn't show a theme nobody can keep
 *  using past the expiry). */
export function activeThemes(now: Date = new Date()) {
  return THEMES.filter((t) => {
    if (!("endsOn" in t) || !t.endsOn) return true;
    return new Date(t.endsOn + "T23:59:59").getTime() >= now.getTime();
  });
}

interface ThemeContextValue {
  theme: ThemeId;
  /** Switch theme. `persist=false` applies the theme for this session
   *  only — no localStorage write — used by the daily-fresh "try" flow
   *  so users can preview without committing. */
  setTheme: (t: ThemeId, opts?: { persist?: boolean }) => void;
  /** True when the active theme isn't the one persisted to storage —
   *  i.e. the user is in a "previewing" state. The daily-fresh card
   *  uses this to decide whether to show "Keep" / "Revert" actions. */
  isPreviewing: boolean;
  /** Whatever's persisted in localStorage (or null if none) — used so
   *  callers can revert from a preview to the user's saved choice. */
  savedTheme: ThemeId | null;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "light",
  setTheme: () => {},
  isPreviewing: false,
  savedTheme: null,
});

const STORAGE_KEY = "bhn-theme";

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>("light");
  const [savedTheme, setSavedTheme] = useState<ThemeId | null>(null);

  useEffect(() => {
    const saved = (typeof window !== "undefined" && localStorage.getItem(STORAGE_KEY)) as ThemeId | null;
    const allowedNow = activeThemes().map((t) => t.id);
    if (saved && (allowedNow as string[]).includes(saved)) {
      setThemeState(saved);
      setSavedTheme(saved);
      document.documentElement.dataset.theme = saved;
    } else {
      // Saved theme is missing OR has expired (e.g. Sakura past May 31) —
      // drop it and fall back to OS preference.
      if (saved) {
        try { localStorage.removeItem(STORAGE_KEY); } catch {}
      }
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      const initial: ThemeId = prefersDark ? "dark" : "light";
      setThemeState(initial);
      setSavedTheme(null);
      document.documentElement.dataset.theme = initial;
    }
  }, []);

  function setTheme(t: ThemeId, opts?: { persist?: boolean }) {
    const persist = opts?.persist ?? true;
    setThemeState(t);
    document.documentElement.dataset.theme = t;
    if (persist) {
      try { localStorage.setItem(STORAGE_KEY, t); } catch {}
      setSavedTheme(t);
    }
    try {
      // Only fire analytics if the user has opted in.
      const consentRaw = localStorage.getItem("bhn-consent");
      const okay = consentRaw && JSON.parse(consentRaw)?.analytics === true;
      if (okay) {
        const body = JSON.stringify({
          name: "theme_change",
          path: location.pathname,
          props: { theme: t, persist },
        });
        if (navigator.sendBeacon) {
          navigator.sendBeacon("/api/analytics/track", new Blob([body], { type: "application/json" }));
        }
      }
    } catch {}
  }

  const isPreviewing = savedTheme !== null && theme !== savedTheme;

  return (
    <ThemeContext.Provider value={{ theme, setTheme, isPreviewing, savedTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

export function ThemeScript() {
  // Whitelist mirrors THEMES above. If the user has a retired theme
  // saved in localStorage (e.g. "aurora", "modern", "pink"), drop it
  // and fall back to OS preference so we never set data-theme to a
  // value that has no CSS variables defined.
  //
  // We can't import activeThemes() in this server-rendered script, so
  // we compute the active set inline with the same rule (drop themes
  // whose endsOn ISO date has passed).
  const activeIds = activeThemes().map((t) => t.id);
  const allowedJson = JSON.stringify(activeIds);
  const code = `(function(){try{var allow=${allowedJson};var s=localStorage.getItem('${STORAGE_KEY}');var d=window.matchMedia('(prefers-color-scheme: dark)').matches;var t=(s&&allow.indexOf(s)>=0)?s:(d?'dark':'light');if(s&&allow.indexOf(s)<0){try{localStorage.removeItem('${STORAGE_KEY}');}catch(_){}}document.documentElement.setAttribute('data-theme',t);}catch(e){document.documentElement.setAttribute('data-theme','light');}})();`;
  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}

/**
 * Pick a "theme of the day" suggestion. Sakura preempts as long as
 * it's in its availability window (lets us highlight the limited-time
 * theme); after Sakura expires we rotate through the rest of the
 * registry by day-of-year. We skip the user's currently-saved theme
 * so the suggestion is always something different.
 */
export function suggestTodaysTheme(currentlySaved: ThemeId | null, now: Date = new Date()): ThemeId | null {
  const active = activeThemes(now);
  // Sakura preempt while available — promotes the limited-time theme.
  const sakura = active.find((t) => t.id === "sakura");
  if (sakura && currentlySaved !== "sakura") return "sakura";

  const pool = active.map((t) => t.id).filter((id) => id !== currentlySaved);
  if (pool.length === 0) return null;
  const dayOfYear = Math.floor(
    (now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86_400_000
  );
  return pool[dayOfYear % pool.length];
}
