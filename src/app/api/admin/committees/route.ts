/**
 * Admin committee-membership endpoints.
 *
 *   GET  /api/admin/committees                    list memberships grouped by committee
 *   POST /api/admin/committees                    add a user to a committee
 *
 * GET is used by /admin/committees server page; POST is invoked
 * from the same page's client form to add a new member by email.
 *
 * Authn: requires admin (superadmin inherits). Reviewer
 * committee members do NOT manage memberships — that stays a
 * platform-staff concern.
 */
import { NextResponse } from "next/server";
import { guardRole } from "@/lib/api/guard";

import { prisma } from "@/lib/prisma";
import { isCommitteeSlug, COMMITTEES } from "@/lib/committees/registry";

export const runtime = "nodejs";

export async function GET() {
  const _guard = await guardRole("admin");
  if (_guard instanceof NextResponse) return _guard;

  const rows = await prisma.committeeMembership.findMany({
    orderBy: [{ committee: "asc" }, { active: "desc" }, { joinedAt: "desc" }],
    include: {
      user: { select: { id: true, name: true, email: true, role: true, organization: true } },
    },
  });

  // Group by committee slug so the page renders a section per
  // committee without re-grouping client-side.
  const grouped = COMMITTEES.reduce<Record<string, typeof rows>>((acc, c) => {
    acc[c.slug] = rows.filter((r) => r.committee === c.slug);
    return acc;
  }, {});

  return NextResponse.json({ committees: COMMITTEES, grouped });
}

export async function POST(req: Request) {
  const session = await guardRole("admin");
  if (session instanceof NextResponse) return session;
  const actorId = (session.user as { id?: string }).id ?? "";
  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  const slug = body.committee;
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const note = typeof body.note === "string" ? body.note.slice(0, 500) : null;

  if (!isCommitteeSlug(slug)) {
    return NextResponse.json({ error: "Unknown committee" }, { status: 400 });
  }
  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, name: true, email: true },
  });
  if (!user) {
    return NextResponse.json(
      { error: `No account found for ${email}. The user must register first.` },
      { status: 404 },
    );
  }

  // Re-activating an existing-but-revoked membership keeps the
  // history (joinedAt stays original; we clear leftAt). Adding a
  // brand-new membership inserts a fresh row.
  const existing = await prisma.committeeMembership.findUnique({
    where: { userId_committee: { userId: user.id, committee: slug } },
  });

  let membership;
  if (existing) {
    if (existing.active) {
      return NextResponse.json(
        { error: `${user.name ?? user.email} is already on this committee.` },
        { status: 409 },
      );
    }
    membership = await prisma.committeeMembership.update({
      where: { id: existing.id },
      data: { active: true, leftAt: null, note: note ?? existing.note },
    });
  } else {
    membership = await prisma.committeeMembership.create({
      data: {
        userId: user.id,
        committee: slug,
        active: true,
        note,
      },
    });
  }

  await prisma.auditLog.create({
    data: {
      actorId,
      action: "committee.add_member",
      targetType: "user",
      targetId: user.id,
      detail: JSON.stringify({ committee: slug, note }),
      ip: req.headers.get("x-forwarded-for") ?? undefined,
    },
  }).catch(() => undefined);

  return NextResponse.json({ ok: true, membership, user });
}
