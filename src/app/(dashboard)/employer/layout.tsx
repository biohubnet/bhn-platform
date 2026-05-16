/**
 * /employer layout — route-scopes every page under this segment
 * to the Studio design system regardless of the platform-wide
 * default an admin has chosen.
 *
 * How it works
 *   The root dashboard layout (sibling level) mounts a top-level
 *   <DesignSystemProvider value={platformDefault}>. This nested
 *   layout overrides that context with `value="studio"`, so DS
 *   primitives rendered inside /employer/* read "studio" via
 *   useDesignSystem() and switch their visual treatment.
 *
 * Why this approach
 *   The DS context is a single value — nesting another provider
 *   with a different value gives us route-scoped overrides for
 *   free without any extra plumbing or route-aware logic in the
 *   primitives themselves. Other routes are unaffected.
 *
 * The same pattern lets us flip /employer to Classic + Cinematic
 * later by passing a different value here — or to a future
 * route-managed picker if we let users opt out.
 */
import { DesignSystemProvider } from "@/components/ui/DesignSystemProvider";

export default function EmployerLayout({ children }: { children: React.ReactNode }) {
  return (
    <DesignSystemProvider value="studio">
      {children}
    </DesignSystemProvider>
  );
}
