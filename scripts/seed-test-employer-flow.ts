/* Create dummy data for end-to-end testing of the Employer HR flow:
 *   • One Employer HR user
 *   • One Trainee user
 *   • One InternshipPosting created by the employer
 *   • One Talent Application submission by the trainee
 *
 * All four are gated by their stable identifiers (email / title) so this
 * script is safe to re-run — it'll skip anything that already exists.
 *
 * Run:
 *   npx tsx scripts/seed-test-employer-flow.ts            # create
 *   npx tsx scripts/seed-test-employer-flow.ts --cleanup  # remove
 *
 * Test accounts (after running):
 *   Employer: test.employer@biohubnet.test  /  test1234
 *   Trainee:  test.trainee@biohubnet.test   /  test1234
 *
 * Note: the talent-application form must exist (visit /forms/talent-application
 * once on a fresh deploy or it auto-provisions on /pathways too).
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();
const cleanup = process.argv.includes("--cleanup");

const EMPLOYER_EMAIL = "test.employer@biohubnet.test";
const TRAINEE_EMAIL = "test.trainee@biohubnet.test";
const POSTING_TITLE = "Bioprocess Development Intern (Test)";

async function main() {
  if (cleanup) {
    return doCleanup();
  }

  // 1. Employer HR user
  const employer = await prisma.user.upsert({
    where: { email: EMPLOYER_EMAIL },
    update: {
      role: "employer",
      employerCompany: "Acme Biotherapeutics",
      allowPlatformContent: false,
    },
    create: {
      email: EMPLOYER_EMAIL,
      name: "Sam Eldridge",
      password: await bcrypt.hash("test1234", 10),
      role: "employer",
      employerCompany: "Acme Biotherapeutics",
      allowPlatformContent: false,
      emailVerified: new Date(),
      isActive: true,
    },
  });
  console.log(`✓ employer  ${employer.email} (id ${employer.id})`);

  // 2. Trainee user
  const trainee = await prisma.user.upsert({
    where: { email: TRAINEE_EMAIL },
    update: { role: "trainee" },
    create: {
      email: TRAINEE_EMAIL,
      name: "Avery Chen",
      password: await bcrypt.hash("test1234", 10),
      role: "trainee",
      emailVerified: new Date(),
      isActive: true,
    },
  });
  console.log(`✓ trainee   ${trainee.email} (id ${trainee.id})`);

  // 3. Internship posting attributed to the employer
  let posting = await prisma.internshipPosting.findFirst({
    where: { title: POSTING_TITLE, createdById: employer.id },
  });
  if (!posting) {
    posting = await prisma.internshipPosting.create({
      data: {
        companyName: "Acme Biotherapeutics",
        website: "https://acme-bio.test",
        title: POSTING_TITLE,
        duration: "4 months",
        hours: "Full-time · 40 hrs/week",
        location: "Toronto, ON (hybrid)",
        type: "Internship / Co-op",
        compensation: "$25/hr",
        deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        keySkills: [
          "Cell Culture",
          "Bioprocess Development",
          "Aseptic Technique",
          "GMP",
          "Python data analysis",
        ],
        positionDetails:
          "Acme Biotherapeutics is hiring a Bioprocess Development Intern to support our Toronto pilot plant. You'll work alongside senior scientists on USP/DSP optimisation for a Phase II monoclonal-antibody candidate, run controlled bioreactor experiments, contribute to GMP documentation, and assist with analytical method development.\n\nYou'll learn: end-to-end bioprocess scale-up from 2L → 200L, ELISA / HPLC method qualification, statistical DOE for media optimisation, and how a clinical-stage biotech actually runs.\n\nWe're looking for: a graduate or upper-year undergraduate in BME / chemical engineering / biotech, hands-on bench experience, comfort with sterile technique, and curiosity about scaling biology. Bonus: any exposure to QbD or process modelling.",
        status: "active",
        createdById: employer.id,
      },
    });
    console.log(`✓ posting   "${posting.title}" (id ${posting.id})`);
  } else {
    console.log(`= posting   "${posting.title}" already exists (id ${posting.id})`);
  }

  // 4. Talent Application submission by the trainee
  const form = await prisma.eventForm.findUnique({
    where: { slug: "talent-application" },
    select: { id: true },
  });
  if (!form) {
    console.error(
      "× talent-application form not found in DB. Visit /forms/talent-application or /pathways once to auto-provision, then re-run this script."
    );
    process.exit(1);
  }

  const existingSub = await prisma.eventFormSubmission.findFirst({
    where: { formId: form.id, userId: trainee.id },
  });
  if (!existingSub) {
    await prisma.eventFormSubmission.create({
      data: {
        formId: form.id,
        userId: trainee.id,
        email: trainee.email,
        data: {
          first_name: "Avery",
          last_name: "Chen",
          email: trainee.email,
          applicant_id: "BHTAA0042",
          current_position: "Graduate Program",
          earliest_availability: "2026-09-01",
          linkedin: "linkedin.com/in/avery-chen-test",
          status_goal: "Current student searching for internship opportunities",
          locations: [
            "Ontario",
            "Quebec",
            "Remote / hybrid Canada-wide",
          ],
          citizenship: ["Canadian Citizen"],
          french_speaking: "Intermediate",
          french_reading: "Advanced",
          french_writing: "Intermediate",
          thesis_or_contract_date: "2027-04-30",
          program_url: "https://www.utoronto.ca/graduate/programs/bme",
          pitch:
            "Master's student in Biomedical Engineering at the University of Toronto with hands-on experience in mammalian cell culture, USP/DSP optimisation, and quality control. Through coursework and three lab rotations I've built fluency in aseptic technique, automated bioreactor operation, and data analysis with Python. Drawn to the regulatory and process-development side of biomanufacturing and curious about applying ML to bioprocess optimisation. Strong attention to detail, collaborative bench style, and ready to contribute to scaling promising therapies under GMP.",
          linkedin_follow: "Yes, I'm following the LinkedIn page",
          comments: "Available to start mid-September after thesis defence.",
          consent: ["I have read and agreed to the privacy notice and terms above."],
          // File fields left blank — uploads happen via the live form's
          // multipart route, which isn't replayable from a seed. The
          // employer view will show "no file" badges, which is realistic.
        },
      },
    });
    console.log(`✓ submission talent-application for ${trainee.email}`);
  } else {
    console.log(`= submission already exists for ${trainee.email}`);
  }

  console.log("\nDone. Test accounts:");
  console.log(`  Employer:  ${EMPLOYER_EMAIL}  /  test1234`);
  console.log(`  Trainee:   ${TRAINEE_EMAIL}   /  test1234`);
  console.log("\nQuick test paths:");
  console.log("  Sign in as employer  → /employer (Postings + Applicants)");
  console.log("  View-as superadmin   → click avatar → Employer HR");
  console.log("  Sign in as trainee   → /forms/talent-application sees the prior submission");
  console.log("  Admin overview       → /admin/forms/talent-application sees the row");
}

async function doCleanup() {
  // Delete in dependency order: submissions / postings → users.
  const employer = await prisma.user.findUnique({ where: { email: EMPLOYER_EMAIL } });
  const trainee = await prisma.user.findUnique({ where: { email: TRAINEE_EMAIL } });

  if (trainee) {
    const dropped = await prisma.eventFormSubmission.deleteMany({
      where: { userId: trainee.id },
    });
    console.log(`× ${dropped.count} submission(s) for ${trainee.email}`);
  }
  if (employer) {
    const dropped = await prisma.internshipPosting.deleteMany({
      where: { createdById: employer.id },
    });
    console.log(`× ${dropped.count} posting(s) by ${employer.email}`);
  }
  if (trainee) {
    await prisma.user.delete({ where: { id: trainee.id } });
    console.log(`× user ${trainee.email}`);
  }
  if (employer) {
    await prisma.user.delete({ where: { id: employer.id } });
    console.log(`× user ${employer.email}`);
  }
  if (!employer && !trainee) {
    console.log("Nothing to clean up — no test users found.");
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    return prisma.$disconnect().then(() => process.exit(1));
  });
