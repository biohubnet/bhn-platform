/**
 * Per-admin sandbox accounts. Each admin owns exactly one
 * (employer, trainee) pair plus a starter posting + submission.
 *
 *   GET    /api/admin/sandboxes        → all sandboxes grouped by admin
 *   POST   /api/admin/sandboxes        → spawn / refresh my sandbox (idempotent)
 *   PATCH  /api/admin/sandboxes        → reset my sandbox (wipe + re-seed)
 *   DELETE /api/admin/sandboxes        → delete my sandbox
 */
import { NextResponse } from "next/server";
import { requireRole, getSession } from "@/lib/auth";
import { spawnSandbox, resetSandbox, deleteSandbox, listSandboxes } from "@/lib/sandbox/seed";

async function meId() {
  const session = await getSession();
  if (!session) return null;
  return (session.user as { id?: string }).id ?? null;
}

export async function GET() {
  await requireRole("admin");
  const buckets = await listSandboxes();
  return NextResponse.json({ buckets });
}

export async function POST() {
  await requireRole("admin");
  const id = await meId();
  if (!id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const r = await spawnSandbox(id);
  return NextResponse.json({ ok: true, sandbox: r });
}

export async function PATCH() {
  await requireRole("admin");
  const id = await meId();
  if (!id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const r = await resetSandbox(id);
  return NextResponse.json({ ok: true, sandbox: r });
}

export async function DELETE() {
  await requireRole("admin");
  const id = await meId();
  if (!id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const r = await deleteSandbox(id);
  return NextResponse.json({ ok: true, removed: r.removed });
}
