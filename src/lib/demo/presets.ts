/**
 * Curated dummy-data presets for the DemoFiller. Five examples per
 * form so consecutive demos don't all look identical. Realistic
 * biomanufacturing-flavoured content; safe for sales calls.
 *
 * Each preset is a partial object matching the form's state shape. The
 * form spreads the preset over its own state, so missing fields simply
 * stay at whatever the user already had typed.
 */

// ── Talent Application ───────────────────────────────────────────
export interface TalentApplicationPreset {
  first_name?: string;
  last_name?: string;
  email?: string;
  applicant_id?: string;
  current_position?: string;
  earliest_availability?: string;
  linkedin?: string;
  status_goal?: string;
  locations?: string[];
  citizenship?: string[];
  french_speaking?: string;
  french_reading?: string;
  french_writing?: string;
  thesis_or_contract_date?: string;
  program_url?: string;
  pitch?: string;
  linkedin_follow?: string;
  comments?: string;
  consent?: string[];
}

const CONSENT = ["I have read and agreed to the privacy notice and terms above."];

/**
 * 12 curated personas spanning the full BioHubNet audience: master's
 * students, PhD candidates, postdocs, research associates, lab
 * technicians, and industry professionals across life sciences.
 *
 * Each preset fills every non-file field in the talent-application
 * schema (file fields like resume / video / support letter are skipped
 * because they need real uploads). All option-typed values match the
 * canonical option strings in src/lib/forms/talent-application.ts.
 */
