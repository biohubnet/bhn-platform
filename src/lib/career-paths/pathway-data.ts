/**
 * BHN learning-pathway career data — the spine of
 * /career-paths/pathways.
 *
 * Mirrors BHN's seven announced LEARNING-PATHWAY STREAMS (not the
 * individual training programs — those sit UNDER the streams).
 * Source: https://biohubnet.ca/learning-pathway-announcement/
 *
 *   1. Biomanufacturing               (active)
 *       └─ Aseptic Cell Culture Basics
 *       └─ CAR-T Cell Manufacturing
 *       └─ Biologics Manufacturing
 *       Delivered by CATTI + CASTL, 30 hrs
 *
 *   2. Quality Assurance / Quality Control  (active)
 *       └─ QA/QC Microbiology for advanced therapies
 *       └─ QA/QC Analytics for biologics
 *       Delivered by CATTI + CASTL, 30 hrs
 *
 *   3. Regulatory Affairs             (active)
 *       Delivered by Seneca Polytechnic, 30 hrs
 *
 *   4. Medical Affairs                (active)
 *       Delivered by Agilis Health, 24 hrs
 *
 *   5. Entrepreneurship               (active)
 *       Delivered by OBIO, 40 hrs
 *
 *   6. R&D                            (in development)
 *
 *   7. Clinical Trials                (in development)
 *
 * Each stream carries the same five-station spine as the
 * /career-paths/tracks view (Junior → Mid → Senior → Lead → VP),
 * so a trainee who picks a BHN stream can read junior-to-VP, year
 * by year. Sub-program names + delivery partner appear in the
 * stream header as small chips. In-development streams render
 * with a yellow "In development" pill but still show their
 * career stations — the underlying career ladder is real even
 * if BHN's training program isn't shipped yet.
 *
 * Cross-links connect streams to other streams (e.g. Senior
 * Biomanufacturing → Senior QA/QC; Senior Reg-Affairs → Senior
 * Medical Affairs). They reuse the CrossLink shape from data.ts.
 */
import type { CareerTrack } from "./data";

