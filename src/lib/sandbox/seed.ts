/**
 * Per-admin sandbox spawner. Creates one Employer HR + one Trainee
 * tagged accountKind="sandbox" + createdByAdminId pointed at the
 * spawning admin, plus a starter posting and a talent-application
 * submission tying them together. Idempotent — re-running upserts.
 *
 * Sandbox emails are deterministic per admin so re-spawning doesn't
 * create duplicates:
 *   sandbox.{adminLocalPart}.employer@biohubnet.test
 *   sandbox.{adminLocalPart}.trainee@biohubnet.test
 *
 * Password is the same for both: "sandbox-{first6ofAdminId}".
 */
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export interface SandboxSeedResult {
  ownerAdminId: string;
  employer: { id: string; email: string; magicToken: string };
  trainee: { id: string; email: string; magicToken: string };
  posting: { id: string };
  submissionCreated: boolean;
  password: string; // kept for back-compat / direct /login access
}

function newMagicToken() {
  return randomBytes(24).toString("hex");
}

export function sandboxIdentifiers(admin: { id: string; email: string; name: string | null }) {
  // Slug the admin's email local-part so sandbox emails stay friendly.
  const local = admin.email.split("@")[0].toLowerCase().replace(/[^a-z0-9]/g, "");
  const safeLocal = local || admin.id.slice(0, 6).toLowerCase();
  return {
    employerEmail: `sandbox.${safeLocal}.employer@biohubnet.test`,
    traineeEmail:  `sandbox.${safeLocal}.trainee@biohubnet.test`,
    employerName:  `Sandbox HR (${admin.name?.split(" ")[0] ?? safeLocal})`,
    traineeName:   `Sandbox Trainee (${admin.name?.split(" ")[0] ?? safeLocal})`,
    password:      `sandbox-${admin.id.slice(0, 6)}`,
  };
}

