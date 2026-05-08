/**
 * Employer-facing endpoints for application status (kanban) management.
 *
 *   GET  /api/employer/applications?postingId=xxx → list applicants for a
 *        posting with score + status. Pull from EventFormSubmission rows
 *        (talent-application form) joined with ApplicationStatus.
 *
 *   POST /api/employer/applications  { postingId, applicantId, status?, notes?, rating? }
 *        Upserts the ApplicationStatus row.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireRole, getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { scoreMatch } from "@/lib/skills/ontology";

const VALID_STATUSES = [
  "new", "reviewing", "shortlisted", "phone_screen",
  "onsite", "offer", "hired", "rejected", "closed",
];

async function authoriseEmployerForPosting(postingId: string) {
  const session = await getSession();
  if (!session) return null;
  const me = await prisma.user.findUnique({
    where: { email: session.user!.email! },
    select: { id: true, role: true },
  });
  if (!me) return null;
  if (me.role === "admin" || me.role === "superadmin") return me;
  if (me.role !== "employer") return null;
  const posting = await prisma.internshipPosting.findUnique({
    where: { id: postingId }, select: { createdById: true },
  });
  if (!posting || posting.createdById !== me.id) return null;
  return me;
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const postingId = url.searchParams.get("postingId");
  if (!postingId) return NextResponse.json({ error: "postingId required" }, { status: 400 });
  const me = await authoriseEmployerForPosting(postingId);
  if (!me) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const posting = await prisma.internshipPosting.findUnique({
    where: { id: postingId },
    include: { skills: { include: { skill: { select: { id: true, name: true } } } } },
  });
  if (!posting) return NextResponse.json({ error: "not found" }, { status: 404 });

  // Strategy: the "applicants" for a posting are users who submitted the
  // talent-application form. (We don't yet have a per-posting application
  // model; this is the closest signal.) Optionally narrow by location /
  // timing later.
  const subs = await prisma.eventFormSubmission.findMany({
    where: { form: { slug: "talent-application" }, userId: { not: null } },
    include: {
      user: {
        select: {
          id: true, name: true, email: true, image: true, country: true,
          skills: { include: { skill: { select: { id: true, name: true, category: true, status: true } } } },
          _count: { select: { enrollments: { where: { status: "completed" } } } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  const postingSkills = posting.skills.map((s) => ({ skillId: s.skill.id, weight: s.weight, required: s.required }));

  // Look up existing statuses for this posting in one shot
  const statuses = await prisma.applicationStatus.findMany({
    where: { postingId },
  });
  const statusMap = new Map(statuses.map((s) => [s.applicantId, s]));

  // Look up interviews so the kanban can flag which applicants have one
  const interviews = await prisma.interview.findMany({
    where: { postingId },
    select: { applicantId: true, status: true, acceptedSlot: true, proposedSlots: true },
  });
  const interviewMap = new Map(interviews.map((i) => [i.applicantId, i]));

  const rows = subs.filter((s) => s.user).map((s) => {
    const u = s.user!;
    const userSkills = u.skills.filter((sk) => sk.skill.status !== "merged").map((sk) => ({ skillId: sk.skillId, level: sk.level }));
    const m = scoreMatch(userSkills, postingSkills);
    const st = statusMap.get(u.id);
    const iv = interviewMap.get(u.id);
    return {
      applicantId: u.id,
      submissionId: s.id,
      submittedAt: s.createdAt,
      // Real name visible to authorized employer/admin only
      name: u.name,
      email: u.email,
      country: u.country,
      score: m.score,
      matched: m.matched,
      missingRequired: m.missingRequired.length,
      completedCourses: u._count.enrollments,
      status: st?.status ?? "new",
      rating: st?.rating ?? null,
      notes: st?.notes ?? null,
      interview: iv ? { status: iv.status, acceptedSlot: iv.acceptedSlot, proposedSlots: iv.proposedSlots } : null,
      topSkills: u.skills
        .filter((sk) => sk.skill.status !== "merged")
        .sort((a, b) => b.level - a.level)
        .slice(0, 6)
        .map((sk) => ({ name: sk.skill.name, category: sk.skill.category, level: sk.level, source: sk.source })),
    };
  });

  rows.sort((a, b) => b.score - a.score);

  return NextResponse.json({
    posting: { id: posting.id, title: posting.title, totalSkills: postingSkills.length },
    applicants: rows,
  });
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as {
    postingId?: string;
    applicantId?: string;
    status?: string;
    notes?: string;
    rating?: number;
  };
  if (!body.postingId || !body.applicantId) {
    return NextResponse.json({ error: "postingId and applicantId required" }, { status: 400 });
  }
  const me = await authoriseEmployerForPosting(body.postingId);
  if (!me) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const data: Record<string, unknown> = {};
  if (body.status !== undefined) {
    if (!VALID_STATUSES.includes(body.status)) {
      return NextResponse.json({ error: "invalid status" }, { status: 400 });
    }
    data.status = body.status;
  }
  if (body.notes !== undefined)  data.notes = body.notes;
  if (body.rating !== undefined) data.rating = Math.max(1, Math.min(5, Math.round(body.rating)));
  data.updatedById = me.id;

  const row = await prisma.applicationStatus.upsert({
    where: { postingId_applicantId: { postingId: body.postingId, applicantId: body.applicantId } },
    create: {
      postingId: body.postingId,
      applicantId: body.applicantId,
      ...data,
    },
    update: data,
  });
  return NextResponse.json({ ok: true, status: row });
}