// ── 1. Biomanufacturing ──────────────────────────────────────────
const BIOMANUFACTURING: CareerTrack = {
  id: "biomanufacturing",
  title: "Biomanufacturing",
  tagline: "From cleanroom floor to plant leadership.",
  description:
    "The full GMP biologics floor — upstream cell culture, downstream purification, fill-finish, plus the personalised CAR-T workflow. Three BHN training programs feed this stream.",
  iconKey: "flask",
  accent: "#0d9488",
  status: "active",
  subPrograms: [
    "Aseptic Cell Culture Basics",
    "CAR-T Cell Manufacturing",
    "Biologics Manufacturing",
  ],
  deliveredBy: "CATTI + CASTL · 30 hrs",
  stations: [
    {
      level: "junior",
      label: "Manufacturing Associate",
      yearsRange: "0–2 yrs",
      roles: ["Manufacturing Associate", "Cell Culture Operator", "Aseptic Filling Operator", "CAR-T Manufacturing Technician"],
      focus: "Learn the protocols. Pass aseptic qualification, run batch records cleanly, log deviations honestly. Reliability + curiosity, not heroics.",
      educationGaps: [
        "GMP basics + regulatory vocabulary",
        "Aseptic technique + cleanroom behaviour",
        "Batch-record discipline",
        "Microbiology awareness",
      ],
      crossLinks: [
        { trackId: "qa-qc", targetLevel: "junior", when: "Junior → Junior", reason: "Cleanroom operators who find the analytical / problem-solving side more rewarding often jump to QC. Lab notebook discipline transfers directly.", learningNeeded: ["Pharmacopoeia methods (USP/EP)", "Chromatographic data review"] },
      ],
      courses: [],
    },
    {
      level: "mid",
      label: "Process Specialist",
      yearsRange: "2–5 yrs",
      roles: ["Senior Manufacturing Associate", "Cell Culture Specialist", "CAR-T Process Engineer", "Downstream Specialist"],
      focus: "Own a unit op — bioreactor train, chromatography, CAR-T expansion, fill-finish. Troubleshoot deviations, draft SOP revisions, mentor a new operator.",
      educationGaps: [
        "Unit-op depth (chosen specialty)",
        "Deviation + OOS investigation",
        "SOP authoring + change control",
        "Tech-transfer fundamentals",
      ],
      crossLinks: [
        { trackId: "qa-qc", targetLevel: "mid", when: "Mid → Mid", reason: "Process specialists with deep method-validation work pivot to QC validation manager roles.", learningNeeded: ["Method validation (ICH Q2)", "Critical-quality-attribute (CQA) frameworks"] },
        { trackId: "rnd", targetLevel: "mid", when: "Mid → Mid", reason: "Scale-up engineers move back to R&D as process-development scientists when they want bench-to-clinic exposure.", learningNeeded: ["DOE (design of experiments)", "Tech-transfer documentation"] },
      ],
      courses: [],
    },
    {
      level: "senior",
      label: "Process Engineer / Scientist",
      yearsRange: "5–10 yrs",
      roles: ["Senior Process Engineer", "Senior CAR-T Scientist", "Manufacturing Supervisor", "Tech-Transfer Lead"],
      focus: "Lead campaigns + tech-transfers. Author process characterisation reports, own CAPAs, set production schedules, sign off on commercial release lots.",
      educationGaps: [
        "Tech-transfer ownership end-to-end",
        "Process characterisation methodology",
        "Contamination control strategy (Annex 1)",
        "QbD / DoE for biologics + cell therapy",
      ],
      crossLinks: [
        { trackId: "qa-qc", targetLevel: "senior", when: "Senior → Senior", reason: "Manufacturing engineers with method-validation depth often pivot into QC leadership.", learningNeeded: ["Compendial micro + analytics", "Method validation (ICH Q2)"] },
        { trackId: "regulatory-affairs", targetLevel: "senior", when: "Senior → Senior", reason: "Manufacturing experience is the strongest single qualifier for CMC reg-affairs.", learningNeeded: ["ICH Q-series fluency", "CMC sections of BLA/MAA"] },
        { trackId: "rnd", targetLevel: "senior", when: "Senior → Senior", reason: "Senior process engineers with tech-transfer ownership pivot to R&D as process-development leaders bridging bench to plant.", learningNeeded: ["Late-stage CMC strategy", "DOE for biologics process design"] },
      ],
      courses: [],
    },
    {
      level: "lead",
      label: "Manufacturing Director",
      yearsRange: "10–15 yrs",
      roles: ["Manufacturing Director", "Site Operations Lead", "CAR-T Manufacturing Director"],
      focus: "Run a building (or the cell-therapy network). Hire + develop the team, own inspections, manage the budget, sign off on capital plans.",
      educationGaps: [
        "People leadership at scale",
        "Operations budgeting + capital planning",
        "Inspection readiness",
        "Multi-site / decentralised network design",
      ],
      crossLinks: [
        { trackId: "qa-qc", targetLevel: "lead", when: "Lead → Lead", reason: "Manufacturing directors with strong inspection track records are the most common pipeline for Director of Quality / Site QA Head roles.", learningNeeded: ["Quality system architecture", "Inspection-response leadership"] },
      ],
      courses: [],
    },
    {
      level: "vp",
      label: "VP, Manufacturing",
      yearsRange: "15+ yrs",
      roles: ["VP Biomanufacturing", "Site Head", "Chief Operating Officer", "VP Cell Therapy Operations"],
      focus: "Network strategy. Which sites, which products, which CDMOs. Capital deployment, M&A integration, board-level reporting on sterility assurance and supply.",
      educationGaps: [
        "Multi-site manufacturing strategy",
        "CDMO selection + governance",
        "M&A operational diligence",
        "Cell-therapy commercial economics",
      ],
      crossLinks: [
        { trackId: "entrepreneurship", targetLevel: "vp", when: "VP → VP", reason: "VPs of manufacturing are sought-after COOs at new-venture biotechs scaling their first commercial product.", learningNeeded: ["Capital raising for ops", "Board-level governance"] },
      ],
      courses: [],
    },
  ],
};

