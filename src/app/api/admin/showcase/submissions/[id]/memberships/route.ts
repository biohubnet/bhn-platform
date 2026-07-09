/**
 * Membership management for one showcase person.
 *
 *   POST   /api/admin/showcase/submissions/[id]/memberships  { groupId }
 *     Add this person to another group/cohort. No photo needed — they
 *     already exist; this is just a second membership. Idempotent.
 *
 *   DELETE /api/admin/showcase/submissions/[id]/memberships  { groupId }
 *     Remove them from that group. Refuses to remove the `isHome`
 *     membership (that's the person's home group — delete the person
 *     from their card instead).
 *
 * Admin-only. ShowcaseMembership is the single source of truth for
 * cohort/pathway membership; both surfaces (card picker + roster) use this.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

/** Resolve a group into a chip descriptor (Pathway › Cohort, or standalone). */
function describe(group: { id: string; name: string; pathway: { name: string } | null }) {
  return group.pathway
    ? { groupId: group.id, label: group.pathway.name, sub: group.name }
    : { groupId: group.id, label: group.name, sub: null as string | null };
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireRole("admin").catch(() => null);
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const meId = (session.user as { id?: string }).id ?? null;

  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as { groupId?: string };
  const groupId = (body.groupId ?? "").trim();
  if (!groupId) return NextResponse.json({ error: "groupId required" }, { status: 400 });

  const [submission, group] = await Promise.all([
    prisma.showcaseSubmission.findUnique({ where: { id }, select: { id: true } }),
    prisma.showcaseGroup.findUnique({
      where: { id: groupId },
      select: { id: true, name: true, pathway: { select: { name: true } } },
    }),
  ]);
  if (!submission) return NextResponse.json({ error: "Person not found." }, { status: 404 });
  if (!group) return NextResponse.json({ error: "Unknown group." }, { status: 404 });

  // Idempotent: unique [submissionId, groupId]. If they're already in it,
  // return the existing membership rather than erroring.
  const existing = await prisma.showcaseMembership.findUnique({
    where: { submissionId_groupId: { submissionId: id, groupId } },
    select: { id: true, isHome: true },
  });
  const membership =
    existing ??
    (await prisma.showcaseMembership.create({
      data: { submissionId: id, groupId, isHome: false, createdById: meId },
      select: { id: true, isHome: true },
    }));

  return NextResponse.json({
    ok: true,
    membership: { membershipId: membership.id, isHome: membership.isHome, ...describe(group) },
  });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireRole("admin").catch(() => null);
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as { groupId?: string };
  const groupId = (body.groupId ?? "").trim();
  if (!groupId) return NextResponse.json({ error: "groupId required" }, { status: 400 });

  const membership = await prisma.showcaseMembership.findUnique({
    where: { submissionId_groupId: { submissionId: id, groupId } },
    select: { id: true, isHome: true },
  });
  if (!membership) return NextResponse.json({ error: "Not a member of that group." }, { status: 404 });
  if (membership.isHome) {
    return NextResponse.json(
      { error: "That's the person's home group — delete the person from their card instead." },
      { status: 400 },
    );
  }

  await prisma.showcaseMembership.delete({ where: { id: membership.id } });
  return NextResponse.json({ ok: true });
}
