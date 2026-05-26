/**
 * Career-paths data — the static spine of the /career-paths page.
 *
 * Six career tracks, each with five seniority stations (Junior → Mid →
 * Senior → Lead → VP). At each station we surface:
 *   • typical role titles trainees see in postings
 *   • the focus / muscles you build at this level
 *   • a curated 2–4 courses from the platform catalog that fit
 *   • optional cross-links to other tracks where a sideways move
 *     is a common (and worthwhile) career swerve
 *
 * The course list isn't exhaustive per level — we picked the 2–4 that
 * have the highest signal for someone at that station, so the page
 * reads as guidance rather than a dump. The full catalog lives on
 * /courses; this page is the "WHY am I taking this" lens.
 *
 * Curation rule of thumb when adding new programs:
 *   junior  — foundations, terminology, "Working in X"
 *   mid     — operational depth, technique-specific
 *   senior  — leading workstreams, system thinking, mentoring
 *   lead    — strategy, portfolio, cross-functional
 *   vp      — exec, commercialisation, organisational design
 *
 * `crossLinks` powers the "branch points" — most common at Senior /
 * Lead, where careers tend to fork (manufacturing → quality leadership,
 * cell/gene → clinical, technical → business).
 */

export type LevelId = "junior" | "mid" | "senior" | "lead" | "vp";

/** Short transition microcopy rendered between two adjacent station
 *  boxes on the tree chart. Captures the "what changes around year X"
 *  beat that the boxes themselves don't have room for. */
export const TRANSITION_MICROCOPY: Record<string, string> = {
  "junior→mid":  "Around year 2 — you stop following SOPs and start owning a unit op.",
  "mid→senior":  "Around year 5 — strong ICs become workstream leaders. The first time the chart's yours.",
  "senior→lead": "Around year 10 — the work shifts from doing it to designing the system that does it.",
  "lead→vp":     "Year 15+ — set portfolio strategy, answer to the board, hire your replacement.",
};

export interface CourseRef {
  title: string;
  /** Optional short tag/credential the catalog ships under. */
  note?: string;
}

export interface CrossLink {
  /** Target track id. The renderer resolves into the track title. */
  trackId: TrackId;
  /** When this jump tends to happen (e.g. "Senior → Director"). */
  when: string;
  /** Why it's a credible move. One sentence. */
  reason: string;
}

export interface CareerStation {
  level: LevelId;
  label: string;
  yearsRange: string;
  roles: string[];
  focus: string;
  courses: CourseRef[];
  crossLinks?: CrossLink[];
}

export type TrackId =
  | "bioprocess"
  | "quality-regulatory"
  | "cell-gene-therapy"
  | "clinical-trials"
  | "biotech-business"
  | "project-leadership";

export interface CareerTrack {
  id: TrackId;
  title: string;
  tagline: string;
  description: string;
  /** Lucide icon name — client maps to component. */
  iconKey: "flask" | "shield" | "dna" | "stethoscope" | "briefcase" | "network";
  /** Single accent colour used for the level bars + chips. Matches the
   *  4-colour palette the platform's recent redesigns settled on. */
  accent: string;
  stations: CareerStation[];
}

// ── Helpers — keep the inline data terse ──────────────────────────
const c = (title: string, note?: string): CourseRef => (note ? { title, note } : { title });

