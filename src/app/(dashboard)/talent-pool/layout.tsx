/**
 * /talent-pool layout — route-scopes the talent-pool surface to
 * the Studio design system.
 *
 * The talent pool sits in the HR menu (sidebar `employerItems`)
 * alongside `/employer/*`, even though its URL lives outside the
 * /employer route segment. The user-facing intent is "every page
 * on the HR menu looks the same" — so we nest another
 * <DesignSystemProvider value="studio"> here, mirroring what
 * /employer/layout.tsx does for the rest of the menu.
 *
 * Effect: DS primitives rendered under /talent-pool read
 * "studio" via useDesignSystem() and switch to the Studio
 * variant. The page-level DSPageHeader then renders the
 * gradient-mesh hero with drifting blobs + curve-down, matching
 * /employer's chrome.
 */
import { DesignSystemProvider } from "@/components/ui/DesignSystemProvider";

export default function TalentPoolLayout({ children }: { children: React.ReactNode }) {
  return (
    <DesignSystemProvider value="studio">
      {children}
    </DesignSystemProvider>
  );
}
