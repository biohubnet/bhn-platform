/**
 * Design-system registry.
 *
 * A "design system" is a second orthogonal axis to the color theme.
 *
 *   • Color theme  (Light, Dark, Scientific, …) — *what colors*
 *   • Design system (Classic, Cinematic, …)    — *what layout vocabulary*
 *
 * Both coexist. A user can pick "Dark + Cinematic" or "Light +
 * Classic". The active design system is stored client-side in
 * localStorage (`bhn-design-system`) and reflected on the root
 * `<html data-design-system="...">` so individual primitives can
 * also style themselves via CSS selectors if they want, without
 * needing the React context.
 *
 * How primitives consume this
 *   Components under `src/components/design-system/` read the
 *   active design system via `useDesignSystem()` and branch their
 *   rendering. The page code stays declarative:
 *
 *     <DSPageHeader title="AutoPipette" eyebrow="Admin · platform"
 *                   description="…" icon={Pipette} />
 *     <DSSection title="Health"> … </DSSection>
 *
 *   The same JSX renders as a card-based layout under "classic"
 *   and as a cinematic, gradient-heavy editorial layout under
 *   "cinematic". No conditional logic in page code.
 *
 * Adding a new design system
 *   1. Append an entry below.
 *   2. Teach every primitive in `src/components/design-system/`
 *      how to render under the new id. Default to "classic" for
 *      anything you don't override — the picker will keep working.
 *   3. Bump `DESIGN_SYSTEM_VERSION` if you want to invalidate
 *      stored picks (rare — usually unnecessary).
 *
 * Adding new primitives
 *   Drop a file in `src/components/design-system/`. Mark it
 *   `"use client"` and call `useDesignSystem()` to branch on
 *   `id`. Export from `src/components/design-system/index.ts`.
 */

export const DESIGN_SYSTEMS = [
  {
    id: "classic",
    name: "Classic",
    description:
      "Card-based, structured, calm. The original BHN look — neutral chrome with clear section boundaries. Works on any surface.",
    category: "foundation",
  },
  {
    id: "cinematic",
    name: "Cinematic",
    description:
      "Editorial brand stage. Full-bleed gradient hero, eyebrow labels, hairline dividers, gradient-text stats, no card boundaries. Best for showcase and overview pages.",
    category: "foundation",
  },
  {
    id: "studio",
    name: "Studio",
    description:
      "Organic, kinetic, employer-portal vibe. Full-bleed gradient mesh hero with drifting blobs + a curve-down divider, asymmetric blob-cornered stat tiles (organic-card / organic-card-alt), gradient icon disks. Extracted from the HR overview; auto-applied to /employer/* and the HR-preview admin block.",
    category: "foundation",
  },
] as const;

export const DESIGN_SYSTEM_CATEGORIES = {
  foundation: { label: "Foundation", subtitle: "Always available" },
  experimental: { label: "Experimental", subtitle: "Try it on / off" },
} as const;

export type DesignSystemCategory = keyof typeof DESIGN_SYSTEM_CATEGORIES;
export type DesignSystemId = (typeof DESIGN_SYSTEMS)[number]["id"];

/** Lookup helper. Returns the entry or null if the id is unknown
 *  (e.g. an old localStorage value referencing a removed system). */
export function findDesignSystem(id: string) {
  return DESIGN_SYSTEMS.find((d) => d.id === id) ?? null;
}

/** Cheap validator used by the inline FOUC-prevention script too. */
export function isValidDesignSystem(id: string | null | undefined): id is DesignSystemId {
  if (!id) return false;
  return DESIGN_SYSTEMS.some((d) => d.id === id);
}

/** Platform-wide fallback design system when the admin hasn't picked
 *  one yet (or the DB lookup misses). As of 2026-05-17, Cinematic is
 *  the canonical "everywhere except HR Overview" look — `/employer/*`
 *  route-scopes itself to Studio via its own layout, and every other
 *  surface inherits this default. */
export const DEFAULT_DESIGN_SYSTEM: DesignSystemId = "cinematic";
