"use client";
import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export const THEMES = [
  // Light · neutral & cool
  { id: "light",     name: "Daylight",   group: "Light",  description: "Clean blue daylight" },
  { id: "slate",     name: "Slate",      group: "Light",  description: "Neutral monochrome" },
  { id: "ocean",     name: "Ocean",      group: "Light",  description: "Cool teal accent" },
  { id: "forest",    name: "Forest",     group: "Light",  description: "Earthy green" },
  // Light · warm
  { id: "sunset",    name: "Sunset",     group: "Warm",   description: "Amber & terracotta" },
  { id: "rose",      name: "Rose",       group: "Warm",   description: "Soft mauve" },
  { id: "lavender",  name: "Lavender",   group: "Warm",   description: "Calming violet" },
  // Dark
  { id: "dark",      name: "Twilight",   group: "Dark",   description: "Deep navy" },
  { id: "midnight",  name: "Midnight",   group: "Dark",   description: "True black & electric blue" },
  { id: "espresso",  name: "Espresso",   group: "Dark",   description: "Warm cream on coffee" },
] as const;

export type ThemeId = (typeof THEMES)[number]["id"];

interface ThemeContextValue {
  theme: ThemeId;
  setTheme: (t: ThemeId) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "light",
  setTheme: () => {},
});

const STORAGE_KEY = "bhn-theme";

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>("light");

  useEffect(() => {
    const saved = (typeof window !== "undefined" && localStorage.getItem(STORAGE_KEY)) as ThemeId | null;
    if (saved && THEMES.some((t) => t.id === saved)) {
      setThemeState(saved);
      document.documentElement.dataset.theme = saved;
    } else {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      const initial: ThemeId = prefersDark ? "dark" : "light";
      setThemeState(initial);
      document.documentElement.dataset.theme = initial;
    }
  }, []);

  function setTheme(t: ThemeId) {
    setThemeState(t);
    document.documentElement.dataset.theme = t;
    try { localStorage.setItem(STORAGE_KEY, t); } catch {}
    // Fire-and-forget analytics — kept inline so the bundle for ThemeProvider
    // stays small and we don't add a hard dep on the tracker module.
    try {
      const body = JSON.stringify({ name: "theme_change", path: location.pathname, props: { theme: t } });
      if (navigator.sendBeacon) {
        navigator.sendBeacon("/api/analytics/track", new Blob([body], { type: "application/json" }));
      }
    } catch {}
  }

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}

export function ThemeScript() {
  const code = `(function(){try{var s=localStorage.getItem('${STORAGE_KEY}');var d=window.matchMedia('(prefers-color-scheme: dark)').matches;var t=s||(d?'dark':'light');document.documentElement.setAttribute('data-theme',t);}catch(e){document.documentElement.setAttribute('data-theme','light');}})();`;
  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}
