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
  // Self-scoped entities — attach rows to the calling admin's own
  // user id so the demo content shows up on the admin's own page
  // (Application Tracker / My Skills / Interviews are user-private
  // surfaces). Clear targets the marker baked into the row.
  "user_application_status",
  "user_skill",
  "user_interview",
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
      accountKind: "demo",
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
      "Demo posting auto-seeded for the admin walkthrough. Real applicants are not contacted. Safe to clear via Clear demo postings.",
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
      "Demo posting auto-seeded for the admin walkthrough. Real applicants are not contacted. Safe to clear via Clear demo postings.",
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
      "Demo posting auto-seeded for the admin walkthrough. Real applicants are not contacted. Safe to clear via Clear demo postings.",
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

// ── Self-scoped seeders ──────────────────────────────────────────
//
// These three seeders attach rows to the calling admin's OWN user
// row, so the demo content shows up immediately on the same page
// they pressed the button from (Application Tracker / My Skills /
// Interviews are user-private surfaces — seeding to a demo user
// wouldn't be visible). Each row carries a baked-in marker so
// Clear can find them again:
//   • ApplicationStatus / Interview — notes start with "[demo]"
//   • UserSkill — source = "demo"

/** Ensure there are demo internship postings to attach statuses /
 *  interviews to. If none exist, seed them. Returns the postings. */
async function ensureDemoPostings(): Promise<{ id: string; title: string }[]> {
  const demoEmployers = await prisma.user.findMany({
    where: { accountKind: "demo", role: "employer" },
    select: { id: true },
  });
  let postings = await prisma.internshipPosting.findMany({
    where: { createdById: { in: demoEmployers.map((u) => u.id) } },
    select: { id: true, title: true },
    take: 4,
  });
  if (postings.length < 3) {
    await seedInternshipPostings();
    const refreshedEmployers = await prisma.user.findMany({
      where: { accountKind: "demo", role: "employer" },
      select: { id: true },
    });
    postings = await prisma.internshipPosting.findMany({
      where: { createdById: { in: refreshedEmployers.map((u) => u.id) } },
      select: { id: true, title: true },
      take: 4,
    });
  }
  return postings;
}

async function seedUserApplicationStatuses(userId: string): Promise<number> {
  const postings = await ensureDemoPostings();
  if (postings.length === 0) return 0;
  const stages = ["new", "reviewing", "shortlisted", "phone_screen"];
  let created = 0;
  for (let i = 0; i < Math.min(postings.length, stages.length); i++) {
    const cleanTitle = postings[i].title.replace(/^Demo · /, "");
    await prisma.applicationStatus.upsert({
      where: { postingId_applicantId: { postingId: postings[i].id, applicantId: userId } },
      create: {
        postingId: postings[i].id,
        applicantId: userId,
        status: stages[i],
        notes: `[demo] Sample application status for ${cleanTitle}.`,
      },
      update: {
        status: stages[i],
        notes: `[demo] Sample application status for ${cleanTitle}.`,
      },
    });
    created++;
  }
  return created;
}

async function seedUserSkills(userId: string): Promise<number> {
  // Pick existing skills if the ontology has any; otherwise create
  // five anchor skills tagged "Demo · ..." so the global registry
  // doesn't end up polluted with unrecognisable demo entries.
  const wanted = [
    "Aseptic technique",
    "GMP documentation",
    "Cell culture",
    "Bioreactor operations",
    "Quality assurance",
  ];
  const existing = await prisma.skill.findMany({
    where: { name: { in: wanted } },
    select: { id: true, name: true },
  });
  const byName = new Map(existing.map((s) => [s.name, s.id]));
  for (const name of wanted) {
    if (byName.has(name)) continue;
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const created = await prisma.skill.create({ data: { name, slug } });
    byName.set(name, created.id);
  }

  let created = 0;
  for (const name of wanted) {
    const skillId = byName.get(name);
    if (!skillId) continue;
    // upsert via @@unique([userId, skillId]). We deliberately stamp
    // source="demo" so the clear pass can find these rows.
    await prisma.userSkill.upsert({
      where: { userId_skillId: { userId, skillId } },
      create: { userId, skillId, level: 0.65 + Math.random() * 0.25, source: "demo" },
      update: { source: "demo", level: 0.65 + Math.random() * 0.25 },
    });
    created++;
  }
  return created;
}

