"use client";

/**
 * Per-tab toggle for the floating PageTranslator dock. Persisted to
 * localStorage as `bhn-translation-enabled`:
 *   - missing / "true" → enabled (default)
 *   - "false"          → disabled
 *
 * When disabled:
 *   - The TranslatorDock + PageTranslator render nothing (the dock
 *     chrome hides too)
 *   - The auto-translate-on-mount path inside PageTranslator is
 *     short-circuited so a saved target language doesn't re-fire
 *
 * `setPageTranslationEnabled()` writes localStorage and dispatches
 * a `bhn-translation-toggled` CustomEvent so subscribed components
 * react in real time (localStorage events fire across tabs but not
 * within the same tab — the custom event covers in-tab updates).
 */

import { useEffect, useState } from "react";

const STORAGE_KEY = "bhn-translation-enabled";
const EVENT_NAME = "bhn-translation-toggled";

/** Read the flag without subscribing to changes. Safe to call from
 *  effects or event handlers; returns the default `true` on SSR. */
export function readPageTranslationEnabled(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return localStorage.getItem(STORAGE_KEY) !== "false";
  } catch {
    return true;
  }
}

/** Write the flag and notify subscribers in this tab via a
 *  CustomEvent. Cross-tab notification still works via the standard
 *  StorageEvent (which the hook below also subscribes to). */
export function setPageTranslationEnabled(enabled: boolean): void {
  if (typeof window === "undefined") return;
  try {
    if (enabled) {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, "false");
    }
  } catch {
    /* localStorage full or disabled — non-fatal */
  }
  window.dispatchEvent(
    new CustomEvent(EVENT_NAME, { detail: { enabled } }),
  );
}

/** Reactive read — re-renders the calling component whenever the
 *  flag flips (in this tab via CustomEvent, across tabs via the
 *  StorageEvent). SSR-safe: returns the default `true` until the
 *  client mounts. */
export function usePageTranslationEnabled(): boolean {
  // SSR-stable default. The useEffect below pulls the real value
  // on mount; a brief flash of "enabled" is fine because the dock
  // doesn't auto-translate until 600 ms after mount anyway.
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    setEnabled(readPageTranslationEnabled());

    function onCustomToggle(e: Event) {
      const ce = e as CustomEvent<{ enabled: boolean }>;
      if (typeof ce.detail?.enabled === "boolean") setEnabled(ce.detail.enabled);
    }
    function onStorageChange(e: StorageEvent) {
      if (e.key === STORAGE_KEY) setEnabled(readPageTranslationEnabled());
    }
    window.addEventListener(EVENT_NAME, onCustomToggle);
    window.addEventListener("storage", onStorageChange);
    return () => {
      window.removeEventListener(EVENT_NAME, onCustomToggle);
      window.removeEventListener("storage", onStorageChange);
    };
  }, []);

  return enabled;
}
