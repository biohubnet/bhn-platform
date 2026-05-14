/**
 * Move an ApplicationStatus to a new stage.
 *
 *   POST /api/employer/applications/[id]/transition
 *     body: { toStage: Stage, rejectionReason?: string, employerNote?: string }
 *
 * Thin wrapper around src/lib/hiring/transitions.ts. Allowed roles:
 * employer (their own postings only), admin, superadmin.
 *
 * Defence-in-depth ownership check: an employer can only transition
 * applications on postings they created. Admins + superadmins can
 * transition anything.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { transitionApplication, STAGES, type Stage } from "@/lib/hiring/transitions";

export const runtime = "nodejs";

const ERROR_STATUS: Record<string, number> = {
  not_found: 404,
  illegal_transition: 409,
  missing_interview: 409,
  missing_offer: 409,
};

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id?: string }).id;
  const role = (session.user as { role?: string }).role ?? "";
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["employer", "admin", "superadmin"].includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await ctx.params;

  // Ownership gate: employer can only transition their own postings.
  if (role === "employer") {
    const app = await prisma.applicationStatus.findUnique({
      where: { id },
      select: { posting: { select: { createdById: true } } },
    });
    if (!app) return NextResponse.json({ error: "Application not found" }, { status: 404 });
    if (app.posting.createdById !== userId) {
      return NextResponse.json({ error: "Forbidden — not your posting" }, { status: 403 });
    }
  }

  const body = (await req.json().catch(() => ({}))) as {
    toStage?: string;
    rejectionReason?: string;
    employerNote?: string;
  };
  const toStage = body.toStage as Stage;
  if (!(STAGES as readonly string[]).includes(toStage)) {
    return NextResponse.json(
      { error: `toStage must be one of: ${STAGES.join(", ")}` },
      { status: 400 },
    );
  }

  const result = await transitionApplication({
    applicationStatusId: id,
    toStage,
    actorUserId: userId,
    rejectionReason: body.rejectionReason,
    employerNote: body.employerNote,
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, code: result.code },
      { status: ERROR_STATUS[result.code] ?? 400 },
    );
  }
  return NextResponse.json({
    ok: true,
    fromStage: result.fromStage,
    toStage: result.toStage,
    status: result.status,
  });
}