export const TALENT_APPLICATION_PRESETS: { label: string; values: TalentApplicationPreset }[] = [
  {
    label: "Avery — Master's, BME (U of T)",
    values: {
      first_name: "Avery", last_name: "Chen",
      email: "avery.chen.demo@biohubnet.test",
      applicant_id: "BHTAA0042",
      current_position: "Master's student",
      earliest_availability: "2026-09-01",
      linkedin: "https://linkedin.com/in/avery-chen-bme",
      status_goal: "Current student searching for internship opportunities",
      locations: ["Ontario", "Quebec", "Remote / hybrid Canada-wide"],
      citizenship: ["Canadian Citizen"],
      french_speaking: "Intermediate", french_reading: "Advanced", french_writing: "Intermediate",
      thesis_or_contract_date: "2027-04-30",
      program_url: "https://www.utoronto.ca/graduate/programs/bme",
      pitch: "Second-year MASc in Biomedical Engineering at U of T. Hands-on with mammalian cell culture, USP/DSP optimisation, and quality control across three lab rotations. Comfortable with aseptic technique, bench bioreactor operation, ELISA, HPLC. Strong Python + statsmodels for data analysis. Drawn to regulated process development and the idea of applying ML to bioprocess optimisation. Available full-time September after thesis defence.",
      linkedin_follow: "Yes, I'm following the LinkedIn page",
      comments: "Available to start mid-September after thesis defence. Open to relocation within Canada.",
      consent: CONSENT,
    },
  },
  {
    label: "Priya — Recent PhD, regulatory track (McGill)",
    values: {
      first_name: "Priya", last_name: "Ramachandran",
      email: "priya.r.demo@biohubnet.test",
      applicant_id: "BHTAA0118",
      current_position: "Postdoctoral Fellow",
      earliest_availability: "2026-07-01",
      linkedin: "https://linkedin.com/in/priya-ramachandran-bio",
      status_goal: "New or soon-to-be graduate searching for full-time opportunities",
      locations: ["Ontario", "Quebec", "British Columbia"],
      citizenship: ["Permanent Resident"],
      french_speaking: "Basic", french_reading: "Intermediate", french_writing: "Basic",
      thesis_or_contract_date: "2026-06-30",
      program_url: "https://www.mcgill.ca/biology/graduate",
      pitch: "PhD in molecular biology (McGill, 2024) with a 1.5-year postdoc supporting CMC documentation for an early-stage gene therapy. Comfortable with Health Canada CTAs, FDA pre-IND meetings, and writing module 2/3 sections in eCTD. Strengths: technical writing, regulatory submissions, cross-functional coordination with QA + clinical ops. Looking to move from academic research into industry regulatory affairs or medical writing.",
      linkedin_follow: "Yes, I'm following the LinkedIn page",
      comments: "Open to fully remote roles. Ready to start within 30 days of offer.",
      consent: CONSENT,
    },
  },
  {
    label: "Mark — Industry pro, career pivot to biotech",
    values: {
      first_name: "Mark", last_name: "Sullivan",
      email: "mark.s.demo@biohubnet.test",
      applicant_id: "BHTAA0203",
      current_position: "Industry Professional",
      earliest_availability: "2026-08-15",
      linkedin: "https://linkedin.com/in/marksullivan-data",
      status_goal: "Working professional exploring new opportunities",
      locations: ["Quebec", "Ontario", "Remote / hybrid Canada-wide"],
      citizenship: ["Canadian Citizen"],
      french_speaking: "Advanced", french_reading: "Advanced", french_writing: "Advanced",
      thesis_or_contract_date: "2026-08-01",
      program_url: "https://biohubnet.ca/learning-pathways",
      pitch: "Six years as a Python data engineer at a Montreal fintech, now pivoting to bio. Completed the BHN biomanufacturing fundamentals + bioprocess data analysis pathways and a CASTL aseptic gowning workshop. Strong analytical foundation, fast bench learner. Looking for a junior process scientist or bioprocess data analyst role where ML meets the wet lab. Bilingual EN/FR.",
      linkedin_follow: "Yes, I'm following the LinkedIn page",
      comments: "Open to part-time bridging roles to gain bench hours; happy to take a step back in seniority for the right team.",
      consent: CONSENT,
    },
  },
  {
    label: "Hannah — PhD candidate, structural bio (U Calgary)",
    values: {
      first_name: "Hannah", last_name: "Lévesque",
      email: "hannah.l.demo@biohubnet.test",
      applicant_id: "BHTAA0317",
      current_position: "PhD candidate",
      earliest_availability: "2026-10-01",
      linkedin: "https://linkedin.com/in/hannah-levesque-cryoEM",
      status_goal: "Current student searching for internship opportunities",
      locations: ["Alberta", "British Columbia", "Ontario", "Quebec"],
      citizenship: ["Canadian Citizen"],
      french_speaking: "Native / fluent", french_reading: "Native / fluent", french_writing: "Advanced",
      thesis_or_contract_date: "2027-12-15",
      program_url: "https://www.ucalgary.ca/biochemistry",
      pitch: "Third-year PhD candidate in structural biology at U Calgary. Cryo-EM reconstruction of viral capsids, X-ray crystallography for protein–ligand complexes, fluency with ChimeraX, Coot, Python scripting. Looking for a 4-6 month industry placement in cell + gene therapy R&D — vector engineering or analytical method development. Bilingual French/English, native Quebecker.",
      linkedin_follow: "Yes, I'm following the LinkedIn page",
      comments: "Strongly prefer in-person roles to maximise hands-on learning. Bilingual is a bonus.",
      consent: CONSENT,
    },
  },
  {
    label: "Diego — Postdoc, AAV engineering (UBC)",
    values: {
      first_name: "Diego", last_name: "Morales",
      email: "diego.m.demo@biohubnet.test",
      applicant_id: "BHTAA0451",
      current_position: "Postdoctoral Fellow",
      earliest_availability: "2026-10-15",
      linkedin: "https://linkedin.com/in/diego-morales-aav",
      status_goal: "New or soon-to-be graduate searching for full-time opportunities",
      locations: ["British Columbia", "Ontario", "Quebec"],
      citizenship: ["Permanent Resident"],
      french_speaking: "None", french_reading: "Basic", french_writing: "None",
      thesis_or_contract_date: "2026-10-31",
      program_url: "https://www.ubc.ca/postdoc",
      pitch: "Two-year postdoc at UBC on AAV capsid engineering wrapping up. Strengths: directed-evolution library design, transient transfection scale-up to 10L (HEK293), analytical method development for empty/full ratio (AUC, mass photometry, dPCR). Recently published in Mol Ther on a tropism-shifted capsid. Looking for senior scientist or PD scientist roles in cell + gene therapy at clinical-stage biotechs.",
      linkedin_follow: "Yes, I'm following the LinkedIn page",
      comments: "Available October. Open to relocation; visa-stable as a PR.",
      consent: CONSENT,
    },
  },
  {
    label: "Wei — Research Associate, immunology lab (UBC)",
    values: {
      first_name: "Wei", last_name: "Zhang",
      email: "wei.z.demo@biohubnet.test",
      applicant_id: "BHTAA0512",
      current_position: "Research Associate",
      earliest_availability: "2026-09-01",
      linkedin: "https://linkedin.com/in/wei-zhang-ra",
      status_goal: "Working professional exploring new opportunities",
      locations: ["British Columbia", "Alberta", "Ontario"],
      citizenship: ["Canadian Citizen"],
      french_speaking: "None", french_reading: "None", french_writing: "None",
      thesis_or_contract_date: "2026-08-31",
      program_url: "https://www.ubc.ca/immunology-research",
      pitch: "Senior Research Associate (4 years) in an academic immunology lab at UBC. Daily flow cytometry (BD FACSymphony, ID7000), tetramer staining for T-cell repertoire analysis, mouse colony management, BSL-2 work with primary human PBMCs. Co-author on 5 papers including 1 first-author. Looking to transition to industry — senior RA / scientist roles in cell therapy or immuno-oncology.",
      linkedin_follow: "Yes, I'm following the LinkedIn page",
      comments: "Have manuscripts in revision; open to staggered start to wrap them up.",
      consent: CONSENT,
    },
  },
  {
    label: "Marcus — Lab Technician, biotech CRO (Toronto)",
    values: {
      first_name: "Marcus", last_name: "Brooks",
      email: "marcus.b.demo@biohubnet.test",
      applicant_id: "BHTAA0584",
      current_position: "Lab Technician",
      earliest_availability: "2026-08-01",
      linkedin: "https://linkedin.com/in/marcus-brooks-tech",
      status_goal: "Working professional exploring new opportunities",
      locations: ["Ontario", "Quebec"],
      citizenship: ["Canadian Citizen"],
      french_speaking: "Basic", french_reading: "Basic", french_writing: "None",
      thesis_or_contract_date: "2026-07-31",
      program_url: "https://www.senecacollege.ca/biotech-diploma",
      pitch: "Lab Technician at a 25-person Toronto CRO for 3 years. Daily ELISA setup and validation, plate-reader troubleshooting (BMG Pherastar / Tecan Spark), reagent prep, equipment qualification, GMP-light documentation. Seneca Biotech diploma. Looking to move to a larger biotech or biopharma where I can grow into a Senior Tech / Junior Scientist role with formal GMP training.",
      linkedin_follow: "Yes, I'm following the LinkedIn page",
      comments: "Reliable, hands-on, looking for a place that invests in formal QA training.",
      consent: CONSENT,
    },
  },
  {
    label: "Aanya — Master's biotech, intl student (Western)",
    values: {
      first_name: "Aanya", last_name: "Patel",
      email: "aanya.p.demo@biohubnet.test",
      applicant_id: "BHTAA0639",
      current_position: "Master's student",
      earliest_availability: "2027-01-15",
      linkedin: "https://linkedin.com/in/aanya-patel-mbiotech",
      status_goal: "Current student searching for internship opportunities",
      locations: ["Ontario", "Quebec", "British Columbia"],
      citizenship: ["International Student"],
      french_speaking: "None", french_reading: "Basic", french_writing: "None",
      thesis_or_contract_date: "2027-08-30",
      program_url: "https://www.uwo.ca/sci/biology/graduate",
      pitch: "MSc Biotechnology (course-based) at Western, finishing summer 2027. Coursework in upstream bioprocessing, regulatory affairs, GMP. Capstone on antibody discovery using phage display. Previous internship at an Indian biopharma — purification of mAbs by Protein A. Looking for a 4-month industry internship to deepen GMP exposure and bridge into full-time post-graduation. PGWP-eligible.",
      linkedin_follow: "Yes, I'm following the LinkedIn page",
      comments: "International student on study permit, eligible for co-op work permit.",
      consent: CONSENT,
    },
  },
  {
    label: "Olivier — Postdoc, vaccines (Université Laval)",
    values: {
      first_name: "Olivier", last_name: "Tremblay",
      email: "olivier.t.demo@biohubnet.test",
      applicant_id: "BHTAA0712",
      current_position: "Postdoctoral Fellow",
      earliest_availability: "2026-09-30",
      linkedin: "https://linkedin.com/in/olivier-tremblay-vaccines",
      status_goal: "New or soon-to-be graduate searching for full-time opportunities",
      locations: ["Quebec", "Ontario", "Remote / hybrid Canada-wide"],
      citizenship: ["Canadian Citizen"],
      french_speaking: "Native / fluent", french_reading: "Native / fluent", french_writing: "Native / fluent",
      thesis_or_contract_date: "2026-09-15",
      program_url: "https://www.fmed.ulaval.ca/postdoc",
      pitch: "Wrapping a 3-year postdoc at U Laval on mRNA-LNP vaccine formulation. Built the lab's microfluidic LNP pipeline, developed cryo-TEM characterisation SOP, validated dynamic light scattering for batch QC. Co-inventor on a provisional patent. Native French and English — comfortable in bilingual settings. Looking for senior scientist roles in vaccine PD or LNP CMC at a Canadian biopharma.",
      linkedin_follow: "Yes, I'm following the LinkedIn page",
      comments: "Strong preference for QC-based or PD roles in Quebec / Eastern Ontario.",
      consent: CONSENT,
    },
  },
  {
    label: "Fiona — Research Associate, industry CRO",
    values: {
      first_name: "Fiona", last_name: "O'Connell",
      email: "fiona.oc.demo@biohubnet.test",
      applicant_id: "BHTAA0809",
      current_position: "Research Associate",
      earliest_availability: "2026-09-15",
      linkedin: "https://linkedin.com/in/fiona-oconnell-bioassay",
      status_goal: "Working professional exploring new opportunities",
      locations: ["Ontario", "Quebec", "Nova Scotia"],
      citizenship: ["Permanent Resident"],
      french_speaking: "Basic", french_reading: "Intermediate", french_writing: "Basic",
      thesis_or_contract_date: "2026-09-15",
      program_url: "https://www.dal.ca/microbiology-immunology",
      pitch: "Research Associate at a Mississauga CRO for 4 years. Cell-based potency assay development and qualification (CHO + primary cells), method-validation packages for client GMP submissions. Authored 12 SOPs, lead bench-side mentor for 3 junior RAs. BSc Microbiology from Dalhousie. Looking for a senior RA / Junior Scientist role at a sponsor company where I can drive a programme rather than client-hop.",
      linkedin_follow: "Yes, I'm following the LinkedIn page",
      comments: "Highly motivated to leave CRO life and own a programme end-to-end.",
      consent: CONSENT,
    },
  },
  {
    label: "Krishna — Lab Technician, core facility (U Manitoba)",
    values: {
      first_name: "Krishna", last_name: "Nair",
      email: "krishna.n.demo@biohubnet.test",
      applicant_id: "BHTAA0876",
      current_position: "Lab Technician",
      earliest_availability: "2026-11-01",
      linkedin: "https://linkedin.com/in/krishna-nair-tech",
      status_goal: "Working professional exploring new opportunities",
      locations: ["Manitoba", "Saskatchewan", "Alberta", "Ontario"],
      citizenship: ["Work Permit"],
      french_speaking: "None", french_reading: "Basic", french_writing: "None",
      thesis_or_contract_date: "2026-10-31",
      program_url: "https://umanitoba.ca/microbiology",
      pitch: "Lab Technician at U Manitoba's flow cytometry + imaging core for 2.5 years. Trained 80+ users on Cytek Aurora and Zeiss Axio Imager. Daily QC on optical alignment, compensation matrices, panel design support. MSc Microbiology (India), arrived Canada 2023 on PGWP. Looking for an industry tech role in QC or cell biology where my training-and-troubleshoot skill set translates well.",
      linkedin_follow: "Yes, I'm following the LinkedIn page",
      comments: "Open work permit valid through 2027. Open to relocation across the prairies / GTA.",
      consent: CONSENT,
    },
  },
  {
    label: "Jasmine — PhD candidate, genomics (U Toronto)",
    values: {
      first_name: "Jasmine", last_name: "Park",
      email: "jasmine.p.demo@biohubnet.test",
      applicant_id: "BHTAA0954",
      current_position: "PhD candidate",
      earliest_availability: "2027-01-10",
      linkedin: "https://linkedin.com/in/jasmine-park-genomics",
      status_goal: "Current student searching for internship opportunities",
      locations: ["Ontario", "Quebec", "British Columbia", "Remote / hybrid Canada-wide"],
      citizenship: ["Canadian Citizen"],
      french_speaking: "Basic", french_reading: "Intermediate", french_writing: "Basic",
      thesis_or_contract_date: "2028-04-30",
      program_url: "https://www.utoronto.ca/graduate/molecular-genetics",
      pitch: "Fourth-year PhD candidate in molecular genetics at U of T. Single-cell RNA-seq pipelines (Cell Ranger, Scanpy, Seurat), CRISPR screen design and analysis, daily Python + R for variant scoring. Strong bioinformatics + wet-lab combo — ran my own CRISPR knockout panels in primary HSCs. Looking for an internship at a discovery-stage biotech to translate academic methods into a commercial pipeline.",
      linkedin_follow: "Yes, I'm following the LinkedIn page",
      comments: "Open to part-time during winter term, full-time summer 2027.",
      consent: CONSENT,
    },
  },
];

