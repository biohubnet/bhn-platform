/**
 * Demo workspace seeder. Spawns a *populated* demo environment for a
 * prospective partner: an Employer HR account, three sample postings
 * across different states, ten sample applicants spread across the
 * kanban funnel, two scheduled interviews, ratings + notes — so when
 * the prospect lands they walk into a "lived-in" portal rather than
 * an empty shell.
 *
 * All accounts and rows are tagged accountKind="demo" with a
 * demoExpiresAt timestamp. The sweeper at /api/admin/demo-workspaces/cleanup
 * deletes everything once the timer runs out.
 */
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { randomBytes } from "crypto";
import type { Prisma } from "@prisma/client";

interface DemoSeedInput {
  email: string;
  companyName: string;
  visitorName?: string | null;
  websiteUrl?: string | null;
  expiresAt: Date;
  mintedByAdminId: string;
}

interface DemoSeedResult {
  employerId: string;
  employerEmail: string;
  password: string;
  postings: { id: string; title: string }[];
  applicantsCreated: number;
  interviewsCreated: number;
}

const SAMPLE_FIRST_NAMES = [
  "Avery", "Priya", "Mark", "Sarah", "Diego", "Maya", "Liam",
  "Imani", "Sho", "Camille", "Theo", "Naomi",
];
const SAMPLE_LAST_NAMES = [
  "Chen", "Ramachandran", "Sullivan", "Liang", "Morales", "Patel",
  "O'Brien", "Adeyemi", "Okada", "Roy", "Singh", "Watanabe",
];

