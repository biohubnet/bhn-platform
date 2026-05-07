"use client";
import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { translate, type LocaleId, LOCALES } from "./dictionaries";

interface I18nValue {
  locale: LocaleId;
  setLocale: (l: LocaleId) => void;
  t: (key: string) => string;
}

const I18nContext = createContext<I18nValue>({
  locale: "en",
  setLocale: () => {},
  t: (k) => translate("en", k),
});

const STORAGE_KEY = "bhn-locale";

export function I18nProvider({ initialLocale, children }: { initialLocale?: LocaleId; children: ReactNode }) {
  const [locale, setLocaleState] = useState<LocaleId>(initialLocale ?? "en");

  useEffect(() => {
    if (initialLocale) return; // server-provided wins
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as LocaleId | null;
      if (saved && LOCALES.some((l) => l.id === saved)) {
        setLocaleState(saved);
        document.documentElement.lang = saved;
        return;
      }
      // Fall back to browser language hint
      const navLang = navigator.language?.slice(0, 2) as LocaleId;
      if (LOCALES.some((l) => l.id === navLang)) {
        setLocaleState(navLang);
        document.documentElement.lang = navLang;
      }
    } catch {}
  }, [initialLocale]);

  const setLocale = (l: LocaleId) => {
    setLocaleState(l);
    try { localStorage.setItem(STORAGE_KEY, l); } catch {}
    document.documentElement.lang = l;
    // Persist on the user record (best-effort, fire-and-forget)
    fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locale: l }),
    }).catch(() => {});
  };

  const t = (key: string) => translate(locale, key);

  return <I18nContext.Provider value={{ locale, setLocale, t }}>{children}</I18nContext.Provider>;
}

export function useI18n() { return useContext(I18nContext); }
export function useT()    { return useContext(I18nContext).t; }

/** Inline script that runs before hydration to set <html lang>. */
export function I18nScript() {
  const code = `(function(){try{var s=localStorage.getItem('${STORAGE_KEY}');if(s)document.documentElement.lang=s;}catch(e){}})();`;
  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}
