/**
 * Barrel export for the design-system primitives.
 *
 * Page code imports from `@/components/design-system`:
 *
 *   import { DSPageHeader, DSSection, DSStatGrid, DSStat } from "@/components/design-system";
 *
 * Each primitive reads `useDesignSystem()` and branches its render.
 * The page never has to.
 */
export { DSPageHeader } from "./DSPageHeader";
export { DSSection } from "./DSSection";
export { DSStatGrid, DSStat } from "./DSStatGrid";
export type { StatTone } from "./DSStatGrid";
export { DSEyebrow } from "./DSEyebrow";
export { DSCoverBanner } from "./DSCoverBanner";
