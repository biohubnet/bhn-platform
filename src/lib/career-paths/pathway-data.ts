/**
 * BHN learning-pathway career data — the spine of
 * /career-paths/pathways.
 *
 * Where /career-paths/tracks is organised by JOB FUNCTION (Bioprocess,
 * Quality, CGT, Clinical, Business, Project Leadership), this file
 * mirrors BHN's seven announced LEARNING PATHWAYS:
 *
 *   1. Aseptic Cell Culture Basics
 *   2. CAR-T Cell Manufacturing
 *   3. Biologics Manufacturing
 *   4. QA/QC Microbiology for Advanced Therapies
 *   5. QA/QC Analytics for Biologics
 *   6. Regulatory Affairs
 *   7. Medical Affairs
 *
 * Source: https://biohubnet.ca/learning-pathway-announcement/
 *
 * Each pathway carries the same five-station spine (Junior → Mid →
 * Senior → Lead → VP) used in the tracks view, so a trainee who
 * picks a pathway can see "where this training takes me, year by
 * year". The CareerTrack/CareerStation/CrossLink interfaces are
 * reused from src/lib/career-paths/data.ts — only the data is new.
 *
 * Cross-links here connect PATHWAYS to OTHER PATHWAYS (e.g. CAR-T
 * Senior → Regulatory Affairs Senior, because CMC-experienced manu
 * leads frequently pivot into reg-affairs CMC roles). They use the
 * same crossLinks: CrossLink[] shape as data.ts but reference
 * pathway ids instead of track ids.
 *
 * The (in development) BHN pathways — Entrepreneurship, R&D,
 * Clinical Trials — are deliberately omitted here. Add them when
 * BHN announces them.
 */
import type { CareerTrack, CareerStation } from "./data";

// ── 1. Aseptic Cell Culture Basics ───────────────────────────────
const ASEPTIC: CareerTrack = {
  id: "aseptic-cell-culture",
  title: "Aseptic Cell Culture Basics",
  tagline: "From cleanroom apprentice to aseptic-operations leadership.",
  description:
    "Cell culture is one of the highest-stakes operations in biologics — one stray particle voids a multi-million-dollar batch. This pathway is the floor-to-ceiling craft of growing cells without contaminating them.",
  iconKey: "flask",
  accent: "#0d9488",
  stations: [
    {
      level: "junior",
      label: "Aseptic Operator",
      yearsRange: "0–2 yrs",
      roles: ["Cell Culture Operator", "Aseptic Filling Operator", "Cleanroom Associate"],
      focus: "Gown like a surgeon, move like a dancer. Pass aseptic qualification, run gowning audits cleanly, log every intervention without flinching.",
      educationGaps: [
        "Cleanroom gowning + behaviour",
        "Aseptic technique fundamentals",
        "Media + buffer prep",
        "Particle / microbial contamination basics",
      ],
      courses: [],
    },
    {
      level: "mid",
      label: "Cell Culture Specialist",
      yearsRange: "2–5 yrs",
      roles: ["Cell Culture Specialist", "Aseptic Process Specialist"],
      focus: "Own a process step end-to-end — thaw, expansion, harvest. Troubleshoot contaminations, draft SOP revisions, mentor a new operator.",
      educationGaps: [
        "Mammalian cell biology",
        "Aseptic process risk assessment",
        "Deviation investigation",
        "SOP authoring + change control",
      ],
      courses: [],
    },
    {
      level: "senior",
      label: "Senior Cell Culture Scientist",
      yearsRange: "5–10 yrs",
      roles: ["Senior Cell Culture Scientist", "Aseptic Process Engineer"],
      focus: "Lead campaigns. Author process characterisation reports, own CAPAs from contamination events, sign off on tech-transfer batches.",
      educationGaps: [
        "Process characterisation methodology",
        "Contamination control strategy (CCS)",
        "QbD / DoE for cell culture",
        "Tech-transfer leadership",
      ],
      crossLinks: [
        { trackId: "qa-qc-microbiology", targetLevel: "senior", when: "Senior → Senior", reason: "Sterility-event experts often jump to QC Micro leadership.", learningNeeded: ["Compendial micro methods", "Environmental monitoring strategy"] },
        { trackId: "regulatory-affairs", targetLevel: "mid", when: "Senior → Mid", reason: "CMC reg-affairs roles love a process-knowledgeable hire.", learningNeeded: ["Regulatory CMC sections", "ICH Q-series fluency"] },
      ],
      courses: [],
    },
    {
      level: "lead",
      label: "Aseptic Manufacturing Lead",
      yearsRange: "10–15 yrs",
      roles: ["Cell Culture Manufacturing Lead", "Aseptic Operations Manager"],
      focus: "Design the cleanroom strategy. Hire + train operators, set the contamination-control program, own regulatory inspections of the aseptic suite.",
      educationGaps: [
        "Cleanroom design + qualification",
        "Inspection readiness (Annex 1)",
        "People leadership at scale",
        "Site investment cases",
      ],
      courses: [],
    },
    {
      level: "vp",
      label: "VP, Aseptic Manufacturing",
      yearsRange: "15+ yrs",
      roles: ["VP Manufacturing — Sterile Operations", "Head of Aseptic Operations"],
      focus: "Network strategy. Pick the next site, the next product, the next CDMO. Answer for sterility assurance at the board level.",
      educationGaps: [
        "Multi-site manufacturing strategy",
        "CDMO selection + governance",
        "Sterility-assurance executive reporting",
      ],
      courses: [],
    },
  ],
};

