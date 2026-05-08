/**
 * Two-direction matching for a single posting.
 *
 *   GET /api/match/posting/[id]?as=trainee   → for the signed-in trainee:
 *      a 0..100 match score, the skills you have, the skills you're missing,
 *      and BHN courses that cover the missing ones.
 *
 *   GET /api/match/posting/[id]?as=employer  → for the posting owner:
 *      anonymised top-N matching trainees with score + breakdown. Privacy:
 *      no names / emails — only initials, completed-course count, and
 *      consented skills.
 */
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { scoreMatch } from "@/lib/skills/ontology";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const mode = url.searchParams.get("as") ?? "trainee";

  const posting = await prisma.internshipPosting.findUnique({
    where: { id },
    include: {
      skills: {
        include: { skill: { select: { id: true, name: true, category: true } } },
      },
    },
  });
  if (!posting) return NextResponse.json({ error: "not found" }, { status: 404 });

  if (mode === "employer") {
    return employerView(req, posting);
  }
  return traineeView(session.user.email, posting);
}

async function traineeView(
  email: string,
  posting: NonNullable<Awaited<ReturnType<typeof prisma.internshipPosting.findUnique>>> & { skills: { skill: { id: string; name: string; category: string | null }; weight: number; required: boolean }[] },
) {
  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      skills: { include: { skill: { select: { id: true, name: true, category: true } } } },
    },
  });
  if (!user) return NextResponse.json({ error: "not found" }, { status: 404 });

  const userSkills = user.skills.map((s) => ({ skillId: s.skillId, level: s.level }));
  const postingSkills = posting.skills.map((p) => ({ skillId: p.skill.id, weight: p.weight, required: p.required }));
  const { score, missingRequired } = scoreMatch(userSkills, postingSkills);

  const have   = posting.skills.filter((p) => userSkills.some((u) => u.skillId === p.skill.id));
  const missing = posting.skills.filter((p) => !userSkills.some((u) => u.skillId === p.skill.id));

  // Look up courses that teach the missing skills (Phase 3 hook to
  // close the loop: missing skill → "take this course to gain it").
  const missingIds = missing.map((m) => m.skill.id);
  const courseSuggestions = missingIds.length
    ? await prisma.courseSkill.findMany({
        where: { skillId: { in: missingIds } },
        include: {
          course: { select: { id: true, title: true, status: true, thumbnail: true, duration: true } },
          skill: { select: { id: true, name: true } },
        },
        take: 30,
      })
    : [];
  // Group by course so each course shows the skills it would unlock.
  const byCourse = new Map<string, { courseId: string; title: string; thumbnail: string | null; duration: number | null; unlocks: string[] }>();
  for (const cs of courseSuggestions) {
    if (cs.course.status !== "published") continue;
    if (!byCourse.has(cs.course.id)) {
      byCourse.set(cs.course.id, {
        courseId: cs.course.id,
        title: cs.course.title,
        thumbnail: cs.course.thumbnail,
        duration: cs.course.duration,
        unlocks: [],
      });
    }
    byCourse.get(cs.course.id)!.unlocks.push(cs.skill.name);
  }

  return NextResponse.json({
    posting: { id: posting.id, title: posting.title, companyName: posting.companyName },
    score,
    have:    have.map((p) => ({ id: p.skill.id, name: p.skill.name, category: p.skill.category, required: p.required })),
    missing: missing.map((p) => ({ id: p.skill.id, name: p.skill.name, category: p.skill.category, required: p.required })),
    missingRequired,
    courses: Array.from(byCourse.values()).slice(0, 10),
  });
}

async function employerView(
  req: NextRequest,
  posting: NonNullable<Awaited<ReturnType<typeof prisma.internshipPosting.findUnique>>> & { skills: { skill: { id: string }; weight: number; required: boolean }[] },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const me = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, role: true },
  });
  if (!me) return NextResponse.json({ error: "not found" }, { status: 404 });
  // Only admins/superadmins, or the employer who owns the posting, can run this.
  const allowedRole = me.role === "admin" || me.role === "superadmin"
    || (me.role === "employer" && posting.createdById === me.id);
  if (!allowedRole) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const postingSkills = posting.skills.map((p) => ({ skillId: p.skill.id, weight: p.weight, required: p.required }));
  const requiredIds = posting.skills.filter((p) => p.required).map((p) => p.skill.id);

  // Find candidates with at least one required skill — narrows the pool
  // before we score in app code.
  const candidates = await prisma.user.findMany({
    where: {
      role: { in: ["trainee", "evaluating"] },
      isActive: true,
      skills: requiredIds.length > 0
        ? { some: { skillId: { in: requiredIds } } }
        : { some: {} },
    },
    select: {
      id: true,
      name: true,
      skills: {
        select: {
          skillId: true,
          level: true,
          source: true,
          skill: { select: { name: true, category: true, status: true } },
        },
      },
      _count: { select: { enrollments: { where: { status: "completed" } } } },
    },
    take: 200,
  });

  const scored = candidates
    .map((c) => {
      const userSkills = c.skills
        .filter((s) => s.skill.status !== "merged")
        .map((s) => ({ skillId: s.skillId, level: s.level }));
      const m = scoreMatch(userSkills, postingSkills);
      return {
        // Anonymise: only initials by default
        initials: (c.name ?? "??").split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join(""),
        userId: c.id,
        score: m.score,
        matched: m.matched,
        missingRequired: m.missingRequired.length,
        completedCourses: c._count.enrollments,
        topSkills: c.skills
          .filter((s) => s.skill.status !== "merged")
          .sort((a, b) => b.level - a.level)
          .slice(0, 5)
          .map((s) => ({ name: s.skill.name, category: s.skill.category, level: s.level, source: s.source })),
      };
    })
    .filter((c) => c.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 30);

  return NextResponse.json({
    posting: { id: posting.id, title: posting.title, totalSkills: postingSkills.length },
    candidates: scored,
  });
}
