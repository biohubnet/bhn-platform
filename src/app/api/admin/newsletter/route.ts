/**
 * Admin endpoint for the newsletter export workflow.
 *
 *   GET  /api/admin/newsletter            → list rows (default: new only)
 *   GET  /api/admin/newsletter?scope=all  → all opted-in users
 *   POST /api/admin/newsletter            → mark a list of userIds as exported
 *
 * "New" means newsletterStatus = "subscribe" AND newsletterExportedAt is
 * null (never exported). After the admin clicks "Mark as exported", we
 * stamp the timestamp on each row so they don't show up next time.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireRole, getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  await requireRole("admin");
  const url = new URL(req.url);
  const scope = url.searchParams.get("scope") ?? "new";

  const baseWhere = { newsletterStatus: "subscribe" as const, accountKind: "real" as const };
  const where =
    scope === "all"
      ? baseWhere
      : { ...baseWhere, newsletterExportedAt: null };

  const [rows, totalNew, totalAll, lastExportRow] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        name: true,
        organization: true,
        jobTitle: true,
        country: true,
        createdAt: true,
        newsletterSubscribedAt: true,
        newsletterExportedAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 500,
    }),
    prisma.user.count({ where: { newsletterStatus: "subscribe", newsletterExportedAt: null, accountKind: "real" } }),
    prisma.user.count({ where: { newsletterStatus: "subscribe", accountKind: "real" } }),
    prisma.user.findFirst({
      where: { newsletterStatus: "subscribe", newsletterExportedAt: { not: null } },
      orderBy: { newsletterExportedAt: "desc" },
      select: { newsletterExportedAt: true },
    }),
  ]);

  return NextResponse.json({
    scope,
    rows,
    counts: {
      new: totalNew,
      all: totalAll,
    },
    lastExportedAt: lastExportRow?.newsletterExportedAt ?? null,
  });
}

export async function POST(req: NextRequest) {
  await requireRole("admin");
  const session = await getSession();
  const body = (await req.json().catch(() => ({}))) as { userIds?: string[] };
  const ids = Array.isArray(body.userIds) ? body.userIds.filter((x): x is string => typeof x === "string") : [];
  if (ids.length === 0) {
    return NextResponse.json({ error: "userIds must be a non-empty array" }, { status: 400 });
  }

  const now = new Date();
  const r = await prisma.user.updateMany({
    where: { id: { in: ids }, newsletterStatus: "subscribe" },
    data: { newsletterExportedAt: now },
  });

  // Audit so the export is visible in the admin audit log. detail is
  // a String column holding JSON; we encode the payload there.
  const actorId = session ? (session.user as { id?: string }).id : null;
  if (actorId) {
    await prisma.auditLog.create({
      data: {
        actorId,
        action: "newsletter.export",
        targetType: "User",
        targetId: ids[0] ?? null,
        detail: JSON.stringify({
          count: r.count,
          userIds: ids.slice(0, 200), // cap so the column doesn't bloat
        }),
      },
    }).catch(() => undefined);
  }

  return NextResponse.json({ ok: true, marked: r.count, at: now });
}

export async function DELETE(req: NextRequest) {
  // Convenience: clear the exportedAt flag on a list of users so they
  // re-appear in the "new" view. Useful for re-running an export.
  await requireRole("admin");
  const body = (await req.json().catch(() => ({}))) as { userIds?: string[] };
  const ids = Array.isArray(body.userIds) ? body.userIds.filter((x): x is string => typeof x === "string") : [];
  if (ids.length === 0) {
    return NextResponse.json({ error: "userIds must be a non-empty array" }, { status: 400 });
  }
  const r = await prisma.user.updateMany({
    where: { id: { in: ids }, newsletterStatus: "subscribe" },
    data: { newsletterExportedAt: null },
  });
  return NextResponse.json({ ok: true, reset: r.count });
}