/** Result shape that the route handler unwraps into the JSON
 *  response. `note` surfaces a human-readable explanation when
 *  `created === 0` so the UI doesn't say "Seeded 0" with no context. */
interface SeedDetail {
  created: number;
  note?: string;
}

async function seedUserInterviews(userId: string): Promise<SeedDetail> {
  // Skip the existing-interview check so each click stacks more rows
  // — admins explicitly want repeatable seed for demo loops. The
  // Clear button takes them all back out.
  const postings = await ensureDemoPostings();
  if (postings.length === 0) {
    return {
      created: 0,
      note:
        "Couldn't bootstrap a demo employer or demo postings. Try clicking 'Seed demo postings' on /employer/postings first, or check the server logs for the underlying Prisma error.",
    };
  }
  // 3 upcoming interview slots over the next ~3 weeks, varied formats.
  const samples = [
    { days:  3, format: "video",  location: null,                                 status: "accepted" as const },
    { days: 10, format: "phone",  location: null,                                 status: "proposed" as const },
    { days: 21, format: "onsite", location: "MaRS Discovery District, Toronto",   status: "proposed" as const },
  ];
  let created = 0;
  const errors: string[] = [];
  for (let i = 0; i < Math.min(postings.length, samples.length); i++) {
    const s = samples[i];
    const slot = new Date();
    slot.setDate(slot.getDate() + s.days);
    slot.setHours(10 + i, 0, 0, 0);
    try {
      await prisma.interview.create({
        data: {
          postingId: postings[i].id,
          applicantId: userId,
          // scheduledById uses the same user — these are demo rows, not
          // real employer-scheduled interviews. Avoids FK noise.
          scheduledById: userId,
          proposedSlots: [slot.toISOString()],
          acceptedSlot: s.status === "accepted" ? slot : null,
          status: s.status,
          format: s.format,
          location: s.location,
          notes: `[demo] Sample interview for ${postings[i].title.replace(/^Demo · /, "")}.`,
        },
      });
      created++;
    } catch (err) {
      // Capture per-row failures so a single bad row doesn't
      // poison the whole batch. The first 2 messages are
      // surfaced to the admin UI verbatim.
      errors.push(err instanceof Error ? err.message : String(err));
    }
  }
  if (created === 0 && errors.length > 0) {
    return { created: 0, note: `All ${errors.length} inserts failed: ${errors.slice(0, 2).join("; ")}` };
  }
  return { created, note: errors.length > 0 ? `${errors.length} of ${samples.length} rows failed` : undefined };
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
    let note: string | undefined;
    if (entity === "internship_posting") created = await seedInternshipPostings();
    else if (entity === "credit_application") created = await seedCreditApplications(reviewerId);
    else if (entity === "form_submission") {
      if (!formSlug) {
        return NextResponse.json({ error: "scope.formSlug is required for form_submission." }, { status: 400 });
      }
      created = await seedFormSubmissions(formSlug);
    }
    else if (entity === "pool_exit_feedback") created = await seedPoolExitFeedback();
    else if (entity === "user_application_status") {
      if (!reviewerId) return NextResponse.json({ error: "Session missing user id." }, { status: 400 });
      created = await seedUserApplicationStatuses(reviewerId);
    }
    else if (entity === "user_skill") {
      if (!reviewerId) return NextResponse.json({ error: "Session missing user id." }, { status: 400 });
      created = await seedUserSkills(reviewerId);
    }
    else if (entity === "user_interview") {
      if (!reviewerId) return NextResponse.json({ error: "Session missing user id." }, { status: 400 });
      const detail = await seedUserInterviews(reviewerId);
      created = detail.created;
      note = detail.note;
    }

    return NextResponse.json({ ok: true, entity, created, note });
  } catch (e) {
    // Surface the actual Prisma / runtime error to the admin instead
    // of a flat "Seed failed." — this is admin-only, so leaking the
    // detail is fine and saves a round-trip to the server logs.
    const message = e instanceof Error ? e.message : String(e);
    console.error("[demo-seed]", entity, message);
    return NextResponse.json(
      { error: `Seed failed: ${message}` },
      { status: 500 },
    );
  }
}
