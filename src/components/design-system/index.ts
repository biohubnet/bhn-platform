/**
 * Barrel export for the design-system primitives — **AVOID** using
 * this from pages or other server components under Next.js 16 +
 * Turbopack. Import directly from each component file instead:
 *
 *   import { DSPageHeader } from "@/components/design-system/DSPageHeader";
 *   import { DSSection }    from "@/components/design-system/DSSection";
 *   import { DSStatGrid, DSStat } from "@/components/design-system/DSStatGrid";
 *
 * Why direct imports
 *   Under Next.js 16 + Turbopack, re-exporting "use client"
 *   components through a barrel — even one marked "use client"
 *   itself — silently drops the client-component boundary. The
 *   re-exported component then renders as a server component, and
 *   useContext (used inside DSPageHeader / DSEyebrow / etc.) throws
 *   at SSR with the generic "An error occurred in the Server
 *   Components render" digest 1621801304.
 *
 *   Direct imports per file preserve the boundary correctly.
 *
 * This barrel is kept only so existing references resolve at type-
 * check time; consumers should be converted to direct imports
 * whenever touched.
 */
export { DSPageHeader } from "./DSPageHeader";
export { DSSection } from "./DSSection";
export { DSStatGrid, DSStat } from "./DSStatGrid";
export type { StatTone } from "./DSStatGrid";
export { DSEyebrow } from "./DSEyebrow";
export { DSCoverBanner } from "./DSCoverBanner";