// ── 2. Quality Assurance / Quality Control ───────────────────────
const QA_QC: CareerTrack = {
  id: "qa-qc",
  title: "Quality Assurance / Quality Control",
  tagline: "From bench analyst to head of quality.",
  description:
    "The data the regulator reads when they decide whether to approve. Identity, purity, potency, sterility — analytics on biologics + microbiology on advanced therapies. Two BHN training programs feed this stream.",
  iconKey: "shield",
  accent: "#f59e0b",
  status: "active",
  subPrograms: [
    "QA/QC Microbiology for Advanced Therapies",
    "QA/QC Analytics for Biologics",
  ],
  deliveredBy: "CATTI + CASTL · 30 hrs",
  stations: [
    {
      level: "junior",
      label: "QC Technician",
      yearsRange: "0–2 yrs",
      roles: ["QC Analyst I", "QC Microbiology Technician", "EM Sampler"],
      focus: "Run the routine — environmental monitoring, sterility, HPLC, UV. Plate accurately, log honestly, escalate excursions promptly.",
      educationGaps: [
        "Compendial micro methods (USP, EP, JP)",
        "Compendial analytics — HPLC, UV, ELISA basics",
        "Aseptic technique + gowning",
        "LIMS data entry hygiene",
      ],
      crossLinks: [
        { trackId: "biomanufacturing", targetLevel: "junior", when: "Junior → Junior", reason: "QC analysts who'd rather build product than test it move to the manufacturing floor; the GMP discipline and aseptic basics are already there.", learningNeeded: ["Batch-record execution", "Cleanroom-floor SOPs"] },
      ],
      courses: [],
    },
    {
      level: "mid",
      label: "QC Analyst / Microbiologist",
      yearsRange: "2–5 yrs",
      roles: ["QC Analyst II", "QC Microbiologist", "Sterility Assurance Specialist", "Stability Lead"],
      focus: "Own a method. Author + execute method validations, lead troubleshooting, draft OOS / excursion investigations.",
      educationGaps: [
        "Method validation (USP <1225>, ICH Q2)",
        "OOS / OOT / excursion investigation methodology",
        "Trending + alert / action limits",
        "Rapid micro methods (BacT/ALERT, Bactec)",
      ],
      crossLinks: [
        { trackId: "regulatory-affairs", targetLevel: "mid", when: "Mid → Mid", reason: "Mid-career QC analysts with method-validation packages already authored translate directly to RA CMC specialist roles.", learningNeeded: ["CMC sections (S.4, S.7) of BLA/MAA", "ICH Q-series essentials"] },
      ],
      courses: [],
    },
    {
      level: "senior",
      label: "Senior QC Scientist",
      yearsRange: "5–10 yrs",
      roles: ["Senior QC Microbiologist", "Senior Analytical Scientist", "Sterility Assurance Lead"],
      focus: "Own the contamination-control strategy (CCS) AND the analytical comparability package. Sign off on commercial release lots, brief auditors.",
      educationGaps: [
        "Contamination control strategy (Annex 1)",
        "Analytical method development (orthogonal panels)",
        "Validation master plan authoring",
        "Reference-standard management",
      ],
      crossLinks: [
        { trackId: "regulatory-affairs", targetLevel: "senior", when: "Senior → Senior", reason: "Sterility- + analytical-fluent leaders are scarce and prized in reg-affairs CMC.", learningNeeded: ["ICH Q6 specifications", "Sterility submissions language"] },
        { trackId: "biomanufacturing", targetLevel: "senior", when: "Senior → Senior", reason: "Senior QC scientists who've owned the CCS for a product often cross to manufacturing as senior process engineers — the contamination-control mindset transfers.", learningNeeded: ["Process characterisation methodology", "Tech-transfer ownership"] },
      ],
      courses: [],
    },
    {
      level: "lead",
      label: "QC Manager",
      yearsRange: "10–15 yrs",
      roles: ["QC Microbiology Manager", "QC Analytics Manager", "Head of Sterility Assurance"],
      focus: "Run the lab. Hire microbiologists + analysts, own the CCS + analytical strategy, lead regulatory inspections of the QC org.",
      educationGaps: [
        "Lab budgeting + staffing models",
        "Multi-product CCS coordination",
        "Method-transfer governance",
        "Inspection leadership",
      ],
      crossLinks: [
        { trackId: "regulatory-affairs", targetLevel: "lead", when: "Lead → Lead", reason: "Heads of QC are the most common pipeline for VP RA roles at companies where quality and reg-affairs sit under one operating officer.", learningNeeded: ["Reg-affairs strategy across submissions", "Agency interaction at director level"] },
      ],
      courses: [],
    },
    {
      level: "vp",
      label: "VP, Quality",
      yearsRange: "15+ yrs",
      roles: ["VP Quality", "Head of Quality Operations", "VP Analytical Sciences"],
      focus: "Programme-level quality. Defend sterility + analytical strategy to the board, set the global QC direction, own the regulatory relationship.",
      educationGaps: [
        "Executive-level quality reporting",
        "Global regulatory relationship management",
        "Platform investment cases",
      ],
      crossLinks: [
        { trackId: "regulatory-affairs", targetLevel: "vp", when: "VP → VP", reason: "At smaller biotechs the VP Quality and VP RA seats are often combined under a single quality-and-compliance officer.", learningNeeded: ["Submission-strategy oversight", "Agency-relationship at C-suite level"] },
        { trackId: "biomanufacturing", targetLevel: "vp", when: "VP → VP", reason: "VPs of Quality with site-leadership track records pivot to VP Manufacturing when operations and quality unify under a single officer at growing biotechs.", learningNeeded: ["Operations P&L ownership", "Capital-deployment for manufacturing"] },
      ],
      courses: [],
    },
  ],
};