export async function spawnDemoWorkspace(input: DemoSeedInput): Promise<DemoSeedResult> {
  const password = `demo-${randomBytes(4).toString("hex")}`;
  const passwordHash = await bcrypt.hash(password, 10);

  // 1. Demo employer account ─────────────────────────────────────
  const slug = input.email.split("@")[0].toLowerCase().replace(/[^a-z0-9]/g, "");
  const demoEmail = `demo.${slug}.${randomBytes(3).toString("hex")}@biohubnet.test`;
  const employer = await prisma.user.create({
    data: {
      email: demoEmail,
      name: input.visitorName ?? "Demo Visitor",
      password: passwordHash,
      role: "employer",
      employerCompany: input.companyName,
      companyWebsite: input.websiteUrl ?? null,
      companyDescription: `Demo workspace for ${input.companyName} — pre-populated with sample data so you can explore the platform without setup.`,
      companyIndustry: "Demo / Trial",
      companySize: "11-50",
      allowPlatformContent: false,
      emailVerified: new Date(),
      isActive: true,
      accountKind: "demo",
      demoExpiresAt: input.expiresAt,
      createdByAdminId: input.mintedByAdminId,
    },
  });

  // 2. Three sample postings ─────────────────────────────────────
  const postingDefs = [
    {
      title: `Bioprocess Development Intern (Demo)`,
      status: "active",
      keySkills: ["Cell Culture", "Aseptic Technique", "GMP", "HPLC"],
      positionDetails: `${input.companyName} is hiring a Bioprocess Development Intern to support our pilot plant. You'll work alongside senior scientists on USP/DSP optimisation, run controlled bioreactor experiments, and assist with analytical method development. Looking for: hands-on bench experience, comfort with sterile technique, curiosity about scaling biology. Bonus: Python data analysis.`,
    },
    {
      title: `QC Analyst Co-op (Demo)`,
      status: "active",
      keySkills: ["ELISA", "HPLC", "GMP", "Quality Control"],
      positionDetails: `${input.companyName} is recruiting a QC Analyst Co-op to support release testing. You'll run ELISA, HPLC, and bioassays against established methods, document results in EBR, and participate in OOS / OOT investigations under direct mentorship of senior analysts. Open to undergrads in life sciences with strong analytical chemistry foundations.`,
    },
    {
      title: `Process Scientist — Cell Therapy (Demo)`,
      status: "draft",
      keySkills: ["Cell Therapy", "CAR-T", "Aseptic Technique", "Tech Transfer"],
      positionDetails: `${input.companyName} is hiring a Process Scientist for our autologous CAR-T programme. You'll own SOPs from bench to GMP suite, qualify equipment, train manufacturing operators, and partner with QA on PPQ. Must have: 3+ years cell therapy experience.`,
    },
  ];

  const postings = await Promise.all(
    postingDefs.map((p) =>
      prisma.internshipPosting.create({
        data: {
          companyName: input.companyName,
          website: input.websiteUrl ?? null,
          title: p.title,
          duration: "4 months",
          hours: "Full-time",
          location: "Toronto, ON (hybrid)",
          type: "Internship / Co-op",
          compensation: "$25/hr",
          deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          keySkills: p.keySkills,
          positionDetails: p.positionDetails,
          status: p.status,
          createdById: employer.id,
        },
        select: { id: true, title: true },
      })
    )
  );

  // 3. Ten sample applicants ─────────────────────────────────────
  // Each gets a UserSkill profile and an ApplicationStatus distributed
  // across the funnel for visual realism.
  const allSkills = await prisma.skill.findMany({
    where: { status: "active" },
    select: { id: true, name: true },
    take: 30,
    orderBy: { name: "asc" },
  });
  const skillByName = new Map(allSkills.map((s) => [s.name, s.id]));

  const STATUSES_DISTRIBUTION = [
    "new", "new", "new",
    "reviewing", "reviewing",
    "shortlisted", "shortlisted",
    "phone_screen",
    "onsite",
    "offer",
  ];

  const applicantsCreated: { id: string; name: string | null }[] = [];
  for (let i = 0; i < STATUSES_DISTRIBUTION.length; i++) {
    const first = pick(SAMPLE_FIRST_NAMES);
    const last  = pick(SAMPLE_LAST_NAMES);
    const status = STATUSES_DISTRIBUTION[i];
    const aEmail = `demo.${slug}.applicant-${i}.${randomBytes(2).toString("hex")}@biohubnet.test`;
    const a = await prisma.user.create({
      data: {
        email: aEmail,
        name: `${first} ${last}`,
        password: passwordHash,
        role: "trainee",
        bio: pickBio(first, i),
        organization: pick(["University of Toronto", "McGill University", "UBC", "Western University"]),
        jobTitle: pick(["Graduate student", "Co-op student", "Recently graduated", "Career changer"]),
        country: "Canada",
        emailVerified: new Date(),
        isActive: true,
        accountKind: "demo",
        demoExpiresAt: input.expiresAt,
        createdByAdminId: input.mintedByAdminId,
      },
      select: { id: true, name: true, email: true },
    });
    applicantsCreated.push({ id: a.id, name: a.name });

    // Attach 4-7 random skills to give them a realistic profile.
    const pickCount = 4 + (i % 4);
    const picked = shuffle(allSkills).slice(0, pickCount);
    for (const sk of picked) {
      await prisma.userSkill.create({
        data: {
          userId: a.id,
          skillId: sk.id,
          level: 0.4 + Math.random() * 0.5,
          source: i % 3 === 0 ? "self" : i % 3 === 1 ? "resume" : "inferred",
        },
      }).catch(() => undefined);
    }

    // Application status row attaching them to the FIRST posting.
    await prisma.applicationStatus.create({
      data: {
        postingId: postings[0].id,
        applicantId: a.id,
        status,
        rating: status === "shortlisted" || status === "offer" ? 4 : status === "phone_screen" ? 3 : null,
        notes: status === "offer"
          ? "Strong on USP, walks the talk on aseptic technique. Make an offer."
          : status === "phone_screen"
            ? "Solid resume — set up a 30-min screen for next week."
            : null,
        updatedById: employer.id,
      },
    }).catch(() => undefined);

    // Submission for the talent application form (if available).
    const taForm = await prisma.eventForm.findFirst({
      where: { slug: "talent-application" }, select: { id: true },
    });
    if (taForm) {
      const subData: Prisma.JsonObject = {
        first_name: first,
        last_name: last,
        email: a.email,
        applicant_id: `BHDEMO${String(i + 1).padStart(3, "0")}`,
        current_position: "Graduate Program",
        earliest_availability: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
        locations: ["Ontario", "Quebec"],
        citizenship: ["Canadian Citizen"],
        pitch: pickBio(first, i),
        consent: ["I have read and agreed to the privacy notice and terms above."],
      };
      await prisma.eventFormSubmission.create({
        data: { formId: taForm.id, userId: a.id, email: a.email, data: subData },
      }).catch(() => undefined);
    }
  }

  // 4. Two scheduled interviews ──────────────────────────────────
  // For the phone_screen and onsite applicants — proves out the flow.
  const phoneScreen = applicantsCreated[7];
  const onsite      = applicantsCreated[8];
  let interviewsCreated = 0;
  if (phoneScreen) {
    const slot1 = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000); slot1.setHours(10, 0, 0, 0);
    const slot2 = new Date(Date.now() + 4 * 24 * 60 * 60 * 1000); slot2.setHours(14, 0, 0, 0);
    await prisma.interview.create({
      data: {
        postingId: postings[0].id,
        applicantId: phoneScreen.id,
        scheduledById: employer.id,
        proposedSlots: [slot1.toISOString(), slot2.toISOString()] as unknown as Prisma.InputJsonValue,
        format: "video",
        location: "https://meet.example.com/demo-screen",
        notes: "Quick 30-min screen to talk through your bioreactor experience and recent project.",
      },
    }).catch(() => undefined);
    interviewsCreated++;
  }
  if (onsite) {
    const accepted = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); accepted.setHours(11, 0, 0, 0);
    await prisma.interview.create({
      data: {
        postingId: postings[0].id,
        applicantId: onsite.id,
        scheduledById: employer.id,
        proposedSlots: [accepted.toISOString()] as unknown as Prisma.InputJsonValue,
        acceptedSlot: accepted,
        status: "accepted",
        format: "onsite",
        location: "BHN HQ — Toronto",
        notes: "Onsite panel: 30 min with the PD lead, 30 min with QA, 30 min with the team.",
        respondedAt: new Date(),
      },
    }).catch(() => undefined);
    interviewsCreated++;
  }

  return {
    employerId: employer.id,
    employerEmail: employer.email,
    password,
    postings,
    applicantsCreated: applicantsCreated.length,
    interviewsCreated,
  };
}

