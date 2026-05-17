/**
 * /talent-pool layout.
 *
 * Previously route-scoped the talent-pool surface to the Studio
 * design system (mirroring `/employer/*` so every page on the HR
 * menu looked the same). After the 2026-05-17 Option-B unification
 * the talent pool now inherits the platform-default DS (Cinematic),
 * matching the rest of the admin/employer workspace. The /employer
 * HR Overview keeps its Studio override on its own layout; the
 * talent-pool surface is a workspace, not a brand stage.
 *
 * Layout file kept (rather than deleted) so future overrides have a
 * place to land without restructuring the routing tree.
 */
export default function TalentPoolLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
