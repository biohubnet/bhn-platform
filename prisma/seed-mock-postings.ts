/**
 * Mock internship postings, so "Upcoming opportunities" on the trainee
 * home and the /internships board have something in them before real
 * host companies post.
 *
 * Run with:  npx tsx prisma/seed-mock-postings.ts
 * Remove with: npx tsx prisma/seed-mock-postings.ts --clear
 *
 * Ids are stable and prefixed `mock-posting-`, so re-running updates the
 * same rows and --clear takes exactly these away and nothing else.
 *
 * These are NOT flagged isDemoSeed: that flag belongs to the employer
 * sandbox tool, and rows carrying it are filtered out of the dashboard.
 * These are meant to be seen.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const ID = (slug: string) => `mock-posting-${slug}`;
/** Calendar day, UTC midnight — the shape the rest of the app reads. */
const day = (iso: string) => new Date(`${iso}T00:00:00Z`);

const POSTINGS = [
  {
    id: ID("omniabio-cell-therapy-manufacturing"),
    companyName: "OmniaBio",
    title: "Cell Therapy Manufacturing Intern",
    location: "Hamilton, ON",
    type: "Internship · 8 months",
    duration: "8 months",
    hours: "Full-time, 37.5 h/week",
    compensation: "$24/hour",
    deadline: day("2026-10-15"),
    keySkills: ["Aseptic technique", "GMP", "Cell culture", "Batch records"],
    positionDetails:
      "Join OmniaBio's GMP manufacturing team on a commercial-scale cell therapy floor. You will run unit operations under supervision, keep batch records to GMP standard, and support tech transfer from process development. Suited to a graduate student or recent graduate in biology, biochemistry or biomedical engineering.",
  },
  {
    id: ID("eurofins-alphora-analytical"),
    companyName: "Eurofins CDMO Alphora",
    title: "Analytical Development Intern",
    location: "Mississauga, ON",
    type: "Internship · 6 months",
    duration: "6 months",
    hours: "Full-time",
    compensation: "$23/hour",
    deadline: day("2026-10-31"),
    keySkills: ["HPLC", "Method validation", "GLP", "Data analysis"],
    positionDetails:
      "Support method development and validation for small-molecule programmes: run HPLC and UPLC assays, write up results to GLP standard, and help qualify methods for client submissions. Good fit for an MSc or PhD student in analytical or organic chemistry.",
  },
  {
    id: ID("biozone-bioprocess"),
    companyName: "BioZone, University of Toronto",
    title: "Bioprocess Engineering Intern",
    location: "Toronto, ON",
    type: "Internship · 4 months",
    duration: "4 months",
    hours: "Full-time",
    compensation: "$22/hour",
    deadline: day("2026-11-14"),
    keySkills: ["Bioreactors", "Fermentation", "Process data", "Python"],
    positionDetails:
      "Run bench-scale bioreactors and help scale a fermentation process from 2 L to 30 L. You will plan runs, collect and analyse process data, and present findings to the lab. Engineering, microbiology or biotechnology background.",
  },
  {
    id: ID("apotex-regulatory-affairs"),
    companyName: "Apotex",
    title: "Regulatory Affairs Intern",
    location: "Toronto, ON (hybrid)",
    type: "Internship · 12 months",
    duration: "12 months",
    hours: "Full-time",
    compensation: "$25/hour",
    deadline: day("2026-11-28"),
    keySkills: ["Health Canada submissions", "Technical writing", "eCTD", "Literature review"],
    positionDetails:
      "Help prepare and track Health Canada submissions: compile modules, keep submission trackers current, and summarise guidance changes for the team. Strong writing and attention to detail matter more than prior regulatory experience.",
  },
  {
    id: ID("sanofi-quality-assurance"),
    companyName: "Sanofi Canada",
    title: "Quality Assurance Intern",
    location: "Toronto, ON",
    type: "Internship · 8 months",
    duration: "8 months",
    hours: "Full-time",
    compensation: "$26/hour",
    deadline: day("2026-12-12"),
    keySkills: ["Deviations", "CAPA", "Document control", "GMP"],
    positionDetails:
      "Work alongside QA on a vaccine manufacturing site: review batch documentation, support deviation and CAPA investigations, and help keep controlled documents current. Life-sciences background and a methodical streak.",
  },
  {
    id: ID("bhn-medical-affairs-fellow"),
    companyName: "BioHubNet partner network",
    title: "Medical Affairs Fellow",
    location: "Remote (Ontario)",
    type: "Fellowship · 6 months",
    duration: "6 months",
    hours: "Part-time, 20 h/week",
    compensation: "Stipend",
    deadline: null,
    keySkills: ["Scientific communication", "Evidence review", "Slide design", "KOL engagement"],
    positionDetails:
      "A part-time fellowship for PhD students and postdocs curious about medical affairs. You will review published evidence, build scientific slide decks, and sit in on advisory board preparation with a host company matched to your therapeutic area.",
  },
];

async function main() {
  const host = new URL(process.env.DATABASE_URL ?? "postgres://nowhere").host;
  if (!/supabase\.com|localhost|127\.0\.0\.1/.test(host)) {
    throw new Error(`Refusing to write — unexpected DB host: ${host}`);
  }

  if (process.argv.includes("--clear")) {
    const { count } = await prisma.internshipPosting.deleteMany({
      where: { id: { startsWith: "mock-posting-" } },
    });
    console.log(`Removed ${count} mock postings.`);
    return;
  }

  for (const p of POSTINGS) {
    const { id, ...data } = p;
    await prisma.internshipPosting.upsert({
      where: { id },
      create: { id, ...data, status: "active", isDemoSeed: false },
      update: { ...data, status: "active", isDemoSeed: false },
    });
  }
  console.log(`Seeded ${POSTINGS.length} mock postings.`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