// ── Internship Posting ───────────────────────────────────────────
export interface PostingPreset {
  companyName?: string;
  website?: string;
  title?: string;
  duration?: string;
  hours?: string;
  location?: string;
  type?: string;
  compensation?: string;
  deadline?: string; // YYYY-MM-DD
  keySkills?: string[];
  positionDetails?: string;
  status?: string;
}

function deadlineDaysFromNow(days: number) {
  const d = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  return d.toISOString().slice(0, 10);
}

export const POSTING_PRESETS: { label: string; values: PostingPreset }[] = [
  {
    label: "Bioprocess Development Intern",
    values: {
      companyName: "Acme Biotherapeutics",
      website: "https://acme-bio.test",
      title: "Bioprocess Development Intern",
      duration: "4 months",
      hours: "Full-time · 40 hrs/week",
      location: "Toronto, ON (hybrid)",
      type: "Internship / Co-op",
      compensation: "$25/hr",
      deadline: deadlineDaysFromNow(45),
      keySkills: ["Cell Culture", "Aseptic Technique", "GMP", "HPLC", "Python"],
      positionDetails: "We're hiring a Bioprocess Development Intern to support our Toronto pilot plant. Work alongside senior scientists on USP/DSP optimisation for a Phase II monoclonal-antibody candidate. You'll run controlled bioreactor experiments, contribute to GMP documentation, and assist with analytical method development.\n\nYou'll learn: end-to-end bioprocess scale-up from 2L → 200L, ELISA / HPLC method qualification, statistical DOE for media optimisation, and how a clinical-stage biotech actually runs.\n\nWe're looking for: a graduate or upper-year undergraduate in BME / chemical engineering / biotech, hands-on bench experience, comfort with sterile technique, and curiosity about scaling biology. Bonus: any exposure to QbD or process modelling.",
      status: "active",
    },
  },
  {
    label: "QC Analyst Co-op",
    values: {
      companyName: "Northstar Vaccines",
      website: "https://northstar-vaccines.test",
      title: "QC Analyst Co-op",
      duration: "8 months",
      hours: "Full-time · 37.5 hrs/week",
      location: "Montreal, QC (on-site)",
      type: "Co-op",
      compensation: "$22/hr",
      deadline: deadlineDaysFromNow(30),
      keySkills: ["ELISA", "HPLC", "GMP", "Quality Control", "Aseptic Technique"],
      positionDetails: "Northstar Vaccines is recruiting a QC Analyst Co-op to support release testing of our seasonal influenza vaccine line. You'll run ELISA, HPLC, and bioassay protocols against established methods, document results in EBR, and participate in OOS / OOT investigations under direct mentorship of senior analysts.\n\nWe're looking for: an undergraduate in life sciences with a strong analytical chemistry foundation, attention to detail, and comfort working in BSL-2 / cleanroom environments. Bilingual French an asset; not required.",
      status: "active",
    },
  },
  {
    label: "Cell & Gene Therapy Process Scientist",
    values: {
      companyName: "Helix Cell Therapeutics",
      website: "https://helix-cgt.test",
      title: "Cell & Gene Therapy Process Scientist",
      duration: "Permanent",
      hours: "Full-time · 40 hrs/week",
      location: "Vancouver, BC (on-site)",
      type: "Full-time",
      compensation: "$85,000 – $110,000",
      deadline: deadlineDaysFromNow(60),
      keySkills: ["Cell Therapy", "CAR-T", "Aseptic Technique", "GMP Documentation", "Tech Transfer"],
      positionDetails: "Helix is scaling a CAR-T candidate from R&D into Phase I and we're hiring a Process Scientist to drive tech-transfer. You'll own SOPs from bench to GMP suite, qualify equipment, train manufacturing operators, and partner with QA on PPQ.\n\nMust have: 3+ years cell therapy / autologous experience, fluency with closed-system processing (CliniMACS, Cocoon, Sefia, or similar), and demonstrated ownership of tech transfer. Nice to have: previous IND filing experience.",
      status: "active",
    },
  },
  {
    label: "Regulatory Affairs Coordinator",
    values: {
      companyName: "Meridian Pharma",
      website: "https://meridian-pharma.test",
      title: "Regulatory Affairs Coordinator",
      duration: "12 months (contract, possibility to convert)",
      hours: "Full-time · 40 hrs/week",
      location: "Mississauga, ON (hybrid)",
      type: "Contract",
      compensation: "$65,000 – $80,000",
      deadline: deadlineDaysFromNow(21),
      keySkills: ["Regulatory Affairs", "FDA Submissions", "Health Canada Submissions", "Technical Writing", "Pharmacovigilance"],
      positionDetails: "Meridian's regulatory team is expanding to support three concurrent product submissions and we're hiring a Regulatory Affairs Coordinator. You'll prepare CTAs, maintain regulatory dossiers, draft module 2/3 sections, coordinate with global agencies, and own pharmacovigilance reporting.\n\nWe're looking for: 1-3 years RA experience, strong technical writing, familiarity with eCTD, and either a science degree or RA diploma. Health Canada submission experience preferred.",
      status: "active",
    },
  },
  {
    label: "Bioinformatics Analyst",
    values: {
      companyName: "Lumi Discovery",
      website: "https://lumi-discovery.test",
      title: "Bioinformatics Analyst",
      duration: "Permanent",
      hours: "Full-time · remote-first",
      location: "Remote (Canada)",
      type: "Full-time",
      compensation: "$72,000 – $95,000",
      deadline: deadlineDaysFromNow(40),
      keySkills: ["Python", "R Programming", "Bioinformatics", "Statistical Analysis", "Machine Learning"],
      positionDetails: "Lumi is a small platform-biology team building ML models for target discovery. We need a Bioinformatics Analyst to wrangle multi-omic datasets, build reproducible pipelines (Snakemake / Nextflow), and prototype ML workflows for variant scoring.\n\nWe're looking for: strong Python + R + SQL, comfort in Linux / cloud, prior pharma or biotech experience, and a portfolio (GitHub or otherwise). The team is small and remote-first; you'll have direct exposure to founders and clients.",
      status: "active",
    },
  },
];

