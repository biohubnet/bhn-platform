/**
 * Self-service demo seeder for HR / employer accounts.
 *
 * Lets an employer (or admin viewing /employer) populate their own
 * workspace with throwaway postings + applicants at a mix of
 * pipeline stages so the rest of the surface has something to play
 * with. Symmetric pair:
 *
 *   POST   /api/employer/demo/seed   → create
 *   DELETE /api/employer/demo/seed   → clear
 *
 * Markings
 *   Every posting created here gets `isDemoSeed = true` so the
 *   clear path can find them by `(createdById, isDemoSeed)` and
 *   sweep the lot. Cascading FKs on ApplicationStatus / Interview /
 *   Offer mean we never need to mark those rows individually.
 *
 * Applicants
 *   We find or create a small pool of demo trainees
 *   (accountKind = "demo", role = "trainee") and reuse them across
 *   postings. Demo users have no demoExpiresAt so the phantom
 *   sweeper leaves them alone; the clear path here only deletes
 *   postings (so a demo user can survive across multiple seed/clear
 *   cycles — useful for keeping applicant-detail bookmarks alive).
 *
 * Stages
 *   Each posting gets six applicants, one per stage:
 *     1. new
 *     2. reviewing
 *     3. shortlisted
 *     4. phone_screen          (with a proposed Interview row)
 *     5. offer                 (with a sent Offer row)
 *     6. rejected              (with a rejectionReason)
 *   stageEnteredAt is staggered so the dashboard's "stale ≥ 7d"
 *   filter has something to chew on too.
 */
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const POSTING_TEMPLATES = [
  {
    title: "Research Associate Intern",
    duration: "4 months",
    hours: "Full-time",
    location: "Toronto, ON",
    type: "Internship",
    compensation: "$22/hr",
    keySkills: ["Cell culture", "PCR", "Western blot", "Documentation"],
    positionDetails:
      "Hands-on wet-lab support across cell-line maintenance, sample prep, and assay readouts. Reports to a senior scientist; you'll join a small team focused on early-stage discovery.",
  },
  {
    title: "Regulatory Affairs Coordinator",
    duration: "6 months",
    hours: "Full-time",
    location: "Hybrid · Toronto",
    type: "Internship",
    compensation: "$24/hr",
    keySkills: ["Health Canada filings", "Document control", "Excel", "Quality systems"],
    positionDetails:
      "Support our regulatory team through document prep, submission tracking, and GxP-aligned record-keeping. Good fit for someone who likes neat systems and is patient with detail.",
  },
  {
    title: "Business Development Analyst",
    duration: "1 month",
    hours: "Part-time",
    location: "Remote · Canada",
    type: "Co-op",
    compensation: "$26/hr",
    keySkills: ["Market research", "Competitive analysis", "Excel modelling", "Deck design"],
    positionDetails:
      "Market-sizing sprints + competitive landscapes for two new product lines. Heavy on synthesis; light on bureaucracy. Mentored by the BD lead with weekly review of your decks.",
  },
];

/** A small pool of realistic-sounding demo applicants. Reused
 *  across postings — the same person might apply to several. */
const APPLICANT_NAMES = [
  "Alex Chen",
  "Priya Patel",
  "Marcus Williams",
  "Sara Mendez",
  "Jordan Kim",
  "Olivia Brown",
  "David Lee",
  "Maya Rodriguez",
];

const STAGES: { status: string; daysAgo: number }[] = [
  { status: "new",            daysAgo: 1  },
  { status: "reviewing",      daysAgo: 4  },
  { status: "shortlisted",    daysAgo: 8  }, // crosses the 7-day stale threshold
  { status: "phone_screen",   daysAgo: 12 },
  { status: "offer",          daysAgo: 5  },
  { status: "rejected",       daysAgo: 14 },
];

function emailFor(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z\s]/g, "")
    .replace(/\s+/g, ".")
    .slice(0, 32);
  return `demo.${slug}@bhn.test`;
}

function daysAgo(n: number): Date {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000);
}

async function ensureDemoApplicants(count: number): Promise<{ id: string; name: string; email: string }[]> {
  const out: { id: string; name: string; email: string }[] = [];
  for (let i = 0; i < count; i++) {
    const name = APPLICANT_NAMES[i % APPLICANT_NAMES.length];
    const email = emailFor(name);
    // Upsert so re-running the seeder reuses the same throwaway
    // user instead of piling up duplicates.
    const u = await prisma.user.upsert({
      where: { email },
      create: {
        email,
        name,
        role: "trainee",
        accountKind: "demo",
      },
      update: {},
      select: { id: true, name: true, email: true },
    });
    out.push({ id: u.id, name: u.name ?? name, email: u.email });
  }
  return out;
}

