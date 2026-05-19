/**
 * Curated registry of floater components available to the admin
 * for placement on the /login backdrop.
 *
 * 74+ persona/process glyphs ship in `src/components/branding/`;
 * this registry exposes the 20 that work best as ambient
 * periphery atmosphere (compact aspect ratios, recognisable at
 * thumbnail size, on-brand to a biotech audience). Adding a new
 * entry here is a code-side decision — admins on
 * /admin/login-floaters pick from this list, but can't add
 * arbitrary components.
 *
 * Component prop signature is `{ size?: number; className?: string }`
 * across all floaters — both the looping process animations and
 * the simple static glyphs use this shape.
 */

import type React from "react";

import { AntibodyBinding } from "@/components/branding/AntibodyBinding";
import { BioreactorScaleUp } from "@/components/branding/BioreactorScaleUp";
import { CarTKill } from "@/components/branding/CarTKill";
import { CarTManufacturing } from "@/components/branding/CarTManufacturing";
import { ChromatographyPurification } from "@/components/branding/ChromatographyPurification";
import { ColdChainShipment } from "@/components/branding/ColdChainShipment";
import { CrisprEditCycle } from "@/components/branding/CrisprEditCycle";
import { DnaTranscription } from "@/components/branding/DnaTranscription";
import { ElisaPlateAssay } from "@/components/branding/ElisaPlateAssay";
import { EnrollmentFunnel } from "@/components/branding/EnrollmentFunnel";
import { GmpCellBank } from "@/components/branding/GmpCellBank";
import { GowningCleanroom } from "@/components/branding/GowningCleanroom";
import { HplcAnalyticalRun } from "@/components/branding/HplcAnalyticalRun";
import { KaplanMeierReveal } from "@/components/branding/KaplanMeierReveal";
import { MrnaLnpAssembly } from "@/components/branding/MrnaLnpAssembly";
import { MscCultureCycle } from "@/components/branding/MscCultureCycle";
import { MslEngagementCycle } from "@/components/branding/MslEngagementCycle";
import { PatentProsecution } from "@/components/branding/PatentProsecution";
import { RegulatorySubmission } from "@/components/branding/RegulatorySubmission";
import { WesternBlotRun } from "@/components/branding/WesternBlotRun";

type FloaterComponent = React.ComponentType<{ size?: number; className?: string }>;

export interface FloaterDef {
  id: string;
  displayName: string;
  category:
    | "Molecular"
    | "Cell / Process"
    | "Analytical"
    | "Clinical"
    | "Manufacturing"
    | "Regulatory"
    | "Persona";
  Component: FloaterComponent;
  /** Suggested size in px — admin overrides per-instance from the
   *  editor. Sizes chosen to look balanced at thumbnail scale on
   *  the /login periphery. */
  defaultSize: number;
  /** Tailwind text-color class. Picks the floater's dominant
   *  stroke tint (the SVGs use `currentColor`). */
  defaultColorClass: string;
}