// ── 2. CAR-T Cell Manufacturing ──────────────────────────────────
const CAR_T: CareerTrack = {
  id: "car-t-manufacturing",
  title: "CAR-T Cell Manufacturing",
  tagline: "From autologous-cell technician to ATMP programme leadership.",
  description:
    "The work of harvesting, engineering, and re-infusing a patient's own T-cells. Personalised manufacturing at its hardest — every batch is one patient, every batch has to work.",
  iconKey: "dna",
  accent: "#7c3aed",
  stations: [
    {
      level: "junior",
      label: "CAR-T Manufacturing Technician",
      yearsRange: "0–2 yrs",
      roles: ["CAR-T Manufacturing Technician", "Autologous Cell Therapy Operator"],
      focus: "Run the per-patient batch. Chain of identity, chain of custody, no mix-ups. Aseptic technique under pressure — patients are waiting.",
      educationGaps: [
        "Aseptic + cleanroom basics",
        "Chain-of-identity protocols",
        "T-cell biology fundamentals",
        "Viral-vector handling safety",
      ],
      courses: [],
    },
    {
      level: "mid",
      label: "CAR-T Process Engineer",
      yearsRange: "2–5 yrs",
      roles: ["CAR-T Process Engineer", "CGT Manufacturing Specialist"],
      focus: "Own a unit op — activation, transduction, expansion, fill. Troubleshoot patient-specific yield problems. First-pass investigations on deviations.",
      educationGaps: [
        "Lentiviral / retroviral transduction",
        "T-cell expansion kinetics",
        "Closed-system bioreactors (G-Rex, Prodigy, etc.)",
        "Per-patient deviation methodology",
      ],
      courses: [],
    },
    {
      level: "senior",
      label: "Senior CAR-T Scientist",
      yearsRange: "5–10 yrs",
      roles: ["Senior CAR-T Scientist", "ATMP Manufacturing Lead"],
      focus: "Lead process development — increase yield, shorten vein-to-vein time, design the next-gen process. Author the tech-transfer package to commercial.",
      educationGaps: [
        "QbD / DoE for cell therapy",
        "Process intensification for autologous workflows",
        "Comparability + commercial readiness",
        "Vein-to-vein logistics design",
      ],
      crossLinks: [
        { trackId: "qa-qc-microbiology", targetLevel: "senior", when: "Senior → Senior", reason: "ATMP sterility experts are scarce — micro QC leadership reaches for them.", learningNeeded: ["Compendial vs rapid micro methods", "ATMP-specific environmental monitoring"] },
        { trackId: "regulatory-affairs", targetLevel: "senior", when: "Senior → Senior", reason: "CMC reg-affairs for ATMPs is a critical-skills role; experienced CGT scientists frequently move in.", learningNeeded: ["FDA / Health Canada ATMP guidance", "BLA/CTA submissions"] },
      ],
      courses: [],
    },
    {
      level: "lead",
      label: "CAR-T Manufacturing Director",
      yearsRange: "10–15 yrs",
      roles: ["CAR-T Manufacturing Director", "Director — Cell Therapy Operations"],
      focus: "Network the manufacturing fleet — academic GMP sites, central CDMO, decentralised model. Build the inspection-ready culture across all of them.",
      educationGaps: [
        "Multi-site ATMP network design",
        "Apheresis-collection logistics + COI",
        "Regulatory submission strategy (BLA, MAA)",
        "Programmatic leadership for autologous workflows",
      ],
      courses: [],
    },
    {
      level: "vp",
      label: "VP, Cell Therapy",
      yearsRange: "15+ yrs",
      roles: ["VP Cell Therapy Operations", "Chief Cell Therapy Officer"],
      focus: "Programme-level decisions. Outsourced vs in-house manufacturing, comparability strategy, scale-up from clinical to commercial. Hire your replacement.",
      educationGaps: [
        "Cell-therapy commercial economics",
        "Decentralised vs centralised manufacturing strategy",
        "Executive-level regulatory negotiation",
      ],
      courses: [],
    },
  ],
};