// ── 1. Bioprocess Manufacturing ───────────────────────────────────
const BIOPROCESS: CareerTrack = {
  id: "bioprocess",
  title: "Bioprocess Manufacturing",
  tagline: "From floor associate to plant leadership.",
  description:
    "The factory floor of biologics — upstream cell-culture, downstream purification, fill-finish, the full cGMP machine. Bench-experienced operators move into supervisor, then site, then corporate manufacturing roles.",
  iconKey: "flask",
  accent: "#0d9488", // teal-600
  stations: [
    {
      level: "junior",
      label: "Manufacturing Associate",
      yearsRange: "0–2 yrs",
      roles: ["Manufacturing Associate", "Bioprocess Technician", "Cell Culture Operator", "Aseptic Operator"],
      focus:
        "Learn the protocols. Get aseptic-certified, learn batch records, follow SOPs cleanly, log deviations honestly. The job is reliability + curiosity, not heroics.",
      courses: [
        c("GMP Fundamentals"),
        c("Working in a GMP Environment 2-day In-Person Workshop"),
        c("Introduction to Bioprocessing (Online)"),
        c("BIS Program: Foundations"),
        c("Industry-Readiness courses (R&D, business& commercialization, virtual clinical immersion training, professional development)"),
      ],
    },
    {
      level: "mid",
      label: "Process Specialist",
      yearsRange: "2–5 yrs",
      roles: ["Senior Manufacturing Associate", "Bioreactor Operator", "Cell Culture Specialist", "Aseptic Process Specialist"],
      focus:
        "Own a unit operation end-to-end. Troubleshoot deviations, draft SOP revisions, run training shadow-shifts, contribute to tech-transfer doc review.",
      courses: [
        c("Upstream Processing: Bioreactors in Bioprocessing"),
        c("Bioreactor Operations"),
        c("Cell Culture in Biopharmaceutical Manufacturing"),
        c("Aseptic Processing: Contamination Control"),
        c("Aseptic Processing: Decontamination and Sterilization Technologies"),
        c("Microbiology 2-Day In-Person Training"),
        c("4019 - Good Manufacturing Practice in Biomanufacturing"),
        c("SCS 4099 Bioprocess Foundations"),
      ],
    },
    {
      level: "senior",
      label: "Process Engineer / Supervisor",
      yearsRange: "5–10 yrs",
      roles: ["Senior Process Engineer", "Manufacturing Supervisor", "Tech-Transfer Lead", "Production Lead"],
      focus:
        "Lead a shift, a campaign, or a tech-transfer. Write process characterisation reports, own CAPAs, set production schedules, mentor junior associates.",
      courses: [
        c("Pharmaceutical Manufacturing Technology"),
        c("Pharmaceutical Foundation Technology"),
        c("Meeting GMP Requirements Globally"),
        c("Bioproduction Training course"),
        c("Scientific Report Writing Fundamentals"),
      ],
      crossLinks: [
        {
          trackId: "quality-regulatory",
          when: "Senior → Lead",
          reason:
            "Strong process-engineering Seniors often pivot to Quality leadership — the floor experience makes for credible QA management.",
        },
        {
          trackId: "project-leadership",
          when: "Senior → Lead",
          reason:
            "Tech-transfer leaders frequently formalise their toolkit and move into multi-site project ownership.",
        },
      ],
    },
    {
      level: "lead",
      label: "Manufacturing Manager / Director",
      yearsRange: "10–15 yrs",
      roles: ["Manufacturing Manager", "Operations Director", "Site Engineering Director", "Plant Manager"],
      focus:
        "Own a value stream or a site. Capital project sign-off, capacity planning, hiring + headcount, regulator readiness, vendor strategy.",
      courses: [
        c("Assessment and Certification for Fundamentals of Effective Risk Management"),
        c("Advanced Training Certification (ATC)"),
        c("STERIS Master Class: Applied Cleaning Validation"),
      ],
      crossLinks: [
        {
          trackId: "biotech-business",
          when: "Lead → VP",
          reason:
            "Manufacturing Directors with a commercial lens commonly cross into General Manager / commercial-operations VP roles.",
        },
      ],
    },
    {
      level: "vp",
      label: "VP, Manufacturing & Operations",
      yearsRange: "15+ yrs",
      roles: ["VP Manufacturing", "Chief Operations Officer", "SVP Biologics Operations"],
      focus:
        "Set network-wide strategy. Make / buy decisions, M&A integration, regulatory inspections at the executive level, board reporting on supply.",
      courses: [
        c("miniMBA"),
        c("2235 - Program & Portfolio Management"),
        c("Institute of Biomedical Entrepreneurship Certificate Program"),
      ],
    },
  ],
};

