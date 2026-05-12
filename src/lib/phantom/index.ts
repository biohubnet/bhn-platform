/**
 * Phantom user service — ephemeral test accounts.
 *
 * Use case: admin wants to populate a feature (Manage Enrollments,
 * registrations table, internship pipeline) with throwaway test
 * trainees / employers without polluting the real user list or
 * leaving cleanup work for later.
 *
 * Lifecycle
 *   • spawnPhantoms()           — create N accounts in one batch
 *   • deletePhantom()           — admin removes one immediately
 *   • sweepExpiredPhantoms()    — cron-callable; removes any phantom
 *                                  whose demoExpiresAt has passed.
 *                                  Default TTL is 24 h from spawn.
 *
 * Distinct from demo workspaces (accountKind="demo") — demos are
 * pre-populated prospect simulations. Phantoms are stripped-down
 * test fixtures the admin uses to exercise platform features.
 *
 * accountKind="phantom" lets admin filters keep phantoms out of
 * "real" stats and prevents the demo sweeper from touching them
 * (and vice-versa).
 *
 * Sign-in
 *   Each phantom gets a magicToken so admins can one-click sign in
 *   via /sandbox/[token] (which already gates by accountKind !==
 *   "real") to test flows from the trainee's seat.
 */
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";

export const PHANTOM_TTL_DEFAULT_HOURS = 24;
export const PHANTOM_TTL_MAX_HOURS = 24 * 7;            // a week — generous cap
export const PHANTOM_BATCH_MAX = 50;                    // per spawn call
export const PHANTOM_ROLE_VALUES = ["trainee", "evaluating", "employer", "instructor"] as const;
export type PhantomRole = (typeof PHANTOM_ROLE_VALUES)[number];

/** Plausible-but-clearly-fake first/last names. Keeps the test UI
 *  legible (you can tell phantoms apart from each other) while still
 *  reading as "human user" so the screenshots feel real. */
const FIRST_NAMES = [
  "Hazel", "Otto", "Mira", "Bo", "Indira", "Felix", "Naia", "Ezra",
  "Lumi", "Casimir", "Beatrix", "Theo", "Anouk", "Jules", "Rumi",
  "Sasha", "Hugo", "Yumi", "Cosmo", "Zara", "Ines", "Kai", "Nori",
];
const LAST_NAMES = [
  "Aspen", "Birch", "Cinder", "Dune", "Echo", "Fern", "Glacier",
  "Hollow", "Iris", "Juniper", "Kestrel", "Lichen", "Marlow",
  "Nimbus", "Onyx", "Petrel", "Quill", "Rowan", "Slate", "Thistle",
  "Umber", "Vale", "Willow", "Yarrow", "Zephyr",
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

interface SpawnInput {
  count: number;
  role?: PhantomRole;
  hours?: number;
  adminId: string;
}

export interface SpawnedPhantom {
  id: string;
  email: string;
  name: string;
  role: string;
  magicToken: string;
  expiresAt: Date;
}

/**
 * Create N phantom users in one transaction. Each gets a random
 * Plausible-name email at @bhn.test (RFC 2606 reserved TLD), a
 * never-displayed bcrypt password, and a single-use magic token
 * so admins can impersonate via /sandbox/[token].
 */
export async function spawnPhantoms(input: SpawnInput): Promise<SpawnedPhantom[]> {
  if (input.count < 1) throw new Error("count must be ≥ 1");
  if (input.count > PHANTOM_BATCH_MAX) {
    throw new Error(`count must be ≤ ${PHANTOM_BATCH_MAX}`);
  }
  const hours = Math.min(
    Math.max(input.hours ?? PHANTOM_TTL_DEFAULT_HOURS, 1),
    PHANTOM_TTL_MAX_HOURS,
  );
  const role: PhantomRole = input.role ?? "trainee";
  if (!(PHANTOM_ROLE_VALUES as readonly string[]).includes(role)) {
    throw new Error(`role must be one of: ${PHANTOM_ROLE_VALUES.join(", ")}`);
  }

  const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000);
  // Use the same password hash for the whole batch — we never display
  // or accept it for sign-in (magic-token only), so doing one bcrypt
  // round saves real time when spawning batches.
  const sharedHash = await bcrypt.hash(randomBytes(16).toString("hex"), 10);

  const created: SpawnedPhantom[] = [];
  for (let i = 0; i < input.count; i++) {
    const first = pick(FIRST_NAMES);
    const last = pick(LAST_NAMES);
    const slug = randomBytes(4).toString("hex");
    // RFC 2606 reserves .test for testing; safe forever, can't escape
    // to real DNS, won't ever clash with a real BioHubNet inbox.
    const email = `phantom-${slug}@bhn.test`;
    const magicToken = randomBytes(24).toString("hex");

    // Phantom trainees get the standard starter credits so they can
    // enroll in courses immediately for testing. Other roles get 0
    // (credits aren't part of the employer/instructor flow).
    const credits = role === "trainee" || role === "evaluating" ? 200 : 0;

    const user = await prisma.user.create({
      data: {
        email,
        name: `${first} ${last}`,
        password: sharedHash,
        role,
        accountKind: "phantom",
        demoExpiresAt: expiresAt,
        createdByAdminId: input.adminId,
        magicToken,
        credits,
        emailVerified: new Date(),    // skip verification gate
        passwordUpdatedAt: new Date(),
        // Useful realistic-looking defaults so the phantom isn't a
        // bunch of blanks in admin tables.
        jobTitle: role === "trainee" || role === "evaluating"
          ? pick(["PhD candidate", "Master's student", "Postdoc", "Research Associate"])
          : null,
        organization: role === "trainee" || role === "evaluating"
          ? pick(["University of Toronto", "McGill University", "UBC", "McMaster University"])
          : null,
      },
      select: { id: true, email: true, name: true, role: true, magicToken: true, demoExpiresAt: true },
    });

    created.push({
      id: user.id,
      email: user.email,
      name: user.name ?? `${first} ${last}`,
      role: user.role,
      magicToken: user.magicToken!,
      expiresAt: user.demoExpiresAt!,
    });
  }

  return created;
}