// ── 3. Biologics Manufacturing ───────────────────────────────────
const BIOLOGICS: CareerTrack = {
  id: "biologics-manufacturing",
  title: "Biologics Manufacturing",
  tagline: "From floor associate to plant leadership.",
  description:
    "The factory floor of biologics — recombinant proteins, monoclonal antibodies, vaccines. Upstream cell culture, downstream purification, fill-finish, the full cGMP machine.",
  iconKey: "flask",
  accent: "#0ea5e9",
  stations: [
    {
      level: "junior",
      label: "Manufacturing Associate",
      yearsRange: "0–2 yrs",
      roles: ["Manufacturing Associate", "Bioprocess Technician", "Downstream Operator"],
      focus: "Learn the protocols. GMP basics, batch records, gowning, deviation logging. Reliability + curiosity, not heroics.",
      educationGaps: [
        "GMP basics + regulatory vocabulary",
        "Aseptic technique fundamentals",
        "Batch-record discipline",
        "Microbiology awareness",
      ],
      courses: [],
    },
    {
      level: "mid",
      label: "Process Specialist",
      yearsRange: "2–5 yrs",
      roles: ["Senior Manufacturing Associate", "Downstream Specialist", "Upstream Specialist"],
      focus: "Own a unit op — bioreactor train, chromatography, viral inactivation, UF/DF. Troubleshoot deviations, draft SOP revisions, run training shadow-shifts.",
      educationGaps: [
        "Unit-op depth (chosen specialty)",
        "Deviation investigation methodology",
        "SOP authoring + change control",
        "Tech-transfer fundamentals",
      ],
      courses: [],
    },
    {
      level: "senior",
      label: "Process Engineer",
      yearsRange: "5–10 yrs",
      roles: ["Senior Process Engineer", "Manufacturing Supervisor", "Tech-Transfer Lead"],
      focus: "Lead campaigns + tech-transfers. Write process characterisation reports, own CAPAs, set production schedules, mentor associates.",
      educationGaps: [
        "Tech-transfer ownership end-to-end",
        "Process characterisation methodology",
        "CAPA leadership + RCA discipline",
        "Technical report writing",
      ],
      crossLinks: [
        { trackId: "qa-qc-analytics", targetLevel: "senior", when: "Senior → Senior", reason: "Manufacturing engineers with analytical depth often pivot into QC ownership.", learningNeeded: ["Compendial analytics (HPLC, MS, CE)", "Method validation"] },
        { trackId: "regulatory-affairs", targetLevel: "senior", when: "Senior → Senior", reason: "Manufacturing experience is the strongest single qualifier for CMC reg-affairs.", learningNeeded: ["ICH Q-series", "CMC sections of BLA/MAA"] },
      ],
      courses: [],
    },
    {
      level: "lead",
      label: "Manufacturing Manager",
      yearsRange: "10–15 yrs",
      roles: ["Manufacturing Manager", "Site Operations Lead"],
      focus: "Run a building. Hire + develop the team, own inspections, manage the operating budget. The day-to-day is people + delivery, not process science.",
      educationGaps: [
        "People leadership at scale",
        "Operations budgeting",
        "Inspection readiness",
        "Capital planning",
      ],
      courses: [],
    },
    {
      level: "vp",
      label: "VP, Biomanufacturing",
      yearsRange: "15+ yrs",
      roles: ["VP Biomanufacturing", "Site Head", "Chief Operating Officer"],
      focus: "Network strategy — which sites, which products, which CDMO partners. Capital deployment, M&A integration, board-level reporting.",
      educationGaps: [
        "Multi-site manufacturing strategy",
        "CDMO selection + governance",
        "M&A operational diligence",
      ],
      courses: [],
    },
  ],
};

