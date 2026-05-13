/**
 * Admin: unified seeder for "demo + sandbox" rows across the
 * platform.
 *
 *   POST /api/admin/demo-seed
 *     body: {
 *       entity: "internship_posting"
 *             | "form_submission"
 *             | "credit_application"
 *             | "pool_exit_feedback",
 *       scope?: { formSlug?: string }
 *     }
 *
 * Mirror of /api/admin/clear-test-data — same `entity` namespace,
 * same `scope` contract, opposite operation. The two endpoints form
 * a symmetric pair: every row this endpoint creates can be removed
 * by the matching clear call, because every row is anchored to a
 * demo or sandbox account and the clear endpoint targets exactly
 * those accountKinds.
 *
 * Why one endpoint instead of per-entity routes?
 *   • The clear side is already one switched endpoint — admins
 *     learning the seed pattern see the same shape.
 *   • A single role check / accountKind allowlist / shared user-
 *     bootstrapping path beats four duplicated route files that
 *     would inevitably drift.
 *   • Adding a new seedable entity is a single case-arm here plus
 *     a matching arm in clear-test-data — no new route to register.
 *
 * Bootstrap policy: if no demo / sandbox user with the right role
 * exists, we auto-create one (`demo-{entity}-{ts}@bhn.test`) so a
 * fresh DB or just-cleared environment never blocks the seed. The
 * auto-created users are themselves demo-kind so the next Clear
 * press takes their seeded rows out with the rest.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const VALID_ENTITIES = [
  "internship_posting",
  "form_submission",
  "credit_application",
  "pool_exit_feedback",
] as const;
type Entity = (typeof VALID_ENTITIES)[number];

function isEntity(s: unknown): s is Entity {
  return typeof s === "string" && (VALID_ENTITIES as readonly string[]).includes(s);
}

/** Get or create a demo user with the desired role. Returns the id. */
async function ensureDemoUser(opts: {
  role: "trainee" | "employer" | "instructor";
  emailHint: string;
}): Promise<string> {
  const existing = await prisma.user.findFirst({
    where: {
      accountKind: { in: ["demo", "sandbox"] },
      role: opts.role,
    },
    select: { id: true },
    orderBy: { createdAt: "desc" },
  });
  if (existing) return existing.id;

  const created = await prisma.user.create({
    data: {
      name: `Demo ${opts.role.charAt(0).toUpperCase() + opts.role.slice(1)}`,
      email: `demo-${opts.emailHint}-${Date.now()}@bhn.test`,
      role: opts.role,
      accountKind: "demo",
      credits: opts.role === "trainee" ? 200 : 0,
      emailVerified: new Date(),
    },
    select: { id: true },
  });
  return created.id;
}

// ── Per-entity seed samples ──────────────────────────────────────

const INTERNSHIP_SAMPLES = [
  {
    companyName: "Demo · Veridiom Therapeutics",
    title: "Manufacturing Process Associate (Demo)",
    duration: "16 weeks",
    hours: "37.5 hrs/week",
    location: "Toronto, ON",
    type: "Full-time, in-person",
    compensation: "$24/hr + transit pass",
    keySkills: ["GMP", "Aseptic technique", "Bioreactor operations"],
    positionDetails:
      "Demo posting auto-seeded for the admin walkthrough. Real applicants are not contacted. Safe to clear via Clear demo + sandbox postings.",
    contactEmail: "demo-hiring@bhn.test",
  },
  {
    companyName: "Demo · Northbridge Biologics",
    title: "QA Documentation Co-op (Demo)",
    duration: "8 months",
    hours: "40 hrs/week",
    location: "Mississauga, ON",
    type: "Co-op (winter + summer)",
    compensation: "$26/hr",
    keySkills: ["Document control", "QA review", "Deviation handling"],
    positionDetails:
      "Demo posting auto-seeded for the admin walkthrough. Real applicants are not contacted. Safe to clear via Clear demo + sandbox postings.",
    contactEmail: "demo-hiring@bhn.test",
  },
  {
    companyName: "Demo · Cedar Biopharma",
    title: "Cell Culture Technician — Summer (Demo)",
    duration: "12 weeks",
    hours: "40 hrs/week",
    location: "Hamilton, ON",
    type: "Summer internship",
    compensation: "$22/hr",
    keySkills: ["Cell culture", "Aseptic transfer", "Plate reading"],
    positionDetails:
      "Demo posting auto-seeded for the admin walkthrough. Real applicants are not contacted. Safe to clear via Clear demo + sandbox postings.",
    contactEmail: "demo-hiring@bhn.test",
  },
];

interface CreditAppSample {
  fullName: string;
  organization: string;
  title: string;
  country: string;
  useCase: string;
  status: "pending" | "approved" | "rejected";
  requestedAmount: number;
  approvedAmount?: number;
}