// ── 2. Quality & Regulatory ───────────────────────────────────────
const QUALITY: CareerTrack = {
  id: "quality-regulatory",
  title: "Quality & Regulatory",
  tagline: "From document control to head-of-quality.",
  description:
    "The conscience of every biomanufacturing org. QA/QC, regulatory affairs, validation — the people who keep the licence to operate. Most senior QA leaders started in document control or bench-QC.",
  iconKey: "shield",
  accent: "#0369a1", // sky-700
  stations: [
    {
      level: "junior",
      label: "QC Technician / Document Control",
      yearsRange: "0–2 yrs",
      roles: ["QC Technician", "QA Document Specialist", "Compliance Assistant"],
      focus:
        "Learn the language. SOPs, change-control, deviation forms, audit trails. The boring stuff that becomes the spine of every senior QA role.",
      courses: [
        c("QA/QC Fundamentals"),
        c("Good Laboratory Practice (GLP) Fundamentals"),
        c("GMP Fundamentals"),
        c("Scientific Report Writing Fundamentals"),
      ],
    },
    {
      level: "mid",
      label: "QA Specialist / Regulatory Associate",
      yearsRange: "2–5 yrs",
      roles: ["QA Specialist", "Regulatory Affairs Associate", "Validation Engineer I", "CAPA Coordinator"],
      focus:
        "Own a system. Deviation investigations, internal audit prep, regulatory dossier sections, validation protocol authoring.",
      courses: [
        c("Pharmaceutical Quality Control"),
        c("Root Cause Analysis: Detangling laboratory ‘problems’ and identifying ways to prevent recurrence!"),
        c("An Orientation to Canadian Regulations and Regulators"),
        c("Microbiology 2-Day In-Person Training"),
      ],
    },
    {
      level: "senior",
      label: "Senior QA / Regulatory Lead",
      yearsRange: "5–10 yrs",
      roles: ["Senior QA Specialist", "Regulatory Lead", "Validation Manager", "Audit Lead"],
      focus:
        "Lead inspections. Own the quality system for a product or site. Mentor specialists, write the executive risk briefings, sit on the change-control board.",
      courses: [
        c("SCS 4023 Quality Assurance Management in Biomanufacturing"),
        c("Pharmaceutical Quality Assurance"),
        c("Pharmaceutical Regulatory Compliance"),
        c("STERIS Master Class: Applied Cleaning Validation"),
        c("Advanced Training Certification (ATC)"),
        c("Meeting GMP Requirements Globally"),
      ],
      crossLinks: [
        {
          trackId: "cell-gene-therapy",
          when: "Senior → Lead",
          reason:
            "Quality leaders with CGT exposure are scarce — the move into ATMP-focused quality leadership opens up rapidly.",
        },
      ],
    },
    {
      level: "lead",
      label: "QA Director / Head of Regulatory",
      yearsRange: "10–15 yrs",
      roles: ["Director, Quality Assurance", "Director, Regulatory Affairs", "Head of Compliance"],
      focus:
        "Set the quality + regulatory roadmap. Build the team. Be the named point of contact for the inspector. Brief the CEO on inspection readiness.",
      courses: [
        c("Assessment and Certification for Fundamentals of Effective Risk Management"),
        c("Project Management for Non-Project Managers - Risk Management"),
        c("Project Management for Non-Project Managers - Stakeholder Management"),
        c("PSG Medical Devices Symposium"),
      ],
    },
    {
      level: "vp",
      label: "VP / CQO",
      yearsRange: "15+ yrs",
      roles: ["VP Quality", "Chief Quality Officer", "SVP Regulatory & Compliance"],
      focus:
        "Owns the licence to operate. Board-level audit committee, M&A diligence, global regulatory strategy, post-market surveillance frameworks.",
      courses: [
        c("Masterclass: Navigating Licensing, IP & BD Partnerships in Therapeutics"),
        c("miniMBA"),
      ],
    },
  ],
};

