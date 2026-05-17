/**
 * /employer layout.
 *
 * Previously route-scoped every page under this segment to Studio.
 * After the 2026-05-17 unification, only the HR Overview home page
 * (`/employer/page.tsx`) keeps the Studio brand-stage look — its
 * page file wraps its own content in `<DesignSystemProvider
 * value="studio">`. Every other employer sub-page (how-it-works,
 * postings, applicants pipeline, etc.) is a workspace surface, not
 * a brand stage, so it inherits the platform-default Cinematic look
 * via the root dashboard layout.
 *
 * Layout file kept (rather than deleted) so future overrides have a
 * place to land without restructuring the routing tree.
 */
export default function EmployerLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
