import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolvePathwayWindow } from "@/lib/pathway-enrollment";
import { checkPathwayCompletion } from "@/lib/pathway-completion";
import { trackServer } from "@/lib/analytics";

type Decision = "approve" | "reject" | "waitlist" | "promote" | "reopen" | "withdraw";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireRole("admin").catch(() => null);
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const reviewerId = (session.user as { id?: string }).id!;
  const { id } = await params;
  const body = await req.json();
  const decision = body.decision as Decision;
  const note = (body.note as string | undefined)?.trim() ?? null;

  const VALID = ["approve", "reject", "waitlist", "promote", "reopen", "withdraw"];
  if (!VALID.includes(decision)) {
    return NextResponse.json({ error: "Invalid decision" }, { status: 400 });
  }

  const existing = await prisma.pathwayEnrollment.findUnique({
    where: { id },
    include: { pathway: { select: { id: true, capacity: true, allowWaitlist: true, courses: { select: { courseId: true } } } } },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const now = new Date();
  const tx = await prisma.$transaction(async (db) => {
    switch (decision) {
      case "approve":
      case "promote": {
        if (existing.status === "approved" || existing.status === "completed") {
          throw Object.assign(new Error("Already approved"), { code: 409 });
        }
        // Auto-enroll the user in every course in the pathway (skip duplicates)
        for (const pc of existing.pathway.courses) {
          await db.enrollment.upsert({
            where: { userId_courseId: { userId: existing.userId, courseId: pc.courseId } },
            create: { userId: existing.userId, courseId: pc.courseId, status: "active" },
            update: {},
          });
        }
        return db.pathwayEnrollment.update({
          where: { id },
          data: {
            status: "approved",
            reviewerId, reviewerNote: note, reviewedAt: now, approvedAt: now,
          },
        });
      }
      case "reject": {
        if (existing.status === "rejected") throw Object.assign(new Error("Already rejected"), { code: 409 });
        return db.pathwayEnrollment.update({
          where: { id },
          data: { status: "rejected", reviewerId, reviewerNote: note, reviewedAt: now },
        });
      }
      case "waitlist": {
        if (existing.status === "waitlisted") throw Object.assign(new Error("Already on waitlist"), { code: 409 });
        return db.pathwayEnrollment.update({
          where: { id },
          data: { status: "waitlisted", reviewerId, reviewerNote: note, reviewedAt: now, enrolledAt: existing.enrolledAt },
        });
      }
      case "reopen": {
        return db.pathwayEnrollment.update({
          where: { id },
          data: {
            status: "pending",
            reviewerId: null, reviewerNote: null, reviewedAt: null, approvedAt: null,
          },
        });
      }
      case "withdraw": {
        return db.pathwayEnrollment.update({
          where: { id },
          data: { status: "withdrawn", reviewerId, reviewerNote: note, reviewedAt: now },
        });
      }
    }
  });

  await prisma.auditLog.create({
    data: {
      actorId: reviewerId,
      action: `pathway_enrollment.${decision}`,
      targetType: "pathway_enrollment",
      targetId: id,
      detail: JSON.stringify({ pathwayId: existing.pathwayId, userId: existing.userId, note }),
      ip: req.headers.get("x-forwarded-for") ?? undefined,
    },
  });

  // After approve/promote, check whether the user has already finished
  // every required course and should immediately receive the pathway cert.
  if (decision === "approve" || decision === "promote") {
    checkPathwayCompletion(existing.userId, existing.pathwayId).catch((e) =>
      console.error("pathway sweep:", e)
    );
  }

  // Auto-recompute pathway 'full' status if capacity is set
  const window = await resolvePathwayWindow(existing.pathwayId);
  if (window?.config.capacity != null) {
    const newStatus = window.state === "full" ? "full" : "open";
    if (newStatus !== window.config.enrollmentStatus && window.config.enrollmentStatus !== "closed") {
      await prisma.pathway.update({
        where: { id: existing.pathwayId },
        data: { enrollmentStatus: newStatus },
      });
    }
  }

  trackServer({
    userId: reviewerId,
    role: "admin",
    name: `pathway_enrollment_${decision}`,
    props: { pathwayId: existing.pathwayId, applicantId: existing.userId },
  });

  return NextResponse.json(tx);
}