// ── 3. Cell & Gene Therapy ────────────────────────────────────────
const CGT: CareerTrack = {
  id: "cell-gene-therapy",
  title: "Cell & Gene Therapy",
  tagline: "From CAR-T trainee to ATMP programme lead.",
  description:
    "The newest pillar of biomanufacturing — autologous + allogeneic cell therapies, viral-vector gene therapies, the regulatory greenfield around them. Comparatively young field, fastest hiring growth.",
  iconKey: "dna",
  accent: "#7c3aed", // violet-600
  stations: [
    {
      level: "junior",
      label: "ATMP Trainee",
      yearsRange: "0–2 yrs",
      roles: ["Cell Therapy Operator", "Gene Therapy Process Trainee", "Viral Vector Production Tech"],
      focus:
        "Understand what's different about ATMPs vs. traditional biologics — autologous logistics, vector closure, the cleanroom intensity, the regulatory ambiguity.",
      courses: [
        c("Introduction to Advanced Therapy Medicinal Products (ATMPs)Advanced Therapies GMP Onboarding"),
        c("Advanced Therapies GMP Onboarding"),
        c("GMP Fundamentals"),
        c("Working in a GMP Environment 2-day In-Person Workshop"),
      ],
    },
    {
      level: "mid",
      label: "Cell / Gene Therapy Specialist",
      yearsRange: "2–5 yrs",
      roles: ["Cell Therapy Process Specialist", "Vector Process Engineer", "ATMP QC Specialist"],
      focus:
        "Own the process. iPSC expansion, CAR-T product release, vector titer methods — pick a niche and go deep. Comfortable with autologous chain-of-identity.",
      courses: [
        c("Cell Therapy Bootcamp: hPSC Biomanufacturing"),
        c("Essentials of Cell and Gene Therapy GMP Manufacturing"),
        c("Aseptic Processing: Contamination Control"),
      ],
    },
    {
      level: "senior",
      label: "Senior CGT Engineer",
      yearsRange: "5–10 yrs",
      roles: ["Senior Cell Therapy Engineer", "Process Development Lead — Gene Therapy", "ATMP Tech Transfer Lead"],
      focus:
        "Lead a process-development team. Own the IND/CTA filings on process. Hand off from PD to GMP. Train inspectors on what's different about your modality.",
      courses: [
        c("Adopting a Life-Cycle Approach to Cell & Gene Therapy Manufacturing"),
        c("Planning for Cell Therapy Clinical Trial Applications"),
        c("Meeting GMP Requirements Globally"),
      ],
      crossLinks: [
        {
          trackId: "clinical-trials",
          when: "Senior → Lead",
          reason:
            "Manufacturing-PD leaders with CGT depth are the most credible candidates for clinical-operations leadership at CGT sponsors.",
        },
        {
          trackId: "quality-regulatory",
          when: "Senior → Lead",
          reason:
            "ATMP-experienced regulatory leads are vanishingly rare — the lateral into RA is a fast track to director-level visibility.",
        },
      ],
    },
    {
      level: "lead",
      label: "Director, Cell & Gene Therapy",
      yearsRange: "10–15 yrs",
      roles: ["Director, Cell Therapy Operations", "Head of Vector Manufacturing", "Director, ATMP Quality"],
      focus:
        "Network-level decisions. Outsourced vs. in-house manufacturing, comparability strategy, scale-up from clinical to commercial volumes.",
      courses: [
        c("Assessment and Certification for Fundamentals of Effective Risk Management"),
        c("2235 - Program & Portfolio Management"),
        c("Masterclass: Navigating Licensing, IP & BD Partnerships in Therapeutics"),
      ],
    },
    {
      level: "vp",
      label: "VP, Cell & Gene Therapy",
      yearsRange: "15+ yrs",
      roles: ["VP, ATMP Operations", "Chief Manufacturing Officer (CGT)", "SVP Cell Therapy"],
      focus:
        "Set the modality strategy across the portfolio. Capital allocation, M&A diligence on CGT assets, board reporting on the modality's economics.",
      courses: [
        c("miniMBA"),
        c("Institute of Biomedical Entrepreneurship Certificate Program"),
      ],
    },
  ],
};

