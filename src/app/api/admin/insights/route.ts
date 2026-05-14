/**
 * Research insight upsert.
 *
 *   POST /api/admin/insights
 *     body: { period: string, body: string }
 *
 * Upserts a ResearchInsight by `period` (unique). Both fields
 * required; period stored verbatim (admin chooses the convention —
 * YYYY-MM, YYYY-WW, release-<sha>). Idempotent — same period + new
 * body just updates the row.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const MAX_PERIOD = 32;
const MAX_BODY = 8000;

export async function POST(req: NextRequest) {
  const session = await requireRole("admin").catch(() => null);
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const adminUserId = (session.user as { id?: string }).id;
  if (!adminUserId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = (await req.json().catch(() => ({}))) as {
    period?: unknown;
    body?: unknown;
  };
  const period =
    typeof body.period === "string" ? body.period.trim().slice(0, MAX_PERIOD) : "";
  const text =
    typeof body.body === "string" ? body.body.trim().slice(0, MAX_BODY) : "";

  if (!period) return NextResponse.json({ error: "period required" }, { status: 400 });
  if (!text) return NextResponse.json({ error: "body required" }, { status: 400 });

  const insight = await prisma.researchInsight.upsert({
    where: { period },
    create: {
      period,
      body: text,
      createdById: adminUserId,
      updatedById: adminUserId,
    },
    update: {
      body: text,
      updatedById: adminUserId,
    },
    select: {
      id: true,
      period: true,
      updatedAt: true,
      publishedToChangelogAt: true,
    },
  });

  return NextResponse.json({ ok: true, insight });
}
