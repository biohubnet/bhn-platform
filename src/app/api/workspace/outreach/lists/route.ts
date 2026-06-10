/**
 * Outreach lists (admin-only).
 *   POST /api/workspace/outreach/lists { name } → create (default columns)
 */
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DEFAULT_MEMBERSHIP_COLUMNS } from "@/lib/outreach/directory";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const session = await requireRole("admin").catch(() => null);
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const uid = (session.user as { id?: string }).id ?? null;
  const body = (await req.json().catch(() => ({}))) as { name?: string };
  const name = (body.name ?? "").trim().slice(0, 120);
  if (!name) return NextResponse.json({ error: "A list name is required." }, { status: 400 });
  const count = await prisma.outreachList.count();
  const list = await prisma.outreachList.create({
    data: {
      name,
      columns: DEFAULT_MEMBERSHIP_COLUMNS as unknown as Prisma.InputJsonValue,
      order: count,
      createdById: uid,
    },
    select: { id: true, name: true },
  });
  return NextResponse.json({ ok: true, list }, { status: 201 });
}