// ── 4. QA/QC Microbiology for Advanced Therapies ─────────────────
const QA_QC_MICRO: CareerTrack = {
  id: "qa-qc-microbiology",
  title: "QA/QC Microbiology for Advanced Therapies",
  tagline: "From sample-running to head of QC micro.",
  description:
    "The microbial sentry of biologics + ATMPs. Sterility, endotoxin, environmental monitoring, mycoplasma, adventitious agents. The person who decides if a batch ships.",
  iconKey: "shield",
  accent: "#f59e0b",
  stations: [
    {
      level: "junior",
      label: "QC Microbiology Technician",
      yearsRange: "0–2 yrs",
      roles: ["QC Microbiology Technician", "EM Sampler", "QC Associate — Micro"],
      focus: "Run the routine — environmental monitoring, sterility, bioburden, endotoxin. Plate accurately, log honestly, escalate excursions promptly.",
      educationGaps: [
        "Compendial micro methods (USP, EP, JP)",
        "Aseptic technique + gowning",
        "Environmental monitoring fundamentals",
        "Endotoxin (LAL) assay basics",
      ],
      courses: [],
    },
    {
      level: "mid",
      label: "QC Microbiologist",
      yearsRange: "2–5 yrs",
      roles: ["QC Microbiologist", "EM Lead", "Sterility Assurance Specialist"],
      focus: "Own a method. Investigate excursions, lead OOS investigations, draft + execute method validations.",
      educationGaps: [
        "Excursion / OOS investigation methodology",
        "Method validation (USP <1225>)",
        "Trending + alert / action limit setting",
        "Rapid micro methods (BacT/ALERT, Bactec)",
      ],
      courses: [],
    },
    {
      level: "senior",
      label: "Senior QC Microbiologist",
      yearsRange: "5–10 yrs",
      roles: ["Senior QC Microbiologist", "Sterility Assurance Lead"],
      focus: "Own the contamination-control strategy (CCS). Author validation master plans, present to auditors, sign off on commercial release lots.",
      educationGaps: [
        "Contamination control strategy (CCS) — Annex 1",
        "Validation master plan authoring",
        "Auditor / inspector liaison",
        "ATMP-specific microbial risk assessment",
      ],
      crossLinks: [
        { trackId: "regulatory-affairs", targetLevel: "senior", when: "Senior → Senior", reason: "Sterility-experienced micro leaders often pivot to reg-affairs CMC.", learningNeeded: ["Sterility submissions language", "Inspection / 483 response drafting"] },
      ],
      courses: [],
    },
    {
      level: "lead",
      label: "QC Microbiology Manager",
      yearsRange: "10–15 yrs",
      roles: ["QC Microbiology Manager", "Head of Sterility Assurance"],
      focus: "Run the lab. Hire microbiologists, own the CCS across the site, lead regulatory inspections of the QC org.",
      educationGaps: [
        "Lab budgeting + staffing models",
        "Multi-product CCS coordination",
        "Inspection leadership",
        "QC strategy roadmapping",
      ],
      courses: [],
    },
    {
      level: "vp",
      label: "VP, Quality Microbiology",
      yearsRange: "15+ yrs",
      roles: ["VP Quality", "Head of Quality Operations"],
      focus: "Programme-level quality. Defend sterility assurance to the board, set the global QC microbiology direction, own the regulatory relationship.",
      educationGaps: [
        "Executive-level quality reporting",
        "Global regulatory relationship management",
        "Quality programme design (Annex 1, ICH Q10)",
      ],
      courses: [],
    },
  ],
};

