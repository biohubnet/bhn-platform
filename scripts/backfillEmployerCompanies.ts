/**
 * Employer team portal — step 2/20 backfill.
 *
 * Mirrors every existing single-seat employer User into the new
 * multi-user Company model, then seeds each company with starter
 * email templates + a starter scorecard rubric.
 *
 * Idempotent: safe to re-run. Skips any User that already has a
 * CompanyMember row (meaning the Company was already created for them).
 *
 * Run:
 *   npx tsx scripts/backfillEmployerCompanies.ts
 *   npx tsx scripts/backfillEmployerCompanies.ts --dry-run
 *
 * --dry-run prints what would be created without writing anything.
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { randomUUID } from "crypto";

const prisma = new PrismaClient();
const DRY = process.argv.includes("--dry-run");

// ── Starter email templates ───────────────────────────────────────
// Seeded into every new Company. Companies can edit or delete them;
// starterVersion lets us surface a "see the latest starter" diff later
// without overwriting their edits.

const STARTER_TEMPLATES = [
  {
    name: "Rejection — early stage",
    kind: "rejection",
    subject: "Your application to {{postingTitle}} at {{companyName}}",
    body: `Hi {{candidateFirstName}},

Thank you for taking the time to apply for the {{postingTitle}} position at {{companyName}}. We appreciate your interest in joining our team.

After reviewing your application, we've decided to move forward with other candidates whose backgrounds more closely match the requirements for this role at this time.

We encourage you to continue developing your skills and to keep an eye on future openings with us. Thank you again for your interest in {{companyName}}.

Best regards,
{{senderFirstName}}
{{senderSignature}}`,
    starterVersion: 1,
  },
  {
    name: "Rejection — post-interview",
    kind: "rejection",
    subject: "Following up on your interview for {{postingTitle}}",
    body: `Hi {{candidateFirstName}},

Thank you for taking the time to interview for the {{postingTitle}} role at {{companyName}}. It was a pleasure learning more about your background and experience.

After careful consideration, we've decided to move forward with another candidate for this particular role. This was a difficult decision as we were impressed with your qualifications.

We will keep your information on file and reach out should a suitable opportunity arise. We wish you the best in your job search.

Best regards,
{{senderFirstName}}
{{senderSignature}}`,
    starterVersion: 1,
  },
  {
    name: "Interview invitation",
    kind: "interview_invite",
    subject: "Interview invitation — {{postingTitle}} at {{companyName}}",
    body: `Hi {{candidateFirstName}},

Thank you for your application for the {{postingTitle}} position at {{companyName}}. We've reviewed your background and we'd love to schedule an interview with you.

{{interviewerName}} will be reaching out shortly with available time slots. The interview will be approximately 30–45 minutes.

Please feel free to reply to this email if you have any questions in the meantime.

We look forward to speaking with you!

Best regards,
{{senderFirstName}}
{{senderSignature}}`,
    starterVersion: 1,
  },
  {
    name: "Offer follow-up",
    kind: "follow_up",
    subject: "Following up on your offer — {{postingTitle}}",
    body: `Hi {{candidateFirstName}},

I wanted to follow up on the offer we sent for the {{postingTitle}} position at {{companyName}}. We're very excited about the prospect of you joining our team and want to make sure you have everything you need to make your decision.

If you have any questions about the role, compensation, benefits, or anything else, please don't hesitate to reach out. We're happy to schedule a call to discuss.

We hope to hear from you soon!

Best regards,
{{senderFirstName}}
{{senderSignature}}`,
    starterVersion: 1,
  },
] as const;

// ── Starter scorecard ─────────────────────────────────────────────
// One rubric per posting is expected; the Company itself doesn't own
// the scorecard — InternshipPosting does. So we don't create scorecards
// here (they're per-posting, created when a Manager edits a posting's
// rubric). We just define the default criteria payload used when a new
// scorecard is initialised from the editor.
//
// Stored in a seeder-only constant — the scorecard editor imports this
// to pre-fill a blank rubric. Not a DB row at this level.
export const DEFAULT_SCORECARD_CRITERIA = [
  { id: randomUUID(), label: "Skills match",    description: "Does the candidate have the required technical or domain skills?", scale: 4 },
  { id: randomUUID(), label: "Communication",   description: "Clarity, listening, and ability to convey ideas effectively.",     scale: 4 },
  { id: randomUUID(), label: "Culture fit",     description: "Alignment with team values, working style, and environment.",      scale: 4 },
  { id: randomUUID(), label: "Motivation",      description: "Genuine interest in the role and long-term career alignment.",     scale: 4 },
  { id: randomUUID(), label: "Overall",         description: "Holistic impression — would you hire this person?",                scale: 5 },
];

// ── Title → role mapping ───────────────────────────────────────────
// Used to pre-fill role on CompanyJoinRequest. Not used in the
// backfill itself (existing employers become owner by default).
export function titleToRole(title: string | null): "owner" | "manager" | "generalist" | "viewer" {
  if (!title) return "generalist";
  const t = title.toLowerCase();
  if (/director|vp |vice.?president|head of|chief|coo|ceo|cto|chro/.test(t)) return "owner";
  if (/manager|lead|senior recruiter|talent partner|hr business/.test(t))     return "manager";
  if (/recruiter|coordinator|generalist|specialist|advisor/.test(t))          return "generalist";
  if (/hiring manager|engineering manager|product manager|stakeholder/.test(t)) return "manager";
  return "generalist";
}

// ── Domain extraction ─────────────────────────────────────────────
const CONSUMER_DOMAINS = new Set([
  "gmail.com", "googlemail.com", "outlook.com", "hotmail.com",
  "live.com", "yahoo.com", "icloud.com", "me.com", "mac.com",
  "proton.me", "protonmail.com", "aol.com", "msn.com",
]);

function extractDomain(email: string): string | null {
  const parts = email.split("@");
  if (parts.length !== 2) return null;
  const domain = parts[1].toLowerCase();
  return CONSUMER_DOMAINS.has(domain) ? null : domain;
}

// ── Main ──────────────────────────────────────────────────────────
async function main() {
  console.log(DRY ? "=== DRY RUN — no writes ===" : "=== BACKFILL START ===");

  // Find all employer Users who don't yet have a CompanyMember row.
  // CompanyMember is created as part of this backfill, so an existing
  // row means this user has already been processed.
  const employers = await prisma.user.findMany({
    where: {
      role: "employer",
      companyMemberships: { none: {} },
    },
    select: {
      id: true,
      email: true,
      name: true,
      employerCompany: true,
      companyWebsite: true,
      companyLogo: true,
      companyLogoShape: true,
      companyLogoTransform: true,
      companyBrand: true,
      companyIndustry: true,
      companySize: true,
      companyLocation: true,
      companyDescription: true,
      companyFounded: true,
      companyMainBusiness: true,
      companyTicker: true,
    },
  });

  console.log(`Found ${employers.length} employer(s) to migrate.`);
  if (employers.length === 0) {
    console.log("Nothing to do.");
    return;
  }

  let created = 0;
  let skipped = 0;

  for (const user of employers) {
    const companyName = user.employerCompany?.trim() || user.name?.trim() || user.email.split("@")[0];
    const domain = extractDomain(user.email);

    console.log(`\n→ ${user.email} — "${companyName}" (domain: ${domain ?? "none"})`);

    if (DRY) {
      // Describe what would happen without writing.
      const postingCount = await prisma.internshipPosting.count({ where: { createdById: user.id } });
      console.log(`  Would create: Company "${companyName}", CompanyMember(owner), ${postingCount} posting(s) tagged, 4 email templates.`);
      skipped++;
      continue;
    }

    // All writes in one transaction per employer so partial failures
    // don't leave orphaned rows.
    await prisma.$transaction(async (tx) => {
      // 1. Create the Company.
      const now = new Date();
      const company = await tx.company.create({
        data: {
          name:          companyName,
          domain,
          website:       user.companyWebsite       ?? undefined,
          logo:          user.companyLogo           ?? undefined,
          logoShape:     user.companyLogoShape      ?? undefined,
          logoTransform: user.companyLogoTransform  ?? undefined,
          brand:         user.companyBrand          ?? undefined,
          industry:      user.companyIndustry       ?? undefined,
          size:          user.companySize           ?? undefined,
          location:      user.companyLocation       ?? undefined,
          description:   user.companyDescription    ?? undefined,
          founded:       user.companyFounded        ?? undefined,
          mainBusiness:  user.companyMainBusiness   ?? undefined,
          ticker:        user.companyTicker         ?? undefined,
          kind:          "real",
          updatedAt:     now,
        },
      });
      console.log(`  Company created: ${company.id}`);

      // 2. Create the owner CompanyMember.
      await tx.companyMember.create({
        data: {
          companyId: company.id,
          userId:    user.id,
          role:      "owner",
          joinedAt:  now,
        },
      });
      console.log(`  CompanyMember(owner) created for ${user.email}`);

      // 3. Tag all existing postings with the new companyId.
      const postingResult = await tx.internshipPosting.updateMany({
        where: { createdById: user.id, companyId: null },
        data:  { companyId: company.id },
      });
      console.log(`  Tagged ${postingResult.count} posting(s) with companyId`);

      // 4. Fetch all postings for this company to create PostingTeamMember rows.
      const postings = await tx.internshipPosting.findMany({
        where:  { companyId: company.id, createdById: { not: null } },
        select: { id: true, createdById: true },
      });

      // 5. Create PostingTeamMember (creator → recruiter) for every posting
      //    that doesn't already have a team row.
      let teamRowsCreated = 0;
      for (const p of postings) {
        if (!p.createdById) continue;
        // upsert so re-runs are safe.
        await tx.postingTeamMember.upsert({
          where:  { postingId_userId: { postingId: p.id, userId: p.createdById } },
          update: {},
          create: {
            postingId: p.id,
            userId:    p.createdById,
            role:      "recruiter",
            addedAt:   now,
          },
        });
        teamRowsCreated++;
      }
      console.log(`  Created ${teamRowsCreated} PostingTeamMember row(s) (recruiter)`);

      // 6. Backfill lastTouched* on ApplicationStatus rows for these
      //    postings, seeding from the existing updatedAt / updatedById.
      //    Only rows where lastTouchedAt is still null.
      const postingIds = postings.map((p) => p.id);
      if (postingIds.length > 0) {
        // Can't use updateMany across a join — use raw for efficiency.
        await tx.$executeRaw`
          UPDATE "ApplicationStatus" AS a
          SET    "lastTouchedAt"   = a."updatedAt",
                 "lastTouchedById" = a."updatedById"
          WHERE  a."postingId"     = ANY(${postingIds}::text[])
            AND  a."lastTouchedAt" IS NULL
        `;
        console.log(`  Seeded lastTouched* on ApplicationStatus rows`);
      }

      // 7. Seed 4 starter email templates.
      const templateData = STARTER_TEMPLATES.map((t) => ({
        companyId:      company.id,
        name:           t.name,
        kind:           t.kind,
        subject:        t.subject,
        body:           t.body,
        isStarter:      true,
        starterVersion: t.starterVersion,
        createdById:    user.id,
        updatedAt:      now,
      }));
      await tx.emailTemplate.createMany({ data: templateData, skipDuplicates: true });
      console.log(`  Created ${templateData.length} starter email templates`);
    });

    created++;
  }

  console.log(`\n=== DONE: ${created} company(ies) created, ${skipped} dry-run(s) ===`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
