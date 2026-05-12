/**
 * Admin: spawn phantom users.
 *
 *   POST /api/admin/phantom-users
 *     body: { count: number, role?: "trainee" | "evaluating" | "employer" | "instructor", hours?: number }
 *
 *   GET  /api/admin/phantom-users
 *     Returns every currently-alive phantom (accountKind="phantom"
 *     AND demoExpiresAt > NOW()). Used by the admin page.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  spawnPhantoms,
  PHANTOM_TTL_DEFAULT_HOURS,
  PHANTOM_TTL_MAX_HOURS,
  PHANTOM_BATCH_MAX,
  PHANTOM_ROLE_VALUES,
} from "@/lib/phantom";

export const runtime = "nodejs";

export async function GET() {
  const session = await requireRole("admin").catch(() => null);
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const phantoms = await prisma.user.findMany({
    where: {
      accountKind: "phantom",
      demoExpiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      credits: true,
      magicToken: true,
      organization: true,
      jobTitle: true,
      demoExpiresAt: true,
      createdAt: true,
      createdByAdmin: { select: { id: true, name: true, email: true } },
    },
  });

  return NextResponse.json({ ok: true, phantoms });
}

export async function POST(req: NextRequest) {
  const session = await requireRole("admin").catch(() => null);
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const adminId = (session.user as { id?: string }).id ?? null;
  if (!adminId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = (await req.json().catch(() => ({}))) as {
    count?: unknown;
    role?: unknown;
    hours?: unknown;
  };

  if (typeof body.count !== "number" || !Number.isInteger(body.count) || body.count < 1) {
    return NextResponse.json({ error: "count must be a positive integer" }, { status: 400 });
  }
  if (body.count > PHANTOM_BATCH_MAX) {
    return NextResponse.json(
      { error: `count must be ≤ ${PHANTOM_BATCH_MAX} (spawn in batches)` },
      { status: 400 },
    );
  }
  if (body.role !== undefined && !(PHANTOM_ROLE_VALUES as readonly string[]).includes(String(body.role))) {
    return NextResponse.json(
      { error: `role must be one of: ${PHANTOM_ROLE_VALUES.join(", ")}` },
      { status: 400 },
    );
  }
  if (body.hours !== undefined) {
    if (typeof body.hours !== "number" || body.hours < 1 || body.hours > PHANTOM_TTL_MAX_HOURS) {
      return NextResponse.json(
        { error: `hours must be between 1 and ${PHANTOM_TTL_MAX_HOURS}` },
        { status: 400 },
      );
    }
  }

  try {
    const phantoms = await spawnPhantoms({
      count: body.count,
      role: (body.role as "trainee" | "evaluating" | "employer" | "instructor") ?? "trainee",
      hours: (body.hours as number) ?? PHANTOM_TTL_DEFAULT_HOURS,
      adminId,
    });
    return NextResponse.json({ ok: true, phantoms });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