// ── 5. QA/QC Analytics for Biologics ─────────────────────────────
const QA_QC_ANALYTICS: CareerTrack = {
  id: "qa-qc-analytics",
  title: "QA/QC Analytics for Biologics",
  tagline: "From analyst at the bench to head of analytical development.",
  description:
    "The chemical fingerprint of a biologic — identity, purity, potency, stability. HPLC, mass spec, CE-SDS, bioassays. The data the regulator reads when they decide whether to approve.",
  iconKey: "shield",
  accent: "#dc2626",
  stations: [
    {
      level: "junior",
      label: "QC Analyst I",
      yearsRange: "0–2 yrs",
      roles: ["QC Analyst I", "Analytical Chemistry Technician"],
      focus: "Run the methods clean. Prepare standards, run HPLC + UV + binding assays, log results into LIMS without typos.",
      educationGaps: [
        "Compendial analytics — HPLC, UV, ELISA basics",
        "Sample prep + standards",
        "LIMS data entry hygiene",
        "Analytical lab safety",
      ],
      courses: [],
    },
    {
      level: "mid",
      label: "QC Analyst II",
      yearsRange: "2–5 yrs",
      roles: ["QC Analyst II", "Bioanalytical Scientist", "Stability Lead"],
      focus: "Own a method. Author + execute method validations, lead troubleshooting, draft OOS investigations for chromatography failures.",
      educationGaps: [
        "Method validation (USP <1225>, ICH Q2)",
        "OOS / OOT investigation methodology",
        "Mass-spec characterisation basics",
        "Stability program management",
      ],
      courses: [],
    },
    {
      level: "senior",
      label: "Senior Analytical Scientist",
      yearsRange: "5–10 yrs",
      roles: ["Senior Analytical Scientist", "Analytical Development Lead"],
      focus: "Design + transfer methods. Own the analytical comparability package for tech-transfer. Sign off on commercial release lots.",
      educationGaps: [
        "Analytical method development (orthogonal panels)",
        "Comparability protocols",
        "Statistical analysis (multivariate, capability)",
        "Reference-standard management",
      ],
      crossLinks: [
        { trackId: "regulatory-affairs", targetLevel: "senior", when: "Senior → Senior", reason: "Analytical-fluent reg-affairs hires are scarce and prized.", learningNeeded: ["ICH Q6 specifications", "CMC sections of BLA/MAA"] },
      ],
      courses: [],
    },
    {
      level: "lead",
      label: "QC Analytics Manager",
      yearsRange: "10–15 yrs",
      roles: ["QC Analytics Manager", "Analytical Development Director"],
      focus: "Run the lab. Hire + develop analysts, own the analytical strategy across products, lead inspections of the analytical org.",
      educationGaps: [
        "Lab budgeting + staffing",
        "Multi-product analytical strategy",
        "Inspection readiness",
        "Method-transfer governance",
      ],
      courses: [],
    },
    {
      level: "vp",
      label: "VP, Analytical Sciences",
      yearsRange: "15+ yrs",
      roles: ["VP Analytical Sciences", "Head of Quality Control"],
      focus: "Set the analytical roadmap. Decide which platforms to invest in, defend specifications at FDA / EMA pre-approval inspections.",
      educationGaps: [
        "Platform investment cases",
        "Executive-level regulatory negotiation",
        "Global QC programme design",
      ],
      courses: [],
    },
  ],
};

