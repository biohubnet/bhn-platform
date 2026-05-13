import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { resolvePathwayWindow } from "@/lib/pathway-enrollment";
import { trackServer } from "@/lib/analytics";
import { enrollInCohort, pathwayHasCohorts, cancelCohortEnrollment } from "@/lib/pathways/cohorts";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: pathwayId } = await params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  const userId = (session.user as { id?: string }).id!;
  const role = (session.user as { role?: string }).role ?? "trainee";
  const body = await req.json().catch(() => ({}));
  const requestReason = typeof body.reason === "string" ? body.reason.trim().slice(0, 1000) : null;
  const cohortId = typeof body.cohortId === "string" && body.cohortId.length > 0 ? body.cohortId : null;

  // Cohort-mode path: when the pathway has cohorts, the legacy
  // pathway-level capacity/window is ignored and we route through
  // the cohort service which handles its own state computation,
  // capacity, and waitlist promotion.
  const usesCohorts = await pathwayHasCohorts(pathwayId);
  if (usesCohorts) {
    if (!cohortId) {
      return NextResponse.json(
        { error: "This pathway runs in cohorts — pick one to enroll.", code: "cohort_required" },
        { status: 400 },
      );
    }
    const r = await enrollInCohort(userId, cohortId, requestReason);
    if (!r.ok) {
      return NextResponse.json({ error: r.error, code: r.code }, { status: 409 });
    }
    trackServer({
      userId, role, name: "pathway_request",
      props: { pathwayId, cohortId, status: r.status },
    });
    return NextResponse.json({
      id: r.enrollmentId,
      status: r.status,
      waitlistPosition: r.waitlistPosition,
    }, { status: 201 });
  }

  // Legacy path — pathway-level enrollment (no cohorts).
  const window = await resolvePathwayWindow(pathwayId);
  if (!window) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (window.state === "closed") {
    return NextResponse.json({ error: window.reason ?? "Enrollment closed" }, { status: 409 });
  }

  // Already requested?
  const existing = await prisma.pathwayEnrollment.findUnique({
    where: { userId_pathwayId: { userId, pathwayId } },
  });
  if (existing) {
    if (existing.status === "approved" || existing.status === "completed") {
      return NextResponse.json(existing); // already in
    }
    if (existing.status === "pending" || existing.status === "waitlisted") {
      return NextResponse.json({ error: `You already have a ${existing.status} request.` }, { status: 409 });
    }
    if (existing.status === "rejected" || existing.status === "withdrawn") {
      // Allow resubmission — flip to pending/waitlisted accordingly
      const placement = window.state === "full"
        ? (window.config.allowWaitlist ? "waitlisted" : null)
        : "pending";
      if (!placement) {
        return NextResponse.json({ error: "Pathway is full and the waitlist is closed." }, { status: 409 });
      }
      const updated = await prisma.pathwayEnrollment.update({
        where: { id: existing.id },
        data: {
          status: placement,
          requestReason,
          reviewerId: null,
          reviewerNote: null,
          reviewedAt: null,
          enrolledAt: new Date(),
        },
      });
      trackServer({ userId, role, name: "pathway_request", props: { pathwayId, status: placement } });
      return NextResponse.json(updated, { status: 201 });
    }
  }

  // New request
  const placement = window.state === "full"
    ? (window.config.allowWaitlist ? "waitlisted" : null)
    : "pending";
  if (!placement) {
    return NextResponse.json({ error: "Pathway is full and the waitlist is closed." }, { status: 409 });
  }

  const created = await prisma.pathwayEnrollment.create({
    data: { userId, pathwayId, status: placement, requestReason },
  });
  trackServer({ userId, role, name: "pathway_request", props: { pathwayId, status: placement } });
  return NextResponse.json(created, { status: 201 });
}

/**
 * Withdraw the calling user's enrollment from a pathway.
 *
 * Mirrors the course-side DELETE: flips the user's PathwayEnrollment
 * row to status="withdrawn" so they can re-apply later if they want.
 * For cohort-mode pathways we route through `cancelCohortEnrollment`
 * which also promotes the next-in-line waitlist entry — leaving an
 * approved seat dangling would penalise the next trainee for no
 * reason.
 *
 * This is admin-fast-path-equivalent on the trainee side too — the
 * UI exposes the button only for admin/superadmin (testing flows),
 * but the API isn't role-gated because a trainee withdrawing their
 * own row is fundamentally safe. The withdrawn state is reversible
 * (re-enroll), audit-logged via the pathway_request track event,
 * and doesn't touch course enrollments inside the pathway.
 */
export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: pathwayId } = await params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  const userId = (session.user as { id?: string }).id!;
  const role = (session.user as { role?: string }).role ?? "trainee";

  // Route through the cohort cancel helper when the pathway is in
  // cohort-mode — it handles waitlist promotion in the same tx.
  const usesCohorts = await pathwayHasCohorts(pathwayId);
  if (usesCohorts) {
    const r = await cancelCohortEnrollment(userId, pathwayId);
    if (!("ok" in r) || !r.ok) {
      return NextResponse.json({ error: (r as { error?: string }).error ?? "Couldn't leave." }, { status: 409 });
    }
    trackServer({ userId, role, name: "pathway_withdraw", props: { pathwayId, promoted: r.promoted } });
    return NextResponse.json({ ok: true, promoted: r.promoted });
  }

  // Legacy path — pathway-level enrollment.
  const existing = await prisma.pathwayEnrollment.findUnique({
    where: { userId_pathwayId: { userId, pathwayId } },
  });
  if (!existing) {
    // Idempotent: no row means there's nothing to withdraw, return ok.
    return NextResponse.json({ ok: true, alreadyGone: true });
  }
  if (existing.status === "withdrawn") {
    return NextResponse.json({ ok: true, alreadyGone: true });
  }
  await prisma.pathwayEnrollment.update({
    where: { id: existing.id },
    data: { status: "withdrawn", waitlistPosition: null },
  });
  trackServer({ userId, role, name: "pathway_withdraw", props: { pathwayId } });
  return NextResponse.json({ ok: true });
}
