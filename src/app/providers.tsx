"use client";
import { Suspense } from "react";
import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "@/components/ui/ThemeProvider";
import { DesignSystemProvider } from "@/components/ui/DesignSystemProvider";
import { PageViewTracker } from "@/components/analytics/PageViewTracker";
import { I18nProvider } from "@/lib/i18n/I18nProvider";
import { ConsentProvider } from "@/components/consent/ConsentProvider";
import { CookieBanner } from "@/components/consent/CookieBanner";
import { GreenwoodAtmosphere } from "@/components/themes/GreenwoodAtmosphere";
import type { DesignSystemId } from "@/lib/design-system/registry";

export function Providers({
  children,
  initialDesignSystem,
}: {
  children: React.ReactNode;
  /** Platform-wide design system id, read server-side from the
   *  PlatformSetting table in the root layout. */
  initialDesignSystem: DesignSystemId;
}) {
  return (
    <SessionProvider>
      <I18nProvider>
        <ConsentProvider>
          <ThemeProvider>
            <DesignSystemProvider value={initialDesignSystem}>
              <Suspense fallback={null}>
                <PageViewTracker />
              </Suspense>
              {/* Theme-specific decoration layer — renders falling
                  leaves, ground mist, dappled sunlight, fireflies +
                  a rotating scene caption when theme === "greenwood"
                  is active. Mounted inside ThemeProvider so it can
                  read the active theme; returns null for every other
                  theme so it's free until needed. */}
              <GreenwoodAtmosphere />
              {children}
              <CookieBanner />
            </DesignSystemProvider>
          </ThemeProvider>
        </ConsentProvider>
      </I18nProvider>
    </SessionProvider>
  );
}
