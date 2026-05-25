/**
 * Self-service demo seeder for the talent pool.
 *
 *   POST   /api/employer/demo/talent-pool  → create 6 demo candidates
 *   DELETE /api/employer/demo/talent-pool  → remove demo submissions
 *
 * Upserts 6 demo accounts (accountKind = "demo", role = "trainee")
 * and creates EventFormSubmission rows for the "talent-application"
 * form, pre-approved so they're immediately visible to employers.
 */
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const DEMO_CANDIDATES = [
  {
    name: "Jamie Park",
    email: "demo.jamie.park@bhn.test",
    jobTitle: "Research Associate",
    organization: "Sunnybrook Research Institute",
    skills: "Cell culture, Flow cytometry, Data analysis",
    daysAgo: 2,
  },
  {
    name: "Nadia Al-Hassan",
    email: "demo.nadia.al-hassan@bhn.test",
    jobTitle: "Regulatory Affairs Coordinator",
    organization: "MDS Pharma Services",
    skills: "Health Canada submissions, GxP compliance, Document control",
    daysAgo: 4,
  },
  {
    name: "Chris Okafor",
    email: "demo.chris.okafor@bhn.test",
    jobTitle: "Business Development Analyst",
    organization: "Ontario Bioscience Innovation Organization",
    skills: "Market research, Excel modelling, Competitive analysis",
    daysAgo: 6,
  },
  {
    name: "Mei-Ling Zhao",
    email: "demo.mei-ling.zhao@bhn.test",
    jobTitle: "Bioinformatics Intern",
    organization: "The Hospital for Sick Children",
    skills: "Python, R, Next-generation sequencing",
    daysAgo: 8,
  },
  {
    name: "Devon Baptiste",
    email: "demo.devon.baptiste@bhn.test",
    jobTitle: "Quality Assurance Technician",
    organization: "Apotex Inc.",
    skills: "SOP development, HPLC, Root cause analysis",
    daysAgo: 11,
  },
  {
    name: "Aisha Fernandez",
    email: "demo.aisha.fernandez@bhn.test",
    jobTitle: "Clinical Research Coordinator",
    organization: "Princess Margaret Cancer Centre",
    skills: "ICH-GCP, EDC systems, Participant recruitment",
    daysAgo: 14,
  },
];

function daysAgo(n: number): Date {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000);
}

export async function POST() {
  const session = await getSession();
  const role = (session?.user as { role?: string })?.role ?? "";
  const userId = (session?.user as { id?: string })?.id;
  if (!session || !userId || (role !== "employer" && !["admin", "superadmin"].includes(role))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const form = await prisma.eventForm.findUnique({
    where: { slug: "talent-application" },
    select: { id: true },
  });
  if (!form) {
    return NextResponse.json(
      { error: "Talent application form not set up yet." },
      { status: 400 },
    );
  }

  let created = 0;

  for (const candidate of DEMO_CANDIDATES) {
    // Upsert the demo user account.
    const user = await prisma.user.upsert({
      where: { email: candidate.email },
      create: {
        email: candidate.email,
        name: candidate.name,
        role: "trainee",
        accountKind: "demo",
      },
      update: {},
      select: { id: true },
    });

    // Check if a submission already exists for this (formId, userId) pair.
    const existing = await prisma.eventFormSubmission.findFirst({
      where: { formId: form.id, userId: user.id },
      select: { id: true },
    });

    if (existing) continue;

    await prisma.eventFormSubmission.create({
      data: {
        formId: form.id,
        userId: user.id,
        email: candidate.email,
        reviewStatus: "approved",
        eligibilityApprovedAt: new Date(),
        eligibilityApprovedBy: userId,
        eligibilityNote: "Demo seed — auto-approved for testing",
        createdAt: daysAgo(candidate.daysAgo),
        data: {
          jobTitle: candidate.jobTitle,
          organization: candidate.organization,
          skills: candidate.skills,
          availability: "Immediately",
          linkedinUrl: "",
        },
      },
    });
    created++;
  }

  return NextResponse.json({ ok: true, created });
}

export async function DELETE() {
  const session = await getSession();
  const role = (session?.user as { role?: string })?.role ?? "";
  const userId = (session?.user as { id?: string })?.id;
  if (!session || !userId || (role !== "employer" && !["admin", "superadmin"].includes(role))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const form = await prisma.eventForm.findUnique({
    where: { slug: "talent-application" },
    select: { id: true },
  });
  if (!form) {
    return NextResponse.json({ ok: true, deleted: 0 });
  }

  const result = await prisma.eventFormSubmission.deleteMany({
    where: { formId: form.id, user: { accountKind: "demo" } },
  });

  return NextResponse.json({ ok: true, deleted: result.count });
}