// ── 6. Regulatory Affairs ────────────────────────────────────────
const REGULATORY: CareerTrack = {
  id: "regulatory-affairs",
  title: "Regulatory Affairs",
  tagline: "From submissions coordinator to chief regulatory officer.",
  description:
    "Translate the science into something a regulator approves. Pre-IND, IND, CTA, BLA, MAA — the documents that turn a molecule into a medicine.",
  iconKey: "shield",
  accent: "#0369a1",
  stations: [
    {
      level: "junior",
      label: "Regulatory Affairs Coordinator",
      yearsRange: "0–2 yrs",
      roles: ["Regulatory Affairs Coordinator", "Regulatory Specialist I"],
      focus: "Submission mechanics. Compile + format docs, run gap-analyses, track agency correspondence, learn the eCTD structure inside out.",
      educationGaps: [
        "eCTD structure + assembly tools",
        "Health Canada / FDA / EMA submission portals",
        "Regulatory vocabulary (IND, CTA, BLA, MAA)",
        "Document QC + version control",
      ],
      courses: [],
    },
    {
      level: "mid",
      label: "Regulatory Affairs Specialist",
      yearsRange: "2–5 yrs",
      roles: ["Regulatory Affairs Specialist", "Submissions Manager"],
      focus: "Own a section. Author CMC or non-clinical or clinical chapters, respond to agency questions, plan the next amendment.",
      educationGaps: [
        "Chapter authoring (CMC, non-clinical, or clinical)",
        "ICH guideline fluency",
        "Health-authority interaction planning",
        "Variation / amendment strategy",
      ],
      courses: [],
    },
    {
      level: "senior",
      label: "Senior RA Manager",
      yearsRange: "5–10 yrs",
      roles: ["Senior Regulatory Affairs Manager", "Global RA Lead"],
      focus: "Own a product or programme. Set the regulatory strategy, lead agency meetings, negotiate label language, defend the dossier.",
      educationGaps: [
        "Regulatory strategy authoring",
        "Pre-meeting briefing books",
        "Label negotiation",
        "Lifecycle / post-market planning",
      ],
      crossLinks: [
        { trackId: "medical-affairs", targetLevel: "senior", when: "Senior → Senior", reason: "Reg-affairs leaders who've sat in label-negotiation meetings move smoothly into medical affairs.", learningNeeded: ["Field-medical evidence generation", "MSL-style stakeholder engagement"] },
      ],
      courses: [],
    },
    {
      level: "lead",
      label: "RA Director",
      yearsRange: "10–15 yrs",
      roles: ["Director — Regulatory Affairs", "Head of Regulatory Strategy"],
      focus: "Portfolio strategy. Sequence submissions across products, build the agency relationships, run inspections + responses.",
      educationGaps: [
        "Portfolio regulatory strategy",
        "Inspection / 483 response leadership",
        "Multi-region (US / EU / Canada / Asia) strategy",
        "Agency-relationship management",
      ],
      courses: [],
    },
    {
      level: "vp",
      label: "VP / Chief Regulatory Officer",
      yearsRange: "15+ yrs",
      roles: ["VP Regulatory Affairs", "Chief Regulatory Officer"],
      focus: "Defend the dossier at board level. Approve the regulatory budget, set the negotiating posture with agencies, own the company's regulatory reputation.",
      educationGaps: [
        "Board-level regulatory reporting",
        "Cross-product regulatory portfolio governance",
        "Crisis response (483, warning letters, recalls)",
      ],
      courses: [],
    },
  ],
};

