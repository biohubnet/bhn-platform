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
  // Platform-wide entity (no user scope) — every row is authored by
  // the calling admin and carries a [demo] title prefix so the clear
  // pass can pick it out without touching real announcements.
  "announcement",
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
  "user_resumes_10",
  "user_job_folder",
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

// ── Job-folder samples ───────────────────────────────────────────
// Four fully-populated folders that span the pipeline (drafting →
// offer) so the index has live status chips, real cover-letter and
// interview-prep text in each row, and feels like a real workspace
// when a staff reviewer opens the page. Every title is prefixed
// "[demo]" so the matching clear pass can find them with a startsWith
// filter and never accidentally touch a real folder.

const JOB_FOLDER_SAMPLES: Array<{
  title: string;
  jdSnippet: string;
  coverLetter: string;
  interviewPrep: string;
  status: "drafting" | "submitted" | "interviewing" | "offer";
}> = [
  {
    title: "[demo] Veridiom Therapeutics · Manufacturing Process Associate",
    status: "drafting",
    jdSnippet:
      "Veridiom is hiring a Manufacturing Process Associate (16-week co-op) to support our cell-therapy manufacturing suite. You'll run aseptic operations, support batch records under cGMP, troubleshoot bioreactor parameters, and contribute to deviation investigations. Required: aseptic technique, basic bioprocess familiarity, attention to documentation. Nice to have: GMP coursework, hands-on bioreactor experience, root-cause analysis exposure.",
    coverLetter:
      "Dear Veridiom Hiring Team,\n\nI'm writing to apply for the Manufacturing Process Associate co-op. Two of my courses last term — Bioprocess Engineering and Quality Systems in GMP — map directly to what your posting calls out, and a summer placement at a cell-culture lab gave me 12 weeks of aseptic-technique muscle memory.\n\nThe part of your posting that pulled me in was deviation investigations. In my placement I ran the root-cause exercise after three back-to-back shake-flask contaminations and traced the issue to a short autoclave cycle. The fix became a daily watch metric. I'd like to bring that same patience for the paper trail to your floor.\n\nI'm available the full 16 weeks starting in May and can relocate to Toronto for the term.\n\nThank you for the consideration,\nDemo Trainee",
    interviewPrep:
      "## Likely questions\n\n1. Walk me through your aseptic gowning protocol.\n2. Tell me about a time you caught a deviation.\n3. What's the difference between cGMP and GLP — and which applies here?\n4. How do you keep a batch record clean when you're rushed?\n\n## STAR moments to lead with\n\n- **Cell-culture contamination root-cause** — three flasks → autoclave-cycle deviation → daily watch metric. Lands the GMP + investigations angle.\n- **Aseptic gowning audit** — paired-shadow protocol for two new trainees, zero fails. Lands the mentoring + SOP fluency angle.\n\n## Questions to ask them\n\n- How does the suite split between cell-therapy and gene-therapy lines?\n- Who owns deviation review — is there a CAPA board I'd sit on as an associate?\n- What's the cadence on batch-record review training?",
  },
  {
    title: "[demo] LumenBio · Cell Culture Scientist Intern",
    status: "submitted",
    jdSnippet:
      "LumenBio is looking for a Cell Culture Scientist Intern (12 weeks, hybrid) to support our discovery pipeline. The intern will run shake-flask and small-scale bioreactor cultures, perform cell-viability and metabolite assays, and help develop a fed-batch process for a new cell line. Required: cell culture coursework, basic statistics, comfort in BSL-2. Nice to have: Pichia or CHO experience, DoE familiarity, Python for data clean-up.",
    coverLetter:
      "Hi LumenBio team,\n\nI'm applying for the Cell Culture Scientist Intern role. My final-year thesis was a Pichia pastoris fed-batch optimisation, so the small-scale bioreactor work you describe is the work I've been training toward.\n\nA few specifics from the posting that I can speak to:\n\n- **DoE** — I ran a small two-factor design comparing methanol feed rate against agitation. Modest sample size, but the analysis taught me how to write a clean response-surface report.\n- **Python for clean-up** — I wrote the pandas pipeline that took our 18,400-row metabolite-assay export and turned it into a usable weekly chart for the PI.\n- **BSL-2 fluency** — full year of supervised work; my supervisor cleared me to run unsupervised the second term.\n\nHappy to interview on short notice — I've already blocked the next two Tuesdays.\n\nBest,\nDemo Trainee",
    interviewPrep:
      "## Likely questions\n\n1. What's the difference between batch, fed-batch, and perfusion — and when would you pick each?\n2. Walk me through your Pichia fed-batch.\n3. How do you decide a culture has crashed vs. just drifted?\n4. Tell me about a time you used a DoE.\n\n## STAR moments to lead with\n\n- **Bioreactor failed mid-run** — pH probe drift → manual recalibration → batch saved within 3% of historical yield. Lands the troubleshooting + decision-under-pressure angle.\n- **Dataset clean-up** — pandas pipeline → grant figure → cited in the conference poster. Lands the Python + DoE-adjacent angle.\n\n## Questions to ask them\n\n- Is the new cell line CHO, Pichia, or something else?\n- How do interns plug into the DoE planning — observer or running their own factor?\n- What's the hand-off between discovery and process development?",
  },
  {
    title: "[demo] PolarMed Devices · Quality Engineer Intern",
    status: "interviewing",
    jdSnippet:
      "PolarMed Devices is hiring a Quality Engineer Intern (8 months, on-site Mississauga) to support our 510(k) submission cycle and post-market surveillance. The intern will draft and update SOPs, support design-control documentation, participate in CAPA investigations, and help with internal audit prep. Required: ISO 13485 awareness, technical writing, attention to detail. Nice to have: medical-device coursework, MDSAP exposure, statistical-process-control basics.",
    coverLetter:
      "Dear PolarMed,\n\nI'm applying for the Quality Engineer Intern position. The 8-month length and the mix of 510(k) work, CAPA, and audit prep is exactly the kind of cycle I want to live through before deciding whether QA/RA is my path.\n\nFrom the posting:\n\n- **SOP authoring** — I coordinated 40 GMP SOP migrations to an electronic QMS on a 6-week deadline. All 40 were live with seven days to spare and the next inspection passed clean.\n- **ISO 13485** — I took a 12-week course last fall and shadowed a real internal audit at my placement; happy to talk through what I saw.\n- **Technical writing** — most of my placement deliverables were SOPs, deviation reports, and one CAPA investigation summary. The CAPA was 11 pages; I can bring a redacted copy if useful.\n\nMy on-site availability is the full 8 months from January.\n\nThanks for the consideration,\nDemo Trainee",
    interviewPrep:
      "## Likely questions\n\n1. What's the difference between a deviation and a CAPA?\n2. Walk me through ISO 13485 clause 8.2.\n3. How do you decide whether a corrective action needs to escalate to a CAPA?\n4. Have you ever written an SOP that someone else had to follow — what did you change after their feedback?\n\n## STAR moments to lead with\n\n- **40 SOP rollover** — change-control board, three-times-a-week standup, 12 highest-risk SOPs personally owned, clean inspection. Lands the project-management + QMS angle.\n- **Cell-culture contamination CAPA** — root-cause + written brief format that the lead later adopted as the team standard. Lands the technical-writing + RCA angle.\n\n## Questions to ask them\n\n- Where is the team in the 510(k) cycle right now — drafting, response to FDA, or post-clearance?\n- Are interns involved in MDR investigations or only design-control?\n- What's the cadence on internal audits in an 8-month window — would I see a full cycle?",
  },
  {
    title: "[demo] BioFen Analytics · Data Science Intern",
    status: "offer",
    jdSnippet:
      "BioFen Analytics builds remote-monitoring software for inhaled-medication adherence. We're hiring a Data Science Intern (16 weeks, remote-friendly) to clean a large device-telemetry export, build a weekly adherence dashboard, and prototype a drop-off predictor. Required: Python (pandas, numpy, matplotlib), basic statistics, comfort owning a messy dataset end-to-end. Nice to have: scikit-learn, public-health exposure, Git fluency.",
    coverLetter:
      "Hi BioFen team,\n\nI'm writing to apply for the Data Science Intern role. Your posting describes almost exactly the work I did on placement last summer — except the dataset I cleaned was about half the size, so I'm hungry to work on a bigger one.\n\nThe specifics:\n\n- **Pandas + matplotlib** — 18,400-row telemetry export → cleaned, deduplicated, forward-filled small gaps, rejected long-gap participants → weekly adherence chart used in a $215K grant.\n- **Owning the messy end-to-end** — the lab's PI didn't have a Python person, so the cleaning script was mine to author and document. The next placement student inherited it; my notes are why they could pick it up in a week.\n- **scikit-learn** — comfortable with the basics (logistic regression, train/test split, a confusion matrix). Not a research-grade modeller yet — but I'd love this internship to be the one where I get there under proper supervision.\n\nThank you,\nDemo Trainee",
    interviewPrep:
      "## Likely questions\n\n1. How do you decide whether to forward-fill, interpolate, or drop a gap?\n2. Walk me through how you'd build a baseline drop-off predictor.\n3. What's the difference between AUC and accuracy — and which would you report to a clinical-team stakeholder?\n4. Tell me about a dataset you owned end-to-end.\n\n## STAR moments to lead with\n\n- **Dataset clean-up** — 18,400 rows, 6% test-fires dropped, 50-row sanity check against device logs, weekly rolling-mean chart, grant awarded. Lands the end-to-end + clinical-comms angle.\n- **Cross-team handoff** — diff document to break a stuck handoff. Lands the communication + ownership angle in case they pivot away from pure-technical questions.\n\n## Questions to ask them\n\n- Is the drop-off predictor expected to ship to production or stay internal?\n- What's the team's stack — Jupyter notebooks, scripts, or something more structured?\n- How is intern work reviewed — pair review, async PR, or stand-alone?",
  },
];

