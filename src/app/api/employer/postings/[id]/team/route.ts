/**
 * /api/employer/postings/[id]/team
 *
 * Manages the PostingTeamMember roster for a single posting.
 *
 *   GET    — list current team members + all company members (for the
 *            "add member" picker). Auth: any company member on the
 *            posting's company (or admin/superadmin).
 *
 *   POST   — upsert a PostingTeamMember.
 *            Body: { userId: string, role: TeamRole }
 *            Auth: manager+ on the posting's company.
 *
 *   DELETE — remove a PostingTeamMember.
 *            Body: { userId: string }
 *            Auth: manager+ on the posting's company.
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getActiveCompanyId, meetsMinRole } from "@/lib/employer/company";

export const runtime = "nodejs";

type TeamRole = "recruiter" | "hiring_manager" | "interviewer" | "observer";
const VALID_TEAM_ROLES: TeamRole[] = [
  "recruiter",
  "hiring_manager",
  "interviewer",
  "observer",
];

// ── Shared helpers ────────────────────────────────────────────────────────────

async function resolveCallerAndPosting(postingId: string) {
  const session = await getSession();
  if (!session) return { ok: false as const, httpStatus: 401, error: "Unauthorized" };

  const userId = (session.user as { id?: string }).id ?? null;
  const sysRole = (session.user as { role?: string }).role ?? "trainee";
  if (!userId) return { ok: false as const, httpStatus: 401, error: "Unauthorized" };

  const posting = await prisma.internshipPosting.findUnique({
    where:  { id: postingId },
    select: { id: true, companyId: true },
  });
  if (!posting) return { ok: false as const, httpStatus: 404, error: "Posting not found" };

  // Resolve the company: prefer the posting's own companyId, fall back to the
  // caller's active company (covers postings not yet migrated to the company model).
  const companyId =
    posting.companyId ?? (await getActiveCompanyId(userId));

  if (!companyId) return { ok: false as const, httpStatus: 403, error: "No company found" };

  return { ok: true as const, userId, sysRole, companyId, posting };
}

// ── GET ───────────────────────────────────────────────────────────────────────

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id: postingId } = await ctx.params;
  const resolved = await resolveCallerAndPosting(postingId);
  if (!resolved.ok) {
    return NextResponse.json({ error: resolved.error }, { status: resolved.httpStatus });
  }
  const { userId, sysRole, companyId } = resolved;

  // Auth: admin/superadmin bypass; otherwise must be a company member.
  const isAdmin = sysRole === "admin" || sysRole === "superadmin";
  if (!isAdmin) {
    const membership = await prisma.companyMember.findUnique({
      where:  { companyId_userId: { companyId, userId } },
      select: { role: true },
    });
    if (!membership) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const [teamMembers, companyMembers] = await Promise.all([
    prisma.postingTeamMember.findMany({
      where:   { postingId },
      include: {
        user: { select: { id: true, name: true, email: true, image: true } },
      },
      orderBy: { addedAt: "asc" },
    }),
    prisma.companyMember.findMany({
      where:   { companyId },
      select: {
        userId: true,
        role:   true,
        title:  true,
        user: { select: { id: true, name: true, email: true, image: true } },
      },
      orderBy: { user: { name: "asc" } },
    }),
  ]);

  return NextResponse.json({ teamMembers, companyMembers });
}

// ── POST (upsert) ─────────────────────────────────────────────────────────────

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id: postingId } = await ctx.params;
  const resolved = await resolveCallerAndPosting(postingId);
  if (!resolved.ok) {
    return NextResponse.json({ error: resolved.error }, { status: resolved.httpStatus });
  }
  const { userId, sysRole, companyId } = resolved;

  // Auth: manager+ required (admins bypass).
  const isAdmin = sysRole === "admin" || sysRole === "superadmin";
  if (!isAdmin) {
    const membership = await prisma.companyMember.findUnique({
      where:  { companyId_userId: { companyId, userId } },
      select: { role: true },
    });
    if (!membership || !meetsMinRole(membership.role, "manager")) {
      return NextResponse.json({ error: "Forbidden: manager role required" }, { status: 403 });
    }
  }

  const body = (await req.json().catch(() => ({}))) as {
    userId?: string;
    role?: string;
  };

  if (!body.userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }
  if (!body.role || !VALID_TEAM_ROLES.includes(body.role as TeamRole)) {
    return NextResponse.json(
      { error: `role must be one of: ${VALID_TEAM_ROLES.join(", ")}` },
      { status: 400 },
    );
  }

  await prisma.postingTeamMember.upsert({
    where: {
      postingId_userId: { postingId, userId: body.userId },
    },
    create: {
      postingId,
      userId:    body.userId,
      role:      body.role,
      addedById: userId,
    },
    update: {
      role:      body.role,
      addedById: userId,
    },
  });

  return NextResponse.json({ ok: true });
}

// ── DELETE ────────────────────────────────────────────────────────────────────

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id: postingId } = await ctx.params;
  const resolved = await resolveCallerAndPosting(postingId);
  if (!resolved.ok) {
    return NextResponse.json({ error: resolved.error }, { status: resolved.httpStatus });
  }
  const { userId, sysRole, companyId } = resolved;

  // Auth: manager+ required (admins bypass).
  const isAdmin = sysRole === "admin" || sysRole === "superadmin";
  if (!isAdmin) {
    const membership = await prisma.companyMember.findUnique({
      where:  { companyId_userId: { companyId, userId } },
      select: { role: true },
    });
    if (!membership || !meetsMinRole(membership.role, "manager")) {
      return NextResponse.json({ error: "Forbidden: manager role required" }, { status: 403 });
    }
  }

  const body = (await req.json().catch(() => ({}))) as { userId?: string };

  if (!body.userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  await prisma.postingTeamMember.deleteMany({
    where: { postingId, userId: body.userId },
  });

  return NextResponse.json({ ok: true });
}