/** Hard-delete an entire demo workspace by employer id. */
export async function deleteDemoWorkspace(employerId: string): Promise<{ removed: number }> {
  const employer = await prisma.user.findUnique({
    where: { id: employerId },
    select: { id: true, accountKind: true },
  });
  if (!employer || employer.accountKind !== "demo") return { removed: 0 };

  // Find all demo accounts seeded under this admin's mint
  // (the applicants share the same createdByAdminId via the seeder).
  const applicants = await prisma.user.findMany({
    where: { accountKind: "demo", id: { not: employerId } },
    select: { id: true, createdByAdminId: true },
  });
  // We can't perfectly group by minter without a workspaceId. For a
  // single-employer cleanup we just nuke the postings + the employer
  // and let cascade do its thing for status / interviews.
  const postings = await prisma.internshipPosting.findMany({
    where: { createdById: employerId }, select: { id: true },
  });
  const postingIds = postings.map((p) => p.id);
  // Find applicants attached to those postings via ApplicationStatus.
  const linkedStatuses = await prisma.applicationStatus.findMany({
    where: { postingId: { in: postingIds } },
    select: { applicantId: true },
  });
  const linkedIds = new Set(linkedStatuses.map((s) => s.applicantId));

  // Delete dependent rows first.
  await prisma.eventFormSubmission.deleteMany({ where: { userId: { in: Array.from(linkedIds) } } });
  await prisma.internshipPosting.deleteMany({ where: { createdById: employerId } });
  // Delete demo applicants attached to this employer's postings.
  await prisma.user.deleteMany({ where: { id: { in: Array.from(linkedIds) }, accountKind: "demo" } });
  await prisma.user.delete({ where: { id: employerId } });

  return { removed: 1 + linkedIds.size };
}

/** Sweep all expired demo workspaces. Idempotent — safe to call often. */
export async function sweepExpiredDemos(): Promise<{ deleted: number }> {
  const expired = await prisma.user.findMany({
    where: { accountKind: "demo", role: "employer", demoExpiresAt: { lt: new Date() } },
    select: { id: true },
  });
  let deleted = 0;
  for (const e of expired) {
    const r = await deleteDemoWorkspace(e.id);
    deleted += r.removed;
  }
  return { deleted };
}

// ── helpers ──────────────────────────────────────────────────────
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
function pickBio(first: string, i: number) {
  const variants = [
    `Master's student in BME at U of T with hands-on cell-culture and Python data analysis. Three lab rotations covering USP/DSP and bioassays. Drawn to applying ML to bioprocess optimisation.`,
    `Recent PhD in molecular biology with three years of CMC documentation supporting an early-stage gene therapy. Comfortable navigating Health Canada CTAs and FDA pre-IND.`,
    `Six years as a Python data engineer at a fintech, completed BHN biomanufacturing fundamentals + bioprocess data analysis pathways. Looking for junior PD or bioprocess data analyst roles.`,
    `Third-year biology undergrad at McGill. Previous co-op was QC analyst at a vaccine manufacturer — ELISA, plate reading, batch documentation. Comfortable in BSL-2 / cleanrooms.`,
    `Postdoc on AAV capsid engineering wrapping up. Strengths: vector design, transient transfection scale-up, analytical method development. Looking for senior PD or scientist roles in CGT.`,
  ];
  return `${first}: ${variants[i % variants.length]}`;
}
