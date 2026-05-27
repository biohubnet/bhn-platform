/**
 * Curated registry of floater components available to the admin
 * for placement on the /login backdrop AND for browsing in the
 * /admin/login-floaters editorial gallery.
 *
 * Every floater that ships in `src/components/branding/` and
 * speaks the `{ size?: number; className?: string }` prop contract
 * is exposed here. Each entry carries a stable id, display name,
 * editorial category (used to group the gallery into numbered
 * sections), a default px size that looks balanced at thumbnail
 * scale, and a default Tailwind text-color class that the floater
 * inherits via `currentColor`.
 *
 * Adding a new floater is a code-side decision — drop the React
 * component in `src/components/branding/`, then register it here
 * with the right category + tint. Admins on /admin/login-floaters
 * pick from this list; they can't add arbitrary components.
 */

import type React from "react";

import { AavGeneTherapy } from "@/components/branding/AavGeneTherapy";
import { AdaptiveTrialDesign } from "@/components/branding/AdaptiveTrialDesign";
import { AdmeProfiling } from "@/components/branding/AdmeProfiling";
import { AlcoaDocumentation } from "@/components/branding/AlcoaDocumentation";
import { AntibodyBinding } from "@/components/branding/AntibodyBinding";
import { AsepticConnection } from "@/components/branding/AsepticConnection";
import { BactAlertRapid } from "@/components/branding/BactAlertRapid";
import { BatchReleaseQA } from "@/components/branding/BatchReleaseQA";
import { BioburdenPlate } from "@/components/branding/BioburdenPlate";
import { BioinformaticsPipeline } from "@/components/branding/BioinformaticsPipeline";
import { BiomarkerQualification } from "@/components/branding/BiomarkerQualification";
import { BioreactorScaleUp } from "@/components/branding/BioreactorScaleUp";
import { CarTKill } from "@/components/branding/CarTKill";
import { CarTManufacturing } from "@/components/branding/CarTManufacturing";
import { ChromatographyPurification } from "@/components/branding/ChromatographyPurification";
import { ColdChainShipment } from "@/components/branding/ColdChainShipment";
import { CompoundLogisticsKit } from "@/components/branding/CompoundLogisticsKit";
import { CrisprEditCycle } from "@/components/branding/CrisprEditCycle";
import { CryoEMStructure } from "@/components/branding/CryoEMStructure";
import { DigitalPathology } from "@/components/branding/DigitalPathology";
import { DnaTranscription } from "@/components/branding/DnaTranscription";
import { DoseEscalation3plus3 } from "@/components/branding/DoseEscalation3plus3";
import { DrugMasterFile } from "@/components/branding/DrugMasterFile";
import { ElisaPlateAssay } from "@/components/branding/ElisaPlateAssay";
import { EndotoxinLAL } from "@/components/branding/EndotoxinLAL";
import { EnrollmentFunnel } from "@/components/branding/EnrollmentFunnel";
import { EnvironmentalMonitoring } from "@/components/branding/EnvironmentalMonitoring";
import { FlowCytometryGating } from "@/components/branding/FlowCytometryGating";
import { GmpCellBank } from "@/components/branding/GmpCellBank";
import { GowningCleanroom } from "@/components/branding/GowningCleanroom";
import { GrantSubmissionCycle } from "@/components/branding/GrantSubmissionCycle";
import { HeorPayerEngagement } from "@/components/branding/HeorPayerEngagement";
import { HighThroughputScreen } from "@/components/branding/HighThroughputScreen";
import { HplcAnalyticalRun } from "@/components/branding/HplcAnalyticalRun";
import { InVivoPkPdStudy } from "@/components/branding/InVivoPkPdStudy";
import { InformedConsent } from "@/components/branding/InformedConsent";
import { KaplanMeierReveal } from "@/components/branding/KaplanMeierReveal";
import { MassSpecProteomics } from "@/components/branding/MassSpecProteomics";
import { MedChemSAR } from "@/components/branding/MedChemSAR";
import { MedicalInformationRequest } from "@/components/branding/MedicalInformationRequest";
import { MolecularDocking } from "@/components/branding/MolecularDocking";
import { MrnaLnpAssembly } from "@/components/branding/MrnaLnpAssembly";
import { MscCultureCycle } from "@/components/branding/MscCultureCycle";
import { MslEngagementCycle } from "@/components/branding/MslEngagementCycle";
import { MycoplasmaPCR } from "@/components/branding/MycoplasmaPCR";
import { OosOotInvestigation } from "@/components/branding/OosOotInvestigation";
import { PatentProsecution } from "@/components/branding/PatentProsecution";
import { PatientSupportProgram } from "@/components/branding/PatientSupportProgram";
import { PhageDisplayPanning } from "@/components/branding/PhageDisplayPanning";
import { PharmaSalesCall } from "@/components/branding/PharmaSalesCall";
import { PharmacovigilanceSignal } from "@/components/branding/PharmacovigilanceSignal";
import { PitchDeckBuild } from "@/components/branding/PitchDeckBuild";
import { PotencyBioassay } from "@/components/branding/PotencyBioassay";
import { PublicationPlanCycle } from "@/components/branding/PublicationPlanCycle";
import { QcReleaseTesting } from "@/components/branding/QcReleaseTesting";
import { RadiologyImagingBiomarker } from "@/components/branding/RadiologyImagingBiomarker";
import { RecallComplaintAdr } from "@/components/branding/RecallComplaintAdr";
import { RegulatorySubmission } from "@/components/branding/RegulatorySubmission";
import { SingleCellRnaSeq } from "@/components/branding/SingleCellRnaSeq";
import { SiteActivation } from "@/components/branding/SiteActivation";
import { SopLifecycle } from "@/components/branding/SopLifecycle";
import { SourceDataVerification } from "@/components/branding/SourceDataVerification";
import { StemCellDifferentiation } from "@/components/branding/StemCellDifferentiation";
import { SterileFillFinish } from "@/components/branding/SterileFillFinish";
import { SterilityTest } from "@/components/branding/SterilityTest";
import { TechTransferLabToPilot } from "@/components/branding/TechTransferLabToPilot";
import { ToxDoseEscalation } from "@/components/branding/ToxDoseEscalation";
import { ValidationIQOQPQ } from "@/components/branding/ValidationIQOQPQ";
import { VcDiligenceCycle } from "@/components/branding/VcDiligenceCycle";
import { WesternBlotRun } from "@/components/branding/WesternBlotRun";
// ── 2026-05-28 batch: fill out sparse categories to ≥6 each ─────
import { AcademicTechTransfer } from "@/components/branding/AcademicTechTransfer";
import { CompetitiveIntelligence } from "@/components/branding/CompetitiveIntelligence";
import { CongressEngagementPlan } from "@/components/branding/CongressEngagementPlan";
import { DisinfectionEfficacy } from "@/components/branding/DisinfectionEfficacy";
import { EfficacyXenograftModel } from "@/components/branding/EfficacyXenograftModel";
import { InvestigatorSponsoredTrial } from "@/components/branding/InvestigatorSponsoredTrial";
import { IrbReviewCycle } from "@/components/branding/IrbReviewCycle";
import { KolAdvisoryBoard } from "@/components/branding/KolAdvisoryBoard";
import { LentivirusVectorProduction } from "@/components/branding/LentivirusVectorProduction";
import { MarketAccessLaunch } from "@/components/branding/MarketAccessLaunch";
import { MedicalLiteratureSurveillance } from "@/components/branding/MedicalLiteratureSurveillance";
import { PatientRegistryEnrollment } from "@/components/branding/PatientRegistryEnrollment";
import { PkPdModeling } from "@/components/branding/PkPdModeling";
import { SingleCellAtacSeq } from "@/components/branding/SingleCellAtacSeq";
import { TregExpansion } from "@/components/branding/TregExpansion";
import { ZebrafishToxScreen } from "@/components/branding/ZebrafishToxScreen";
// ── 2026-05-29 batch: bring every category to a multiple of 6 ───
import { AlphafoldStructure } from "@/components/branding/AlphafoldStructure";
import { ContinuousManufacturing } from "@/components/branding/ContinuousManufacturing";
import { DnaEncodedLibrary } from "@/components/branding/DnaEncodedLibrary";
import { DsmbReview } from "@/components/branding/DsmbReview";
import { FragmentScreening } from "@/components/branding/FragmentScreening";
import { MasterProtocolTrial } from "@/components/branding/MasterProtocolTrial";
import { PatientReportedOutcomes } from "@/components/branding/PatientReportedOutcomes";
import { QualityRiskManagement } from "@/components/branding/QualityRiskManagement";
import { SingleUseBioreactor } from "@/components/branding/SingleUseBioreactor";
import { TangentialFlowFiltration } from "@/components/branding/TangentialFlowFiltration";