export async function POST() {
  const session = await getSession();
  const role = (session?.user as { role?: string })?.role ?? "";
  const userId = (session?.user as { id?: string })?.id;
  if (!session || !userId || (role !== "employer" && !["admin", "superadmin"].includes(role))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Use the caller's display name for companyName fall-back so the
  // demo postings carry SOMETHING legible if the company-profile
  // field is empty (common on day-one accounts).
  const me = await prisma.user.findUnique({
    where: { id: userId },
    select: { employerCompany: true, email: true, companyWebsite: true },
  });
  const companyName = me?.employerCompany?.trim()
    || (me?.email?.split("@")[1]?.split(".")[0] ?? "Acme Bio");

  // 8 demo applicants → enough variety across 3 postings.
  const applicants = await ensureDemoApplicants(APPLICANT_NAMES.length);

  let postingsCreated = 0;
  let applicationsCreated = 0;
  let interviewsCreated = 0;
  let offersCreated = 0;

  for (let i = 0; i < POSTING_TEMPLATES.length; i++) {
    const tpl = POSTING_TEMPLATES[i];
    // Stagger created-at slightly so postings don't all share the
    // exact same timestamp.
    const createdAt = daysAgo(20 - i * 3);
    const posting = await prisma.internshipPosting.create({
      data: {
        isDemoSeed: true,
        companyName,
        website: me?.companyWebsite ?? null,
        title: tpl.title,
        duration: tpl.duration,
        hours: tpl.hours,
        location: tpl.location,
        type: tpl.type,
        compensation: tpl.compensation,
        keySkills: tpl.keySkills,
        positionDetails: tpl.positionDetails,
        status: "active",
        deadline: daysAgo(-21), // 21 days in the future
        createdById: userId,
        createdAt,
      },
      select: { id: true },
    });
    postingsCreated++;

    // Pick a distinct applicant per stage for this posting. Cycle
    // through the pool with an offset so each posting gets a
    // different mix.
    for (let s = 0; s < STAGES.length; s++) {
      const stage = STAGES[s];
      const applicant = applicants[(s + i * 2) % applicants.length];
      const stageEnteredAt = daysAgo(stage.daysAgo);

      const appStatus = await prisma.applicationStatus.create({
        data: {
          postingId: posting.id,
          applicantId: applicant.id,
          status: stage.status,
          stageEnteredAt,
          coverLetter:
            "Hi, thanks for considering me. I've been studying " +
            tpl.keySkills[0].toLowerCase() +
            " for the last two semesters and would love to bring that into your team.",
          rejectionReason:
            stage.status === "rejected"
              ? "Strong fit on skills, but we filled this seat from another shortlist. Encourage you to reapply for future openings."
              : null,
        },
        select: { id: true },
      });
      applicationsCreated++;

      // Interview for phone_screen stage.
      if (stage.status === "phone_screen") {
        await prisma.interview.create({
          data: {
            postingId: posting.id,
            applicantId: applicant.id,
            scheduledById: userId,
            status: "proposed",
            format: "phone",
            proposedSlots: [
              daysAgo(-2).toISOString(),
              daysAgo(-4).toISOString(),
              daysAgo(-5).toISOString(),
            ],
            notes: "Auto-seeded for demo. 30-min screen with the hiring manager.",
          },
        });
        interviewsCreated++;
      }

      // Offer for offer stage.
      if (stage.status === "offer") {
        await prisma.offer.create({
          data: {
            applicationStatusId: appStatus.id,
            postingId: posting.id,
            applicantId: applicant.id,
            createdById: userId,
            status: "sent",
            templateKey: "paid_internship",
            body:
              `Dear ${applicant.name},\n\n` +
              `We're thrilled to offer you the **${tpl.title}** position at ${companyName}.\n\n` +
              `**Compensation:** ${tpl.compensation}\n` +
              `**Duration:** ${tpl.duration}\n` +
              `**Location:** ${tpl.location}\n\n` +
              `Please reply by the deadline below to accept or decline.\n\n` +
              `Welcome aboard,\n${companyName} hiring team`,
            compensation: tpl.compensation,
            startDate: daysAgo(-14),
            hoursPerWeek: tpl.hours,
            location: tpl.location,
            acceptDeadline: daysAgo(-7),
            sentAt: daysAgo(stage.daysAgo - 1),
          },
        });
        offersCreated++;
      }
    }
  }

  return NextResponse.json({
    ok: true,
    postingsCreated,
    applicationsCreated,
    interviewsCreated,
    offersCreated,
  });
}

export async function DELETE() {
  const session = await getSession();
  const role = (session?.user as { role?: string })?.role ?? "";
  const userId = (session?.user as { id?: string })?.id;
  if (!session || !userId || (role !== "employer" && !["admin", "superadmin"].includes(role))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Cascades down: ApplicationStatus → Interview / Offer / etc. all
  // FK to the posting with onDelete: Cascade.
  const result = await prisma.internshipPosting.deleteMany({
    where: { createdById: userId, isDemoSeed: true },
  });

  return NextResponse.json({ ok: true, deleted: result.count });
}
