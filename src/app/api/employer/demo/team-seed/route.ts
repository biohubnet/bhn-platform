/**
 * Team demo seeder — employer self-service. ADDITIVE.
 *
 *   POST   /api/employer/demo/team-seed   → add a fresh batch of 3 demo members
 *   DELETE /api/employer/demo/team-seed   → remove ALL demo members
 *
 * Each demo member is a real User row (accountKind = "demo") with a
 * unique per-batch email in the `.test` TLD (which can never receive
 * real mail). Because every batch gets fresh emails, repeated "Add
 * demo team" clicks keep growing the roster instead of no-opping —
 * matching the postings seeder.
 *
 * Clear finds demo members by accountKind = "demo" (not a fixed email
 * list), so it sweeps every batch + any legacy fixed-email members,
 * deletes their CompanyMember rows, and cleans up the now-orphaned
 * demo User rows.
 */

import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceCompanyId } from "@/lib/employer/admin-preview";
import {
  DEMO_TEAM_POOL,
  DEMO_TEAM_BATCH_SIZE,
  DEMO_TEAM_EMAIL_PREFIX,
} from "@/lib/employer/team-demo";

export const runtime = "nodejs";

function hoursAgo(h: number): Date {
  return new Date(Date.now() - h * 3_600_000);
}
function daysAgo(n: number): Date {
  return new Date(Date.now() - n * 86_400_000);
}

// The old `resolveCompanyId(userId, isAdmin)` here adopted the FIRST
// company in the table for admins — the exact cross-admin leak that
// ensureAdminPreviewCompany was built to kill, and it diverged from
// the team PAGE (which already uses the private preview company). It's
// been replaced by the shared resolveWorkspaceCompanyId so seed-writes
// and the team page's reads always land on the same company.

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

  const companyId = await resolveWorkspaceCompanyId(
    userId,
    (session.user as { realRole?: string }).realRole ?? role,
  );
  if (!companyId) {
    return NextResponse.json(
      { error: "No company workspace found" },
      { status: 400 },
    );
  }

  // How many demo members already in this company — the offset into the
  // ordered pool, so each click draws the NEXT distinct people (different
  // name AND title) rather than repeating the same batch. Batches are
  // always DEMO_TEAM_BATCH_SIZE, which divides the pool length evenly, so
  // the offset stays aligned to pool boundaries and wraps predictably.
  const existingDemoCount = await prisma.companyMember.count({
    where: { companyId, user: { accountKind: "demo" } },
  });

  // Per-batch token → globally-unique emails → brand-new User rows
  // every click, so seeding is genuinely additive (no dedup/skip).
  const batch = randomBytes(4).toString("hex");

  let membersCreated = 0;

  for (let i = 0; i < DEMO_TEAM_BATCH_SIZE; i++) {
    const person = DEMO_TEAM_POOL[(existingDemoCount + i) % DEMO_TEAM_POOL.length];
    const email  = `${DEMO_TEAM_EMAIL_PREFIX}${batch}.${i}@bhn.test`;

    const demoUser = await prisma.user.create({
      data: {
        email,
        name:        person.name,
        role:        "employer",
        accountKind: "demo",
      },
      select: { id: true },
    });

    await prisma.companyMember.create({
      data: {
        companyId,
        userId:      demoUser.id,
        role:        person.role,
        title:       person.title,
        invitedById: userId,
        joinedAt:    daysAgo(person.joinedDaysAgo),
        lastSeenAt:  person.lastSeenHoursAgo != null
          ? hoursAgo(person.lastSeenHoursAgo)
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

  const companyId = await resolveWorkspaceCompanyId(
    userId,
    (session.user as { realRole?: string }).realRole ?? role,
  );
  if (!companyId) {
    return NextResponse.json(
      { error: "No company workspace found" },
      { status: 400 },
    );
  }

  // Find every demo-account member of this company (catches all
  // additive batches AND any legacy fixed-email members).
  const demoMembers = await prisma.companyMember.findMany({
    where:  { companyId, user: { accountKind: "demo" } },
    select: { id: true, userId: true },
  });
  const memberRowIds = demoMembers.map((m) => m.id);
  const userIds      = demoMembers.map((m) => m.userId);

  const { count: deleted } = await prisma.companyMember.deleteMany({
    where: { id: { in: memberRowIds } },
  });

  // Clean up the now-orphaned demo team users (those no longer a
  // member of ANY company). Scoped to the demo-team email prefix so
  // we never touch demo applicants or other demo accounts.
  if (userIds.length > 0) {
    const stillMembers = await prisma.companyMember.findMany({
      where:  { userId: { in: userIds } },
      select: { userId: true },
    });
    const stillSet = new Set(stillMembers.map((s) => s.userId));
    const orphanIds = userIds.filter((id) => !stillSet.has(id));
    if (orphanIds.length > 0) {
      await prisma.user.deleteMany({
        where: {
          id:          { in: orphanIds },
          accountKind: "demo",
          email:       { startsWith: DEMO_TEAM_EMAIL_PREFIX },
        },
      });
    }
  }

  return NextResponse.json({ ok: true, deleted });
}