const CREDIT_APP_SAMPLES: CreditAppSample[] = [
  {
    fullName: "Demo · Priya Iyer",
    organization: "University of Toronto",
    title: "MSc candidate, Pharmaceutical Sciences",
    country: "Canada",
    useCase:
      "Working on a cleanroom gowning thesis project. Need additional credits for the Aseptic Technique pathway plus two specialised SCORM simulations.",
    status: "pending",
    requestedAmount: 4800,
  },
  {
    fullName: "Demo · Marcus Chen",
    organization: "McMaster University",
    title: "PhD candidate, Chemical Engineering",
    country: "Canada",
    useCase:
      "Switching focus to biomanufacturing process design. Want to take the full Bioreactor Operations + Quality Systems sequence ahead of internship cycles.",
    status: "approved",
    requestedAmount: 4800,
    approvedAmount: 4800,
  },
  {
    fullName: "Demo · Aisha Okonkwo",
    organization: "Toronto Metropolitan University",
    title: "Undergraduate · Biotechnology, 4th year",
    country: "Canada",
    useCase:
      "Need credits for the Industry-Linked Capstone preparation modules and Workplace Communication for Biomanufacturing.",
    status: "pending",
    requestedAmount: 3200,
  },
  {
    fullName: "Demo · Jordan Williams",
    organization: "Independent consultant",
    title: "Career transition",
    country: "United States",
    useCase:
      "Career pivot from clinical-trial coordination into manufacturing QA. Applying outside the ENGAGE partner-institution criteria.",
    status: "rejected",
    requestedAmount: 4800,
  },
];

const POOL_EXIT_SAMPLES = [
  {
    reason: "found_job" as const,
    helpfulness: 9, partnerQuality: 8, platformExperience: 9, communicationFreq: 7,
    npsScore: 9, foundJob: true, jobSource: "Direct from BHN partner",
    whatWorkedWell: "Demo: the application builder + auto-attach was a huge time-saver.",
    whatToImprove: "Demo: more frequent partner updates would help.",
    additionalComments: "Demo · seeded for admin dashboard walkthrough.",
    allowFollowUp: true,
  },
  {
    reason: "career_change" as const,
    helpfulness: 7, partnerQuality: 6, platformExperience: 8, communicationFreq: 6,
    npsScore: 7, foundJob: false, jobSource: null,
    whatWorkedWell: "Demo: pathway certificate was the strongest part of the application.",
    whatToImprove: "Demo: clearer guidance on which roles match the trainee profile.",
    additionalComments: "Demo · seeded for admin dashboard walkthrough.",
    allowFollowUp: false,
  },
  {
    reason: "platform_quality" as const,
    helpfulness: 4, partnerQuality: 5, platformExperience: 4, communicationFreq: 5,
    npsScore: 4, foundJob: false, jobSource: null,
    whatWorkedWell: "Demo: liked the courses themselves.",
    whatToImprove: "Demo: mobile experience needs work; talent-pool search is slow.",
    additionalComments: "Demo · seeded so admins can see how a critical response renders.",
    allowFollowUp: true,
  },
];

// ── Per-entity seeders ───────────────────────────────────────────

async function seedInternshipPostings(): Promise<number> {
  const employerId = await ensureDemoUser({ role: "employer", emailHint: "employer" });
  let created = 0;
  for (const p of INTERNSHIP_SAMPLES) {
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + 21);
    await prisma.internshipPosting.create({
      data: {
        ...p,
        deadline,
        status: "active",
        createdById: employerId,
      },
    });
    created++;
  }
  return created;
}

async function seedCreditApplications(reviewerId: string | null): Promise<number> {
  let created = 0;
  for (const app of CREDIT_APP_SAMPLES) {
    const userId = await ensureDemoUser({ role: "trainee", emailHint: "credit-apps" });
    const now = new Date();
    await prisma.creditApplication.create({
      data: {
        userId,
        fullName: app.fullName,
        organization: app.organization,
        title: app.title,
        country: app.country,
        useCase: app.useCase,
        status: app.status,
        requestedAmount: app.requestedAmount,
        approvedAmount: app.status === "approved" ? app.approvedAmount ?? app.requestedAmount : null,
        reviewerId: app.status !== "pending" ? reviewerId : null,
        reviewedAt: app.status !== "pending" ? now : null,
        documents: [],
      },
    });
    created++;
  }
  return created;
}

