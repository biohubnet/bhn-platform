/**
 * Admin: mint a feedback invitation link.
 *
 *   POST /api/admin/feedback-invitations
 *     body: { userId?: string, kind?: string, message?: string,
 *             expiresInDays?: number }
 *
 * If userId is provided the invite is scoped (only that user can
 * submit). Without userId the invite is "anyone with the link" —
 * useful for the auto-leave path. The URL pattern is
 * /feedback/[token].
 *
 *   GET /api/admin/feedback-invitations
 *     list every invitation, newest first, with consumption state.
 */
import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { FEEDBACK_INVITE_TTL_DAYS } from "@/lib/talent-pool/comments";

export const runtime = "nodejs";

const VALID_KINDS = ["exit_survey", "post_completion", "nps_check", "custom"] as const;

export async function GET() {
  const session = await requireRole("admin").catch(() => null);
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const invitations = await prisma.feedbackInvitation.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      user:      { select: { id: true, name: true, email: true } },
      invitedBy: { select: { id: true, name: true, email: true } },
    },
  });
  return NextResponse.json({ ok: true, invitations });
}

export async function POST(req: NextRequest) {
  const session = await requireRole("admin").catch(() => null);
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const adminId = (session.user as { id?: string }).id;
  if (!adminId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = (await req.json().catch(() => ({}))) as {
    userId?: unknown;
    kind?: unknown;
    message?: unknown;
    expiresInDays?: unknown;
  };

  if (body.userId !== undefined && typeof body.userId !== "string") {
    return NextResponse.json({ error: "userId must be a string or omitted" }, { status: 400 });
  }
  const kind = typeof body.kind === "string" && (VALID_KINDS as readonly string[]).includes(body.kind)
    ? body.kind
    : "exit_survey";
  const message = typeof body.message === "string"
    ? body.message.trim().slice(0, 2000) || null
    : null;
  const days = typeof body.expiresInDays === "number" && Number.isFinite(body.expiresInDays)
    ? Math.max(1, Math.min(90, Math.round(body.expiresInDays)))
    : FEEDBACK_INVITE_TTL_DAYS;

  // Optional userId — when present, verify user exists so we can
  // give the admin a clear error instead of a foreign-key crash.
  if (body.userId) {
    const exists = await prisma.user.findUnique({
      where: { id: body.userId },
      select: { id: true },
    });
    if (!exists) return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const token = randomBytes(16).toString("hex");
  const expiresAt = new Date(Date.now() + days * 86_400_000);

  const invitation = await prisma.feedbackInvitation.create({
    data: {
      token,
      userId: typeof body.userId === "string" ? body.userId : null,
      invitedById: adminId,
      kind,
      message,
      expiresAt,
    },
    include: {
      user:      { select: { id: true, name: true, email: true } },
      invitedBy: { select: { id: true, name: true, email: true } },
    },
  });

  return NextResponse.json({ ok: true, invitation });
}
