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
  /** Destination level. Pairs with the source-station's level (which
   *  the renderer reads off the parent CareerStation) so the
   *  Cross-stream Mobility section can highlight the exact source +
   *  target boxes in the chart above on hover. The `when` string is
   *  the human-readable counterpart (e.g. "Senior → Lead"). */
  targetLevel: LevelId;
  /** When this jump tends to happen (e.g. "Senior → Director"). */
  when: string;
  /** Why it's a credible move. One sentence. */
  reason: string;
  /** Skill / knowledge areas the candidate needs to acquire to make
   *  the lateral credibly. Surfaced in the "Cross-stream mobility"
   *  section below the main chart. No course names — same gap-phrase
   *  vocabulary the station boxes use. */
  learningNeeded?: string[];
}

export interface CareerStation {
  level: LevelId;
  label: string;
  yearsRange: string;
  roles: string[];
  focus: string;
  /** Education + skill gaps to close at this level. Topic phrases,
   *  intentionally generic — these don't link to platform courses and
   *  aren't tied to specific catalogue titles. The point is "what
   *  kind of training do I need" not "which course should I take".
   *  Trainees go to /courses to find specific offerings. */
  educationGaps: string[];
  /** Course suggestions are kept on the type but no longer rendered
   *  on /career-paths (the user wanted the visual to be about gaps,
   *  not specific catalogue titles). Retained for future use. */
  courses: CourseRef[];
  crossLinks?: CrossLink[];
}

/**
 * Track identifier.
 *
 * Originally a strict union of the six job-function tracks. Widened
 * to `string` when the parallel `pathway-data.ts` was added — that
 * file uses BHN-pathway-shaped ids ("aseptic-cell-culture", "car-t-
 * manufacturing", etc.) but reuses the same CareerTrack /
 * CareerStation / CrossLink shapes. Keeping TrackId narrow would
 * have forced a fork of the type system; widening is the smaller
 * trade.
 *
 * The runtime data still uses well-known string constants; just the
 * compiler doesn't enforce them. The six original ids are documented
 * here as named constants so other code can still reference them
 * by symbol if useful.
 */