type FloaterComponent = React.ComponentType<{ size?: number; className?: string }>;

export interface FloaterDef {
  id: string;
  displayName: string;
  category:
    | "Discovery"
    | "Cell / Process"
    | "Omics"
    | "Preclinical"
    | "Clinical"
    | "Manufacturing"
    | "QC Analytics"
    | "QC Micro"
    | "Regulatory"
    | "Medical Affairs"
    | "Commercial"
    | "Patient & Academia";
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
  // ── DISCOVERY ──────────────────────────────────────────────────
  "antibody-binding": {
    id: "antibody-binding",
    displayName: "Antibody binding",
    category: "Discovery",
    Component: AntibodyBinding,
    defaultSize: 140,
    defaultColorClass: "text-emerald-300/30",
  },
  "crispr-edit-cycle": {
    id: "crispr-edit-cycle",
    displayName: "CRISPR edit cycle",
    category: "Discovery",
    Component: CrisprEditCycle,
    defaultSize: 160,
    defaultColorClass: "text-fuchsia-300/28",
  },
  "cryo-em-structure": {
    id: "cryo-em-structure",
    displayName: "Cryo-EM structure",
    category: "Discovery",
    Component: CryoEMStructure,
    defaultSize: 170,
    defaultColorClass: "text-violet-300/28",
  },
  "dna-transcription": {
    id: "dna-transcription",
    displayName: "DNA → mRNA transcription",
    category: "Discovery",
    Component: DnaTranscription,
    defaultSize: 220,
    defaultColorClass: "text-sky-300/28",
  },
  "high-throughput-screen": {
    id: "high-throughput-screen",
    displayName: "High-throughput screen",
    category: "Discovery",
    Component: HighThroughputScreen,
    defaultSize: 160,
    defaultColorClass: "text-amber-300/28",
  },
  "med-chem-sar": {
    id: "med-chem-sar",
    displayName: "Med chem · SAR",
    category: "Discovery",
    Component: MedChemSAR,
    defaultSize: 160,
    defaultColorClass: "text-fuchsia-300/28",
  },
  "molecular-docking": {
    id: "molecular-docking",
    displayName: "Molecular docking",
    category: "Discovery",
    Component: MolecularDocking,
    defaultSize: 160,
    defaultColorClass: "text-violet-300/28",
  },
  "mrna-lnp-assembly": {
    id: "mrna-lnp-assembly",
    displayName: "mRNA-LNP assembly",
    category: "Discovery",
    Component: MrnaLnpAssembly,
    defaultSize: 150,
    defaultColorClass: "text-violet-300/28",
  },
  "phage-display-panning": {
    id: "phage-display-panning",
    displayName: "Phage display panning",
    category: "Discovery",
    Component: PhageDisplayPanning,
    defaultSize: 160,
    defaultColorClass: "text-sky-300/28",
  },

