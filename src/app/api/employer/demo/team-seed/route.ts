/**
 * Team demo seeder — employer self-service.
 *
 *   POST   /api/employer/demo/team-seed   → add 3 demo members
 *   DELETE /api/employer/demo/team-seed   → remove them
 *
 * Each demo member is a real User row (accountKind = "demo") backed
 * by a well-known email address in the `.test` TLD (which can never
 * receive real mail). The seeder finds-or-creates the User, then
 * creates a CompanyMember row for the caller's company.
 *
 * Clear identifies them by email — a `{ email: { in: DEMO_TEAM_EMAILS } }`
 * lookup then deletes only the CompanyMember rows for this company,
 * leaving the demo User rows alive so the same accounts can be
 * re-seeded without accumulating duplicate users.
 */

import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getActiveCompanyId } from "@/lib/employer/company";
import { DEMO_TEAM_MEMBERS, DEMO_TEAM_EMAILS } from "@/lib/employer/team-demo";

export const runtime = "nodejs";

function hoursAgo(h: number): Date {
  return new Date(Date.now() - h * 3_600_000);
}
function daysAgo(n: number): Date {
  return new Date(Date.now() - n * 86_400_000);
}

/** Resolves the company to seed into, with an admin fallback.
 *  Admins may not have a CompanyMember row; for them we fall back to
 *  the first company in the DB so the seed / clear actions always work
 *  when testing the team page without being an explicit member. */
async function resolveCompanyId(userId: string, isAdmin: boolean): Promise<string | null> {
  const own = await getActiveCompanyId(userId);
  if (own) return own;
  if (!isAdmin) return null;
  const first = await prisma.company.findFirst({
    orderBy: { createdAt: "asc" },
    select:  { id: true },
  });
  return first?.id ?? null;
}

export async function POST() {
  const session = await getSession();
  const role    = (session?.user as { role?: string })?.role ?? "";
  const userId  = (session?.user as { id?: string })?.id;
  const isAdmin = ["admin", "superadmin"].includes(role);
  if (
    !session || !userId ||
    (role !== "employer" && !isAdmin)
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const companyId = await resolveCompanyId(userId, isAdmin);
  if (!companyId) {
    return NextResponse.json(
      { error: "No company workspace found" },
      { status: 400 },
    );
  }

  let membersCreated = 0;

  for (const spec of DEMO_TEAM_MEMBERS) {
    // Find or create the demo user (upsert so re-running never piles
    // up duplicates for the same email).
    const demoUser = await prisma.user.upsert({
      where:  { email: spec.email },
      create: {
        email:       spec.email,
        name:        spec.name,
        role:        "employer",
        accountKind: "demo",
      },
      update: {},
      select: { id: true },
    });

    // Skip if already a member of this company.
    const existing = await prisma.companyMember.findUnique({
      where: { companyId_userId: { companyId, userId: demoUser.id } },
    });
    if (existing) continue;

    await prisma.companyMember.create({
      data: {
        companyId,
        userId:      demoUser.id,
        role:        spec.role,
        title:       spec.title,
        invitedById: userId,
        joinedAt:    daysAgo(spec.joinedDaysAgo),
        lastSeenAt:  spec.lastSeenHoursAgo != null
          ? hoursAgo(spec.lastSeenHoursAgo)
          : null,
      },
    });
    membersCreated++;
  }

  return NextResponse.json({ ok: true, membersCreated });
}

export async function DELETE() {
  const session = await getSession();
  const role    = (session?.user as { role?: string })?.role ?? "";
  const userId  = (session?.user as { id?: string })?.id;
  const isAdmin = ["admin", "superadmin"].includes(role);
  if (
    !session || !userId ||
    (role !== "employer" && !isAdmin)
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const companyId = await resolveCompanyId(userId, isAdmin);
  if (!companyId) {
    return NextResponse.json(
      { error: "No company workspace found" },
      { status: 400 },
    );
  }

  // Resolve demo user IDs from the known email set.
  const demoUsers = await prisma.user.findMany({
    where:  { email: { in: DEMO_TEAM_EMAILS } },
    select: { id: true },
  });
  const demoUserIds = demoUsers.map((u) => u.id);

  const { count: deleted } = await prisma.companyMember.deleteMany({
    where: {
      companyId,
      userId: { in: demoUserIds },
    },
  });

  return NextResponse.json({ ok: true, deleted });
}
