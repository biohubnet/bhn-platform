"use client";
import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export const THEMES = [
  { id: "light",  name: "Light",  description: "Clean blue daylight" },
  { id: "dark",   name: "Dark",   description: "Deep navy for low-light" },
  { id: "ocean",  name: "Ocean",  description: "Cool teal accent" },
  { id: "sunset", name: "Sunset", description: "Warm amber accent" },
  { id: "forest", name: "Forest", description: "Earthy green accent" },
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

  // Read persisted choice on mount
  useEffect(() => {
    const saved = (typeof window !== "undefined" && localStorage.getItem(STORAGE_KEY)) as ThemeId | null;
    if (saved && THEMES.some((t) => t.id === saved)) {
      setThemeState(saved);
      document.documentElement.dataset.theme = saved;
    } else {
      // Honor OS preference for first-time visitors
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
  }

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}

/** Inline script that runs before hydration to set theme attribute and avoid FOUC. */
export function ThemeScript() {
  const code = `(function(){try{var s=localStorage.getItem('${STORAGE_KEY}');var d=window.matchMedia('(prefers-color-scheme: dark)').matches;var t=s||(d?'dark':'light');document.documentElement.setAttribute('data-theme',t);}catch(e){document.documentElement.setAttribute('data-theme','light');}})();`;
  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}