/**
 * Hard-delete one phantom user. Wipes their owned rows in the
 * Restrict-FK tables first (WorkshopBooking, Registration,
 * ElectronicSignature), then deletes the user — Prisma cascades
 * handle the rest.
 *
 * No-op (returns ok=false) if the user isn't a phantom — defence
 * so an admin can't accidentally delete a real user through this
 * path even if they hand-rolled the URL.
 */
export async function deletePhantom(userId: string): Promise<{ ok: boolean; reason?: string }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, accountKind: true },
  });
  if (!user) return { ok: false, reason: "not_found" };
  if (user.accountKind !== "phantom") {
    return { ok: false, reason: "not_a_phantom" };
  }

  await prisma.$transaction(async (tx) => {
    // Restrict-FK tables — must clear before user.delete().
    await tx.workshopBooking.deleteMany({ where: { userId } });
    await tx.registration.deleteMany({ where: { userId } });
    await tx.electronicSignature.deleteMany({ where: { signerId: userId } });
    // PathwayEnrollment.userId carries no Prisma relation (legacy
    // schema oversight) so Postgres doesn't cascade on user.delete.
    // Wipe explicitly; otherwise demo phantoms leave dangling
    // pending-request rows that render as "No name / —" in
    // /admin/enrollments after a clear-all.
    await tx.pathwayEnrollment.deleteMany({ where: { userId } });
    // Postings + downstream applicants for phantom employers.
    await tx.internshipPosting.deleteMany({ where: { createdById: userId } });
    // Everything else cascades from User onDelete: Cascade.
    await tx.user.delete({ where: { id: userId } });
  });

  return { ok: true };
}

/**
 * Sweep every expired phantom. Called by the hourly Vercel cron job
 * pointed at /api/admin/phantom-users/sweep. Returns the count
 * removed for observability.
 *
 * Idempotent — running the sweeper twice in a row deletes 0 the
 * second time.
 */
export async function sweepExpiredPhantoms(): Promise<{ deleted: number; failed: number }> {
  const expired = await prisma.user.findMany({
    where: {
      accountKind: "phantom",
      demoExpiresAt: { lt: new Date() },
    },
    select: { id: true },
  });

  let deleted = 0;
  let failed = 0;
  for (const e of expired) {
    const r = await deletePhantom(e.id);
    if (r.ok) deleted++;
    else failed++;
  }
  return { deleted, failed };
}

/** Extend a phantom's TTL by N hours from now. Caps at PHANTOM_TTL_MAX_HOURS
 *  from the original spawn so admins can't accidentally promote a phantom
 *  to a long-lived test fixture. */
export async function extendPhantom(
  userId: string,
  hours: number,
): Promise<{ ok: boolean; expiresAt?: Date; reason?: string }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { accountKind: true, demoExpiresAt: true, createdAt: true },
  });
  if (!user) return { ok: false, reason: "not_found" };
  if (user.accountKind !== "phantom") return { ok: false, reason: "not_a_phantom" };

  const clamped = Math.min(Math.max(hours, 1), PHANTOM_TTL_MAX_HOURS);
  // Cap at MAX_HOURS past the original spawn time so a chain of
  // extensions can't drift to "forever". This bounds the worst case.
  const ceiling = new Date(user.createdAt.getTime() + PHANTOM_TTL_MAX_HOURS * 60 * 60 * 1000);
  const proposed = new Date(Date.now() + clamped * 60 * 60 * 1000);
  const expiresAt = proposed > ceiling ? ceiling : proposed;

  await prisma.user.update({ where: { id: userId }, data: { demoExpiresAt: expiresAt } });
  return { ok: true, expiresAt };
}
