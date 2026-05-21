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
import { rid, type ResumeContent } from "@/lib/resume/types";
import { recordRevision } from "@/lib/resume/revisions";

export const runtime = "nodejs";

const VALID_ENTITIES = [
  "internship_posting",
  "form_submission",
  "credit_application",
  "pool_exit_feedback",
  // Self-scoped entities — attach rows to the calling admin's own
  // user id so the demo content shows up on the admin's own page
  // (Application Tracker / My Skills / Interviews / Stories / Buddies
  // / Matches are user-private surfaces). Clear targets the marker
  // baked into the row.
  "user_application_status",
  "user_skill",
  "user_interview",
  "user_star_story",
  "user_buddy_pair",
  "user_matches",
  "user_resume",
] as const;
type Entity = (typeof VALID_ENTITIES)[number];

function isEntity(s: unknown): s is Entity {
  return typeof s === "string" && (VALID_ENTITIES as readonly string[]).includes(s);
}

/** Get or create a demo user with the desired role. Returns the id. */
async function ensureDemoUser(opts: {
  role: "trainee" | "employer" | "instructor" | "industrial_mentor";
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

  // 20 plausible demo submissions per batch. Status mix mirrors a
  // realistic queue: ~55% approved (so the talent pool actually has
  // members to scan), ~30% pending (so the review queue has work),
  // ~15% rejected (so admins see the lifecycle). Each call appends
  // 20 fresh rows; the timestamp suffix on the email keeps successive
  // seed clicks from colliding on (formId, email) unique constraints.
  const NAME_BANK = [
    "Priya Patel", "Marcus Chen", "Aisha Mohamed", "Jordan Reyes",
    "Sofia Romano", "Liam O'Connor", "Yuki Tanaka", "Nadia Karimi",
    "Ethan Park", "Camila Vásquez", "Hassan Ali", "Mei Lin",
    "Daniel Volkov", "Anika Singh", "Tomás Cruz", "Hana Yoshida",
    "Olusegun Adeyemi", "Elena Petrova", "Rohan Iyer", "Zara Khan",
  ];
  const STATUS_CYCLE: Array<"pending" | "approved" | "rejected"> = [
    "approved", "pending",  "approved", "pending",  "approved",
    "rejected", "approved", "pending",  "approved", "pending",
    "approved", "rejected", "approved", "pending",  "approved",
    "approved", "pending",  "approved", "rejected", "approved",
  ];
  const ts = Date.now().toString(36);
  const samples: Array<{ reviewStatus: "pending" | "approved" | "rejected"; emailSuffix: string; namePrefix: string }> =
    NAME_BANK.map((name, i) => ({
      reviewStatus: STATUS_CYCLE[i] ?? "pending",
      emailSuffix: `${ts}-${i + 1}`,
      namePrefix: `Demo · ${name}`,
    }));

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
        // Eligibility gate stays UNCHECKED on every seeded row — an
        // admin must explicitly approve before the talent becomes
        // visible to employers. Set null explicitly (matches the
        // schema default) so the intent is impossible to miss.
        eligibilityApprovedAt: null,
        eligibilityApprovedBy: null,
        eligibilityNote: null,
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

/** Helper: idempotently upsert a Skill row given (name, slug). Handles
 *  the case where the slug already exists with a slightly different
 *  name capitalisation (e.g. "Aseptic Technique" vs the demo's
 *  "Aseptic technique") — that was the bug that made seedUserSkills
 *  return `Unique constraint failed on (slug)`. */
async function upsertSkill(name: string, slug: string): Promise<{ id: string; slug: string }> {
  return prisma.skill.upsert({
    where: { slug },
    create: { name, slug },
    update: {}, // never overwrite name — keep whatever's there
    select: { id: true, slug: true },
  });
}

const DEMO_SKILLS: Array<{ name: string; slug: string }> = [
  { name: "Aseptic technique",     slug: "aseptic-technique" },
  { name: "GMP documentation",     slug: "gmp-documentation" },
  { name: "Cell culture",          slug: "cell-culture" },
  { name: "Bioreactor operations", slug: "bioreactor-operations" },
  { name: "Quality assurance",     slug: "quality-assurance" },
];

async function seedUserSkills(userId: string): Promise<number> {
  // Each demo skill is upsert-by-slug — never a bare create — so a
  // pre-existing slug (different casing, prior seed run, ontology
  // already populated) is handled silently.
  const skills = await Promise.all(DEMO_SKILLS.map((s) => upsertSkill(s.name, s.slug)));
  let created = 0;
  for (const s of skills) {
    // upsert via @@unique([userId, skillId]). We deliberately stamp
    // source="demo" so the clear pass can find these rows.
    await prisma.userSkill.upsert({
      where: { userId_skillId: { userId, skillId: s.id } },
      create: { userId, skillId: s.id, level: 0.65 + Math.random() * 0.25, source: "demo" },
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

/** Three reusable STAR stories on the admin's own user. Title is
 *  prefixed [demo] so clear-test-data can find them with a startsWith
 *  filter (mirrors the user_interview pattern). */
const STAR_STORY_SAMPLES: Array<{
  title: string;
  situation: string;
  task: string;
  action: string;
  result: string;
  tags: string[];
}> = [
  {
    title: "[demo] Aseptic gowning audit — taught a new hire the protocol",
    situation: "Two new co-op trainees joined the production floor and needed to clear aseptic gowning certification within their first week, but the training queue was already 3 weeks long.",
    task: "I had to get both trainees certified without pulling them out of their first project rotation, while keeping our gowning fail-rate under the QA team's 5% threshold.",
    action: "Built a 90-minute paired-shadow session — I gowned, narrated each step, then watched them gown twice each, scoring against the SOP checklist. We did the third attempt under our QA lead's supervision so the sign-off was real.",
    result: "Both certified inside three days; zero gowning fails in their first month. The paired-shadow flow became the unofficial onboarding pattern; QA referenced it in their next quarterly review.",
    tags: ["aseptic technique", "mentoring", "process improvement"],
  },
  {
    title: "[demo] Cell-culture contamination — root-cause + comms",
    situation: "Three consecutive shake-flask cultures contaminated within 48 hours of each other in the same hood. Senior scientist was on vacation; I was the most experienced person in the lab that week.",
    task: "Identify the source, stop the bleed, and brief the lead before he flew back.",
    action: "Pulled the contaminated plate prints, autoclave logs, and HEPA-filter records into one timeline. The pattern lined up with a single autoclave cycle that ran 8 minutes shorter than spec. Flagged it to facilities, swapped the autoclave out, escalated to QA, and ran a written brief that the lead could read on the plane.",
    result: "No contamination since. The autoclave-cycle deviation became a watch metric on the daily ops dashboard. Lead specifically called out the written brief as the format he wants going forward.",
    tags: ["cell culture", "root cause analysis", "communication"],
  },
  {
    title: "[demo] GMP doc rollover — got 40 SOPs through change-control in 6 weeks",
    situation: "Our facility was migrating from paper SOPs to an electronic QMS. 40 GMP documents needed re-authoring, change-controlled, signed-off, and live in the eQMS before the next inspection in 6 weeks.",
    task: "Coordinate the SME reviews, run the change-control board, and stay ahead of the audit clock.",
    action: "Built a status board showing every SOP, owner, current state, and blocker. Ran a 15-minute standup three times a week with just the bottlenecked owners. Personally handled the change-control packets for the 12 highest-risk SOPs.",
    result: "All 40 live with seven days to spare. The inspection passed clean — no GMP doc observations. The standup format stayed in place for the next quarterly review cycle.",
    tags: ["GMP documentation", "project management", "stakeholder management"],
  },
  {
    title: "[demo] Bioreactor failed mid-run — rescued the batch",
    situation: "Mid-day on the second day of a 14-day run, the bioreactor's pH probe drifted out of spec and the controller started over-dosing base. Production lead was off-site.",
    task: "Decide whether to salvage the run or call it. The batch was worth ~$80k in materials + 10 days of operator time already committed.",
    action: "Pulled the calibration log, recalibrated the probe in-situ, manually titrated the broth back to spec over 20 minutes, then dropped the next sample to QC early to confirm the cells were still viable. Documented every step against the deviation form.",
    result: "Cells stayed in log-phase; final yield was within 3% of the historical mean for that strain. Deviation closed clean. SOP updated to include the in-situ recalibration procedure I'd improvised.",
    tags: ["bioreactor operations", "troubleshooting", "decision under pressure"],
  },
];

async function seedUserStarStories(userId: string): Promise<SeedDetail> {
  let created = 0;
  const errors: string[] = [];
  for (const s of STAR_STORY_SAMPLES) {
    try {
      await prisma.starStory.create({
        data: {
          userId,
          title: s.title,
          situation: s.situation,
          task: s.task,
          action: s.action,
          result: s.result,
          tags: s.tags,
        },
      });
      created++;
    } catch (err) {
      errors.push(err instanceof Error ? err.message : String(err));
    }
  }
  if (created === 0 && errors.length > 0) {
    return { created: 0, note: `All ${errors.length} inserts failed: ${errors.slice(0, 2).join("; ")}` };
  }
  return { created, note: errors.length > 0 ? `${errors.length} row(s) failed` : undefined };
}

/** Ensure at least 3 distinct demo trainees exist with plausible
 *  names, so buddy pairs aren't all on the same fake account. */
async function ensureDemoTraineeFriends(min: number): Promise<string[]> {
  const existing = await prisma.user.findMany({
    where: { accountKind: "demo", role: "trainee" },
    select: { id: true },
    orderBy: { createdAt: "desc" },
    take: min,
  });
  if (existing.length >= min) return existing.map((u) => u.id);

  const friendNames = [
    "Demo · Priya Iyer",
    "Demo · Marcus Bell",
    "Demo · Aisha Khan",
    "Demo · Jordan Wong",
    "Demo · Lin Sun",
  ];
  const ids: string[] = existing.map((u) => u.id);
  for (let i = 0; ids.length < min && i < friendNames.length; i++) {
    const created = await prisma.user.create({
      data: {
        name: friendNames[i],
        email: `demo-buddy-${Date.now()}-${i}@bhn.test`,
        role: "trainee",
        accountKind: "demo",
        credits: 200,
        emailVerified: new Date(),
      },
      select: { id: true },
    });
    ids.push(created.id);
  }
  return ids;
}

async function seedUserBuddyPairs(userId: string): Promise<SeedDetail> {
  const friends = await ensureDemoTraineeFriends(3);
  if (friends.length < 3) {
    return { created: 0, note: "Couldn't bootstrap enough demo trainee accounts to pair with." };
  }
  // Three pairs, varied state so the buddy hub has something to
  // render in every UI bucket: one incoming invite waiting on the
  // admin, one active partnership, one ended.
  const samples: Array<{
    initiatorId: string;
    partnerId: string;
    status: "invited" | "active" | "ended";
    focusType: "course" | "pathway" | "open";
    goalNote: string;
  }> = [
    {
      initiatorId: friends[0],
      partnerId: userId,
      status: "invited",
      focusType: "pathway",
      goalNote: "[demo] Aseptic Technique pathway — would love a study buddy for the final assessment.",
    },
    {
      initiatorId: userId,
      partnerId: friends[1],
      status: "active",
      focusType: "course",
      goalNote: "[demo] GMP Documentation 101 — biweekly check-ins on Fridays.",
    },
    {
      initiatorId: friends[2],
      partnerId: userId,
      status: "ended",
      focusType: "open",
      goalNote: "[demo] Open accountability — we both got hired, parted on good terms.",
    },
  ];

  let created = 0;
  const errors: string[] = [];
  for (const s of samples) {
    try {
      await prisma.buddyPair.upsert({
        where: { initiatorId_partnerId: { initiatorId: s.initiatorId, partnerId: s.partnerId } },
        create: {
          initiatorId: s.initiatorId,
          partnerId: s.partnerId,
          status: s.status,
          focusType: s.focusType,
          goalNote: s.goalNote,
          acceptedAt: s.status === "active" || s.status === "ended" ? new Date() : null,
          endedAt: s.status === "ended" ? new Date() : null,
        },
        update: {
          status: s.status,
          goalNote: s.goalNote,
          acceptedAt: s.status === "active" || s.status === "ended" ? new Date() : null,
          endedAt: s.status === "ended" ? new Date() : null,
        },
      });
      created++;
    } catch (err) {
      errors.push(err instanceof Error ? err.message : String(err));
    }
  }
  if (created === 0 && errors.length > 0) {
    return { created: 0, note: `All ${errors.length} inserts failed: ${errors.slice(0, 2).join("; ")}` };
  }
  return { created, note: errors.length > 0 ? `${errors.length} row(s) failed` : undefined };
}

/** A "matches scenario" seeder — different from the others in that
 *  it bootstraps everything the /profile/matches page needs to show
 *  interesting rankings, not just create one entity. Specifically:
 *
 *    1. The admin has ≥5 UserSkill rows tagged source="demo".
 *    2. Demo postings exist with PostingSkill rows linking them to
 *       overlapping demo skills, so the fit scorer can do its work.
 *
 *  We deliberately attach 3–4 skills per posting with varied
 *  required/weight values so the ranking is non-trivial. */
async function seedUserMatchesScenario(userId: string): Promise<SeedDetail> {
  // 1. Ensure admin has the demo skill set
  await seedUserSkills(userId);
  // 2. Ensure demo postings exist
  const postings = await ensureDemoPostings();
  if (postings.length === 0) {
    return { created: 0, note: "Couldn't bootstrap demo postings for matching." };
  }
  // 3. Make sure the demo Skill rows exist (idempotent)
  const skills = await Promise.all(DEMO_SKILLS.map((s) => upsertSkill(s.name, s.slug)));

  // 4. Per-posting skill links — each posting gets 3 demo skills
  //    with varied required-flag + weight so ranking is meaningful.
  const linkPlan: Array<{ postingIdx: number; skillIdx: number; required: boolean; weight: number }> = [
    // posting 0: aseptic + cell culture + GMP doc — mostly required
    { postingIdx: 0, skillIdx: 0, required: true,  weight: 1.0 },
    { postingIdx: 0, skillIdx: 2, required: true,  weight: 0.8 },
    { postingIdx: 0, skillIdx: 1, required: false, weight: 0.5 },
    // posting 1: GMP doc + QA + aseptic — QA-flavoured
    { postingIdx: 1, skillIdx: 1, required: true,  weight: 1.0 },
    { postingIdx: 1, skillIdx: 4, required: true,  weight: 0.9 },
    { postingIdx: 1, skillIdx: 0, required: false, weight: 0.4 },
    // posting 2: cell culture + bioreactor + aseptic — bioprocess
    { postingIdx: 2, skillIdx: 2, required: true,  weight: 1.0 },
    { postingIdx: 2, skillIdx: 3, required: true,  weight: 0.9 },
    { postingIdx: 2, skillIdx: 0, required: false, weight: 0.5 },
  ];
  let created = 0;
  const errors: string[] = [];
  for (const l of linkPlan) {
    if (!postings[l.postingIdx] || !skills[l.skillIdx]) continue;
    try {
      await prisma.postingSkill.upsert({
        where: {
          postingId_skillId: {
            postingId: postings[l.postingIdx].id,
            skillId: skills[l.skillIdx].id,
          },
        },
        create: {
          postingId: postings[l.postingIdx].id,
          skillId: skills[l.skillIdx].id,
          required: l.required,
          weight: l.weight,
        },
        update: { required: l.required, weight: l.weight },
      });
      created++;
    } catch (err) {
      errors.push(err instanceof Error ? err.message : String(err));
    }
  }
  return {
    created,
    note:
      errors.length > 0
        ? `${errors.length} link(s) failed`
        : `Skills attached to ${postings.length} demo postings — visit /profile/matches.`,
  };
}

/** Seed a structured-resume scenario for the calling admin:
 *
 *    1. Replace (or create) the admin's Resume row with a multi-
 *       section content tree — Summary / Experience / Skills /
 *       Education — populated with plausible biomanufacturing-trainee
 *       content. Every bullet body carries a [demo] prefix so mentors
 *       and the trainee can tell it apart from anything they typed
 *       themselves, and so a future heuristic clear could find the
 *       seeded rows without nuking the whole resume.
 *    2. Stamp a ResumeRevision snapshot so the version-history view
 *       has something to render.
 *    3. Author 3 mentor comments on selected bullets (open status),
 *       so /profile/resume immediately shows the comment-thread UX —
 *       which is the surface that needed demo coverage in the first
 *       place. Comments come from a demo industrial_mentor account,
 *       auto-bootstrapped if missing.
 *
 *  Re-seeding is idempotent: the Resume row is upserted, every run
 *  bumps version + writes a new revision + adds 3 fresh comments. */
async function seedUserResume(userId: string): Promise<SeedDetail> {
  // 1. Bootstrap a demo industrial mentor so comments have an author
  //    with the right role for /profile/resume's permission check.
  const mentorId = await ensureDemoUser({
    role: "industrial_mentor",
    emailHint: "resume-mentor",
  });

  // 2. Generate stable IDs up-front so we can anchor comments to
  //    specific bullets / items / sections after the tree is written.
  const summarySectionId = rid();
  const expSectionId     = rid();
  const skillsSectionId  = rid();
  const eduSectionId     = rid();
  const stemcellItemId   = rid();
  const veridiomItemId   = rid();
  const stemcellBullet1  = rid();
  const stemcellBullet2  = rid();
  const stemcellBullet3  = rid();
  const veridiomBullet1  = rid();
  const veridiomBullet2  = rid();

  const content: ResumeContent = {
    header: {
      name: "Demo Admin",
      email: "demo@bhn.test",
      phone: "+1 (416) 555-0142",
      location: "Toronto, ON",
      summary: "[demo] Biomanufacturing trainee — aseptic technique, GMP documentation, deviation investigation.",
    },
    sections: [
      {
        id: summarySectionId, kind: "summary", position: 0,
        items: [{
          id: rid(), position: 0,
          // Summary uses `description` (one paragraph), not bullets.
          description: "[demo] Manufacturing-process trainee with 8 months of bench experience across two GMP environments. Comfortable owning aseptic gowning audits, deviation investigations, and SOP rollovers end-to-end. Looking for a fall-2026 internship in upstream bioprocessing.",
          bullets: [],
        }],
      },
      {
        id: expSectionId, kind: "experience", position: 1,
        items: [
          {
            id: stemcellItemId, position: 0,
            title: "Manufacturing Process Intern",
            subtitle: "STEMCELL Technologies · Vancouver",
            // Structured dates with `current: false` — explicit end date.
            // `dateRange` kept as a fallback for any client that hasn't
            // upgraded to read the structured fields yet.
            startDate: "May 2025",
            endDate:   "Aug 2025",
            current:   false,
            dateRange: "May 2025 – Aug 2025",
            description: "[demo] Summer co-op rotating through the upstream cell-culture group; bench work on shake-flask scale plus SOP authoring with the process-engineering team.",
            bullets: [
              {
                id: stemcellBullet1, position: 0,
                body: "[demo] Ran 14 shake-flask cultures across two cell lines (HEK293 + CHO-K1), holding contamination below the team's 2% threshold for the rotation.",
              },
              {
                id: stemcellBullet2, position: 1,
                body: "[demo] Co-authored an SOP rollover for aseptic gowning using a paired-shadow flow that cut new-hire certification time from 3 weeks to 4 days.",
              },
              {
                id: stemcellBullet3, position: 2,
                body: "[demo] Built a deviation tracker in Smartsheet that two adjacent teams adopted before the end of the rotation.",
              },
            ],
          },
          {
            id: veridiomItemId, position: 1,
            title: "QA Documentation Assistant",
            subtitle: "Veridiom Therapeutics · Toronto",
            // Current role demo — `current: true` so the editor renders
            // "Present" and hides the end-date field.
            startDate: "Jan 2025",
            endDate:   "",
            current:   true,
            dateRange: "Jan 2025 – Present",
            description: "[demo] Part-time QA documentation role alongside coursework; supporting the eQMS migration team.",
            bullets: [
              {
                id: veridiomBullet1, position: 0,
                body: "[demo] Shepherded 12 of 40 high-risk SOPs through change-control ahead of a pre-PAI audit; all signed off with 7 days of slack on the deadline.",
              },
              {
                id: veridiomBullet2, position: 1,
                body: "[demo] Maintained the deviation log and ran a 15-minute standup three times a week with blocked owners.",
              },
            ],
          },
        ],
      },
      {
        id: skillsSectionId, kind: "skills", position: 2,
        items: [{
          id: rid(), position: 0, bullets: [
            { id: rid(), position: 0, body: "Aseptic technique · BSL-2 trained" },
            { id: rid(), position: 1, body: "GMP documentation · eQMS change-control" },
            { id: rid(), position: 2, body: "Cell culture · shake-flask + bioreactor sampling" },
            { id: rid(), position: 3, body: "Deviation investigation · root-cause analysis" },
            { id: rid(), position: 4, body: "Python · pandas / matplotlib for batch-data analysis" },
          ],
        }],
      },
      {
        id: eduSectionId, kind: "education", position: 3,
        items: [{
          id: rid(), position: 0,
          title: "BSc Biotechnology, Honours",
          subtitle: "University of Toronto",
          startDate: "Sep 2022",
          endDate:   "Apr 2026",
          current:   true,
          dateRange: "Sep 2022 – Apr 2026 (expected)",
          metric:    "GPA 3.82 / 4.0",
          bullets: [
            { id: rid(), position: 0, body: "Thesis: contamination-rate modelling in mammalian-cell production runs." },
            { id: rid(), position: 1, body: "Relevant coursework: Bioprocess Engineering, Cell Culture, Pharmaceutical QA." },
          ],
        }],
      },
    ],
  };

  // 3. Upsert the Resume row with the demo content. Increment version
  //    on every re-seed so the revision snapshot below is unique.
  //    Wrapped in try/catch so a Prisma error returns a useful note
  //    in the admin UI instead of bubbling to a flat 500.
  //    Multi-resume aware: target the admin's most-recently-edited
  //    non-archived resume; create one if none exists. We DON'T
  //    create a new sibling on every reseed — that would pollute
  //    the picker with "Main resume", "Main resume (2)", etc.
  let resumeId: string;
  let resumeVersion: number;
  try {
    const existing = await prisma.resume.findFirst({
      where: { userId, isArchived: false },
      orderBy: { lastEditedAt: "desc" },
      select: { id: true, version: true },
    });
    if (existing) {
      const updated = await prisma.resume.update({
        where: { id: existing.id },
        data: {
          content: content as unknown as object,
          version: existing.version + 1,
          lastEditedAt: new Date(),
        },
        select: { id: true, version: true },
      });
      resumeId = updated.id;
      resumeVersion = updated.version;
    } else {
      const created = await prisma.resume.create({
        data: {
          userId,
          name: "Main resume",
          content: content as unknown as object,
          version: 1,
          lastEditedAt: new Date(),
        },
        select: { id: true, version: true },
      });
      resumeId = created.id;
      resumeVersion = created.version;
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[demo-seed user_resume] upsert failed:", msg);
    return { created: 0, note: `Resume upsert failed: ${msg.slice(0, 200)}` };
  }

  // 4. Snapshot the revision so the version-history surface has data.
  try {
    // Use the coalescing helper. Re-seeds within 5 min update the
    // existing seed row instead of stacking — admins re-seed
    // repeatedly while testing and the history shouldn't fill up.
    await recordRevision(prisma, {
      resumeId,
      version: resumeVersion,
      content: content as unknown as object,
      triggeredBy: "user",
      note: "[demo] Seeded by /api/admin/demo-seed",
    });
  } catch (err) {
    // Revision row is nice-to-have, not blocking — log + continue so
    // the resume + comments still land.
    console.error("[demo-seed user_resume] revision insert failed:", err);
  }

  // 5. Three mentor comments anchored at varying granularity, so the
  //    /profile/resume page shows the inline-thread UX across the
  //    most common comment-pinning shapes.
  const commentSeeds: Array<{
    anchorBulletId: string;
    anchorItemId: string;
    anchorSectionId: string;
    body: string;
  }> = [
    {
      anchorBulletId: stemcellBullet1,
      anchorItemId: stemcellItemId,
      anchorSectionId: expSectionId,
      body: "[demo] The 2% threshold lands well — say which cell lines, recruiters skim for the specifics.",
    },
    {
      anchorBulletId: stemcellBullet2,
      anchorItemId: stemcellItemId,
      anchorSectionId: expSectionId,
      body: "[demo] Strong delta (3 weeks → 4 days). Consider naming the method (\"paired-shadow flow\") so the *action* is concrete, not just the result.",
    },
    {
      anchorBulletId: veridiomBullet1,
      anchorItemId: veridiomItemId,
      anchorSectionId: expSectionId,
      body: "[demo] \"Shepherded\" reads vague — was that 12 of how many? Throughput is what an audit-shop hiring manager looks for here.",
    },
  ];
  let createdComments = 0;
  const errors: string[] = [];
  for (const c of commentSeeds) {
    try {
      await prisma.resumeComment.create({
        data: {
          resumeId,
          authorId: mentorId,
          authorRole: "industrial_mentor",
          anchorBulletId: c.anchorBulletId,
          anchorItemId: c.anchorItemId,
          anchorSectionId: c.anchorSectionId,
          body: c.body,
          status: "open",
        },
      });
      createdComments++;
    } catch (err) {
      errors.push(err instanceof Error ? err.message : String(err));
    }
  }

  // Count both the resume tree (1) and the mentor comments so the UI
  // tally reflects what the admin will visibly see on /profile/resume.
  return {
    created: 1 + createdComments,
    note:
      errors.length > 0
        ? `${errors.length} comment(s) failed — visit /profile/resume to inspect.`
        : `1 resume tree + ${createdComments} mentor comments — open /profile/resume.`,
  };
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
    else if (entity === "user_star_story") {
      if (!reviewerId) return NextResponse.json({ error: "Session missing user id." }, { status: 400 });
      const detail = await seedUserStarStories(reviewerId);
      created = detail.created;
      note = detail.note;
    }
    else if (entity === "user_buddy_pair") {
      if (!reviewerId) return NextResponse.json({ error: "Session missing user id." }, { status: 400 });
      const detail = await seedUserBuddyPairs(reviewerId);
      created = detail.created;
      note = detail.note;
    }
    else if (entity === "user_matches") {
      if (!reviewerId) return NextResponse.json({ error: "Session missing user id." }, { status: 400 });
      const detail = await seedUserMatchesScenario(reviewerId);
      created = detail.created;
      note = detail.note;
    }
    else if (entity === "user_resume") {
      if (!reviewerId) return NextResponse.json({ error: "Session missing user id." }, { status: 400 });
      const detail = await seedUserResume(reviewerId);
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