// ── 4. Clinical & Trials ──────────────────────────────────────────
const CLINICAL: CareerTrack = {
  id: "clinical-trials",
  title: "Clinical & Trials",
  tagline: "From clinical research coordinator to chief medical officer's bench.",
  description:
    "Where the science meets the patient. CRA / CRC roles into clinical-operations leadership, clinical project management, medical affairs. Cross-pollinates heavily with regulatory + the modality tracks.",
  iconKey: "stethoscope",
  accent: "#d97706", // amber-600
  stations: [
    {
      level: "junior",
      label: "Clinical Research Coordinator",
      yearsRange: "0–2 yrs",
      roles: ["Clinical Research Coordinator", "Clinical Trial Assistant", "Regulatory Document Coordinator"],
      focus:
        "Learn GCP cold. Source-document verification, ICF tracking, monitoring visit prep. The compliance scaffolding everything else hangs on.",
      courses: [
        c("GCP Fundamentals"),
        c("Good Laboratory Practice (GLP) Fundamentals"),
        c("Scientific Report Writing Fundamentals"),
      ],
    },
    {
      level: "mid",
      label: "Clinical Research Associate",
      yearsRange: "2–5 yrs",
      roles: ["Clinical Research Associate", "Senior CRC", "Regulatory Affairs Associate (Clinical)"],
      focus:
        "Own a portfolio of sites. Monitoring visits, query resolution, protocol deviation handling, site initiation visits.",
      courses: [
        c("CANTRAIN: Canadian Consortium of Clinical Trials Training Platform"),
        c("An Orientation to Canadian Regulations and Regulators"),
        c("Business Communication"),
      ],
    },
    {
      level: "senior",
      label: "Senior CRA / Clinical Lead",
      yearsRange: "5–10 yrs",
      roles: ["Senior CRA", "Clinical Trial Manager", "Clinical Project Lead"],
      focus:
        "Lead a trial. Cross-functional leadership across medical, ops, regulatory, biostatistics. First-meeting-with-the-FDA territory.",
      courses: [
        c("Planning for Cell Therapy Clinical Trial Applications"),
        c("PSG Medical Devices Symposium"),
        c("3401 - Practical Project Management - Part 1"),
        c("3402 - Practical Project Management - Part 2"),
      ],
      crossLinks: [
        {
          trackId: "project-leadership",
          when: "Senior → Lead",
          reason:
            "Senior clinical trial managers convert cleanly into multi-program portfolio leadership inside CRO or sponsor orgs.",
        },
      ],
    },
    {
      level: "lead",
      label: "Director, Clinical Operations",
      yearsRange: "10–15 yrs",
      roles: ["Director, Clinical Operations", "Senior Clinical Project Director", "Head of Clinical Quality"],
      focus:
        "Multi-trial leadership. Vendor strategy (CROs, central labs), risk-based monitoring framework, inspection readiness, budgeting.",
      courses: [
        c("2235 - Program & Portfolio Management"),
        c("2236 - Managing International Projects"),
        c("Assessment and Certification for Fundamentals of Effective Risk Management"),
      ],
    },
    {
      level: "vp",
      label: "VP, Clinical Development",
      yearsRange: "15+ yrs",
      roles: ["VP Clinical Operations", "SVP Clinical Development", "Chief Development Officer"],
      focus:
        "Programme-level strategy. Phase 2 / 3 design partnerships with discovery, regulatory strategy, IPO-readiness for the clinical narrative.",
      courses: [
        c("Masterclass: Navigating Licensing, IP & BD Partnerships in Therapeutics"),
        c("miniMBA"),
      ],
    },
  ],
};