export type TrackId = string;
export const TRACK_IDS = {
  bioprocess:         "bioprocess",
  qualityRegulatory:  "quality-regulatory",
  cellGeneTherapy:    "cell-gene-therapy",
  clinicalTrials:     "clinical-trials",
  biotechBusiness:    "biotech-business",
  projectLeadership:  "project-leadership",
} as const;

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
      educationGaps: [
        "Aseptic technique fundamentals",
        "Batch-record discipline",
        "GMP basics + regulatory vocabulary",
        "Lab safety + cleanroom behaviour",
        "Microbiology awareness",
      ],
      courses: [
        c("GMP Fundamentals"),
        c("Working in a GMP Environment 2-day In-Person Workshop"),
        c("Introduction to Bioprocessing (Online)"),
        c("BIS Program: Foundations"),
      ],
    },
    {
      level: "mid",
      label: "Process Specialist",
      yearsRange: "2–5 yrs",
      roles: ["Senior Manufacturing Associate", "Bioreactor Operator", "Cell Culture Specialist", "Aseptic Process Specialist"],
      focus:
        "Own a unit operation end-to-end. Troubleshoot deviations, draft SOP revisions, run training shadow-shifts, contribute to tech-transfer doc review.",
      educationGaps: [
        "Unit-op depth (bioreactor / cell culture)",
        "Deviation investigation methodology",
        "SOP authoring + change control",
        "Statistical process control basics",
        "Tech-transfer fundamentals",
      ],
      courses: [
        c("Upstream Processing: Bioreactors in Bioprocessing"),
        c("Bioreactor Operations"),
        c("Cell Culture in Biopharmaceutical Manufacturing"),
      ],
    },
    {
      level: "senior",
      label: "Process Engineer / Supervisor",
      yearsRange: "5–10 yrs",
      roles: ["Senior Process Engineer", "Manufacturing Supervisor", "Tech-Transfer Lead", "Production Lead"],
      focus:
        "Lead a shift, a campaign, or a tech-transfer. Write process characterisation reports, own CAPAs, set production schedules, mentor junior associates.",
      educationGaps: [
        "Tech-transfer ownership end-to-end",
        "Process characterisation methodology",
        "CAPA leadership + RCA discipline",
        "Technical report writing",
        "Mentoring + people-development frameworks",
      ],
      courses: [
        c("Pharmaceutical Manufacturing Technology"),
        c("Meeting GMP Requirements Globally"),
      ],
      crossLinks: [
        {
          trackId: "quality-regulatory",
          targetLevel: "lead",
          when: "Senior → Lead",
          reason:
            "Strong process-engineering Seniors often pivot to Quality leadership — the floor experience makes for credible QA management.",
          learningNeeded: [
            "Quality system ownership",
            "Internal audit + regulator-facing communication",
            "Risk-based validation methodology",
            "QA team mentoring frameworks",
          ],
        },
        {
          trackId: "project-leadership",
          targetLevel: "lead",
          when: "Senior → Lead",
          reason:
            "Tech-transfer leaders frequently formalise their toolkit and move into multi-site project ownership.",
          learningNeeded: [
            "Multi-program portfolio management",
            "Vendor + outsourcing strategy",
            "PMO methodology selection",
            "Programme-level executive communication",
          ],
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
      educationGaps: [
        "Capacity + demand planning",
        "Capital project management",
        "Vendor + outsourcing strategy",
        "Regulatory inspection readiness",
        "Cross-site coordination + hiring",
      ],
      courses: [
        c("Assessment and Certification for Fundamentals of Effective Risk Management"),
      ],
      crossLinks: [
        {
          trackId: "biotech-business",
          targetLevel: "vp",
          when: "Lead → VP",
          reason:
            "Manufacturing Directors with a commercial lens commonly cross into General Manager / commercial-operations VP roles.",
          learningNeeded: [
            "P&L ownership end-to-end",
            "Strategic alliance management",
            "Capital deployment + investor narratives",
            "M&A diligence on operating assets",
          ],
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
      educationGaps: [
        "Network supply strategy",
        "M&A operations diligence",
        "Board-level communication",
        "Make-vs-buy decisioning",
        "Organisational design at scale",
      ],
      courses: [
        c("miniMBA"),
        c("2235 - Program & Portfolio Management"),
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
      educationGaps: [
        "GMP / GLP fundamentals",
        "Change-control mechanics",
        "Document control rigour",
        "Audit-trail discipline",
        "Regulatory vocabulary",
      ],
      courses: [
        c("QA/QC Fundamentals"),
        c("GMP Fundamentals"),
      ],
    },
    {
      level: "mid",
      label: "QA Specialist / Regulatory Associate",
      yearsRange: "2–5 yrs",
      roles: ["QA Specialist", "Regulatory Affairs Associate", "Validation Engineer I", "CAPA Coordinator"],
      focus:
        "Own a system. Deviation investigations, internal audit prep, regulatory dossier sections, validation protocol authoring.",
      educationGaps: [
        "Deviation investigation + RCA",
        "Validation protocol authoring",
        "Internal audit preparation",
        "Risk assessment frameworks",
        "Regulatory dossier sections",
      ],
      courses: [
        c("Pharmaceutical Quality Control"),
        c("Root Cause Analysis: Detangling laboratory ‘problems’ and identifying ways to prevent recurrence!"),
      ],
    },
    {
      level: "senior",
      label: "Senior QA / Regulatory Lead",
      yearsRange: "5–10 yrs",
      roles: ["Senior QA Specialist", "Regulatory Lead", "Validation Manager", "Audit Lead"],
      focus:
        "Lead inspections. Own the quality system for a product or site. Mentor specialists, write the executive risk briefings, sit on the change-control board.",
      educationGaps: [
        "Quality system ownership",
        "Inspection front-room skills",
        "Risk-based methodology",
        "Validation strategy",
        "Mentoring + change-control board chair-craft",
      ],
      courses: [
        c("SCS 4023 Quality Assurance Management in Biomanufacturing"),
        c("Pharmaceutical Quality Assurance"),
      ],
      crossLinks: [
        {
          trackId: "cell-gene-therapy",
          targetLevel: "lead",
          when: "Senior → Lead",
          reason:
            "Quality leaders with CGT exposure are scarce — the move into ATMP-focused quality leadership opens up rapidly.",
          learningNeeded: [
            "ATMP-specific GMP standards",
            "Living-drug analytics + release testing",
            "Modality-specific regulatory writing",
            "Comparability strategy for cell + gene products",
          ],
        },
        {
          trackId: "biotech-business",
          targetLevel: "lead",
          when: "Senior → Lead",
          reason:
            "Regulatory leaders with a commercial lens move into BD as the deal-structuring partner — quality / RA depth de-risks every transaction.",
          learningNeeded: [
            "Deal negotiation + term-sheet literacy",
            "Investor-facing narratives",
            "M&A diligence",
            "Strategic alliance management",
          ],
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
      educationGaps: [
        "Quality roadmap design",
        "Regulator relationship management",
        "Hiring + career-pathing",
        "Continuous improvement programmes",
        "Cross-functional executive alignment",
      ],
      courses: [
        c("Assessment and Certification for Fundamentals of Effective Risk Management"),
      ],
    },
    {
      level: "vp",
      label: "VP / CQO",
      yearsRange: "15+ yrs",
      roles: ["VP Quality", "Chief Quality Officer", "SVP Regulatory & Compliance"],
      focus:
        "Owns the licence to operate. Board-level audit committee, M&A diligence, global regulatory strategy, post-market surveillance frameworks.",
      educationGaps: [
        "Global regulatory strategy",
        "Post-market surveillance frameworks",
        "M&A quality diligence",
        "Board-level risk reporting",
        "Quality-of-supply governance",
      ],
      courses: [
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
      educationGaps: [
        "ATMP regulatory landscape",
        "Autologous chain-of-identity",
        "Vector / cell-product basics",
        "Cleanroom GMP intensity",
        "Modality-specific safety practices",
      ],
      courses: [
        c("Advanced Therapies GMP Onboarding"),
        c("GMP Fundamentals"),
      ],
    },
    {
      level: "mid",
      label: "Cell / Gene Therapy Specialist",
      yearsRange: "2–5 yrs",
      roles: ["Cell Therapy Process Specialist", "Vector Process Engineer", "ATMP QC Specialist"],
      focus:
        "Own the process. iPSC expansion, CAR-T product release, vector titer methods — pick a niche and go deep. Comfortable with autologous chain-of-identity.",
      educationGaps: [
        "iPSC / CAR-T process expertise",
        "Vector titer + analytics methods",
        "Cold-chain + logistics for living drugs",
        "ATMP-specific QC + release testing",
        "Modality-specific deviation handling",
      ],
      courses: [
        c("Cell Therapy Bootcamp: hPSC Biomanufacturing"),
        c("Essentials of Cell and Gene Therapy GMP Manufacturing"),
      ],
    },
    {
      level: "senior",
      label: "Senior CGT Engineer",
      yearsRange: "5–10 yrs",
      roles: ["Senior Cell Therapy Engineer", "Process Development Lead — Gene Therapy", "ATMP Tech Transfer Lead"],
      focus:
        "Lead a process-development team. Own the IND/CTA filings on process. Hand off from PD to GMP. Train inspectors on what's different about your modality.",
      educationGaps: [
        "PD-to-GMP transfer methodology",
        "IND / CTA process sections",
        "Comparability planning",
        "Process characterisation for living drugs",
        "Modality-specific regulatory writing",
      ],
      courses: [
        c("Adopting a Life-Cycle Approach to Cell & Gene Therapy Manufacturing"),
      ],
      crossLinks: [
        {
          trackId: "clinical-trials",
          targetLevel: "lead",
          when: "Senior → Lead",
          reason:
            "Manufacturing-PD leaders with CGT depth are the most credible candidates for clinical-operations leadership at CGT sponsors.",
          learningNeeded: [
            "Trial-level operational leadership",
            "CRO + vendor strategy",
            "Biostatistics literacy",
            "Regulator-facing presentations",
          ],
        },
        {
          trackId: "quality-regulatory",
          targetLevel: "lead",
          when: "Senior → Lead",
          reason:
            "ATMP-experienced regulatory leads are vanishingly rare — the lateral into RA is a fast track to director-level visibility.",
          learningNeeded: [
            "ATMP quality system design",
            "Inspection front-room skills",
            "Comparability + lifecycle strategy",
            "Modality-specific RA dossier authorship",
          ],
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
      educationGaps: [
        "Outsourcing vs in-house decisioning",
        "Clinical-to-commercial scale-up",
        "Modality-specific regulatory dialogue",
        "Cost modelling for ATMP",
        "Capacity planning under uncertainty",
      ],
      courses: [
        c("2235 - Program & Portfolio Management"),
      ],
    },
    {
      level: "vp",
      label: "VP, Cell & Gene Therapy",
      yearsRange: "15+ yrs",
      roles: ["VP, ATMP Operations", "Chief Manufacturing Officer (CGT)", "SVP Cell Therapy"],
      focus:
        "Set the modality strategy across the portfolio. Capital allocation, M&A diligence on CGT assets, board reporting on the modality's economics.",
      educationGaps: [
        "Modality portfolio strategy",
        "CGT capital allocation",
        "M&A diligence on CGT assets",
        "Regulator engagement at exec level",
        "Industry standards-body participation",
      ],
      courses: [
        c("miniMBA"),
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
      educationGaps: [
        "GCP fundamentals",
        "Source-document verification",
        "ICH guidelines",
        "Site-communication etiquette",
        "Informed-consent process",
      ],
      courses: [
        c("GCP Fundamentals"),
      ],
    },
    {
      level: "mid",
      label: "Clinical Research Associate",
      yearsRange: "2–5 yrs",
      roles: ["Clinical Research Associate", "Senior CRC", "Regulatory Affairs Associate (Clinical)"],
      focus:
        "Own a portfolio of sites. Monitoring visits, query resolution, protocol deviation handling, site initiation visits.",
      educationGaps: [
        "Monitoring methodology",
        "Protocol deviation management",
        "Site initiation visits",
        "Vendor coordination (CRO + labs)",
        "Query management discipline",
      ],
      courses: [
        c("CANTRAIN: Canadian Consortium of Clinical Trials Training Platform"),
      ],
    },
    {
      level: "senior",
      label: "Senior CRA / Clinical Lead",
      yearsRange: "5–10 yrs",
      roles: ["Senior CRA", "Clinical Trial Manager", "Clinical Project Lead"],
      focus:
        "Lead a trial. Cross-functional leadership across medical, ops, regulatory, biostatistics. First-meeting-with-the-FDA territory.",
      educationGaps: [
        "Cross-functional trial leadership",
        "FDA / regulator interactions",
        "Risk-based monitoring",
        "Biostatistics literacy",
        "Vendor performance management",
      ],
      courses: [
        c("3401 - Practical Project Management - Part 1"),
      ],
      crossLinks: [
        {
          trackId: "project-leadership",
          targetLevel: "lead",
          when: "Senior → Lead",
          reason:
            "Senior clinical trial managers convert cleanly into multi-program portfolio leadership inside CRO or sponsor orgs.",
          learningNeeded: [
            "Multi-program portfolio management",
            "Vendor strategy + tooling selection",
            "PMO methodology frameworks",
            "Cross-functional executive communication",
          ],
        },
        {
          trackId: "biotech-business",
          targetLevel: "lead",
          when: "Senior → Lead",
          reason:
            "Clinical-operations leaders become the clinical-narrative architects for fundraising — IPO and Series-B pitches lean on the clinical story.",
          learningNeeded: [
            "Investor-facing narratives",
            "IPO clinical positioning",
            "Commercial + market-sizing modelling",
            "Term-sheet + valuation literacy",
          ],
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
      educationGaps: [
        "Multi-trial portfolio leadership",
        "CRO selection + strategy",
        "Inspection readiness",
        "Budgeting + resource modelling",
        "Cross-program prioritisation",
      ],
      courses: [
        c("2235 - Program & Portfolio Management"),
      ],
    },
    {
      level: "vp",
      label: "VP, Clinical Development",
      yearsRange: "15+ yrs",
      roles: ["VP Clinical Operations", "SVP Clinical Development", "Chief Development Officer"],
      focus:
        "Programme-level strategy. Phase 2 / 3 design partnerships with discovery, regulatory strategy, IPO-readiness for the clinical narrative.",
      educationGaps: [
        "Phase 2 / 3 design partnership",
        "Programme-level regulatory strategy",
        "IPO clinical narrative",
        "Portfolio prioritisation",
        "Strategic-alliance management",
      ],
      courses: [
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
      educationGaps: [
        "Commercial vocabulary",
        "Market sizing basics",
        "Term-sheet literacy",
        "Communication for scientists",
        "Reading financial statements",
      ],
      courses: [
        c("UofT: Summer by Design"),
      ],
    },
    {
      level: "mid",
      label: "Scientific Founder / Business Specialist",
      yearsRange: "2–5 yrs",
      roles: ["Scientific Co-Founder", "Business Development Associate", "Commercial Strategy Analyst"],
      focus:
        "Run a workstream. Lead a fundraise prep, own a partnership thesis, build the first version of a commercial model. The first time the chart's on the wall and yours.",
      educationGaps: [
        "Fundraise prep + pitch",
        "BD thesis development",
        "Commercial + financial modelling",
        "Partnership scoping",
        "IP + licensing fundamentals",
      ],
      courses: [
        c("Scientific Founders Program"),
      ],
    },
    {
      level: "senior",
      label: "Senior BD / Strategy",
      yearsRange: "5–10 yrs",
      roles: ["Senior BD Manager", "Director, Strategy", "Head of Commercial — Early Stage"],
      focus:
        "Run deals. Negotiate term sheets, lead BD pipelines, brief the board on commercial milestones. Scientific credibility + commercial chops in one room.",
      educationGaps: [
        "Deal negotiation",
        "Board-level commercial briefings",
        "Investor-facing narratives",
        "Alliance management",
        "Competitive-landscape mastery",
      ],
      courses: [
        c("Institute of Biomedical Entrepreneurship Certificate Program"),
      ],
      crossLinks: [
        {
          trackId: "project-leadership",
          targetLevel: "lead",
          when: "Senior → Lead",
          reason:
            "BD leaders running multiple deals at once frequently formalise into Portfolio / Programme leadership.",
          learningNeeded: [
            "PMO design + methodology",
            "Portfolio prioritisation frameworks",
            "Multi-stream resource modelling",
            "Programme-level reporting cadence",
          ],
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
      educationGaps: [
        "M&A diligence",
        "Cap-table management",
        "IPO process",
        "Strategic-partnership leadership",
        "Multi-deal pipeline ownership",
      ],
      courses: [
        c("miniMBA"),
      ],
    },
    {
      level: "vp",
      label: "CEO / Operating Partner",
      yearsRange: "15+ yrs",
      roles: ["Chief Executive Officer", "Operating Partner (Life Sciences VC)", "Entrepreneur-in-Residence"],
      focus:
        "Set the company strategy. Or move into an investor-side seat — operating partner, EIR, scout — funding the next generation of the science you grew up in.",
      educationGaps: [
        "Company strategy formulation",
        "VC / operator-partner skills",
        "Board governance",
        "Industry-network leverage",
        "Long-horizon capital strategy",
      ],
      courses: [
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
      educationGaps: [
        "Gantt + dependency tracking",
        "Status-report cadence",
        "Stakeholder mapping",
        "Stand-up facilitation",
        "Documentation discipline",
      ],
      courses: [
        c("Project Management for Non-Project Managers - Stakeholder Management"),
      ],
    },
    {
      level: "mid",
      label: "Project Manager",
      yearsRange: "2–5 yrs",
      roles: ["Project Manager", "Programme Coordinator", "Agile Delivery Lead"],
      focus:
        "Run a project end-to-end. Budget, risk, scope, stakeholders — own all of it. Become the person the science leader trusts to translate plans into milestones.",
      educationGaps: [
        "Budget / risk / scope ownership",
        "Cross-functional negotiation",
        "Agile methodology basics",
        "Change management",
        "Vendor coordination",
      ],
      courses: [
        c("3401 - Practical Project Management - Part 1"),
      ],
    },
    {
      level: "senior",
      label: "Senior PM / Programme Lead",
      yearsRange: "5–10 yrs",
      roles: ["Senior Project Manager", "Programme Lead", "Agile Coach", "Product Owner"],
      focus:
        "Own a programme. Multiple projects, multiple workstreams, vendor management. The board-trusted operator who can land a complex transition (eg. a tech-transfer or a SAP migration).",
      educationGaps: [
        "Multi-project programme leadership",
        "Tech-transfer execution",
        "Vendor strategy",
        "Project recovery techniques",
        "Programme-level communication",
      ],
      courses: [
        c("1952A - Project Leadership"),
      ],
      crossLinks: [
        {
          trackId: "bioprocess",
          targetLevel: "lead",
          when: "Senior → Lead",
          reason:
            "Strong programme leads land manufacturing director seats by owning a tech-transfer or capacity-expansion to completion.",
          learningNeeded: [
            "Manufacturing operational depth",
            "Capacity + demand planning",
            "Inspection readiness",
            "Capital project ownership",
          ],
        },
        {
          trackId: "biotech-business",
          targetLevel: "lead",
          when: "Senior → Lead",
          reason:
            "Programme leaders with a commercial lens make natural Heads of Strategy / Chiefs of Staff at growth-stage biotechs.",
          learningNeeded: [
            "Deal negotiation",
            "Cap-table literacy + M&A diligence",
            "Strategic alliance management",
            "Investor narratives",
          ],
        },
        {
          trackId: "quality-regulatory",
          targetLevel: "lead",
          when: "Senior → Lead",
          reason:
            "PMs with deep regulated-industry exposure become credible Quality directors — the toolkit transfers and the regulator visibility is already there.",
          learningNeeded: [
            "Quality system ownership",
            "Regulator-facing communication",
            "Validation strategy",
            "Inspection front-room skills",
          ],
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
      educationGaps: [
        "PMO design + operation",
        "Portfolio prioritisation",
        "Methodology framework selection",
        "Career-pathing the PM team",
        "Exec-level reporting cadence",
      ],
      courses: [
        c("2799 - Project Management Office"),
      ],
    },
    {
      level: "vp",
      label: "VP / Chief of Staff",
      yearsRange: "15+ yrs",
      roles: ["VP, Programme Management", "Chief of Staff to CEO", "Chief Transformation Officer"],
      focus:
        "Operating partner to the CEO. Strategic-cadence ownership, M&A integration playbooks, the place where the company's biggest cross-cutting bets sit.",
      educationGaps: [
        "Strategic-cadence ownership",
        "M&A integration playbook",
        "CEO operator-partnership",
        "Cross-cutting strategic bets",
        "Capability building across orgs",
      ],
      courses: [
        c("miniMBA"),
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
