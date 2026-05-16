"use client";
import { Suspense } from "react";
import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "@/components/ui/ThemeProvider";
import { DesignSystemProvider } from "@/components/ui/DesignSystemProvider";
import { PageViewTracker } from "@/components/analytics/PageViewTracker";
import { I18nProvider } from "@/lib/i18n/I18nProvider";
import { ConsentProvider } from "@/components/consent/ConsentProvider";
import { CookieBanner } from "@/components/consent/CookieBanner";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <I18nProvider>
        <ConsentProvider>
          <ThemeProvider>
            <DesignSystemProvider>
              <Suspense fallback={null}>
                <PageViewTracker />
              </Suspense>
              {children}
              <CookieBanner />
            </DesignSystemProvider>
          </ThemeProvider>
        </ConsentProvider>
      </I18nProvider>
    </SessionProvider>
  );
}
