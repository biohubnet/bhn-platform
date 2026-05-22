"use client";

/**
 * Wrapper for the floating PageTranslator dock — handles the
 * "fixed top-3 right-4" position + surface chrome that used to
 * live inline in the dashboard layout. Splitting it out as a
 * client component lets us hide the WHOLE thing (including the
 * `surface` background pill) when the user has toggled
 * translation off via the ThemePicker dropdown.
 */

import { PageTranslator } from "./PageTranslator";
import { usePageTranslationEnabled } from "./usePageTranslationEnabled";

interface Props {
  /** Platform-level gate — superadmin toggle at /admin/settings.
   *  When false the dock is hidden regardless of the user's own toggle. */
  platformEnabled?: boolean;
}

export function TranslatorDock({ platformEnabled = true }: Props) {
  const userEnabled = usePageTranslationEnabled();
  // Both gates must be open: the platform setting AND the user's per-tab toggle.
  if (!platformEnabled || !userEnabled) return null;

  return (
    <div className="fixed top-3 right-4 z-40 pointer-events-auto" data-no-translate>
      <div className="surface px-1 py-1">
        <PageTranslator />
      </div>
    </div>
  );
}
