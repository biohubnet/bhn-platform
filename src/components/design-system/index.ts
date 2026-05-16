"use client";
/**
 * Barrel export for the design-system primitives.
 *
 * Page code imports from `@/components/design-system`:
 *
 *   import { DSPageHeader, DSSection, DSStatGrid, DSStat } from "@/components/design-system";
 *
 * Each primitive reads `useDesignSystem()` and branches its render.
 * The page never has to.
 *
 * Why this barrel is itself marked "use client":
 *   Under Next.js 16 + Turbopack, re-exporting from "use client"
 *   modules through a barrel that lacks the directive causes the
 *   client-boundary marker to be dropped — consumers then receive
 *   the components as if they were server components, and
 *   useContext (used inside DSPageHeader / DSEyebrow / etc.) blows
 *   up at SSR with the generic "An error occurred in the Server
 *   Components render" digest 1621801304. Marking this barrel
 *   "use client" preserves the boundary for every re-exported
 *   component in one line — no need to refactor every consumer
 *   to import directly from each file.
 */
export { DSPageHeader } from "./DSPageHeader";
export { DSSection } from "./DSSection";
export { DSStatGrid, DSStat } from "./DSStatGrid";
export type { StatTone } from "./DSStatGrid";
export { DSEyebrow } from "./DSEyebrow";
export { DSCoverBanner } from "./DSCoverBanner";