  // ── CELL / PROCESS ────────────────────────────────────────────
  "aav-gene-therapy": {
    id: "aav-gene-therapy",
    displayName: "AAV gene therapy",
    category: "Cell / Process",
    Component: AavGeneTherapy,
    defaultSize: 160,
    defaultColorClass: "text-emerald-300/30",
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
  "stem-cell-differentiation": {
    id: "stem-cell-differentiation",
    displayName: "iPSC differentiation",
    category: "Cell / Process",
    Component: StemCellDifferentiation,
    defaultSize: 170,
    defaultColorClass: "text-emerald-300/28",
  },

  // ── OMICS ──────────────────────────────────────────────────────
  "bioinformatics-pipeline": {
    id: "bioinformatics-pipeline",
    displayName: "Bioinformatics pipeline",
    category: "Omics",
    Component: BioinformaticsPipeline,
    defaultSize: 170,
    defaultColorClass: "text-teal-300/28",
  },
  "biomarker-qualification": {
    id: "biomarker-qualification",
    displayName: "Biomarker qualification",
    category: "Omics",
    Component: BiomarkerQualification,
    defaultSize: 170,
    defaultColorClass: "text-blue-300/28",
  },
  "flow-cytometry-gating": {
    id: "flow-cytometry-gating",
    displayName: "Flow cytometry gating",
    category: "Omics",
    Component: FlowCytometryGating,
    defaultSize: 160,
    defaultColorClass: "text-cyan-300/28",
  },
  "mass-spec-proteomics": {
    id: "mass-spec-proteomics",
    displayName: "Mass spec · proteomics",
    category: "Omics",
    Component: MassSpecProteomics,
    defaultSize: 170,
    defaultColorClass: "text-indigo-300/28",
  },
  "single-cell-rna-seq": {
    id: "single-cell-rna-seq",
    displayName: "Single-cell RNA-seq",
    category: "Omics",
    Component: SingleCellRnaSeq,
    defaultSize: 170,
    defaultColorClass: "text-teal-300/28",
  },

  // ── PRECLINICAL ────────────────────────────────────────────────
  "adme-profiling": {
    id: "adme-profiling",
    displayName: "ADME profiling",
    category: "Preclinical",
    Component: AdmeProfiling,
    defaultSize: 170,
    defaultColorClass: "text-amber-300/28",
  },
  "in-vivo-pk-pd-study": {
    id: "in-vivo-pk-pd-study",
    displayName: "In-vivo PK/PD study",
    category: "Preclinical",
    Component: InVivoPkPdStudy,
    defaultSize: 170,
    defaultColorClass: "text-amber-200/28",
  },
  "tox-dose-escalation": {
    id: "tox-dose-escalation",
    displayName: "Tox dose escalation",
    category: "Preclinical",
    Component: ToxDoseEscalation,
    defaultSize: 170,
    defaultColorClass: "text-rose-200/28",
  },

  // ── CLINICAL ───────────────────────────────────────────────────
  "adaptive-trial-design": {
    id: "adaptive-trial-design",
    displayName: "Adaptive trial design",
    category: "Clinical",
    Component: AdaptiveTrialDesign,
    defaultSize: 170,
    defaultColorClass: "text-sky-300/28",
  },
  "digital-pathology": {
    id: "digital-pathology",
    displayName: "Digital pathology",
    category: "Clinical",
    Component: DigitalPathology,
    defaultSize: 170,
    defaultColorClass: "text-violet-300/28",
  },
  "dose-escalation-3-plus-3": {
    id: "dose-escalation-3-plus-3",
    displayName: "Dose escalation · 3+3",
    category: "Clinical",
    Component: DoseEscalation3plus3,
    defaultSize: 170,
    defaultColorClass: "text-amber-300/28",
  },
  "enrollment-funnel": {
    id: "enrollment-funnel",
    displayName: "Trial enrollment funnel",
    category: "Clinical",
    Component: EnrollmentFunnel,
    defaultSize: 160,
    defaultColorClass: "text-amber-300/28",
  },
  "informed-consent": {
    id: "informed-consent",
    displayName: "Informed consent",
    category: "Clinical",
    Component: InformedConsent,
    defaultSize: 170,
    defaultColorClass: "text-emerald-300/28",
  },
  "kaplan-meier-reveal": {
    id: "kaplan-meier-reveal",
    displayName: "Kaplan-Meier reveal",
    category: "Clinical",
    Component: KaplanMeierReveal,
    defaultSize: 170,
    defaultColorClass: "text-sky-300/28",
  },
  "radiology-imaging-biomarker": {
    id: "radiology-imaging-biomarker",
    displayName: "Imaging biomarker",
    category: "Clinical",
    Component: RadiologyImagingBiomarker,
    defaultSize: 170,
    defaultColorClass: "text-cyan-300/28",
  },
  "site-activation": {
    id: "site-activation",
    displayName: "Trial site activation",
    category: "Clinical",
    Component: SiteActivation,
    defaultSize: 170,
    defaultColorClass: "text-emerald-300/28",
  },
  "source-data-verification": {
    id: "source-data-verification",
    displayName: "Source data verification",
    category: "Clinical",
    Component: SourceDataVerification,
    defaultSize: 170,
    defaultColorClass: "text-amber-300/28",
  },

  // ── MANUFACTURING ──────────────────────────────────────────────
  "alcoa-documentation": {
    id: "alcoa-documentation",
    displayName: "ALCOA+ documentation",
    category: "Manufacturing",
    Component: AlcoaDocumentation,
    defaultSize: 170,
    defaultColorClass: "text-slate-200/30",
  },
  "aseptic-connection": {
    id: "aseptic-connection",
    displayName: "Aseptic connection",
    category: "Manufacturing",
    Component: AsepticConnection,
    defaultSize: 160,
    defaultColorClass: "text-cyan-200/28",
  },
  "batch-release-qa": {
    id: "batch-release-qa",
    displayName: "Batch release QA",
    category: "Manufacturing",
    Component: BatchReleaseQA,
    defaultSize: 170,
    defaultColorClass: "text-emerald-200/28",
  },
  "bioreactor-scale-up": {
    id: "bioreactor-scale-up",
    displayName: "Bioreactor scale-up",
    category: "Manufacturing",
    Component: BioreactorScaleUp,
    defaultSize: 180,
    defaultColorClass: "text-cyan-300/28",
  },
  "cart-manufacturing": {
    id: "cart-manufacturing",
    displayName: "CAR-T manufacturing",
    category: "Manufacturing",
    Component: CarTManufacturing,
    defaultSize: 170,
    defaultColorClass: "text-rose-200/28",
  },
  "chromatography-purification": {
    id: "chromatography-purification",
    displayName: "Chromatography purification",
    category: "Manufacturing",
    Component: ChromatographyPurification,
    defaultSize: 170,
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
  "compound-logistics-kit": {
    id: "compound-logistics-kit",
    displayName: "Compound logistics kit",
    category: "Manufacturing",
    Component: CompoundLogisticsKit,
    defaultSize: 170,
    defaultColorClass: "text-amber-200/28",
  },
  "environmental-monitoring": {
    id: "environmental-monitoring",
    displayName: "Environmental monitoring",
    category: "Manufacturing",
    Component: EnvironmentalMonitoring,
    defaultSize: 170,
    defaultColorClass: "text-emerald-200/28",
  },
  "gmp-cell-bank": {
    id: "gmp-cell-bank",
    displayName: "GMP cell bank",
    category: "Manufacturing",
    Component: GmpCellBank,
    defaultSize: 160,
    defaultColorClass: "text-emerald-200/28",
  },
  "gowning-cleanroom": {
    id: "gowning-cleanroom",
    displayName: "Cleanroom gowning",
    category: "Manufacturing",
    Component: GowningCleanroom,
    defaultSize: 150,
    defaultColorClass: "text-cyan-200/28",
  },
  "sterile-fill-finish": {
    id: "sterile-fill-finish",
    displayName: "Sterile fill/finish",
    category: "Manufacturing",
    Component: SterileFillFinish,
    defaultSize: 170,
    defaultColorClass: "text-sky-200/28",
  },
  "tech-transfer-lab-to-pilot": {
    id: "tech-transfer-lab-to-pilot",
    displayName: "Tech transfer · lab → pilot",
    category: "Manufacturing",
    Component: TechTransferLabToPilot,
    defaultSize: 170,
    defaultColorClass: "text-indigo-200/28",
  },
  "validation-iq-oq-pq": {
    id: "validation-iq-oq-pq",
    displayName: "Validation · IQ/OQ/PQ",
    category: "Manufacturing",
    Component: ValidationIQOQPQ,
    defaultSize: 170,
    defaultColorClass: "text-amber-200/28",
  },

  // ── QC · ANALYTICS ────────────────────────────────────────────
  "elisa-plate-assay": {
    id: "elisa-plate-assay",
    displayName: "ELISA plate assay",
    category: "QC Analytics",
    Component: ElisaPlateAssay,
    defaultSize: 150,
    defaultColorClass: "text-amber-200/28",
  },
  "hplc-analytical-run": {
    id: "hplc-analytical-run",
    displayName: "HPLC analytical run",
    category: "QC Analytics",
    Component: HplcAnalyticalRun,
    defaultSize: 160,
    defaultColorClass: "text-blue-300/28",
  },
  "oos-oot-investigation": {
    id: "oos-oot-investigation",
    displayName: "OOS / OOT investigation",
    category: "QC Analytics",
    Component: OosOotInvestigation,
    defaultSize: 170,
    defaultColorClass: "text-rose-200/28",
  },
  "potency-bioassay": {
    id: "potency-bioassay",
    displayName: "Potency bioassay",
    category: "QC Analytics",
    Component: PotencyBioassay,
    defaultSize: 170,
    defaultColorClass: "text-emerald-200/28",
  },
  "qc-release-testing": {
    id: "qc-release-testing",
    displayName: "QC release testing",
    category: "QC Analytics",
    Component: QcReleaseTesting,
    defaultSize: 170,
    defaultColorClass: "text-sky-200/28",
  },
  "western-blot-run": {
    id: "western-blot-run",
    displayName: "Western blot run",
    category: "QC Analytics",
    Component: WesternBlotRun,
    defaultSize: 150,
    defaultColorClass: "text-sky-200/28",
  },

  // ── QC · MICRO ────────────────────────────────────────────────
  "bact-alert-rapid": {
    id: "bact-alert-rapid",
    displayName: "BacT/ALERT · rapid micro",
    category: "QC Micro",
    Component: BactAlertRapid,
    defaultSize: 170,
    defaultColorClass: "text-emerald-300/28",
  },
  "bioburden-plate": {
    id: "bioburden-plate",
    displayName: "Bioburden enumeration",
    category: "QC Micro",
    Component: BioburdenPlate,
    defaultSize: 170,
    defaultColorClass: "text-amber-200/28",
  },
  "endotoxin-lal": {
    id: "endotoxin-lal",
    displayName: "Endotoxin · LAL",
    category: "QC Micro",
    Component: EndotoxinLAL,
    defaultSize: 170,
    defaultColorClass: "text-amber-300/28",
  },
  "mycoplasma-pcr": {
    id: "mycoplasma-pcr",
    displayName: "Mycoplasma · qPCR",
    category: "QC Micro",
    Component: MycoplasmaPCR,
    defaultSize: 170,
    defaultColorClass: "text-rose-200/28",
  },
  "sterility-test": {
    id: "sterility-test",
    displayName: "Sterility test · USP <71>",
    category: "QC Micro",
    Component: SterilityTest,
    defaultSize: 170,
    defaultColorClass: "text-emerald-300/28",
  },

  // ── REGULATORY ─────────────────────────────────────────────────
  "drug-master-file": {
    id: "drug-master-file",
    displayName: "Drug Master File",
    category: "Regulatory",
    Component: DrugMasterFile,
    defaultSize: 170,
    defaultColorClass: "text-indigo-300/28",
  },
  "patent-prosecution": {
    id: "patent-prosecution",
    displayName: "Patent prosecution",
    category: "Regulatory",
    Component: PatentProsecution,
    defaultSize: 160,
    defaultColorClass: "text-amber-300/28",
  },
  "pharmacovigilance-signal": {
    id: "pharmacovigilance-signal",
    displayName: "Pharmacovigilance signal",
    category: "Regulatory",
    Component: PharmacovigilanceSignal,
    defaultSize: 170,
    defaultColorClass: "text-rose-300/28",
  },
  "recall-complaint-adr": {
    id: "recall-complaint-adr",
    displayName: "Recall / complaint / ADR",
    category: "Regulatory",
    Component: RecallComplaintAdr,
    defaultSize: 170,
    defaultColorClass: "text-rose-300/28",
  },
  "regulatory-submission": {
    id: "regulatory-submission",
    displayName: "Regulatory submission",
    category: "Regulatory",
    Component: RegulatorySubmission,
    defaultSize: 160,
    defaultColorClass: "text-indigo-300/28",
  },
  "sop-lifecycle": {
    id: "sop-lifecycle",
    displayName: "SOP lifecycle",
    category: "Regulatory",
    Component: SopLifecycle,
    defaultSize: 170,
    defaultColorClass: "text-amber-200/28",
  },

  // ── MEDICAL AFFAIRS ───────────────────────────────────────────
  "medical-information-request": {
    id: "medical-information-request",
    displayName: "Medical information request",
    category: "Medical Affairs",
    Component: MedicalInformationRequest,
    defaultSize: 170,
    defaultColorClass: "text-teal-300/28",
  },
  "msl-engagement-cycle": {
    id: "msl-engagement-cycle",
    displayName: "MSL engagement cycle",
    category: "Medical Affairs",
    Component: MslEngagementCycle,
    defaultSize: 170,
    defaultColorClass: "text-teal-300/28",
  },
  "publication-plan-cycle": {
    id: "publication-plan-cycle",
    displayName: "Publication plan cycle",
    category: "Medical Affairs",
    Component: PublicationPlanCycle,
    defaultSize: 170,
    defaultColorClass: "text-blue-300/28",
  },

  // ── COMMERCIAL ────────────────────────────────────────────────
  "heor-payer-engagement": {
    id: "heor-payer-engagement",
    displayName: "HEOR · payer engagement",
    category: "Commercial",
    Component: HeorPayerEngagement,
    defaultSize: 170,
    defaultColorClass: "text-amber-300/28",
  },
  "pharma-sales-call": {
    id: "pharma-sales-call",
    displayName: "Pharma sales call",
    category: "Commercial",
    Component: PharmaSalesCall,
    defaultSize: 170,
    defaultColorClass: "text-fuchsia-300/28",
  },
  "pitch-deck-build": {
    id: "pitch-deck-build",
    displayName: "Pitch deck build",
    category: "Commercial",
    Component: PitchDeckBuild,
    defaultSize: 170,
    defaultColorClass: "text-amber-300/28",
  },
  "vc-diligence-cycle": {
    id: "vc-diligence-cycle",
    displayName: "VC diligence cycle",
    category: "Commercial",
    Component: VcDiligenceCycle,
    defaultSize: 170,
    defaultColorClass: "text-emerald-300/28",
  },

  // ── PATIENT & ACADEMIA ────────────────────────────────────────
  "grant-submission-cycle": {
    id: "grant-submission-cycle",
    displayName: "Grant submission cycle",
    category: "Patient & Academia",
    Component: GrantSubmissionCycle,
    defaultSize: 170,
    defaultColorClass: "text-amber-200/28",
  },
  "patient-support-program": {
    id: "patient-support-program",
    displayName: "Patient support program",
    category: "Patient & Academia",
    Component: PatientSupportProgram,
    defaultSize: 170,
    defaultColorClass: "text-rose-200/28",
  },

  // ── 2026-05-28 batch ────────────────────────────────────────────
  // Sixteen additions to bring every category to ≥6 entries so the
  // /admin/login-floaters gallery (6-cols-per-row at lg+) renders
  // full rows rather than partial trailing rows. Each glyph evokes
  // a real BHN-curriculum process; not invented filler.

  // Patient & Academia (+4 → 6) — registries, ethics review, tech
  // transfer, investigator-sponsored trials.
  "patient-registry-enrollment": {
    id: "patient-registry-enrollment",
    displayName: "Patient registry enrollment",
    category: "Patient & Academia",
    Component: PatientRegistryEnrollment,
    defaultSize: 170,
    defaultColorClass: "text-emerald-200/28",
  },
  "irb-review-cycle": {
    id: "irb-review-cycle",
    displayName: "IRB / REB review cycle",
    category: "Patient & Academia",
    Component: IrbReviewCycle,
    defaultSize: 170,
    defaultColorClass: "text-sky-200/28",
  },
  "academic-tech-transfer": {
    id: "academic-tech-transfer",
    displayName: "Academic tech transfer",
    category: "Patient & Academia",
    Component: AcademicTechTransfer,
    defaultSize: 170,
    defaultColorClass: "text-violet-200/28",
  },
  "investigator-sponsored-trial": {
    id: "investigator-sponsored-trial",
    displayName: "Investigator-sponsored trial",
    category: "Patient & Academia",
    Component: InvestigatorSponsoredTrial,
    defaultSize: 170,
    defaultColorClass: "text-amber-200/28",
  },

  // Preclinical (+3 → 6) — zebrafish tox, PK/PD modeling, xenograft.
  "zebrafish-tox-screen": {
    id: "zebrafish-tox-screen",
    displayName: "Zebrafish tox screen",
    category: "Preclinical",
    Component: ZebrafishToxScreen,
    defaultSize: 170,
    defaultColorClass: "text-emerald-200/28",
  },
  "pk-pd-modeling": {
    id: "pk-pd-modeling",
    displayName: "PK/PD modeling",
    category: "Preclinical",
    Component: PkPdModeling,
    defaultSize: 170,
    defaultColorClass: "text-amber-200/28",
  },
  "efficacy-xenograft-model": {
    id: "efficacy-xenograft-model",
    displayName: "Xenograft efficacy",
    category: "Preclinical",
    Component: EfficacyXenograftModel,
    defaultSize: 170,
    defaultColorClass: "text-rose-200/28",
  },

  // Medical Affairs (+3 → 6) — KOL boards, congress plans, literature.
  "kol-advisory-board": {
    id: "kol-advisory-board",
    displayName: "KOL advisory board",
    category: "Medical Affairs",
    Component: KolAdvisoryBoard,
    defaultSize: 170,
    defaultColorClass: "text-sky-200/28",
  },
  "congress-engagement-plan": {
    id: "congress-engagement-plan",
    displayName: "Congress engagement plan",
    category: "Medical Affairs",
    Component: CongressEngagementPlan,
    defaultSize: 170,
    defaultColorClass: "text-amber-200/28",
  },
  "medical-literature-surveillance": {
    id: "medical-literature-surveillance",
    displayName: "Literature surveillance",
    category: "Medical Affairs",
    Component: MedicalLiteratureSurveillance,
    defaultSize: 170,
    defaultColorClass: "text-violet-200/28",
  },

  // Commercial (+2 → 6) — market access, competitive intelligence.
  "market-access-launch": {
    id: "market-access-launch",
    displayName: "Market access launch",
    category: "Commercial",
    Component: MarketAccessLaunch,
    defaultSize: 170,
    defaultColorClass: "text-emerald-200/28",
  },
  "competitive-intelligence": {
    id: "competitive-intelligence",
    displayName: "Competitive intelligence",
    category: "Commercial",
    Component: CompetitiveIntelligence,
    defaultSize: 170,
    defaultColorClass: "text-sky-200/28",
  },

  // Cell / Process (+2 → 6) — lentiviral vectors, Treg expansion.
  "lentivirus-vector-production": {
    id: "lentivirus-vector-production",
    displayName: "Lentivirus vector production",
    category: "Cell / Process",
    Component: LentivirusVectorProduction,
    defaultSize: 170,
    defaultColorClass: "text-violet-200/28",
  },
  "treg-expansion": {
    id: "treg-expansion",
    displayName: "Treg expansion",
    category: "Cell / Process",
    Component: TregExpansion,
    defaultSize: 170,
    defaultColorClass: "text-emerald-200/28",
  },

  // Omics (+1 → 6) — single-cell ATAC-seq.
  "single-cell-atac-seq": {
    id: "single-cell-atac-seq",
    displayName: "Single-cell ATAC-seq",
    category: "Omics",
    Component: SingleCellAtacSeq,
    defaultSize: 170,
    defaultColorClass: "text-sky-200/28",
  },

  // QC Micro (+1 → 6) — disinfection efficacy.
  "disinfection-efficacy": {
    id: "disinfection-efficacy",
    displayName: "Disinfectant efficacy",
    category: "QC Micro",
    Component: DisinfectionEfficacy,
    defaultSize: 170,
    defaultColorClass: "text-amber-200/28",
  },

  // ── 2026-05-29 batch ────────────────────────────────────────────
  // Bring the three largest categories to a clean multiple of 6:
  // Discovery 9 → 12, Clinical 9 → 12, Manufacturing 14 → 18.
  // Same 4-stage useStageCycle pattern as the rest of the registry.

  // Discovery (+3 → 12)
  "fragment-screening": {
    id: "fragment-screening",
    displayName: "Fragment screening (FBDD)",
    category: "Discovery",
    Component: FragmentScreening,
    defaultSize: 170,
    defaultColorClass: "text-emerald-300/30",
  },
  "dna-encoded-library": {
    id: "dna-encoded-library",
    displayName: "DNA-encoded library",
    category: "Discovery",
    Component: DnaEncodedLibrary,
    defaultSize: 170,
    defaultColorClass: "text-emerald-300/30",
  },
  "alphafold-structure": {
    id: "alphafold-structure",
    displayName: "AlphaFold structure",
    category: "Discovery",
    Component: AlphafoldStructure,
    defaultSize: 170,
    defaultColorClass: "text-violet-300/30",
  },

  // Clinical (+3 → 12)
  "master-protocol-trial": {
    id: "master-protocol-trial",
    displayName: "Master protocol / umbrella",
    category: "Clinical",
    Component: MasterProtocolTrial,
    defaultSize: 170,
    defaultColorClass: "text-sky-300/30",
  },
  "patient-reported-outcomes": {
    id: "patient-reported-outcomes",
    displayName: "Patient-reported outcomes",
    category: "Clinical",
    Component: PatientReportedOutcomes,
    defaultSize: 170,
    defaultColorClass: "text-sky-300/30",
  },
  "dsmb-review": {
    id: "dsmb-review",
    displayName: "DSMB review",
    category: "Clinical",
    Component: DsmbReview,
    defaultSize: 170,
    defaultColorClass: "text-amber-300/30",
  },

  // Manufacturing (+4 → 18)
  "single-use-bioreactor": {
    id: "single-use-bioreactor",
    displayName: "Single-use bioreactor",
    category: "Manufacturing",
    Component: SingleUseBioreactor,
    defaultSize: 170,
    defaultColorClass: "text-sky-300/30",
  },
  "tangential-flow-filtration": {
    id: "tangential-flow-filtration",
    displayName: "Tangential-flow filtration",
    category: "Manufacturing",
    Component: TangentialFlowFiltration,
    defaultSize: 170,
    defaultColorClass: "text-emerald-300/30",
  },
  "quality-risk-management": {
    id: "quality-risk-management",
    displayName: "Quality risk management (ICH Q9)",
    category: "Manufacturing",
    Component: QualityRiskManagement,
    defaultSize: 170,
    defaultColorClass: "text-amber-300/30",
  },
  "continuous-manufacturing": {
    id: "continuous-manufacturing",
    displayName: "Continuous manufacturing",
    category: "Manufacturing",
    Component: ContinuousManufacturing,
    defaultSize: 170,
    defaultColorClass: "text-emerald-300/30",
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
