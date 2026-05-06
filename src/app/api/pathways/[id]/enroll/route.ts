import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { resolvePathwayWindow } from "@/lib/pathway-enrollment";
import { trackServer } from "@/lib/analytics";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: pathwayId } = await params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  const userId = (session.user as { id?: string }).id!;
  const role = (session.user as { role?: string }).role ?? "trainee";
  const body = await req.json().catch(() => ({}));
  const requestReason = typeof body.reason === "string" ? body.reason.trim().slice(0, 1000) : null;

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
