/**
 * Propose an interview for an application.
 *
 *   POST /api/employer/applications/[id]/interview
 *     body: {
 *       proposedSlots: string[]  // ISO datetime strings, 1..5
 *       format: "phone" | "video" | "onsite",
 *       location?: string,       // URL for video, address for onsite
 *       notes?: string
 *     }
 *
 * Creates an Interview row (or replaces an existing un-accepted one)
 * and moves the ApplicationStatus to `interview_scheduled`. The
 * trainee gets an email + sees their /profile/applications/[id]
 * page light up with the slot picker.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { transitionApplication } from "@/lib/hiring/transitions";

export const runtime = "nodejs";

const VALID_FORMATS = ["phone", "video", "onsite"] as const;
type Format = (typeof VALID_FORMATS)[number];

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id?: string }).id;
  const role = (session.user as { role?: string }).role ?? "";
  if (!userId || !["employer", "admin", "superadmin"].includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await ctx.params;
  const app = await prisma.applicationStatus.findUnique({
    where: { id },
    select: {
      postingId: true,
      applicantId: true,
      posting: { select: { createdById: true } },
    },
  });
  if (!app) return NextResponse.json({ error: "Application not found" }, { status: 404 });
  if (role === "employer" && app.posting.createdById !== userId) {
    return NextResponse.json({ error: "Forbidden — not your posting" }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    proposedSlots?: unknown;
    format?: string;
    location?: string;
    notes?: string;
  };

  if (!Array.isArray(body.proposedSlots) || body.proposedSlots.length === 0 || body.proposedSlots.length > 5) {
    return NextResponse.json(
      { error: "Provide 1–5 proposed slots as ISO date strings." },
      { status: 400 },
    );
  }
  const slots: string[] = [];
  for (const s of body.proposedSlots) {
    if (typeof s !== "string") {
      return NextResponse.json({ error: "Each slot must be an ISO date string." }, { status: 400 });
    }
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) {
      return NextResponse.json({ error: `Invalid slot: ${s}` }, { status: 400 });
    }
    slots.push(d.toISOString());
  }

  const format = body.format as Format;
  if (!VALID_FORMATS.includes(format)) {
    return NextResponse.json(
      { error: `format must be one of: ${VALID_FORMATS.join(", ")}` },
      { status: 400 },
    );
  }

  // Replace any existing un-accepted interview for this app — keeps
  // one active proposal at a time. Accepted ones survive so history
  // isn't destroyed.
  await prisma.interview.deleteMany({
    where: {
      postingId: app.postingId,
      applicantId: app.applicantId,
      status: { in: ["proposed", "cancelled"] },
    },
  });

  const interview = await prisma.interview.create({
    data: {
      postingId: app.postingId,
      applicantId: app.applicantId,
      scheduledById: userId,
      proposedSlots: slots,
      status: "proposed",
      format,
      location: body.location?.trim().slice(0, 500) || null,
      notes: body.notes?.trim().slice(0, 2000) || null,
    },
    select: { id: true },
  });

  // Move the ApplicationStatus forward. Best-effort — if the
  // transition fails (illegal source state, etc.), the interview
  // row stays as a draft.
  const result = await transitionApplication({
    applicationStatusId: id,
    toStage: "interview_scheduled",
    actorUserId: userId,
  });

  return NextResponse.json({
    ok: true,
    interviewId: interview.id,
    transition: result.ok ? { ok: true } : { ok: false, error: result.error },
  });
}