async function seedUserJobFolders(userId: string): Promise<SeedDetail> {
  let created = 0;
  const errors: string[] = [];
  for (const f of JOB_FOLDER_SAMPLES) {
    try {
      await prisma.jobFolder.create({
        data: {
          userId,
          title:         f.title,
          jdSnippet:     f.jdSnippet,
          coverLetter:   f.coverLetter,
          interviewPrep: f.interviewPrep,
          status:        f.status,
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

/** Seed ten plausibly-named demo resumes for the calling admin so the
 *  /profile/resumes index has real content to lay out against.
 *  Each row shares the same skeleton tree (see makeDemoResumeContent
 *  below) with the header.summary varied so the resumes look like
 *  ten different tailored copies of the admin's main resume — which
 *  is the realistic shape an active user reaches.
 *
 *  No mentor comments or revisions are written — those add weight to
 *  a single-resume seed for the editor demo, but ten resumes' worth
 *  of comments would clutter the index. Each row's `name` and
 *  header.summary carries a [demo] tag so the clear path can
 *  unambiguously delete what this function planted (the existing
 *  user_resume clear already drops all of the admin's resumes via
 *  userId, which is sufficient).
 */
async function seedTenUserResumes(userId: string): Promise<SeedDetail> {
  // Distinct names + summaries so the index doesn't read as ten
  // identical cards. Tailored-to-posting copies are the most
  // realistic case once a user has been on the platform a while.
  const variants: { name: string; summary: string }[] = [
    {
      name: "[demo] Main resume",
      summary: "[demo] Biomanufacturing trainee with bench experience across upstream cell-culture and QA documentation. Aseptic-trained; comfortable owning deviation investigations end-to-end.",
    },
    {
      name: "[demo] Academic CV",
      summary: "[demo] Research-track biotechnology undergraduate with a contamination-rate modelling thesis. Looking for graduate research roles in mammalian-cell process science.",
    },
    {
      name: "[demo] Tailored · Process Engineer @ STEMCELL",
      summary: "[demo] Process-engineering-leaning resume rewritten around upstream scale-up and SOP authorship. Targets the STEMCELL Manufacturing Process Engineer role.",
    },
    {
      name: "[demo] Tailored · QC Technician @ Veridiom",
      summary: "[demo] QC-leaning resume foregrounding eQMS migration, change-control, and the deviation log work at Veridiom. Targets the QC Technician posting.",
    },
    {
      name: "[demo] Tailored · Bioreactor Operator @ AbCellera",
      summary: "[demo] Operations-leaning resume centred on bioreactor sampling cadence and contamination thresholds. Targets the AbCellera Bioreactor Operator posting.",
    },
    {
      name: "[demo] Tailored · GMP Documentation @ AstraZeneca",
      summary: "[demo] Documentation-leaning resume foregrounding SOP rollover and pre-PAI audit prep. Targets the AstraZeneca GMP Documentation Specialist posting.",
    },
    {
      name: "[demo] Tailored · Upstream Scientist @ Sanofi",
      summary: "[demo] Upstream-bioprocessing-leaning resume highlighting HEK293 + CHO-K1 shake-flask work. Targets the Sanofi Upstream Scientist II role.",
    },
    {
      name: "[demo] Tailored · Downstream Engineer @ Regeneron",
      summary: "[demo] Downstream-leaning resume rewritten around purification + buffer-prep adjacencies inferred from the shake-flask + bioreactor experience. Targets the Regeneron Downstream Engineer posting.",
    },
    {
      name: "[demo] Industrial mentor application",
      summary: "[demo] Mentorship-focused resume foregrounding the gowning SOP rollover (3 weeks → 4 days for new hires) and the cross-team Smartsheet deviation tracker adoption. Targets the BHN industrial-mentor pool.",
    },
    {
      name: "[demo] Co-op summary",
      summary: "[demo] Summary-only co-op resume reformatted as a one-page tear-sheet: lead with current studies + most recent role, two-line per bullet, no Skills section.",
    },
  ];

  let created = 0;
  const failures: string[] = [];
  for (const v of variants) {
    try {
      await prisma.resume.create({
        data: {
          userId,
          name: v.name,
          content: makeDemoResumeContent(v.summary) as unknown as object,
          version: 1,
          lastEditedAt: new Date(),
        },
        select: { id: true },
      });
      created++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      failures.push(`${v.name}: ${msg.slice(0, 120)}`);
      console.error("[demo-seed user_resumes_10] create failed:", v.name, msg);
    }
  }

  return {
    created,
    note:
      failures.length > 0
        ? `${created} of ${variants.length} seeded; ${failures.length} failed — see server logs.`
        : `${created} resume rows on /profile/resumes — open the page to see them.`,
  };
}

/** Build a skeleton resume content tree with a configurable header
 *  summary. Same shape as seedUserResume's content but trimmed of
 *  the per-bullet ids that anchor mentor comments (we don't seed
 *  comments for these). Adequate detail so the resume thumbnails
 *  on /profile/resumes look populated, not empty.
 */
function makeDemoResumeContent(summary: string): ResumeContent {
  return {
    header: {
      name: "Demo Admin",
      email: "demo@bhn.test",
      phone: "+1 (416) 555-0142",
      location: "Toronto, ON",
      summary,
    },
    sections: [
      {
        id: rid(), kind: "experience", position: 0,
        items: [
          {
            id: rid(), position: 0,
            title: "Manufacturing Process Intern",
            subtitle: "STEMCELL Technologies · Vancouver",
            startDate: "May 2025",
            endDate:   "Aug 2025",
            current:   false,
            dateRange: "May 2025 – Aug 2025",
            description: "Summer co-op rotating through the upstream cell-culture group.",
            bullets: [
              { id: rid(), position: 0, body: "Ran 14 shake-flask cultures across HEK293 + CHO-K1, holding contamination below the team's 2% threshold." },
              { id: rid(), position: 1, body: "Co-authored an SOP rollover for aseptic gowning that cut new-hire certification from 3 weeks to 4 days." },
              { id: rid(), position: 2, body: "Built a deviation tracker in Smartsheet that two adjacent teams adopted." },
            ],
          },
          {
            id: rid(), position: 1,
            title: "QA Documentation Assistant",
            subtitle: "Veridiom Therapeutics · Toronto",
            startDate: "Jan 2025",
            endDate:   "",
            current:   true,
            dateRange: "Jan 2025 – Present",
            description: "Part-time QA documentation role alongside coursework.",
            bullets: [
              { id: rid(), position: 0, body: "Shepherded 12 of 40 high-risk SOPs through change-control ahead of a pre-PAI audit." },
              { id: rid(), position: 1, body: "Maintained the deviation log + ran a 15-minute standup three times a week." },
            ],
          },
        ],
      },
      {
        id: rid(), kind: "skills", position: 1,
        items: [{
          id: rid(), position: 0, bullets: [
            { id: rid(), position: 0, body: "Aseptic technique · BSL-2 trained" },
            { id: rid(), position: 1, body: "GMP documentation · eQMS change-control" },
            { id: rid(), position: 2, body: "Cell culture · shake-flask + bioreactor sampling" },
            { id: rid(), position: 3, body: "Deviation investigation · root-cause analysis" },
          ],
        }],
      },
      {
        id: rid(), kind: "education", position: 2,
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
}

// ── Announcement samples ─────────────────────────────────────────
// Three platform-wide rows that exercise every Announcement render
// path: pinned, course-scoped, and a plain note. Author is the
// calling admin (real id) so the announcement reads as posted by a
// human; the [demo] title prefix is what the clear pass scans for.

const ANNOUNCEMENT_SAMPLES: Array<{
  title: string;
  body: string;
  pinned: boolean;
  /** When true, link to the first published course on the platform.
   *  Falls back to platform-wide if none exists. */
  attachToFirstCourse?: boolean;
}> = [
  {
    title: "[demo] Platform maintenance window — Sunday 02:00–04:00 ET",
    body: "We'll be running the next round of upgrades on Sunday morning. The platform stays available throughout, but you may briefly see stale dashboards. Live scoring will resume within ten minutes of the window closing. No action required.",
    pinned: true,
  },
  {
    title: "[demo] New cohort drop — winter intake applications open",
    body: "Winter-intake applications are now live on the talent-pool form. The review queue typically clears within five business days; you'll receive an email when a decision lands. Industry partners have already been previewing the shortlist daily — strong portfolios are getting picked off fast.",
    pinned: false,
  },
  {
    title: "[demo] Course-scoped — new SCORM scenario for Aseptic Technique",
    body: "Module 4 of the Aseptic Technique pathway has a new SCORM scenario landed today: a gowning-audit walk-through with an instructor-marked deviation report. Counts toward your completion certificate. Estimated time: 35 minutes.",
    pinned: false,
    attachToFirstCourse: true,
  },
];

async function seedAnnouncements(authorId: string): Promise<SeedDetail> {
  // Pull one published course as the course-scoped sample's target;
  // if none exists, the third sample silently falls back to
  // platform-wide so the seed never errors on a fresh DB.
  const firstCourse = await prisma.course.findFirst({
    where: { status: "published" },
    select: { id: true },
    orderBy: { createdAt: "asc" },
  });

  let created = 0;
  const errors: string[] = [];
  for (const a of ANNOUNCEMENT_SAMPLES) {
    try {
      await prisma.announcement.create({
        data: {
          title: a.title,
          body: a.body,
          pinned: a.pinned,
          authorId,
          courseId: a.attachToFirstCourse ? firstCourse?.id ?? null : null,
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
  return {
    created,
    note: errors.length > 0 ? `${errors.length} row(s) failed` : undefined,
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
    else if (entity === "announcement") {
      if (!reviewerId) return NextResponse.json({ error: "Session missing user id." }, { status: 400 });
      const detail = await seedAnnouncements(reviewerId);
      created = detail.created;
      note = detail.note;
    }
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
    else if (entity === "user_resumes_10") {
      // Spawn ten plausibly-named resume rows for the calling admin
      // so the /profile/resumes index has real content to lay out
      // against. All ten are siblings (no derivation chain) so the
      // listing renders them in last-edited order.
      if (!reviewerId) return NextResponse.json({ error: "Session missing user id." }, { status: 400 });
      const detail = await seedTenUserResumes(reviewerId);
      created = detail.created;
      note = detail.note;
    }
    else if (entity === "user_job_folder") {
      if (!reviewerId) return NextResponse.json({ error: "Session missing user id." }, { status: 400 });
      const detail = await seedUserJobFolders(reviewerId);
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
