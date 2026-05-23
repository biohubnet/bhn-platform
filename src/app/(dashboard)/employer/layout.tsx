/**
 * /employer layout — routes the entire HR portal through Studio.
 *
 * Studio gives every DSPageHeader under /employer/* the full-bleed
 * gradient-mesh hero with drifting blobs and a curve-down divider,
 * matching the visual language of the brand-stage overview page.
 *
 * The overview page (/employer/page.tsx) used to carry its own
 * inline <DesignSystemProvider value="studio"> — that wrapper is
 * removed now that the layout handles it for the whole segment.
 */
import { DesignSystemProvider } from "@/components/ui/DesignSystemProvider";

export default function EmployerLayout({ children }: { children: React.ReactNode }) {
  return (
    <DesignSystemProvider value="studio">
      {children}
    </DesignSystemProvider>
  );
}