// ── 5. Biotech Business & Entrepreneurship ─────────────────────────
const BUSINESS: CareerTrack = {
  id: "biotech-business",
  title: "Biotech Business & Entrepreneurship",
  tagline: "From scientific founder to operator-VC bridge.",
  description:
    "The commercial side of life sciences. Founders, BD professionals, IP / licensing, investor-relations, commercial ops. Many bench-trained people pivot here mid-career and never look back.",
  iconKey: "briefcase",
  accent: "#0d9488", // teal-600 (paired with the manufacturing track)
  stations: [
    {
      level: "junior",
      label: "Commercial Analyst / Programme Trainee",
      yearsRange: "0–2 yrs",
      roles: ["Commercial Analyst", "Business Development Analyst", "Founders-Programme Member"],
      focus:
        "Build the commercial vocabulary. Markets, P&Ls, deal terms, term sheets. The vocabulary that lets a bench scientist hold their own in a CEO's office.",
      courses: [
        c("UofT: Summer by Design"),
        c("Life Sciences Talent Accelerator"),
        c("Business Communication"),
        c("Scientific Report Writing Fundamentals"),
      ],
    },
    {
      level: "mid",
      label: "Scientific Founder / Business Specialist",
      yearsRange: "2–5 yrs",
      roles: ["Scientific Co-Founder", "Business Development Associate", "Commercial Strategy Analyst"],
      focus:
        "Run a workstream. Lead a fundraise prep, own a partnership thesis, build the first version of a commercial model. The first time the chart's on the wall and yours.",
      courses: [
        c("Scientific Founders Program"),
        c("Women in the Business of Health Science Bootcamp"),
        c("UofT: Building a Biotech Venture"),
        c("Data Science Certificate"),
      ],
    },
    {
      level: "senior",
      label: "Senior BD / Strategy",
      yearsRange: "5–10 yrs",
      roles: ["Senior BD Manager", "Director, Strategy", "Head of Commercial — Early Stage"],
      focus:
        "Run deals. Negotiate term sheets, lead BD pipelines, brief the board on commercial milestones. Scientific credibility + commercial chops in one room.",
      courses: [
        c("Marketing and Sales in Health Sciences Bootcamp"),
        c("Institute of Biomedical Entrepreneurship Certificate Program"),
        c("Life Sciences Entrepreneurship Development Program (LSEDP)"),
        c("Masterclass: Navigating Licensing, IP & BD Partnerships in Therapeutics"),
      ],
      crossLinks: [
        {
          trackId: "project-leadership",
          when: "Senior → Lead",
          reason:
            "BD leaders running multiple deals at once frequently formalise into Portfolio / Programme leadership.",
        },
      ],
    },
    {
      level: "lead",
      label: "VP / Head of BD",
      yearsRange: "10–15 yrs",
      roles: ["VP, Business Development", "Head of Commercial", "Chief Strategy Officer (mid-stage)"],
      focus:
        "Own the deal book. M&A diligence, licensing deal sign-off, alliance management, IPO process — and the cap table that goes with all of it.",
      courses: [
        c("miniMBA"),
        c("2235 - Program & Portfolio Management"),
        c("Masterclass: Navigating Licensing, IP & BD Partnerships in Therapeutics"),
      ],
    },
    {
      level: "vp",
      label: "CEO / Operating Partner",
      yearsRange: "15+ yrs",
      roles: ["Chief Executive Officer", "Operating Partner (Life Sciences VC)", "Entrepreneur-in-Residence"],
      focus:
        "Set the company strategy. Or move into an investor-side seat — operating partner, EIR, scout — funding the next generation of the science you grew up in.",
      courses: [
        c("Institute of Biomedical Entrepreneurship Certificate Program"),
        c("miniMBA"),
      ],
    },
  ],
};