async function seedFormSubmissions(formSlug: string): Promise<number> {
  const form = await prisma.eventForm.findUnique({
    where: { slug: formSlug },
    select: { id: true, fields: true },
  });
  if (!form) {
    throw new Error(`No form with slug "${formSlug}" — create the form before seeding submissions.`);
  }

  // Build a minimal `data` payload using whatever string-typed fields
  // the form declares. We don't try to satisfy required-but-conditional
  // fields perfectly; these are demo rows for the admin queue, not
  // production submissions. The reviewer will see "filled-out enough
  // to scan" rather than "production-grade applicant."
  const fields = Array.isArray(form.fields) ? (form.fields as Array<{ id: string; label?: string; type?: string }>) : [];
  function demoValueFor(f: { id: string; label?: string; type?: string }): string {
    const id = f.id.toLowerCase();
    if (id.includes("email")) return "demo-applicant@bhn.test";
    if (id.includes("name")) return "Demo Applicant";
    if (id.includes("phone")) return "(416) 555-0100";
    if (id.includes("country")) return "Canada";
    if (id.includes("organization") || id.includes("school") || id.includes("institution"))
      return "Demo · University of Toronto";
    return `Demo value for ${f.label ?? f.id}`;
  }
  const data: Record<string, unknown> = {};
  for (const f of fields) {
    if (typeof f === "object" && f && "id" in f) data[f.id] = demoValueFor(f);
  }

  const samples: Array<{ reviewStatus: "pending" | "approved" | "rejected"; emailSuffix: string; namePrefix: string }> = [
    { reviewStatus: "pending",  emailSuffix: "1", namePrefix: "Demo · Priya"  },
    { reviewStatus: "pending",  emailSuffix: "2", namePrefix: "Demo · Marcus" },
    { reviewStatus: "approved", emailSuffix: "3", namePrefix: "Demo · Aisha"  },
    { reviewStatus: "rejected", emailSuffix: "4", namePrefix: "Demo · Jordan" },
  ];

  let created = 0;
  for (const s of samples) {
    const userId = await ensureDemoUser({ role: "trainee", emailHint: `form-${formSlug}` });
    await prisma.eventFormSubmission.create({
      data: {
        formId: form.id,
        userId,
        email: `demo-${formSlug}-${s.emailSuffix}@bhn.test`,
        data: { ...data, fullName: s.namePrefix },
        reviewStatus: s.reviewStatus,
        reviewedAt: s.reviewStatus !== "pending" ? new Date() : null,
      },
    });
    created++;
  }
  return created;
}

async function seedPoolExitFeedback(): Promise<number> {
  // Pool exit feedback rows are attached to an EventFormSubmission
  // that has leftPoolAt set. The talent-application form is the
  // only one that wires up exit-survey UX, so we anchor to that.
  const form = await prisma.eventForm.findUnique({
    where: { slug: "talent-application" },
    select: { id: true },
  });
  if (!form) {
    throw new Error('No "talent-application" form — pool-exit feedback can\'t be seeded without it.');
  }

  let created = 0;
  for (const sample of POOL_EXIT_SAMPLES) {
    const userId = await ensureDemoUser({ role: "trainee", emailHint: "pool-exit" });
    const leftAt = new Date();
    const submission = await prisma.eventFormSubmission.create({
      data: {
        formId: form.id,
        userId,
        email: `demo-pool-exit-${created}@bhn.test`,
        data: { fullName: `Demo · Exiter ${created + 1}` },
        reviewStatus: "approved",
        reviewedAt: leftAt,
        leftPoolAt: leftAt,
        leftPoolReason: sample.reason,
      },
    });
    await prisma.poolExitFeedback.create({
      data: {
        submissionId: submission.id,
        userId,
        reason: sample.reason,
        helpfulness: sample.helpfulness,
        partnerQuality: sample.partnerQuality,
        platformExperience: sample.platformExperience,
        communicationFreq: sample.communicationFreq,
        npsScore: sample.npsScore,
        foundJob: sample.foundJob,
        jobSource: sample.jobSource,
        whatWorkedWell: sample.whatWorkedWell,
        whatToImprove: sample.whatToImprove,
        additionalComments: sample.additionalComments,
        allowFollowUp: sample.allowFollowUp,
      },
    });
    created++;
  }
  return created;
}

// ── Route handler ────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const session = await requireRole("admin").catch(() => null);
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = (await req.json().catch(() => ({}))) as {
    entity?: unknown;
    scope?: { formSlug?: unknown };
  };
  if (!isEntity(body.entity)) {
    return NextResponse.json(
      { error: `entity must be one of: ${VALID_ENTITIES.join(", ")}` },
      { status: 400 },
    );
  }
  const entity = body.entity;
  const formSlug = typeof body.scope?.formSlug === "string" ? body.scope.formSlug : null;
  const reviewerId = (session.user as { id?: string }).id ?? null;

  try {
    let created = 0;
    if (entity === "internship_posting") created = await seedInternshipPostings();
    else if (entity === "credit_application") created = await seedCreditApplications(reviewerId);
    else if (entity === "form_submission") {
      if (!formSlug) {
        return NextResponse.json({ error: "scope.formSlug is required for form_submission." }, { status: 400 });
      }
      created = await seedFormSubmissions(formSlug);
    }
    else if (entity === "pool_exit_feedback") created = await seedPoolExitFeedback();

    return NextResponse.json({ ok: true, entity, created });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message ?? "Seed failed." }, { status: 500 });
  }
}
