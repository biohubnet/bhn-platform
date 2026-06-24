/**
 * Master resume — top-level GET + PATCH.
 *
 *   GET    /api/profile/master
 *     Returns the master + every non-archived bullet, grouped by
 *     section. Lazy-creates a MasterResume row on first call.
 *
 *   PATCH  /api/profile/master
 *     body: { header: { name, email, phone, location, summary } }
 *     Updates the shared header fields. Returns the updated master.
 *
 * See docs/plans/master-resume.md for the full design.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getOrCreateMaster } from "@/lib/resume/master";
import type { ResumeContent } from "@/lib/resume/types";

export const runtime = "nodejs";

async function getMyUserId(): Promise<string | null> {
  const session = await requireSession().catch(() => null);
  if (!session) return null;
  return (session.user as { id?: string }).id ?? null;
}

export async function GET() {
  const userId = await getMyUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const master = await getOrCreateMaster(prisma, userId);
  // Include archived counts so the UI can render the "Archived (N)"
  // tab without a second query. The main list excludes archived so
  // the deep page lands on the active library by default.
  const [bullets, archivedCount, snapshotCount, latestSnapshot] = await Promise.all([
    prisma.masterBullet.findMany({
      where: { masterId: master.id, isArchived: false },
      orderBy: [{ sectionKind: "asc" }, { position: "asc" }, { createdAt: "asc" }],
      select: {
        id: true, sectionKind: true,
        anchorTitle: true, anchorSubtitle: true, anchorDateRange: true,
        anchorCompany: true, anchorLocation: true, anchorStart: true, anchorEnd: true, anchorCurrent: true,
        body: true, tags: true, position: true,
        sourceResumeId: true,
        updatedAt: true,
        _count: { select: { revisions: true } },
      },
    }),
    prisma.masterBullet.count({ where: { masterId: master.id, isArchived: true } }),
    prisma.masterSnapshot.count({ where: { masterId: master.id } }),
    prisma.masterSnapshot.findFirst({
      where: { masterId: master.id },
      orderBy: { versionNumber: "desc" },
      select: { id: true, versionNumber: true, name: true, createdAt: true },
    }),
  ]);

  return NextResponse.json({
    ok: true,
    master: {
      id: master.id,
      header: master.header,
      createdAt: master.createdAt.toISOString(),
      updatedAt: master.updatedAt.toISOString(),
    },
    bullets: bullets.map((b) => ({
      id: b.id,
      sectionKind: b.sectionKind,
      anchorTitle: b.anchorTitle,
      anchorSubtitle: b.anchorSubtitle,
      anchorDateRange: b.anchorDateRange,
      anchorCompany: b.anchorCompany,
      anchorLocation: b.anchorLocation,
      anchorStart: b.anchorStart,
      anchorEnd: b.anchorEnd,
      anchorCurrent: b.anchorCurrent,
      body: b.body,
      tags: b.tags,
      position: b.position,
      sourceResumeId: b.sourceResumeId,
      revisionCount: b._count.revisions,
      updatedAt: b.updatedAt.toISOString(),
    })),
    stats: {
      bulletCount: bullets.length,
      archivedCount,
      snapshotCount,
      latestSnapshot: latestSnapshot
        ? {
            id: latestSnapshot.id,
            versionNumber: latestSnapshot.versionNumber,
            name: latestSnapshot.name,
            createdAt: latestSnapshot.createdAt.toISOString(),
          }
        : null,
    },
  });
}

export async function PATCH(req: NextRequest) {
  const userId = await getMyUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as {
    header?: Partial<NonNullable<ResumeContent["header"]>>;
  };
  if (!body.header || typeof body.header !== "object") {
    return NextResponse.json({ error: "header (object) required" }, { status: 400 });
  }

  const master = await getOrCreateMaster(prisma, userId);

  // Merge — preserve existing header fields the caller didn't touch.
  const existingHeader = (master.header as Record<string, unknown> | null) ?? {};
  const nextHeader = { ...existingHeader, ...body.header };

  const updated = await prisma.masterResume.update({
    where: { id: master.id },
    data: { header: nextHeader as object },
    select: { id: true, header: true, updatedAt: true },
  });

  return NextResponse.json({
    ok: true,
    master: {
      id: updated.id,
      header: updated.header,
      updatedAt: updated.updatedAt.toISOString(),
    },
  });
}
