/**
 * HQP feedback rounds — admin endpoints.
 *
 *   GET  /api/admin/committees/hqp/rounds       list every round
 *   POST /api/admin/committees/hqp/rounds       create
 */
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseTopics } from "@/lib/hqp/rounds";

export const runtime = "nodejs";

export async function GET() {
  await requireRole("admin");
  const rounds = await prisma.hqpFeedbackRound.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      createdBy: { select: { id: true, name: true } },
      _count: { select: { responses: true } },
    },
  });
  return NextResponse.json({ rounds });
}

export async function POST(req: Request) {
  const session = await requireRole("admin");
  const actorId = (session.user as { id?: string }).id ?? "";
  const body = await req.json().catch(() => ({} as Record<string, unknown>));

  const title = typeof body.title === "string" ? body.title.slice(0, 200) : "";
  const description = typeof body.description === "string" ? body.description.slice(0, 2000) : null;
  const opensAt  = body.opensAt  ? new Date(body.opensAt  as string) : null;
  const closesAt = body.closesAt ? new Date(body.closesAt as string) : null;
  const topics = parseTopics(body.topics);

  if (!title) return NextResponse.json({ error: "Title is required" }, { status: 400 });
  if (!opensAt  || isNaN(opensAt.getTime()))  return NextResponse.json({ error: "Invalid opensAt"  }, { status: 400 });
  if (!closesAt || isNaN(closesAt.getTime())) return NextResponse.json({ error: "Invalid closesAt" }, { status: 400 });
  if (closesAt.getTime() <= opensAt.getTime()) {
    return NextResponse.json({ error: "closesAt must be after opensAt" }, { status: 400 });
  }
  if (topics.length === 0) {
    return NextResponse.json({ error: "At least one topic is required" }, { status: 400 });
  }

  const created = await prisma.hqpFeedbackRound.create({
    data: {
      title,
      description: description || null,
      topics: topics as unknown as object,
      opensAt, closesAt,
      status: "open",
      createdById: actorId,
    },
  });

  await prisma.auditLog.create({
    data: {
      actorId,
      action: "hqp_round.create",
      targetType: "hqp_feedback_round",
      targetId: created.id,
      detail: JSON.stringify({ title, topicCount: topics.length }),
      ip: req.headers.get("x-forwarded-for") ?? undefined,
    },
  }).catch(() => undefined);

  return NextResponse.json({ ok: true, round: created });
}
