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

export const TALENT_APPLICATION_PRESETS: { label: string; values: TalentApplicationPreset }[] = [
  {
    label: "Avery — bioprocess masters student",
    values: {
      first_name: "Avery", last_name: "Chen",
      applicant_id: "BHTAA0042",
      current_position: "Graduate Program",
      earliest_availability: "2026-09-01",
      linkedin: "linkedin.com/in/avery-chen-test",
      status_goal: "Current student searching for internship opportunities",
      locations: ["Ontario", "Quebec", "Remote / hybrid Canada-wide"],
      citizenship: ["Canadian Citizen"],
      french_speaking: "Intermediate", french_reading: "Advanced", french_writing: "Intermediate",
      thesis_or_contract_date: "2027-04-30",
      program_url: "https://www.utoronto.ca/graduate/programs/bme",
      pitch: "Master's student in Biomedical Engineering at U of T with hands-on experience in mammalian cell culture, USP/DSP optimisation, and quality control. Built fluency in aseptic technique, bioreactor operation, and Python data analysis through three lab rotations. Drawn to regulated process development and applying ML to bioprocess optimisation.",
      linkedin_follow: "Yes, I'm following the LinkedIn page",
      comments: "Available to start mid-September after thesis defence.",
      consent: ["I have read and agreed to the privacy notice and terms above."],
    },
  },
  {
    label: "Priya — recent PhD, regulatory track",
    values: {
      first_name: "Priya", last_name: "Ramachandran",
      applicant_id: "BHTAA0118",
      current_position: "Recently graduated",
      earliest_availability: "2026-07-01",
      linkedin: "linkedin.com/in/priya-ramachandran",
      status_goal: "Recently graduated, open to full-time roles",
      locations: ["Ontario", "British Columbia"],
      citizenship: ["Canadian Permanent Resident"],
      french_speaking: "Beginner",
      thesis_or_contract_date: "2026-06-01",
      pitch: "PhD in molecular biology with three years of CMC documentation experience supporting an early-stage gene therapy. Comfortable navigating Health Canada CTAs, FDA pre-IND meetings, and writing regulatory submissions. Looking to move from academic research into industry regulatory affairs or medical writing.",
      consent: ["I have read and agreed to the privacy notice and terms above."],
    },
  },
  {
    label: "Mark — career switcher from tech",
    values: {
      first_name: "Mark", last_name: "Sullivan",
      current_position: "Career changer",
      earliest_availability: "2026-08-15",
      linkedin: "linkedin.com/in/marksullivan",
      status_goal: "Pivoting from software into bio — open to anything entry-level",
      locations: ["Quebec", "Remote / hybrid Canada-wide"],
      citizenship: ["Canadian Citizen"],
      french_speaking: "Advanced", french_reading: "Advanced", french_writing: "Advanced",
      pitch: "Six years as a Python data engineer at a fintech, completing the BHN biomanufacturing fundamentals + bioprocess data analysis pathways. Strong analytical foundation, quick study with bench techniques in the BHN workshops. Looking for a junior process scientist or bioprocess data analyst role where ML meets the lab.",
      consent: ["I have read and agreed to the privacy notice and terms above."],
    },
  },
  {
    label: "Sarah — undergraduate co-op",
    values: {
      first_name: "Sarah", last_name: "Liang",
      current_position: "Graduate Program",
      earliest_availability: "2026-09-15",
      linkedin: "linkedin.com/in/sarah-liang-co-op",
      status_goal: "Current student searching for internship opportunities",
      locations: ["Ontario", "Quebec"],
      citizenship: ["Canadian Citizen"],
      thesis_or_contract_date: "2027-12-15",
      program_url: "https://www.mcgill.ca/biology",
      pitch: "Third-year biology undergraduate at McGill looking for my second co-op term. Previous co-op was QC analyst at a vaccine manufacturer — ELISA, plate reading, batch documentation. Comfortable in BSL-2 environments and clean rooms. Interested in either QC or upstream cell culture for next term.",
      consent: ["I have read and agreed to the privacy notice and terms above."],
    },
  },
  {
    label: "Diego — postdoc seeking industry pivot",
    values: {
      first_name: "Diego", last_name: "Morales",
      current_position: "Recently graduated",
      earliest_availability: "2026-10-01",
      linkedin: "linkedin.com/in/diego-morales-postdoc",
      status_goal: "Recently graduated, open to full-time roles",
      locations: ["Ontario", "Quebec", "British Columbia"],
      citizenship: ["Canadian Permanent Resident"],
      pitch: "Wrapping up a postdoc on AAV capsid engineering and ready for a process-development role in advanced therapy. Strengths: vector design, transient transfection scale-up to 10L, analytical method development for empty/full ratio. Looking for senior scientist or PD scientist roles in cell + gene therapy.",
      consent: ["I have read and agreed to the privacy notice and terms above."],
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