// ── Course (admin form) ──────────────────────────────────────────
export interface CoursePreset {
  title?: string;
  description?: string;
  category?: string;
  topic?: string;
  delivery?: string;
  provider?: string;
  duration?: number;     // minutes
  passingScore?: number;
  creditCost?: number;
  isSpecial?: boolean;
}

export const COURSE_PRESETS: { label: string; values: CoursePreset }[] = [
  {
    label: "Bioreactor Fundamentals (4 hr async)",
    values: {
      title: "Bioreactor Fundamentals",
      description: "Foundational course on stirred-tank bioreactor operation, scale-up considerations, and basic process control. Covers seed-train design, dissolved-oxygen and pH control, sampling strategy, and contamination prevention. Hands-on simulator exercises.",
      category: "Bioprocess",
      topic: "Bioprocess Engineering",
      delivery: "Asynchronous",
      provider: "CASTL",
      duration: 240,
      passingScore: 80,
      creditCost: 50,
    },
  },
  {
    label: "GMP Documentation Essentials",
    values: {
      title: "GMP Documentation Essentials",
      description: "Practical training on writing and reviewing master batch records, executed batch records, deviations, and CAPA documents. Includes mock document reviews and audit-readiness checks.",
      category: "Quality",
      topic: "Quality Assurance",
      delivery: "Online",
      provider: "BioTalent Canada",
      duration: 360,
      passingScore: 80,
      creditCost: 75,
    },
  },
  {
    label: "Aseptic Gowning Workshop",
    values: {
      title: "Aseptic Gowning & Cleanroom Behaviour",
      description: "In-person workshop covering Grade A/B gowning, glove qualification, and cleanroom behaviour. Each participant qualifies on three independent gowning attempts under instructor observation.",
      category: "Bioprocess",
      topic: "Aseptic Technique",
      delivery: "In-Person",
      provider: "CASTL",
      duration: 480,
      passingScore: 100,
      creditCost: 200,
      isSpecial: true,
    },
  },
  {
    label: "MSL Accelerator (Medical Affairs)",
    values: {
      title: "MSL Accelerator",
      description: "2-day intensive in Toronto preparing scientists for the Medical Science Liaison transition. Includes clinical communication, KOL engagement strategy, scientific platform building, and field-medical career planning. Co-delivered with Agilis Health.",
      category: "Medical Affairs",
      topic: "Medical Affairs",
      delivery: "Blended",
      provider: "Agilis Health",
      duration: 960,
      passingScore: 75,
      creditCost: 1500,
      isSpecial: true,
    },
  },
  {
    label: "Python for Bioprocess Data",
    values: {
      title: "Python for Bioprocess Data",
      description: "Self-paced course teaching pandas, statsmodels, and scikit-learn through real bioprocess datasets. Final project: build a multivariate model predicting titre from process parameters. Suitable for beginners with some Excel exposure.",
      category: "Data",
      topic: "Bioprocess Data Analysis",
      delivery: "Asynchronous",
      provider: "CASTL",
      duration: 1200,
      passingScore: 75,
      creditCost: 100,
    },
  },
];

