/**
 * Showcase trainee — single global advanced-trainee demo account.
 *
 *   GET    /api/admin/showcases   → read-only summary (user + counts)
 *   POST   /api/admin/showcases   → spawn / refresh (idempotent)
 *   PATCH  /api/admin/showcases   → reset (wipe related rows + re-seed)
 *   DELETE /api/admin/showcases   → delete the account entirely
 */
import { NextResponse } from "next/server";
import { requireRole, getSession } from "@/lib/auth";
import {
  spawnShowcase,
  resetShowcase,
  deleteShowcase,
  getShowcase,
} from "@/lib/showcase/seed";

async function meId() {
  const session = await getSession();
  if (!session) return null;
  return (session.user as { id?: string }).id ?? null;
}

export async function GET() {
  await requireRole("admin");
  const summary = await getShowcase();
  return NextResponse.json({ showcase: summary });
}

export async function POST() {
  await requireRole("admin");
  const adminId = await meId();
  if (!adminId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const r = await spawnShowcase(adminId);
  return NextResponse.json({ ok: true, showcase: r });
}

export async function PATCH() {
  await requireRole("admin");
  const adminId = await meId();
  if (!adminId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const r = await resetShowcase(adminId);
  return NextResponse.json({ ok: true, showcase: r });
}

export async function DELETE() {
  await requireRole("admin");
  const r = await deleteShowcase();
  return NextResponse.json({ ok: true, ...r });
}