// ── 7. Medical Affairs ───────────────────────────────────────────
const MEDICAL_AFFAIRS: CareerTrack = {
  id: "medical-affairs",
  title: "Medical Affairs",
  tagline: "From Medical Information Specialist to Chief Medical Officer.",
  description:
    "The bridge between a clinical asset and the doctors who'll prescribe it. MSLs, advisory boards, evidence generation, scientific platform. Field-facing + strategic at once.",
  iconKey: "stethoscope",
  accent: "#9333ea",
  stations: [
    {
      level: "junior",
      label: "Medical Information Specialist",
      yearsRange: "0–2 yrs",
      roles: ["Medical Information Specialist", "Medical Science Liaison Trainee"],
      focus: "Learn the asset cold — MoA, trial data, safety profile. Respond to unsolicited HCP questions, accompany senior MSLs to field meetings.",
      educationGaps: [
        "Asset-level disease + product knowledge",
        "Promotional vs non-promotional boundaries",
        "Medical information response standards",
        "Field-medical compliance",
      ],
      courses: [],
    },
    {
      level: "mid",
      label: "Medical Science Liaison (MSL)",
      yearsRange: "2–5 yrs",
      roles: ["Medical Science Liaison", "Field Medical Manager"],
      focus: "Own a therapeutic area. Engage KOLs peer-to-peer, present at advisory boards, gather field insights and feed them back to medical / commercial.",
      educationGaps: [
        "KOL engagement frameworks",
        "Advisory board facilitation",
        "Field insight reporting + analytics",
        "Therapeutic-area depth (your TA)",
      ],
      courses: [],
    },
    {
      level: "senior",
      label: "Senior MSL / Field Medical Lead",
      yearsRange: "5–10 yrs",
      roles: ["Senior Medical Science Liaison", "Therapeutic Area Lead — Field Medical"],
      focus: "Lead a regional or therapeutic-area MSL team. Design the medical-engagement plan, sit on launch-readiness reviews, mentor junior MSLs.",
      educationGaps: [
        "Medical engagement plan authoring",
        "Launch readiness — medical workstream",
        "MSL-team leadership + coaching",
        "Evidence-generation strategy",
      ],
      crossLinks: [
        { trackId: "regulatory-affairs", targetLevel: "senior", when: "Senior → Senior", reason: "Senior MSLs with label-negotiation exposure are credible reg-affairs hires.", learningNeeded: ["Label / promotional review", "Variation strategy"] },
      ],
      courses: [],
    },
    {
      level: "lead",
      label: "Medical Affairs Director",
      yearsRange: "10–15 yrs",
      roles: ["Director — Medical Affairs", "Head of Field Medical"],
      focus: "Own the medical strategy for an asset or portfolio. Sit on commercial launch committees, defend the medical narrative, approve all field-medical materials.",
      educationGaps: [
        "Cross-functional launch leadership",
        "Medical strategy authoring",
        "Real-world evidence (RWE) design",
        "Publication strategy",
      ],
      courses: [],
    },
    {
      level: "vp",
      label: "VP / Chief Medical Officer",
      yearsRange: "15+ yrs",
      roles: ["VP Medical Affairs", "Chief Medical Officer"],
      focus: "Set the medical voice of the company. Approve the publication strategy, defend the data to payers, represent the science to investors + regulators.",
      educationGaps: [
        "Board + investor medical communication",
        "Multi-product medical-affairs governance",
        "Payer + HEOR strategy",
      ],
      courses: [],
    },
  ],
};

// ── Export ───────────────────────────────────────────────────────

export const BHN_PATHWAYS: CareerTrack[] = [
  ASEPTIC, CAR_T, BIOLOGICS, QA_QC_MICRO, QA_QC_ANALYTICS, REGULATORY, MEDICAL_AFFAIRS,
];

export const PATHWAY_BY_ID = new Map(BHN_PATHWAYS.map((p) => [p.id, p] as const));

// Re-export the shared types so callers can import everything from
// one module (mirrors how data.ts is consumed today).
export type { CareerStation, CareerTrack, CrossLink, LevelId, CourseRef, TrackId } from "./data";