export async function spawnSandbox(adminId: string): Promise<SandboxSeedResult> {
  const admin = await prisma.user.findUnique({
    where: { id: adminId },
    select: { id: true, email: true, name: true },
  });
  if (!admin) throw new Error("Admin not found");

  const ids = sandboxIdentifiers(admin);
  const passwordHash = await bcrypt.hash(ids.password, 10);

  // 1. Employer HR ────────────────────────────────────────────────
  const employerToken = newMagicToken();
  const employer = await prisma.user.upsert({
    where: { email: ids.employerEmail },
    create: {
      email: ids.employerEmail,
      name: ids.employerName,
      password: passwordHash,
      role: "employer",
      employerCompany: "Sandbox Biotherapeutics",
      companyWebsite: "https://sandbox-bio.test",
      companyDescription: "A demo company spun up for admin testing — not real.",
      companyIndustry: "Biotechnology",
      companySize: "11-50",
      companyLocation: "Toronto, ON",
      allowPlatformContent: false,
      emailVerified: new Date(),
      isActive: true,
      accountKind: "sandbox",
      createdByAdminId: adminId,
      magicToken: employerToken,
    },
    update: {
      role: "employer",
      accountKind: "sandbox",
      createdByAdminId: adminId,
      isActive: true,
      // Re-seed: only set if missing. On `Reset` we delete + recreate
      // (which generates a fresh token via the create path), so the
      // OR keeps existing tokens stable on an idempotent re-spawn.
    },
  });
  // Backfill the token if the existing row didn't have one (handles
  // the case where the sandbox was spawned BEFORE the magicToken
  // column existed). Cheap — single update.
  if (!employer.magicToken) {
    await prisma.user.update({
      where: { id: employer.id },
      data: { magicToken: employerToken },
    });
    employer.magicToken = employerToken;
  }

  // 2. Trainee ────────────────────────────────────────────────────
  const traineeToken = newMagicToken();
  const trainee = await prisma.user.upsert({
    where: { email: ids.traineeEmail },
    create: {
      email: ids.traineeEmail,
      name: ids.traineeName,
      password: passwordHash,
      role: "trainee",
      bio: "Master's student — sandbox account for testing.",
      organization: "University of Toronto",
      jobTitle: "Graduate student",
      country: "Canada",
      emailVerified: new Date(),
      isActive: true,
      accountKind: "sandbox",
      createdByAdminId: adminId,
      magicToken: traineeToken,
    },
    update: {
      role: "trainee",
      accountKind: "sandbox",
      createdByAdminId: adminId,
      isActive: true,
    },
  });
  if (!trainee.magicToken) {
    await prisma.user.update({
      where: { id: trainee.id },
      data: { magicToken: traineeToken },
    });
    trainee.magicToken = traineeToken;
  }

  // 3. Posting ────────────────────────────────────────────────────
  const postingTitle = `Sandbox Bioprocess Intern (${admin.name?.split(" ")[0] ?? "test"})`;
  let posting = await prisma.internshipPosting.findFirst({
    where: { title: postingTitle, createdById: employer.id },
    select: { id: true },
  });
  if (!posting) {
    posting = await prisma.internshipPosting.create({
      data: {
        companyName: "Sandbox Biotherapeutics",
        website: "https://sandbox-bio.test",
        title: postingTitle,
        duration: "4 months",
        hours: "Full-time",
        location: "Toronto, ON (hybrid)",
        type: "Internship / Co-op",
        compensation: "$25/hr",
        deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        keySkills: ["Cell Culture", "Aseptic Technique", "GMP"],
        positionDetails:
          "Sandbox posting for testing. We're looking for a bioprocess development intern with hands-on cell culture, aseptic technique, and GMP exposure. Bonus: Python data analysis. Responsibilities include running bench-scale bioreactor experiments, maintaining batch records, and supporting analytical method development.",
        status: "active",
        createdById: employer.id,
      },
      select: { id: true },
    });
  }

  // 4. Submission ─────────────────────────────────────────────────
  let submissionCreated = false;
  const form = await prisma.eventForm.findFirst({
    where: { slug: "talent-application" }, select: { id: true },
  });
  if (form) {
    const existing = await prisma.eventFormSubmission.findFirst({
      where: { formId: form.id, userId: trainee.id }, select: { id: true },
    });
    if (!existing) {
      const data: Prisma.JsonObject = {
        first_name: "Sandbox",
        last_name: "Trainee",
        email: trainee.email,
        applicant_id: `BHTEST${admin.id.slice(0, 4).toUpperCase()}`,
        current_position: "Graduate Program",
        earliest_availability: "2026-09-01",
        linkedin: "linkedin.com/in/sandbox-trainee",
        status_goal: "Current student searching for internship opportunities",
        locations: ["Ontario", "Remote / hybrid Canada-wide"],
        citizenship: ["Canadian Citizen"],
        french_speaking: "Beginner",
        thesis_or_contract_date: "2027-04-30",
        pitch:
          "Sandbox account for testing the application flow. I'm a graduate student in biomedical engineering with hands-on bench experience in cell culture, aseptic technique, GMP documentation, and bioreactor operation. Strong Python data-analysis skills and curiosity about scaling biology in regulated environments.",
        consent: ["I have read and agreed to the privacy notice and terms above."],
      };
      await prisma.eventFormSubmission.create({
        data: { formId: form.id, userId: trainee.id, email: trainee.email, data },
      });
      submissionCreated = true;
    }
  }

  return {
    ownerAdminId: adminId,
    employer: { id: employer.id, email: employer.email, magicToken: employer.magicToken ?? employerToken },
    trainee:  { id: trainee.id,  email: trainee.email,  magicToken: trainee.magicToken  ?? traineeToken  },
    posting: { id: posting.id },
    submissionCreated,
    password: ids.password,
  };
}

/** Wipe everything the admin's sandbox owns and re-seed fresh. */
export async function resetSandbox(adminId: string) {
  await deleteSandbox(adminId);
  return spawnSandbox(adminId);
}

/** Hard-delete the admin's sandbox accounts and dependent rows. */
export async function deleteSandbox(adminId: string) {
  const accounts = await prisma.user.findMany({
    where: { createdByAdminId: adminId, accountKind: "sandbox" },
    select: { id: true },
  });
  if (accounts.length === 0) return { removed: 0 };

  const ids = accounts.map((a) => a.id);
  // Cascade rules clean up most of it via FKs (postings → applicationStatus
  // → interview, submissions ON DELETE SET NULL keeps history). Defensive
  // explicit cleanup of the most user-visible rows first.
  await prisma.eventFormSubmission.deleteMany({ where: { userId: { in: ids } } });
  await prisma.internshipPosting.deleteMany({ where: { createdById: { in: ids } } });
  await prisma.user.deleteMany({ where: { id: { in: ids } } });
  return { removed: accounts.length };
}

export async function listSandboxes() {
  // Group sandbox accounts by their owning admin.
  const accounts = await prisma.user.findMany({
    where: { accountKind: "sandbox" },
    select: {
      id: true, email: true, name: true, role: true, lastLoginAt: true,
      magicToken: true,
      createdByAdminId: true,
      createdByAdmin: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  const byAdmin = new Map<string, typeof accounts>();
  for (const a of accounts) {
    const key = a.createdByAdminId ?? "orphaned";
    if (!byAdmin.has(key)) byAdmin.set(key, []);
    byAdmin.get(key)!.push(a);
  }
  return Array.from(byAdmin.values());
}
