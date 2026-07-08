import { prisma } from "@/lib/prisma";

/**
 * Certification-framework progress + automatic credential issuance.
 *
 * A CertificationProgram has ordered levels (Foundation → Practitioner →
 * Advanced). A learner EARNS a level's credential once they have completed
 * every course in that level AND already hold the previous level's credential
 * (the prerequisite chain). Issuance is idempotent — safe to call on every
 * page load and after any course completion.
 */

export type LevelStatus = "earned" | "available" | "in_progress" | "locked";

export interface LevelProgress {
  levelId: string;
  tier: string;
  order: number;
  title: string;
  summary: string | null;
  passingScore: number;
  courseIds: string[];
  completedCourseIds: string[];
  totalCourses: number;
  completedCount: number;
  percent: number; // 0-100 across this level's courses
  status: LevelStatus;
  credentialNumber: string | null;
  earnedAt: Date | null;
}

export interface ProgramProgress {
  programId: string;
  slug: string;
  title: string;
  discipline: string | null;
  summary: string | null;
  levels: LevelProgress[];
  earnedCount: number; // how many of the tiers earned (0-3)
  levelCount: number;
}

/** Deterministic, human-readable credential number, e.g. BHN-BIOMFG-FND-AB12CD. */
function credentialNumber(programSlug: string, tier: string, userId: string): string {
  const disc = programSlug.replace(/[^a-z0-9]/gi, "").slice(0, 6).toUpperCase() || "CERT";
  const t = tier.slice(0, 3).toUpperCase();
  const suffix = userId.replace(/[^a-z0-9]/gi, "").slice(-6).toUpperCase();
  return `BHN-${disc}-${t}-${suffix}`;
}

/**
 * Walk a program's levels in order and issue any credential the learner has
 * newly qualified for (all courses done + previous tier held). Returns the
 * number of credentials issued this call. Idempotent.
 */
export async function checkCertificationProgress(userId: string, programId: string): Promise<number> {
  const program = await prisma.certificationProgram.findUnique({
    where: { id: programId },
    include: { levels: { orderBy: { order: "asc" } } },
  });
  if (!program) return 0;

  const held = await prisma.certificationCredential.findMany({
    where: { userId, programId, revokedAt: null },
    select: { levelId: true },
  });
  const heldLevelIds = new Set(held.map((c) => c.levelId));

  let issued = 0;
  let priorEarned = true; // level 1 has no prerequisite

  for (const level of program.levels) {
    const alreadyHeld = heldLevelIds.has(level.id);
    const courseIds = level.courseIds ?? [];

    const completedCount =
      courseIds.length === 0
        ? 0
        : await prisma.enrollment.count({
            where: {
              userId,
              courseId: { in: courseIds },
              status: "completed",
              // Enforce the tier's rigor: a scored course must clear this
              // tier's passingScore (70/80/90). Content courses without a
              // score pass on completion.
              OR: [{ score: null }, { score: { gte: level.passingScore } }],
            },
          });
    const allDone = courseIds.length > 0 && completedCount >= courseIds.length;

    if (!alreadyHeld && priorEarned && allDone) {
      // Qualified — issue the credential (unique on [userId, levelId] guards races).
      try {
        await prisma.certificationCredential.create({
          data: {
            userId,
            programId,
            levelId: level.id,
            credentialNumber: credentialNumber(program.slug, level.tier, userId),
          },
        });
        issued += 1;
        heldLevelIds.add(level.id);
      } catch {
        // Unique violation → already issued by a concurrent call. Treat as held.
        heldLevelIds.add(level.id);
      }
    }

    priorEarned = heldLevelIds.has(level.id);
  }

  return issued;
}

/** Read-only progress view for a program + user (issues nothing). */
export async function getProgramProgress(userId: string | null, programId: string): Promise<ProgramProgress | null> {
  const program = await prisma.certificationProgram.findUnique({
    where: { id: programId },
    include: { levels: { orderBy: { order: "asc" } } },
  });
  if (!program) return null;

  const credentials = userId
    ? await prisma.certificationCredential.findMany({
        where: { userId, programId, revokedAt: null },
        select: { levelId: true, credentialNumber: true, earnedAt: true },
      })
    : [];
  const credByLevel = new Map(credentials.map((c) => [c.levelId, c]));

  // Completion + score for this user across every course in the program.
  // Score matters because a course only counts toward a tier if it clears
  // that tier's passingScore (see below) — the same threshold issuance uses.
  const allCourseIds = Array.from(new Set(program.levels.flatMap((l) => l.courseIds ?? [])));
  const completedRows =
    userId && allCourseIds.length
      ? await prisma.enrollment.findMany({
          where: { userId, courseId: { in: allCourseIds }, status: "completed" },
          select: { courseId: true, score: true },
        })
      : [];
  const scoreByCourse = new Map(completedRows.map((r) => [r.courseId, r.score]));

  let priorEarned = true;
  const levels: LevelProgress[] = program.levels.map((level) => {
    const courseIds = level.courseIds ?? [];
    const completedCourseIds = courseIds.filter((id) => {
      if (!scoreByCourse.has(id)) return false;
      const s = scoreByCourse.get(id);
      return s == null || s >= level.passingScore; // meets the tier's bar
    });
    const cred = credByLevel.get(level.id);
    const earned = !!cred;
    const percent = courseIds.length ? Math.round((completedCourseIds.length / courseIds.length) * 100) : 0;

    let status: LevelStatus;
    if (earned) status = "earned";
    else if (!priorEarned) status = "locked";
    else if (completedCourseIds.length > 0) status = "in_progress";
    else status = "available";

    priorEarned = earned;

    return {
      levelId: level.id,
      tier: level.tier,
      order: level.order,
      title: level.title,
      summary: level.summary,
      passingScore: level.passingScore,
      courseIds,
      completedCourseIds,
      totalCourses: courseIds.length,
      completedCount: completedCourseIds.length,
      percent,
      status,
      credentialNumber: cred?.credentialNumber ?? null,
      earnedAt: cred?.earnedAt ?? null,
    };
  });

  return {
    programId: program.id,
    slug: program.slug,
    title: program.title,
    discipline: program.discipline,
    summary: program.summary,
    levels,
    earnedCount: levels.filter((l) => l.status === "earned").length,
    levelCount: levels.length,
  };
}