// ── 6. Project Leadership ─────────────────────────────────────────
const PROJECT: CareerTrack = {
  id: "project-leadership",
  title: "Project Leadership",
  tagline: "From project coordinator to PMO head.",
  description:
    "The cross-cutting discipline that keeps every other track on time + on budget. Project management is famously the easiest mid-career pivot from bench / clinical / business — and the highest-leverage role inside a growing biotech.",
  iconKey: "network",
  accent: "#dc2626", // red-600
  stations: [
    {
      level: "junior",
      label: "Project Coordinator",
      yearsRange: "0–2 yrs",
      roles: ["Project Coordinator", "Programme Assistant", "Scheduling Analyst"],
      focus:
        "Learn the toolkit. Gantt, dependency tracking, status reports, the rhythm of a stand-up. Earn trust by being the most-organised person in the room.",
      courses: [
        c("Project Management for Non-Project Managers - Stakeholder Management"),
        c("Project Management for Non-Project Managers - Planning and Scheduling"),
        c("Business Communication"),
        c("Scientific Report Writing Fundamentals"),
      ],
    },
    {
      level: "mid",
      label: "Project Manager",
      yearsRange: "2–5 yrs",
      roles: ["Project Manager", "Programme Coordinator", "Agile Delivery Lead"],
      focus:
        "Run a project end-to-end. Budget, risk, scope, stakeholders — own all of it. Become the person the science leader trusts to translate plans into milestones.",
      courses: [
        c("Project Management for Non-Project Managers - Cost Management"),
        c("Project Management for Non-Project Managers - Risk Management"),
        c("Project Management for Non-Project Managers - Change Management"),
        c("Women in Project Management Bootcamp"),
        c("3401 - Practical Project Management - Part 1"),
        c("3523A - Agile Project Management Basics: Methods and Solutions"),
        c("3523B - Agile Project Management Basics: Release Planning"),
      ],
    },
    {
      level: "senior",
      label: "Senior PM / Programme Lead",
      yearsRange: "5–10 yrs",
      roles: ["Senior Project Manager", "Programme Lead", "Agile Coach", "Product Owner"],
      focus:
        "Own a programme. Multiple projects, multiple workstreams, vendor management. The board-trusted operator who can land a complex transition (eg. a tech-transfer or a SAP migration).",
      courses: [
        c("3402 - Practical Project Management - Part 2"),
        c("1952A - Project Leadership"),
        c("1952B - Project Communication and Strategy"),
        c("3043 - Project Recovery Methods"),
        c("3841 - Product Management and Ownership – Creating Value"),
      ],
      crossLinks: [
        {
          trackId: "bioprocess",
          when: "Senior → Lead",
          reason:
            "Strong programme leads land manufacturing director seats by owning a tech-transfer or capacity-expansion to completion.",
        },
        {
          trackId: "biotech-business",
          when: "Senior → Lead",
          reason:
            "Programme leaders with a commercial lens make natural Heads of Strategy / Chiefs of Staff at growth-stage biotechs.",
        },
      ],
    },
    {
      level: "lead",
      label: "Director, PMO",
      yearsRange: "10–15 yrs",
      roles: ["Director, Programme Management", "Head of PMO", "VP Operations (PMO-grown)"],
      focus:
        "Build + run the programme function. Methodology, tooling, hiring + career-pathing the team, exec-level reporting cadence.",
      courses: [
        c("2235 - Program & Portfolio Management"),
        c("2236 - Managing International Projects"),
        c("2799 - Project Management Office"),
        c("3845 - Agile Leadership"),
      ],
    },
    {
      level: "vp",
      label: "VP / Chief of Staff",
      yearsRange: "15+ yrs",
      roles: ["VP, Programme Management", "Chief of Staff to CEO", "Chief Transformation Officer"],
      focus:
        "Operating partner to the CEO. Strategic-cadence ownership, M&A integration playbooks, the place where the company's biggest cross-cutting bets sit.",
      courses: [
        c("miniMBA"),
        c("Institute of Biomedical Entrepreneurship Certificate Program"),
      ],
    },
  ],
};

export const CAREER_TRACKS: CareerTrack[] = [
  BIOPROCESS,
  QUALITY,
  CGT,
  CLINICAL,
  BUSINESS,
  PROJECT,
];

export const TRACK_BY_ID = new Map(CAREER_TRACKS.map((t) => [t.id, t] as const));
