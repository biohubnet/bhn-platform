/**
 * Showcase trainee — single global advanced-trainee demo account.
 *
 *   GET    /api/admin/showcases   → read-only summary (user + counts)
 *   POST   /api/admin/showcases   → spawn / refresh (idempotent)
 *   PATCH  /api/admin/showcases   → reset (wipe related rows + re-seed)
 *   DELETE /api/admin/showcases   → delete the account entirely
 */
import { NextResponse } from "next/server";
import { guardRole } from "@/lib/api/guard";
import { getSession } from "@/lib/auth";
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
  const _guard = await guardRole("admin");
  if (_guard instanceof NextResponse) return _guard;
  const summary = await getShowcase();
  return NextResponse.json({ showcase: summary });
}

export async function POST() {
  const _guard = await guardRole("admin");
  if (_guard instanceof NextResponse) return _guard;
  const adminId = await meId();
  if (!adminId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const r = await spawnShowcase(adminId);
  return NextResponse.json({ ok: true, showcase: r });
}

export async function PATCH() {
  const _guard = await guardRole("admin");
  if (_guard instanceof NextResponse) return _guard;
  const adminId = await meId();
  if (!adminId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const r = await resetShowcase(adminId);
  return NextResponse.json({ ok: true, showcase: r });
}

export async function DELETE() {
  const _guard = await guardRole("admin");
  if (_guard instanceof NextResponse) return _guard;
  const r = await deleteShowcase();
  return NextResponse.json({ ok: true, ...r });
}
