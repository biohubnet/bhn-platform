/**
 * Master snapshots — list + create.
 *
 *   GET  /api/profile/master/snapshots
 *     List the caller's master snapshots (id, versionNumber, name,
 *     createdAt). Ordered newest-first.
 *
 *   POST /api/profile/master/snapshots
 *     body: { name }
 *     Snap the current master state into an immutable row.
 *     versionNumber auto-increments.
 *
 * Snapshots are the unit of download — the master itself isn't
 * directly downloadable. See [id]/download/route.ts.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getOrCreateMaster, shapeBulletsAsContent } from "@/lib/resume/master";
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
  const snapshots = await prisma.masterSnapshot.findMany({
    where: { masterId: master.id },
    orderBy: { versionNumber: "desc" },
    select: { id: true, versionNumber: true, name: true, createdAt: true },
  });
  return NextResponse.json({
    ok: true,
    snapshots: snapshots.map((s) => ({
      id: s.id,
      versionNumber: s.versionNumber,
      name: s.name,
      createdAt: s.createdAt.toISOString(),
    })),
  });
}

export async function POST(req: NextRequest) {
  const userId = await getMyUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as { name?: unknown };
  const name = typeof body.name === "string" && body.name.trim()
    ? body.name.trim().slice(0, 120)
    : "Snapshot";

  const master = await getOrCreateMaster(prisma, userId);
  const bullets = await prisma.masterBullet.findMany({
    where: { masterId: master.id, isArchived: false },
    orderBy: [{ sectionKind: "asc" }, { position: "asc" }, { createdAt: "asc" }],
    select: {
      id: true, sectionKind: true,
      anchorTitle: true, anchorSubtitle: true, anchorDateRange: true,
      body: true, tags: true, position: true,
    },
  });
  const content: ResumeContent = shapeBulletsAsContent(
    master.header as ResumeContent["header"] | null,
    bullets,
  );

  // versionNumber = max + 1 per master.
  const last = await prisma.masterSnapshot.findFirst({
    where: { masterId: master.id },
    orderBy: { versionNumber: "desc" },
    select: { versionNumber: true },
  });
  const versionNumber = (last?.versionNumber ?? 0) + 1;

  const snapshot = await prisma.masterSnapshot.create({
    data: {
      masterId: master.id,
      versionNumber,
      name,
      content: content as unknown as object,
    },
    select: { id: true, versionNumber: true, name: true, createdAt: true },
  });

  return NextResponse.json({
    ok: true,
    snapshot: {
      id: snapshot.id,
      versionNumber: snapshot.versionNumber,
      name: snapshot.name,
      createdAt: snapshot.createdAt.toISOString(),
    },
  });
}
