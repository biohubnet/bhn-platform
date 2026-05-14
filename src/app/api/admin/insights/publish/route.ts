/**
 * Publish a saved ResearchInsight to /changelog.
 *
 *   POST /api/admin/insights/publish
 *     body: { period: string }
 *
 * Drops a ChangeLog row visible to ALL roles, titled
 * "What users told us — <period>", with the synthesis body as
 * the entry body. Idempotent — re-publishing the same period
 * updates the existing changelog entry rather than spawning a
 * duplicate.
 *
 * This is the loop-closer for ER&D maturity outcome 3 (transparency).
 */
import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const VISIBLE_TO_ALL = [
  "trainee",
  "evaluating",
  "employer",
  "instructor",
  "admin",
  "superadmin",
];

export async function POST(req: NextRequest) {
  const session = await requireRole("admin").catch(() => null);
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const adminUserId = (session.user as { id?: string }).id;
  if (!adminUserId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = (await req.json().catch(() => ({}))) as { period?: unknown };
  const period =
    typeof body.period === "string" ? body.period.trim().slice(0, 32) : "";
  if (!period) return NextResponse.json({ error: "period required" }, { status: 400 });

  const insight = await prisma.researchInsight.findUnique({
    where: { period },
    select: {
      id: true,
      body: true,
      publishedChangelogId: true,
    },
  });
  if (!insight) {
    return NextResponse.json(
      { error: "No synthesis saved for that period yet. Save first, then publish." },
      { status: 404 },
    );
  }

  const title = `What users told us — ${period}`;

  let changelogId: string;
  if (insight.publishedChangelogId) {
    // Re-publish — update the existing entry. Confirms idempotency.
    const updated = await prisma.changeLog.update({
      where: { id: insight.publishedChangelogId },
      data: { title, body: insight.body, kind: "note", visibleTo: VISIBLE_TO_ALL },
      select: { id: true },
    });
    changelogId = updated.id;
  } else {
    const created = await prisma.changeLog.create({
      data: {
        title,
        body: insight.body,
        kind: "note",
        visibleTo: VISIBLE_TO_ALL,
        createdById: adminUserId,
      },
      select: { id: true },
    });
    changelogId = created.id;
  }

  const publishedAt = new Date();
  await prisma.researchInsight.update({
    where: { id: insight.id },
    data: {
      publishedToChangelogAt: publishedAt,
      publishedChangelogId: changelogId,
      updatedById: adminUserId,
    },
  });

  return NextResponse.json({
    ok: true,
    publishedToChangelogAt: publishedAt.toISOString(),
    changelogId,
  });
}