export const FLOATER_REGISTRY: Record<string, FloaterDef> = {
  "antibody-binding": {
    id: "antibody-binding",
    displayName: "Antibody binding",
    category: "Molecular",
    Component: AntibodyBinding,
    defaultSize: 140,
    defaultColorClass: "text-emerald-300/30",
  },
  "dna-transcription": {
    id: "dna-transcription",
    displayName: "DNA → mRNA transcription",
    category: "Molecular",
    Component: DnaTranscription,
    defaultSize: 220,
    defaultColorClass: "text-sky-300/28",
  },
  "western-blot-run": {
    id: "western-blot-run",
    displayName: "Western blot run",
    category: "Analytical",
    Component: WesternBlotRun,
    defaultSize: 150,
    defaultColorClass: "text-sky-200/28",
  },
  "car-t-kill": {
    id: "car-t-kill",
    displayName: "CAR-T kill cycle",
    category: "Cell / Process",
    Component: CarTKill,
    defaultSize: 160,
    defaultColorClass: "text-rose-300/28",
  },
  "msc-culture-cycle": {
    id: "msc-culture-cycle",
    displayName: "MSC culture cycle",
    category: "Cell / Process",
    Component: MscCultureCycle,
    defaultSize: 200,
    defaultColorClass: "text-slate-200/35",
  },
  "bioreactor-scale-up": {
    id: "bioreactor-scale-up",
    displayName: "Bioreactor scale-up",
    category: "Manufacturing",
    Component: BioreactorScaleUp,
    defaultSize: 180,
    defaultColorClass: "text-cyan-300/28",
  },
  "chromatography-purification": {
    id: "chromatography-purification",
    displayName: "Chromatography purification",
    category: "Manufacturing",
    Component: ChromatographyPurification,
    defaultSize: 170,
    defaultColorClass: "text-emerald-200/28",
  },
  "enrollment-funnel": {
    id: "enrollment-funnel",
    displayName: "Trial enrollment funnel",
    category: "Clinical",
    Component: EnrollmentFunnel,
    defaultSize: 160,
    defaultColorClass: "text-amber-300/28",
  },
  "kaplan-meier-reveal": {
    id: "kaplan-meier-reveal",
    displayName: "Kaplan-Meier reveal",
    category: "Clinical",
    Component: KaplanMeierReveal,
    defaultSize: 170,
    defaultColorClass: "text-sky-300/28",
  },
  "mrna-lnp-assembly": {
    id: "mrna-lnp-assembly",
    displayName: "mRNA-LNP assembly",
    category: "Molecular",
    Component: MrnaLnpAssembly,
    defaultSize: 150,
    defaultColorClass: "text-violet-300/28",
  },
  "crispr-edit-cycle": {
    id: "crispr-edit-cycle",
    displayName: "CRISPR edit cycle",
    category: "Molecular",
    Component: CrisprEditCycle,
    defaultSize: 160,
    defaultColorClass: "text-fuchsia-300/28",
  },
  "patent-prosecution": {
    id: "patent-prosecution",
    displayName: "Patent prosecution",
    category: "Regulatory",
    Component: PatentProsecution,
    defaultSize: 160,
    defaultColorClass: "text-amber-300/28",
  },
  "gowning-cleanroom": {
    id: "gowning-cleanroom",
    displayName: "Cleanroom gowning",
    category: "Manufacturing",
    Component: GowningCleanroom,
    defaultSize: 150,
    defaultColorClass: "text-cyan-200/28",
  },
  "regulatory-submission": {
    id: "regulatory-submission",
    displayName: "Regulatory submission",
    category: "Regulatory",
    Component: RegulatorySubmission,
    defaultSize: 160,
    defaultColorClass: "text-indigo-300/28",
  },
  "elisa-plate-assay": {
    id: "elisa-plate-assay",
    displayName: "ELISA plate assay",
    category: "Analytical",
    Component: ElisaPlateAssay,
    defaultSize: 150,
    defaultColorClass: "text-amber-200/28",
  },
  "hplc-analytical-run": {
    id: "hplc-analytical-run",
    displayName: "HPLC analytical run",
    category: "Analytical",
    Component: HplcAnalyticalRun,
    defaultSize: 160,
    defaultColorClass: "text-blue-300/28",
  },
  "msl-engagement-cycle": {
    id: "msl-engagement-cycle",
    displayName: "MSL engagement cycle",
    category: "Persona",
    Component: MslEngagementCycle,
    defaultSize: 170,
    defaultColorClass: "text-teal-300/28",
  },
  "cart-manufacturing": {
    id: "cart-manufacturing",
    displayName: "CAR-T manufacturing",
    category: "Manufacturing",
    Component: CarTManufacturing,
    defaultSize: 170,
    defaultColorClass: "text-rose-200/28",
  },
  "gmp-cell-bank": {
    id: "gmp-cell-bank",
    displayName: "GMP cell bank",
    category: "Manufacturing",
    Component: GmpCellBank,
    defaultSize: 160,
    defaultColorClass: "text-emerald-200/28",
  },
  "cold-chain-shipment": {
    id: "cold-chain-shipment",
    displayName: "Cold-chain shipment",
    category: "Manufacturing",
    Component: ColdChainShipment,
    defaultSize: 160,
    defaultColorClass: "text-sky-200/28",
  },
};

export const FLOATER_LIST: FloaterDef[] = Object.values(FLOATER_REGISTRY);

/** Allowed lab-swim variants. The SVG itself is wrapped by the
 *  DraggableGlyph component which applies one of these to drive
 *  the gentle drift translate. */
export const SWIM_CLASSES = [
  "lab-swim",
  "lab-swim-slow",
  "lab-swim-rev",
  "lab-swim-drift",
] as const;
export type SwimClass = (typeof SWIM_CLASSES)[number];
