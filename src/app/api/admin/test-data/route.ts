/**
 * Superadmin-only endpoint to seed / cleanup the test employer + trainee
 * + posting + submission set. Mirrors scripts/seed-test-employer-flow.ts
 * exactly, but lives in-app so a superadmin can run it from the System
 * status page on prod without shelling into the CLI.
 *
 *   POST /api/admin/test-data { action: "seed" }
 *   POST /api/admin/test-data { action: "cleanup" }
 *   GET  /api/admin/test-data            → status (which rows exist)
 */
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

const EMPLOYER_EMAIL = "test.employer@biohubnet.test";
const TRAINEE_EMAIL = "test.trainee@biohubnet.test";
const POSTING_TITLE = "Bioprocess Development Intern (Test)";

async function readStatus() {
  const [employer, trainee] = await Promise.all([
    prisma.user.findUnique({ where: { email: EMPLOYER_EMAIL }, select: { id: true } }),
    prisma.user.findUnique({ where: { email: TRAINEE_EMAIL }, select: { id: true } }),
  ]);
  let postingExists = false;
  let submissionExists = false;
  if (employer) {
    const p = await prisma.internshipPosting.findFirst({
      where: { title: POSTING_TITLE, createdById: employer.id },
      select: { id: true },
    });
    postingExists = !!p;
  }
  if (trainee) {
    const s = await prisma.eventFormSubmission.findFirst({
      where: { userId: trainee.id },
      select: { id: true },
    });
    submissionExists = !!s;
  }
  return {
    employer: !!employer,
    trainee: !!trainee,
    posting: postingExists,
    submission: submissionExists,
    employerEmail: EMPLOYER_EMAIL,
    traineeEmail: TRAINEE_EMAIL,
    password: "test1234",
  };
}

export async function GET() {
  await requireRole("superadmin");
  return NextResponse.json(await readStatus());
}

export async function POST(req: NextRequest) {
  await requireRole("superadmin");
  const body = (await req.json().catch(() => ({}))) as { action?: string };
  const action = body.action;
  if (action !== "seed" && action !== "cleanup") {
    return NextResponse.json({ error: "action must be 'seed' or 'cleanup'" }, { status: 400 });
  }

  if (action === "cleanup") {
    const employer = await prisma.user.findUnique({ where: { email: EMPLOYER_EMAIL } });
    const trainee = await prisma.user.findUnique({ where: { email: TRAINEE_EMAIL } });
    let removed = 0;
    if (trainee) {
      const r = await prisma.eventFormSubmission.deleteMany({ where: { userId: trainee.id } });
      removed += r.count;
    }
    if (employer) {
      const r = await prisma.internshipPosting.deleteMany({ where: { createdById: employer.id } });
      removed += r.count;
    }
    if (trainee) await prisma.user.delete({ where: { id: trainee.id } });
    if (employer) await prisma.user.delete({ where: { id: employer.id } });
    return NextResponse.json({
      ok: true,
      action: "cleanup",
      removed,
      status: await readStatus(),
    });
  }

  // ── seed ──────────────────────────────────────────────────────────
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
  let posting = await prisma.internshipPosting.findFirst({
    where: { title: POSTING_TITLE, createdById: employer.id },
    select: { id: true },
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
      select: { id: true },
    });
  }

  // Submission needs the talent-application form to exist. If it's not
  // there, skip the submission step rather than 500 — the rest of the
  // test data is still useful.
  const form = await prisma.eventForm.findFirst({
    where: { slug: "talent-application" },
    select: { id: true },
  });
  let submissionCreated = false;
  if (form) {
    const exists = await prisma.eventFormSubmission.findFirst({
      where: { formId: form.id, userId: trainee.id },
      select: { id: true },
    });
    if (!exists) {
      const subData: Prisma.JsonObject = {
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
      };
      await prisma.eventFormSubmission.create({
        data: {
          formId: form.id,
          userId: trainee.id,
          email: trainee.email,
          data: subData,
        },
      });
      submissionCreated = true;
    }
  }

  return NextResponse.json({
    ok: true,
    action: "seed",
    submissionCreated,
    formFound: !!form,
    status: await readStatus(),
  });
}
