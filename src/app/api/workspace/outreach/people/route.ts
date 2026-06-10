/**
 * Directory people (admin-only).
 *   POST /api/workspace/outreach/people {} → create a blank person (not on
 *   any list yet); attribution stamped from the signed-in admin.
 */
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST() {
  const session = await requireRole("admin").catch(() => null);
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const uid = (session.user as { id?: string }).id ?? null;
  const name = (session.user as { name?: string }).name ?? "Admin";
  const person = await prisma.outreachPerson.create({
    data: { values: {} as unknown as Prisma.InputJsonValue, addedById: uid, addedByName: name },
    select: { id: true },
  });
  return NextResponse.json({ ok: true, person }, { status: 201 });
}