// ── Employer Profile ─────────────────────────────────────────────
export interface EmployerProfilePreset {
  employerCompany?: string;
  companyWebsite?: string;
  companyIndustry?: string;
  companySize?: string;
  companyLocation?: string;
  companyDescription?: string;
  companyFounded?: string;
}

export const EMPLOYER_PROFILE_PRESETS: { label: string; values: EmployerProfilePreset }[] = [
  {
    label: "Acme Biotherapeutics — clinical-stage biotech",
    values: {
      employerCompany: "Acme Biotherapeutics",
      companyWebsite: "https://acme-bio.test",
      companyIndustry: "Biotechnology",
      companySize: "51-200",
      companyLocation: "Toronto, ON",
      companyDescription: "Acme is a clinical-stage biotech advancing a Phase II monoclonal antibody for autoimmune disease. We've raised $80M and are building out our process development and clinical operations teams.",
      companyFounded: "2018",
    },
  },
  {
    label: "Northstar Vaccines — manufacturing",
    values: {
      employerCompany: "Northstar Vaccines",
      companyWebsite: "https://northstar-vaccines.test",
      companyIndustry: "Vaccines / Manufacturing",
      companySize: "201-500",
      companyLocation: "Montreal, QC",
      companyDescription: "Northstar manufactures seasonal and pandemic-preparedness vaccines for the Canadian and US markets. Our Montreal facility runs 24/7 and is licensed for Health Canada and FDA release.",
      companyFounded: "2005",
    },
  },
  {
    label: "Helix Cell Therapeutics — early-stage CGT",
    values: {
      employerCompany: "Helix Cell Therapeutics",
      companyWebsite: "https://helix-cgt.test",
      companyIndustry: "Cell & Gene Therapy",
      companySize: "11-50",
      companyLocation: "Vancouver, BC",
      companyDescription: "Helix is a Series-A cell therapy company developing autologous CAR-T candidates for hematologic malignancies. Our 30-person team includes leadership from veteran CGT companies and we're scaling rapidly toward IND.",
      companyFounded: "2021",
    },
  },
  {
    label: "Lumi Discovery — platform biology",
    values: {
      employerCompany: "Lumi Discovery",
      companyWebsite: "https://lumi-discovery.test",
      companyIndustry: "Platform Biology / AI",
      companySize: "11-50",
      companyLocation: "Remote (HQ Toronto)",
      companyDescription: "Lumi is a remote-first platform-biology company applying machine learning to multi-omic datasets for target discovery. We partner with three pharma companies and are building out our discovery and bioinformatics teams.",
      companyFounded: "2022",
    },
  },
  {
    label: "Meridian Pharma — established mid-market",
    values: {
      employerCompany: "Meridian Pharma",
      companyWebsite: "https://meridian-pharma.test",
      companyIndustry: "Pharmaceuticals",
      companySize: "501-1000",
      companyLocation: "Mississauga, ON",
      companyDescription: "Meridian is a mid-market specialty pharma with a portfolio of approved respiratory and CNS products. Our Mississauga campus houses R&D, regulatory affairs, and a small commercial-scale fill / finish facility.",
      companyFounded: "1992",
    },
  },
];

