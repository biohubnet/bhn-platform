/**
 * Starter biomanufacturing skill catalog. ~80 skills curated from
 * existing course descriptions, common job-board postings, and
 * BioTalent Canada / CASTL competency frameworks.
 *
 * Each entry has: canonical name, optional category, common aliases.
 * The seed runs on first /admin/skills hit — idempotent. Admins can
 * extend the list afterwards from the curation page.
 */

export interface SkillSeed {
  name: string;
  category: string;
  description?: string;
  aliases?: string[];
}

export const SKILL_SEED: SkillSeed[] = [
  // ── Bioprocess / Manufacturing ──────────────────────────────────
  { name: "Cell Culture", category: "Bioprocess", aliases: ["mammalian cell culture", "cell culture techniques"] },
  { name: "Mammalian Cell Culture", category: "Bioprocess", aliases: ["CHO cells", "HEK293", "mammalian cells"] },
  { name: "Microbial Fermentation", category: "Bioprocess", aliases: ["fermentation", "E. coli fermentation", "yeast fermentation"] },
  { name: "Upstream Processing", category: "Bioprocess", description: "Bioreactor operation, media prep, seed train, scale-up", aliases: ["USP", "upstream", "upstream bioprocessing"] },
  { name: "Downstream Processing", category: "Bioprocess", description: "Purification, chromatography, filtration, formulation", aliases: ["DSP", "downstream", "downstream bioprocessing", "purification"] },
  { name: "Bioreactor Operation", category: "Bioprocess", aliases: ["bioreactors", "fermenter operation"] },
  { name: "Process Development", category: "Bioprocess", aliases: ["bioprocess development", "PD"] },
  { name: "Process Scale-Up", category: "Bioprocess", aliases: ["scale-up", "scale up", "scaleup"] },
  { name: "Aseptic Technique", category: "Bioprocess", aliases: ["sterile technique", "aseptic processing"] },
  { name: "Cleanroom Operations", category: "Bioprocess", aliases: ["cleanroom", "controlled environment", "ISO classified rooms"] },
  { name: "Cleanroom Gowning", category: "Bioprocess", aliases: ["gowning", "cleanroom dressing"] },
  { name: "Media Preparation", category: "Bioprocess", aliases: ["media prep", "buffer preparation"] },
  { name: "Single-Use Systems", category: "Bioprocess", aliases: ["single use technology", "disposable bioreactors", "SUS"] },

  // ── Analytical / QC ─────────────────────────────────────────────
  { name: "ELISA", category: "Analytical", aliases: ["enzyme-linked immunosorbent assay"] },
  { name: "HPLC", category: "Analytical", aliases: ["high performance liquid chromatography", "high-performance liquid chromatography"] },
  { name: "UPLC", category: "Analytical", aliases: ["ultra performance liquid chromatography"] },
  { name: "Mass Spectrometry", category: "Analytical", aliases: ["LC-MS", "mass spec", "MS"] },
  { name: "Western Blot", category: "Analytical", aliases: ["western blotting", "immunoblot"] },
  { name: "PCR", category: "Analytical", aliases: ["polymerase chain reaction", "qPCR", "RT-PCR"] },
  { name: "Flow Cytometry", category: "Analytical", aliases: ["FACS", "cytometry"] },
  { name: "Cell-Based Assays", category: "Analytical", aliases: ["potency assays", "bioassays"] },
  { name: "Method Development", category: "Analytical", aliases: ["analytical method development", "AMD"] },
  { name: "Method Qualification", category: "Analytical", aliases: ["method validation", "MV"] },
  { name: "Stability Testing", category: "Analytical", aliases: ["stability studies", "ICH stability"] },

  // ── Quality / Regulatory ────────────────────────────────────────
  { name: "GMP", category: "Quality", description: "Good Manufacturing Practice", aliases: ["good manufacturing practice", "cGMP", "current GMP"] },
  { name: "GLP", category: "Quality", aliases: ["good laboratory practice"] },
  { name: "GxP", category: "Quality", aliases: ["good practice", "regulated environment"] },
  { name: "GMP Documentation", category: "Quality", aliases: ["batch records", "MBR", "EBR"] },
  { name: "Quality Assurance", category: "Quality", aliases: ["QA"] },
  { name: "Quality Control", category: "Quality", aliases: ["QC"] },
  { name: "Quality Management Systems", category: "Quality", aliases: ["QMS"] },
  { name: "Deviation Investigation", category: "Quality", aliases: ["CAPA", "root cause analysis", "RCA"] },
  { name: "Change Control", category: "Quality", aliases: ["change management"] },
  { name: "Validation", category: "Quality", aliases: ["process validation", "PPQ", "qualification"] },
  { name: "Equipment Qualification", category: "Quality", aliases: ["IQ OQ PQ", "IQ/OQ/PQ"] },
  { name: "Quality by Design", category: "Quality", aliases: ["QbD"] },
  { name: "Regulatory Affairs", category: "Regulatory", aliases: ["RA"] },
  { name: "FDA Submissions", category: "Regulatory", aliases: ["IND", "BLA", "NDA"] },
  { name: "Health Canada Submissions", category: "Regulatory", aliases: ["CTA", "NOC"] },
  { name: "EMA Submissions", category: "Regulatory", aliases: ["MAA"] },
  { name: "Pharmacovigilance", category: "Regulatory", aliases: ["PV", "safety reporting"] },

  // ── Clinical / Medical Affairs ─────────────────────────────────
  { name: "Clinical Trials", category: "Clinical", aliases: ["clinical research", "clinical study"] },
  { name: "Clinical Operations", category: "Clinical", aliases: ["ClinOps"] },
  { name: "Medical Affairs", category: "Clinical", aliases: ["MA"] },
  { name: "Medical Science Liaison", category: "Clinical", aliases: ["MSL"] },
  { name: "Health Economics", category: "Clinical", aliases: ["HEOR", "health outcomes research"] },
  { name: "Real-World Evidence", category: "Clinical", aliases: ["RWE", "real world data", "RWD"] },

  // ── Data / Computational ────────────────────────────────────────
  { name: "Python", category: "Data", aliases: ["python programming"] },
  { name: "R Programming", category: "Data", aliases: ["R", "R language"] },
  { name: "SQL", category: "Data", aliases: ["structured query language"] },
  { name: "Statistical Analysis", category: "Data", aliases: ["statistics", "biostatistics"] },
  { name: "Design of Experiments", category: "Data", aliases: ["DOE", "experimental design"] },
  { name: "Data Visualization", category: "Data", aliases: ["data viz", "dashboards"] },
  { name: "Machine Learning", category: "Data", aliases: ["ML", "AI"] },
  { name: "Bioinformatics", category: "Data", aliases: ["computational biology"] },
  { name: "Process Modelling", category: "Data", aliases: ["bioprocess modelling", "kinetic modelling"] },

  // ── Cell & Gene / Advanced Therapy ─────────────────────────────
  { name: "Cell Therapy", category: "Advanced Therapy", aliases: ["CGT cell", "cellular therapy"] },
  { name: "Gene Therapy", category: "Advanced Therapy", aliases: ["AAV", "lentiviral vector", "viral vector"] },
  { name: "CAR-T", category: "Advanced Therapy", aliases: ["CAR T cell", "chimeric antigen receptor"] },
  { name: "mRNA Therapeutics", category: "Advanced Therapy", aliases: ["mRNA", "lipid nanoparticles", "LNP"] },
  { name: "Monoclonal Antibodies", category: "Advanced Therapy", aliases: ["mAb", "biologics"] },
  { name: "Vaccines", category: "Advanced Therapy", aliases: ["vaccine development"] },

  // ── Operations / Supply Chain ───────────────────────────────────
  { name: "Supply Chain Management", category: "Operations", aliases: ["SCM", "logistics"] },
  { name: "Materials Management", category: "Operations", aliases: ["inventory management", "warehousing"] },
  { name: "Project Management", category: "Operations", aliases: ["PM", "PMP"] },
  { name: "Lean Six Sigma", category: "Operations", aliases: ["six sigma", "lean", "continuous improvement"] },
  { name: "Tech Transfer", category: "Operations", aliases: ["technology transfer", "tech transfer to manufacturing"] },

  // ── Soft skills / Career ───────────────────────────────────────
  { name: "Technical Writing", category: "Communication", aliases: ["scientific writing", "SOP writing"] },
  { name: "Cross-Functional Collaboration", category: "Communication", aliases: ["team collaboration", "stakeholder management"] },
  { name: "Mentorship", category: "Communication", aliases: ["mentoring", "coaching"] },
  { name: "Problem Solving", category: "Communication", aliases: ["analytical thinking", "critical thinking"] },
  { name: "Entrepreneurship", category: "Career", aliases: ["startup experience", "founder", "venture building"] },
  { name: "Business Development", category: "Career", aliases: ["BD", "biz dev", "partnerships"] },
  { name: "Grant Writing", category: "Career", aliases: ["funding applications"] },
  { name: "Intellectual Property", category: "Career", aliases: ["IP", "patents"] },

  // ── Safety / EHS ────────────────────────────────────────────────
  { name: "Biosafety", category: "Safety", aliases: ["BSL-2", "biological safety"] },
  { name: "Chemical Safety", category: "Safety", aliases: ["WHMIS", "chemical handling"] },
  { name: "Lab Safety", category: "Safety", aliases: ["laboratory safety", "EHS"] },

  // ── Languages ───────────────────────────────────────────────────
  { name: "French (Working)", category: "Language", aliases: ["French language", "bilingual French"] },
  { name: "English (Working)", category: "Language", aliases: ["English language"] },
];
