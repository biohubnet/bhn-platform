"use client";
import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export const THEMES = [
  { id: "light",      name: "Daylight",   description: "Calm, near-white tech surfaces" },
  { id: "dark",       name: "Nightfall",  description: "Deep navy with electric accents" },
  { id: "aurora",     name: "Aurora",     description: "Soft curves, magenta-violet flow" },
  { id: "modern",     name: "Modern",     description: "Minimalist mono with bold red" },
  { id: "scientific", name: "Scientific", description: "Cool sky-blue, paper-like surfaces" },
  { id: "hitech",     name: "Hi-Tech",    description: "Neon cyan on near-black" },
  { id: "pink",       name: "Pink",       description: "Soft rose, friendly and bright" },
  { id: "lab",        name: "Lab",        description: "Sterile white with emerald accents" },
  { id: "labmouse",   name: "Lab Mouse",  description: "Warm cream and mouse-pink whimsy" },
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
    try {
      // Only fire analytics if the user has opted in.
      const consentRaw = localStorage.getItem("bhn-consent");
      const okay = consentRaw && JSON.parse(consentRaw)?.analytics === true;
      if (okay) {
        const body = JSON.stringify({ name: "theme_change", path: location.pathname, props: { theme: t } });
        if (navigator.sendBeacon) {
          navigator.sendBeacon("/api/analytics/track", new Blob([body], { type: "application/json" }));
        }
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
