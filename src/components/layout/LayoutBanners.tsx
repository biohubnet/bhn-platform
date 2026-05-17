"use client";
/**
 * Layout banners — impersonation, demo expiry, unverified email,
 * AutoPipette first-run. These used to render at the top of <main>
 * in the dashboard layout, which put them ABOVE every page's hero.
 * They now render IMMEDIATELY AFTER the editorial hero via a
 * client-side context wired up like this:
 *
 *   1. Dashboard layout (server component) fetches the banner state
 *      and passes it to `<LayoutBannerProvider data={...}>` which
 *      wraps `{children}`.
 *   2. `<DSPageHeader>` (already a client component) renders the
 *      `<LayoutBannersSlot />` at the end of its return tree.
 *   3. The slot reads the context and renders the appropriate
 *      banners — only re-renders if the data changes.
 *
 * This is all client-side context so we don't drag server-only
 * imports (next/headers, prisma) into client bundles when PageHero
 * is called from client components (e.g. EventFormView).
 */
import { createContext, useContext, type ReactNode } from "react";
import { ImpersonationBanner } from "@/components/admin/ImpersonationBanner";
import { DemoBanner } from "@/components/admin/DemoBanner";
import { UnverifiedEmailBanner } from "@/components/auth/UnverifiedEmailBanner";
import { AutoPipetteFirstRunNotice } from "@/components/assist/AutoPipetteFirstRunNotice";

export interface LayoutBannerData {
  actingAs: string | null;
  isDemo: boolean;
  demoExpiresAt: string | null;
  showUnverifiedBanner: boolean;
  email: string | null;
}

const LayoutBannerContext = createContext<LayoutBannerData | null>(null);

export function LayoutBannerProvider({
  data,
  children,
}: {
  data: LayoutBannerData;
  children: ReactNode;
}) {
  return (
    <LayoutBannerContext.Provider value={data}>
      {children}
    </LayoutBannerContext.Provider>
  );
}

/**
 * Renders the actual banner UI. Drop this immediately after the
 * editorial hero (DSPageHeader places it at the end of every DS
 * branch). The first-run AutoPipette notice always renders since
 * its own internal logic gates the visible UI; everything else is
 * conditional on the layout's banner state.
 */
export function LayoutBannersSlot() {
  const data = useContext(LayoutBannerContext);
  // Outside the dashboard layout (e.g. auth pages) the provider is
  // absent — render nothing and let the page own its own header.
  if (!data) return null;

  const hasBanner =
    Boolean(data.actingAs) ||
    data.isDemo ||
    (data.showUnverifiedBanner && !!data.email);

  return (
    <div className={hasBanner ? "mb-6 space-y-3" : ""}>
      {data.actingAs && <ImpersonationBanner actingAs={data.actingAs} />}
      {data.isDemo && (
        <DemoBanner kind="demo" expiresAt={data.demoExpiresAt} />
      )}
      {data.showUnverifiedBanner && data.email && (
        <UnverifiedEmailBanner email={data.email} />
      )}
      <AutoPipetteFirstRunNotice />
    </div>
  );
}
