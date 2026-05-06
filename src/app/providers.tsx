"use client";
import { Suspense } from "react";
import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "@/components/ui/ThemeProvider";
import { PageViewTracker } from "@/components/analytics/PageViewTracker";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider>
        <Suspense fallback={null}>
          <PageViewTracker />
        </Suspense>
        {children}
      </ThemeProvider>
    </SessionProvider>
  );
}
