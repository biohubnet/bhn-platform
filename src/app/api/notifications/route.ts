export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { activityCopy } from "@/lib/employer/activity";
import type { ActivityKind } from "@/lib/employer/activity";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id?: string }).id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "30", 10), 100);
  const offset = parseInt(searchParams.get("offset") ?? "0", 10);

  const [notifications, unreadCount, total] = await Promise.all([
    prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
      include: {
        activityLog: {
          select: {
            kind: true,
            payload: true,
            postingId: true,
          },
        },
      },
    }),
    prisma.notification.count({
      where: { userId, readAt: null },
    }),
    prisma.notification.count({
      where: { userId },
    }),
  ]);

  const items = notifications.map((n) => {
    const log = n.activityLog;
    const text = activityCopy(
      log.kind as ActivityKind,
      (log.payload as Record<string, unknown>) ?? {},
    );
    return {
      id: n.id,
      reason: n.reason,
      readAt: n.readAt?.toISOString() ?? null,
      createdAt: n.createdAt.toISOString(),
      text,
      postingId: log.postingId ?? null,
      unread: n.readAt === null,
    };
  });

  return NextResponse.json({ notifications: items, unreadCount, total });
}
