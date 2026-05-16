"use client";
/**
 * Provider + inline FOUC-prevention script for the design-system
 * registry. Mirrors the shape of ThemeProvider but operates on the
 * orthogonal "layout vocabulary" axis (Classic / Cinematic / …).
 *
 * Storage
 *   localStorage key `bhn-design-system`. Synced to the
 *   `data-design-system` attribute on `<html>` so primitives can
 *   also style themselves via CSS selectors if useful.
 *
 * Preview
 *   `setDesignSystem(id, { persist: false })` applies for the
 *   current session only — the picker uses this for hover-to-
 *   preview behavior without committing.
 */
import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import {
  DESIGN_SYSTEMS,
  DEFAULT_DESIGN_SYSTEM,
  isValidDesignSystem,
  type DesignSystemId,
} from "@/lib/design-system/registry";

interface DesignSystemContextValue {
  designSystem: DesignSystemId;
  setDesignSystem: (id: DesignSystemId, opts?: { persist?: boolean }) => void;
  /** True when the active id differs from the persisted one — the
   *  picker uses this to show Keep / Revert affordances. */
  isPreviewing: boolean;
  savedDesignSystem: DesignSystemId | null;
}

const STORAGE_KEY = "bhn-design-system";

const DesignSystemContext = createContext<DesignSystemContextValue>({
  designSystem: DEFAULT_DESIGN_SYSTEM,
  setDesignSystem: () => {},
  isPreviewing: false,
  savedDesignSystem: null,
});

export function DesignSystemProvider({ children }: { children: ReactNode }) {
  const [designSystem, setDesignSystemState] = useState<DesignSystemId>(DEFAULT_DESIGN_SYSTEM);
  const [savedDesignSystem, setSaved] = useState<DesignSystemId | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = localStorage.getItem(STORAGE_KEY);
    if (isValidDesignSystem(raw)) {
      setDesignSystemState(raw);
      setSaved(raw);
      document.documentElement.dataset.designSystem = raw;
    } else {
      // Either nothing saved, or a stale id from a removed entry.
      // Drop it and fall back to the platform default.
      if (raw) {
        try { localStorage.removeItem(STORAGE_KEY); } catch { /* */ }
      }
      setDesignSystemState(DEFAULT_DESIGN_SYSTEM);
      setSaved(null);
      document.documentElement.dataset.designSystem = DEFAULT_DESIGN_SYSTEM;
    }
  }, []);

  function setDesignSystem(id: DesignSystemId, opts?: { persist?: boolean }) {
    const persist = opts?.persist ?? true;
    setDesignSystemState(id);
    document.documentElement.dataset.designSystem = id;
    if (persist) {
      try { localStorage.setItem(STORAGE_KEY, id); } catch { /* */ }
      setSaved(id);
    }
    // Best-effort analytics — only if the user has opted in.
    try {
      const consentRaw = localStorage.getItem("bhn-consent");
      const okay = consentRaw && JSON.parse(consentRaw)?.analytics === true;
      if (okay && typeof navigator !== "undefined" && navigator.sendBeacon) {
        const body = JSON.stringify({
          name: "design_system_change",
          path: location.pathname,
          props: { designSystem: id, persist },
        });
        navigator.sendBeacon("/api/analytics/track", new Blob([body], { type: "application/json" }));
      }
    } catch { /* */ }
  }

  const isPreviewing = savedDesignSystem !== null && designSystem !== savedDesignSystem;

  return (
    <DesignSystemContext.Provider value={{ designSystem, setDesignSystem, isPreviewing, savedDesignSystem }}>
      {children}
    </DesignSystemContext.Provider>
  );
}

export function useDesignSystem() {
  return useContext(DesignSystemContext);
}

/** Server-rendered inline script that reads the saved design system
 *  from localStorage and sets `data-design-system` BEFORE the React
 *  app mounts. Prevents flash-of-wrong-system on first paint —
 *  identical pattern to `ThemeScript`. */
export function DesignSystemScript() {
  const allowedIds = DESIGN_SYSTEMS.map((d) => d.id);
  const allowedJson = JSON.stringify(allowedIds);
  const code = `(function(){try{var allow=${allowedJson};var s=localStorage.getItem('${STORAGE_KEY}');var v=(s&&allow.indexOf(s)>=0)?s:'${DEFAULT_DESIGN_SYSTEM}';if(s&&allow.indexOf(s)<0){try{localStorage.removeItem('${STORAGE_KEY}');}catch(_){}}document.documentElement.setAttribute('data-design-system',v);}catch(e){document.documentElement.setAttribute('data-design-system','${DEFAULT_DESIGN_SYSTEM}');}})();`;
  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}
