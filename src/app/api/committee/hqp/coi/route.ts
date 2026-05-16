/**
 * HQP COI disclosures.
 *   POST create new disclosure
 *   PATCH (via body { id, action: "resolve" }) mark inactive
 */
import { NextResponse } from "next/server";
import { requireCommitteeOrAdmin } from "@/lib/committees/membership";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const session = await requireCommitteeOrAdmin(["hqp"]);
  const userId = (session.user as { id?: string }).id ?? "";
  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  const scope = typeof body.scope === "string" ? body.scope.slice(0, 200) : "";
  const description = typeof body.description === "string" ? body.description.slice(0, 2000) : "";
  if (!scope || !description) {
    return NextResponse.json({ error: "Scope + description are required" }, { status: 400 });
  }
  const created = await prisma.hqpCoiDisclosure.create({
    data: { userId, scope, description, active: true },
  });
  return NextResponse.json({ ok: true, disclosure: created });
}

export async function PATCH(req: Request) {
  const session = await requireCommitteeOrAdmin(["hqp"]);
  const userId = (session.user as { id?: string }).id ?? "";
  const role = (session.user as { role?: string }).role ?? "";
  const isAdmin = role === "admin" || role === "superadmin";
  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  const id = typeof body.id === "string" ? body.id : "";
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const existing = await prisma.hqpCoiDisclosure.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!isAdmin && existing.userId !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const updated = await prisma.hqpCoiDisclosure.update({
    where: { id },
    data: { active: false, resolvedAt: new Date() },
  });
  return NextResponse.json({ ok: true, disclosure: updated });
}