// ── Trainee Basic Profile ────────────────────────────────────────
export interface TraineeProfilePreset {
  name?: string;
  bio?: string;
  organization?: string;
  jobTitle?: string;
  country?: string;
}

export const TRAINEE_PROFILE_PRESETS: { label: string; values: TraineeProfilePreset }[] = [
  {
    label: "Avery — masters student",
    values: {
      name: "Avery Chen",
      bio: "Master's student in Biomedical Engineering interested in bioprocess scale-up and ML-augmented process control.",
      organization: "University of Toronto",
      jobTitle: "Graduate student",
      country: "Canada",
    },
  },
  {
    label: "Priya — recent PhD in regulatory",
    values: {
      name: "Priya Ramachandran",
      bio: "Recent PhD in molecular biology with three years of CMC documentation experience supporting an early-stage gene therapy. Looking to move into industry regulatory affairs.",
      organization: "McGill University",
      jobTitle: "Postdoc / regulatory affairs candidate",
      country: "Canada",
    },
  },
  {
    label: "Mark — career switcher",
    values: {
      name: "Mark Sullivan",
      bio: "Six years as a Python data engineer at a fintech, completing the BHN biomanufacturing fundamentals + bioprocess data analysis pathways.",
      organization: "Self-directed (career change)",
      jobTitle: "Bioprocess data analyst (in training)",
      country: "Canada",
    },
  },
  {
    label: "Sarah — undergraduate co-op",
    values: {
      name: "Sarah Liang",
      bio: "Third-year biology undergraduate at McGill. Previous co-op was QC analyst at a vaccine manufacturer.",
      organization: "McGill University",
      jobTitle: "Co-op student",
      country: "Canada",
    },
  },
  {
    label: "Diego — postdoc",
    values: {
      name: "Diego Morales",
      bio: "Wrapping up a postdoc on AAV capsid engineering, ready for a process-development role in advanced therapy.",
      organization: "University of British Columbia",
      jobTitle: "Postdoctoral fellow",
      country: "Canada",
    },
  },
];