// ── 3. Regulatory Affairs ────────────────────────────────────────
const REGULATORY: CareerTrack = {
  id: "regulatory-affairs",
  title: "Regulatory Affairs",
  tagline: "From submissions coordinator to chief regulatory officer.",
  description:
    "Translate the science into something a regulator approves. Pre-IND, IND, CTA, BLA, MAA — the documents that turn a molecule into a medicine.",
  iconKey: "shield",
  accent: "#0369a1",
  status: "active",
  deliveredBy: "Seneca Polytechnic · 30 hrs",
  stations: [
    {
      level: "junior",
      label: "RA Coordinator",
      yearsRange: "0–2 yrs",
      roles: ["Regulatory Affairs Coordinator", "Regulatory Specialist I"],
      focus: "Submission mechanics. Compile + format docs, run gap-analyses, track agency correspondence, learn the eCTD structure inside out.",
      educationGaps: [
        "eCTD structure + assembly tools",
        "Health Canada / FDA / EMA submission portals",
        "Regulatory vocabulary (IND, CTA, BLA, MAA)",
        "Document QC + version control",
      ],
      crossLinks: [
        { trackId: "medical-affairs", targetLevel: "junior", when: "Junior → Junior", reason: "Junior RA coordinators commonly move to Medical Information Specialist roles — same document-rigour, but reading clinical literature instead of agency filings.", learningNeeded: ["Therapeutic-area literature scanning", "Medical-information request handling"] },
      ],
      courses: [],
    },
    {
      level: "mid",
      label: "RA Specialist",
      yearsRange: "2–5 yrs",
      roles: ["Regulatory Affairs Specialist", "Submissions Manager"],
      focus: "Own a section. Author CMC / non-clinical / clinical chapters, respond to agency questions, plan the next amendment.",
      educationGaps: [
        "Chapter authoring (CMC, non-clinical, or clinical)",
        "ICH guideline fluency",
        "Health-authority interaction planning",
        "Variation / amendment strategy",
      ],
      crossLinks: [
        { trackId: "medical-affairs", targetLevel: "mid", when: "Mid → Mid", reason: "Mid-career RA specialists who've negotiated label language pivot to MA Manager roles — they already know which claims are defensible.", learningNeeded: ["Publication planning fundamentals", "Advisory-board facilitation basics"] },
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
        { trackId: "medical-affairs", targetLevel: "senior", when: "Senior → Senior", reason: "RA leaders who've negotiated labels move smoothly into Medical Affairs leadership.", learningNeeded: ["Field-medical evidence generation", "MSL-style stakeholder engagement"] },
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
      crossLinks: [
        { trackId: "medical-affairs", targetLevel: "lead", when: "Lead → Lead", reason: "Heads of RA who've owned label negotiations are the canonical CMO-track candidates at small-to-mid biotechs.", learningNeeded: ["Field-medical leadership", "Publication-strategy oversight"] },
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
      crossLinks: [
        { trackId: "medical-affairs", targetLevel: "vp", when: "VP → VP", reason: "At smaller biotechs the CRO and CMO roles merge — Chief Regulatory Officers with strong medical fluency often take the combined seat.", learningNeeded: ["Chief Medical Officer scope", "External medical-leadership communication"] },
      ],
      courses: [],
    },
  ],
};

// ── 4. Medical Affairs ───────────────────────────────────────────
const MEDICAL_AFFAIRS: CareerTrack = {
  id: "medical-affairs",
  title: "Medical Affairs",
  tagline: "From Medical Information Specialist to Chief Medical Officer.",
  description:
    "The bridge between a clinical asset and the doctors who'll prescribe it. MSLs, advisory boards, evidence generation, scientific platform. Field-facing + strategic at once.",
  iconKey: "stethoscope",
  accent: "#9333ea",
  status: "active",
  deliveredBy: "Agilis Health · 24 hrs",
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
      crossLinks: [
        { trackId: "regulatory-affairs", targetLevel: "junior", when: "Junior → Junior", reason: "Med-info specialists with strong document-rigour move to RA coordinator roles — both jobs reward meticulous referencing and version control.", learningNeeded: ["eCTD structure basics", "Health-authority submission portals"] },
        { trackId: "clinical-trials", targetLevel: "junior", when: "Junior → Junior", reason: "Med-info trainees who want patient contact pivot to Clinical Research Coordinator roles — therapeutic-area knowledge transfers; the rest is GCP.", learningNeeded: ["ICH E6 GCP fundamentals", "Source-documentation discipline"] },
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
        "Therapeutic-area depth",
      ],
      crossLinks: [
        { trackId: "clinical-trials", targetLevel: "mid", when: "Mid → Mid", reason: "MSLs with strong PI relationships often cross into Clinical Trial Manager roles — they already know the investigators, just need the operational rigour.", learningNeeded: ["Risk-based monitoring", "Site management + budget oversight"] },
        { trackId: "regulatory-affairs", targetLevel: "mid", when: "Mid → Mid", reason: "MSLs with deep therapeutic-area data pivot to RA specialists handling clinical sections + labeling negotiations.", learningNeeded: ["Label / SmPC negotiation language", "Clinical section authoring"] },
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
        { trackId: "clinical-trials", targetLevel: "lead", when: "Senior → Lead", reason: "Senior MSLs with trial-design fluency are credible clinical-operations leaders.", learningNeeded: ["Phase 2/3 design", "Protocol authoring + amendments"] },
        { trackId: "regulatory-affairs", targetLevel: "senior", when: "Senior → Senior", reason: "Field Medical Leads who've owned label-discussion materials cross to RA leadership where they own those negotiations directly.", learningNeeded: ["Pre-meeting briefing books", "Label negotiation"] },
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
      crossLinks: [
        { trackId: "clinical-trials", targetLevel: "lead", when: "Lead → Lead", reason: "Medical Affairs Directors with strong evidence-generation track records become Heads of Clinical Operations — the RWE + Phase IV experience translates directly to programme leadership.", learningNeeded: ["Phase 2/3 design", "Programme-level budgeting"] },
        { trackId: "regulatory-affairs", targetLevel: "lead", when: "Lead → Lead", reason: "Heads of Medical Affairs who've owned label + publication strategy are well-positioned for Director of RA roles at small-to-mid biotechs where label is the strategic asset.", learningNeeded: ["Portfolio regulatory strategy", "Inspection / 483 response"] },
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
      crossLinks: [
        { trackId: "clinical-trials", targetLevel: "vp", when: "VP → VP", reason: "VP Medical Affairs and VP Clinical Development frequently merge into a single Chief Medical Officer seat — the medical voice and the clinical strategy converge at C-suite.", learningNeeded: ["Multi-asset clinical portfolio governance", "Safety / efficacy narrative for investors"] },
        { trackId: "regulatory-affairs", targetLevel: "vp", when: "VP → VP", reason: "Chief Medical Officers with negotiated-label depth occasionally take the combined CMO/CRO seat at lean biotechs.", learningNeeded: ["Cross-product regulatory governance", "Agency relationship at board level"] },
      ],
      courses: [],
    },
  ],
};

// ── 5. Entrepreneurship ──────────────────────────────────────────
const ENTREPRENEURSHIP: CareerTrack = {
  id: "entrepreneurship",
  title: "Entrepreneurship",
  tagline: "From scientific founder to operator-VC bridge.",
  description:
    "Turning a discovery into a company. Intellectual property, financing, product strategy, the pitch. Less of a ladder than the other streams — founder-track careers branch wider — but the same five-station spine still maps.",
  iconKey: "briefcase",
  accent: "#dc2626",
  status: "active",
  deliveredBy: "OBIO · 40 hrs",
  stations: [
    {
      level: "junior",
      label: "Co-founder / Builder",
      yearsRange: "0–2 yrs",
      roles: ["Scientific Co-founder", "Founding Engineer / Scientist", "Early-stage Operator"],
      focus: "Get the company off the ground — incorporate, IP-protect, write the first pitch deck, find the first cheque. The job is honest experiments + a clear narrative.",
      educationGaps: [
        "Intellectual property basics (provisional, PCT)",
        "Pre-seed financing instruments (SAFE, convertible)",
        "Co-founder agreements + cap-table fundamentals",
        "Lean experimentation + customer discovery",
      ],
      crossLinks: [
        { trackId: "rnd", targetLevel: "junior", when: "Junior → Junior", reason: "Failed-startup scientists land softly as Research Associates — bench skills from the founding-engineer phase transfer; pace and structure improve.", learningNeeded: ["Lab-notebook + ELN discipline at scale", "Statistical analysis basics"] },
      ],
      courses: [],
    },
    {
      level: "mid",
      label: "Operator",
      yearsRange: "2–5 yrs",
      roles: ["Founder — Head of R&D", "Head of Operations (early-stage)", "VP Product (seed → Series A)"],
      focus: "Build the team + product. Hire engineers + scientists, manage the first burn-rate, run the seed → A milestones. The pitch becomes a board meeting.",
      educationGaps: [
        "Hiring + early-stage org design",
        "Seed → Series A milestone setting",
        "Financial modelling + runway management",
        "Board meeting authoring + governance basics",
      ],
      crossLinks: [
        { trackId: "biomanufacturing", targetLevel: "mid", when: "Mid → Mid", reason: "When the start-up reaches the first GMP batch, founder-operators often spin into a Process Specialist seat at a larger biotech to deepen scale-up reps.", learningNeeded: ["Unit-op depth (chosen specialty)", "Tech-transfer fundamentals"] },
        { trackId: "rnd", targetLevel: "mid", when: "Mid → Mid", reason: "Heads of R&D at seed-stage start-ups often slot in as Scientists at mid-stage biotechs when the original company stalls.", learningNeeded: ["Experimental design + screen architecture", "Cross-functional collaboration (DMPK, safety)"] },
      ],
      courses: [],
    },
    {
      level: "senior",
      label: "Head of Strategy / Ops",
      yearsRange: "5–10 yrs",
      roles: ["Co-founder / Head of Strategy", "VP Operations", "Founding Commercial Lead"],
      focus: "Series A → B. Hit clinical or product milestones, professionalise the org, defend the company to the next round of investors.",
      educationGaps: [
        "Series A → B operational readiness",
        "Term-sheet negotiation",
        "Org-design at 30–80 employees",
        "Partnership / BD strategy",
      ],
      crossLinks: [
        { trackId: "regulatory-affairs", targetLevel: "lead", when: "Senior → Lead", reason: "Founders who own the FDA / Health Canada interaction become strong RA leaders.", learningNeeded: ["IND / CTA strategy", "Agency meeting facilitation"] },
      ],
      courses: [],
    },
    {
      level: "lead",
      label: "CEO",
      yearsRange: "10–15 yrs",
      roles: ["Chief Executive Officer", "President & Founder"],
      focus: "Run the company. Set strategy, raise growth rounds, prepare for IPO or acquisition. The job is signal + decisions, not heroics.",
      educationGaps: [
        "Growth financing (Series C / pre-IPO)",
        "Executive recruiting + board composition",
        "M&A negotiation",
        "Investor narrative + earnings discipline",
      ],
      crossLinks: [
        { trackId: "regulatory-affairs", targetLevel: "lead", when: "Lead → Lead", reason: "CEOs of biotechs whose company stalls at clinical milestones frequently become Heads of RA at larger acquirers — the agency-relationship and submission-strategy reps are deep.", learningNeeded: ["Multi-region (US/EU/Canada/Asia) strategy", "Agency-relationship management"] },
      ],
      courses: [],
    },
    {
      level: "vp",
      label: "Serial Founder / Operator-VC",
      yearsRange: "15+ yrs",
      roles: ["Serial Biotech Founder", "Operating Partner — Life-Sciences VC", "Investor / Board Director"],
      focus: "Build the next one, or back the next ten. Operator-VC roles, board portfolios, repeat-founder syndromes. The hard-won pattern-recognition becomes the asset.",
      educationGaps: [
        "Portfolio thinking — across companies",
        "Board governance at scale",
        "Long-form investment thesis writing",
      ],
      crossLinks: [
        { trackId: "biomanufacturing", targetLevel: "vp", when: "VP → VP", reason: "Serial founders with operations depth often return to large biotechs as VP Manufacturing or COO when their portfolio companies exit — the operator pattern-recognition is rare.", learningNeeded: ["Multi-site manufacturing strategy", "CDMO selection + governance"] },
        { trackId: "rnd", targetLevel: "vp", when: "VP → VP", reason: "Founder-CSOs whose start-ups get acquired often take the CSO seat at the acquirer — the platform thesis and scientific judgment transfer.", learningNeeded: ["Scientific strategy at board level", "Platform investment cases"] },
      ],
      courses: [],
    },
  ],
};

// ── 6. R&D — in development ──────────────────────────────────────
const RD: CareerTrack = {
  id: "rd",
  title: "Research & Development",
  tagline: "From bench scientist to chief scientific officer.",
  description:
    "Discovery + early development — target ID, lead optimisation, IND-enabling studies. The career exists today even though BHN's training pathway for it is still in development; the ladder below reflects the working world.",
  iconKey: "dna",
  accent: "#7c3aed",
  status: "in-development",
  stations: [
    {
      level: "junior",
      label: "Research Associate",
      yearsRange: "0–2 yrs",
      roles: ["Research Associate", "Discovery Scientist I", "Lab Technician — R&D"],
      focus: "Run the experiments cleanly. Bench technique, lab-notebook discipline, learn the platform inside out (small molecule, antibody, mRNA, CRISPR — whichever).",
      educationGaps: [
        "Discovery platform fluency (SM / mAb / mRNA / cell)",
        "Lab-notebook + ELN discipline",
        "Statistical analysis basics",
        "Literature reading + critique",
      ],
      crossLinks: [
        { trackId: "biomanufacturing", targetLevel: "junior", when: "Junior → Junior", reason: "Research Associates who prefer process to discovery move to manufacturing — bench technique transfers, the production cadence is steadier than R&D.", learningNeeded: ["GMP basics + regulatory vocabulary", "Aseptic technique + cleanroom behaviour"] },
        { trackId: "qa-qc", targetLevel: "junior", when: "Junior → Junior", reason: "RAs who enjoy the analytical side over the experimental design side find a natural home in QC.", learningNeeded: ["Compendial micro methods (USP, EP, JP)", "LIMS data entry hygiene"] },
      ],
      courses: [],
    },
    {
      level: "mid",
      label: "Scientist",
      yearsRange: "2–5 yrs",
      roles: ["Scientist", "Senior Discovery Scientist", "Research Investigator"],
      focus: "Drive a workstream. Design + run a screen, generate the first IP, present at internal review.",
      educationGaps: [
        "Experimental design + screen architecture",
        "Patent-quality data generation",
        "Scientific presentation",
        "Cross-functional collaboration (DMPK, safety, CMC)",
      ],
      crossLinks: [
        { trackId: "biomanufacturing", targetLevel: "mid", when: "Mid → Mid", reason: "Scientists at the IND-prep stage often cross into process-development as the lab molecule becomes a manufacturable product.", learningNeeded: ["Tech-transfer fundamentals", "Unit-op depth"] },
        { trackId: "clinical-trials", targetLevel: "mid", when: "Mid → Mid", reason: "Scientists with translational-biology depth move to CRA / Trial Manager roles to follow the molecule into humans — biomarker thinking transfers.", learningNeeded: ["GCP fundamentals", "Risk-based monitoring"] },
      ],
      courses: [],
    },
    {
      level: "senior",
      label: "Senior Scientist",
      yearsRange: "5–10 yrs",
      roles: ["Senior Scientist", "Principal Investigator", "Group Leader — Discovery"],
      focus: "Lead a programme. Set the lab strategy, hire + mentor scientists, defend the discovery story at portfolio review, prep IND-enabling.",
      educationGaps: [
        "Programme leadership",
        "IND-enabling study design",
        "Portfolio prioritisation",
        "Translational biology / clinical bridge",
      ],
      crossLinks: [
        { trackId: "clinical-trials", targetLevel: "senior", when: "Senior → Senior", reason: "Senior scientists who've taken an asset through IND-enabling are credible clinical-development leaders.", learningNeeded: ["Phase 1 design", "First-in-human safety strategy"] },
        { trackId: "regulatory-affairs", targetLevel: "senior", when: "Senior → Senior", reason: "PIs with IND experience cross to RA CMC + non-clinical roles.", learningNeeded: ["ICH M3", "Non-clinical sections of IND"] },
        { trackId: "medical-affairs", targetLevel: "senior", when: "Senior → Senior", reason: "Principal Investigators with deep MoA fluency cross into Field Medical leadership — they're already the asset's strongest internal explainer.", learningNeeded: ["KOL engagement frameworks", "Medical engagement plan authoring"] },
      ],
      courses: [],
    },
    {
      level: "lead",
      label: "Director — R&D",
      yearsRange: "10–15 yrs",
      roles: ["Director — Research", "Head of Discovery", "Therapeutic Area Lead — R&D"],
      focus: "Own a therapeutic area or platform. Set the discovery portfolio, manage budgets + headcount, sign off on candidate selection.",
      educationGaps: [
        "TA portfolio strategy",
        "R&D budgeting + headcount planning",
        "Candidate selection criteria",
        "External innovation / licensing strategy",
      ],
      crossLinks: [
        { trackId: "clinical-trials", targetLevel: "lead", when: "Lead → Lead", reason: "Heads of Discovery with strong translational programmes often cross to Head of Clinical Development — owning the molecule's full bench-to-clinic arc.", learningNeeded: ["Phase 2/3 design", "Programme-level budgeting + timeline"] },
        { trackId: "entrepreneurship", targetLevel: "lead", when: "Lead → Lead", reason: "Heads of Discovery whose platform has internal champions spin out as founding CSOs or CEOs — they own the science thesis and the IP map.", learningNeeded: ["Term-sheet negotiation", "Founding-team economics"] },
      ],
      courses: [],
    },
    {
      level: "vp",
      label: "Chief Scientific Officer",
      yearsRange: "15+ yrs",
      roles: ["VP Research", "Chief Scientific Officer", "Chief Technology Officer"],
      focus: "Set the company's scientific direction. Pick platforms, defend the discovery engine to the board, recruit the next generation of leaders.",
      educationGaps: [
        "Scientific strategy at board level",
        "Platform investment cases",
        "Scientific advisory board composition",
      ],
      crossLinks: [
        { trackId: "clinical-trials", targetLevel: "vp", when: "VP → VP", reason: "CSOs with deep translational + clinical platform reps are credible Chief Development Officers when companies split the CSO and CMO seats.", learningNeeded: ["Multi-asset clinical portfolio governance", "Safety / efficacy narrative for investors"] },
        { trackId: "entrepreneurship", targetLevel: "vp", when: "VP → VP", reason: "CSOs whose platform thesis matures into a spinout become founder-CEOs or Operating Partners at life-sciences VCs — platform pattern-recognition is the asset.", learningNeeded: ["Long-form investment thesis writing", "Board governance at scale"] },
      ],
      courses: [],
    },
  ],
};

// ── 7. Clinical Trials — in development ──────────────────────────
const CLINICAL_TRIALS: CareerTrack = {
  id: "clinical-trials",
  title: "Clinical Trials",
  tagline: "From study coordinator to chief medical officer.",
  description:
    "Designing + running the studies that prove a drug works. CRC, CRA, study lead, programme lead. As with R&D, the BHN training is still being built but the career below is fully real.",
  iconKey: "stethoscope",
  accent: "#0ea5e9",
  status: "in-development",
  stations: [
    {
      level: "junior",
      label: "Clinical Research Coordinator",
      yearsRange: "0–2 yrs",
      roles: ["Clinical Research Coordinator", "Study Coordinator", "Clinical Trial Associate"],
      focus: "Run the site visits. Manage patient schedules, source documents, IRB submissions, regulatory binders. The job is meticulous coordination.",
      educationGaps: [
        "GCP fundamentals (ICH E6)",
        "Source documentation discipline",
        "IRB / ethics submission workflow",
        "Patient-facing communication",
      ],
      crossLinks: [
        { trackId: "regulatory-affairs", targetLevel: "junior", when: "Junior → Junior", reason: "CRCs who prefer documents-and-strategy to patient-facing work move to RA Coordinator roles — IRB submission rigour transfers directly to eCTD.", learningNeeded: ["eCTD structure + assembly tools", "Health Canada / FDA / EMA submission portals"] },
        { trackId: "medical-affairs", targetLevel: "junior", when: "Junior → Junior", reason: "CRCs with deep protocol knowledge often move to Medical Information Specialist roles — therapeutic-area depth transfers, the rest is product training.", learningNeeded: ["Medical information response standards", "Promotional vs non-promotional boundaries"] },
      ],
      courses: [],
    },
    {
      level: "mid",
      label: "Clinical Research Associate",
      yearsRange: "2–5 yrs",
      roles: ["Clinical Research Associate (CRA)", "Lead Study Coordinator", "Clinical Trial Manager I"],
      focus: "Own a site (or a few). Monitor enrollment, query resolution, source-document verification, protocol-deviation triage.",
      educationGaps: [
        "Risk-based monitoring",
        "Query / SDV efficiency",
        "Site-relationship management",
        "Protocol-deviation classification",
      ],
      crossLinks: [
        { trackId: "medical-affairs", targetLevel: "mid", when: "Mid → Mid", reason: "CRAs with deep investigator relationships often pivot to MSL roles — the peer-to-peer credibility with PIs is the hardest part of MSL hiring.", learningNeeded: ["KOL engagement frameworks", "Therapeutic-area depth"] },
        { trackId: "regulatory-affairs", targetLevel: "mid", when: "Mid → Mid", reason: "CRAs with strong protocol + amendment authorship move to RA Specialist roles owning clinical sections.", learningNeeded: ["Clinical section authoring", "ICH guideline fluency"] },
      ],
      courses: [],
    },
    {
      level: "senior",
      label: "Clinical Trial Manager",
      yearsRange: "5–10 yrs",
      roles: ["Senior CRA", "Clinical Trial Manager", "Clinical Operations Lead"],
      focus: "Run a study. Own the timeline + budget, manage the CRO relationship, lead the data-cleaning push to database lock.",
      educationGaps: [
        "Study budget + vendor management",
        "CRO oversight + governance",
        "Database lock + data-cleaning operations",
        "Cross-functional study leadership",
      ],
      crossLinks: [
        { trackId: "regulatory-affairs", targetLevel: "senior", when: "Senior → Senior", reason: "CTM-fluent staff with IND / CTA experience cross to RA clinical-strategy roles.", learningNeeded: ["Clinical sections of IND / CTA", "End-of-Phase-2 meeting prep"] },
        { trackId: "medical-affairs", targetLevel: "senior", when: "Senior → Senior", reason: "Clinical leads with KOL exposure pivot into Medical Affairs at the same level.", learningNeeded: ["MSL-style engagement", "Advisory board facilitation"] },
      ],
      courses: [],
    },
    {
      level: "lead",
      label: "Director — Clinical Operations",
      yearsRange: "10–15 yrs",
      roles: ["Director — Clinical Operations", "Head of Clinical Development", "Senior Clinical Programme Lead"],
      focus: "Own a programme — Phase 1 to NDA. Set the clinical strategy, hire the team, defend the design to the steering committee + agencies.",
      educationGaps: [
        "Phase 2 / 3 design",
        "Programme-level budgeting + timeline",
        "Agency meeting strategy (EoP2, pre-NDA)",
        "Risk-based programme governance",
      ],
      crossLinks: [
        { trackId: "medical-affairs", targetLevel: "lead", when: "Lead → Lead", reason: "Heads of Clinical Development with launch experience often cross to Head of Medical Affairs once the asset transitions from approval to commercialisation.", learningNeeded: ["Medical strategy authoring", "Publication strategy"] },
        { trackId: "regulatory-affairs", targetLevel: "lead", when: "Lead → Lead", reason: "Directors of Clinical Ops with EoP2 + pre-NDA reps cross to Head of RA — the agency-relationship and protocol-defence experience is exactly what RA leadership needs.", learningNeeded: ["Portfolio regulatory strategy", "Agency-relationship management"] },
      ],
      courses: [],
    },
    {
      level: "vp",
      label: "VP Clinical Development / CMO",
      yearsRange: "15+ yrs",
      roles: ["VP Clinical Development", "Chief Medical Officer"],
      focus: "Defend the clinical strategy at board level. Recruit the chief medical office, set the trial portfolio, own the safety + efficacy narrative to investors + regulators.",
      educationGaps: [
        "Board-level clinical reporting",
        "Multi-asset portfolio governance",
        "Safety / efficacy narrative + investor comms",
      ],
      crossLinks: [
        { trackId: "medical-affairs", targetLevel: "vp", when: "VP → VP", reason: "VP Clinical Development and VP Medical Affairs frequently merge into a single Chief Medical Officer seat — both report up through the same medical voice at smaller biotechs.", learningNeeded: ["Multi-product medical-affairs governance", "Payer + HEOR strategy"] },
        { trackId: "regulatory-affairs", targetLevel: "vp", when: "VP → VP", reason: "VPs of Clinical Development with negotiated-approval reps occasionally take the combined CMO/CRO seat — clinical + regulatory live under one chief.", learningNeeded: ["Cross-product regulatory portfolio governance", "Crisis response (483, warning letters)"] },
      ],
      courses: [],
    },
  ],
};

// ── Export ───────────────────────────────────────────────────────

export const BHN_PATHWAYS: CareerTrack[] = [
  BIOMANUFACTURING,
  QA_QC,
  REGULATORY,
  MEDICAL_AFFAIRS,
  ENTREPRENEURSHIP,
  RD,
  CLINICAL_TRIALS,
];

export const PATHWAY_BY_ID = new Map(BHN_PATHWAYS.map((p) => [p.id, p] as const));

// Re-export the shared types so callers can import everything from
// one module (mirrors how data.ts is consumed today).
export type { CareerStation, CareerTrack, CrossLink, LevelId, CourseRef, TrackId } from "./data";
