/**
 * One outreach list (admin-only).
 *   PATCH  /api/workspace/outreach/lists/[id] { name?, description?, columns? }
 *   DELETE /api/workspace/outreach/lists/[id]   → delete list + its contacts
 *
 * `columns` replaces the list's column definitions wholesale —
 * [{ key, label }] — which is how admins add / rename / remove / reorder
 * columns. Keys are stable slugs; contact values are stored per key, so a
 * rename (label change) keeps data, and a removed column's data just stops
 * rendering (kept in JSON in case the column is re-added).
 */
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
interface Ctx { params: Promise<{ id: string }> }

interface ColumnDef { key: string; label: string }

function sanitizeColumns(input: unknown): ColumnDef[] | null {
  if (!Array.isArray(input) || input.length === 0 || input.length > 20) return null;
  const seen = new Set<string>();
  const out: ColumnDef[] = [];
  for (const c of input) {
    const o = c as Record<string, unknown>;
    const key = typeof o.key === "string" ? o.key.trim().slice(0, 40) : "";
    const label = typeof o.label === "string" ? o.label.trim().slice(0, 60) : "";
    if (!key || !label || !/^[a-z0-9_-]+$/i.test(key) || seen.has(key)) return null;
    seen.add(key);
    out.push({ key, label });
  }
  return out;
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const session = await requireRole("admin").catch(() => null);
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as { name?: string; description?: string; columns?: unknown };

  const data: Prisma.OutreachListUpdateInput = {};
  if (typeof body.name === "string" && body.name.trim()) data.name = body.name.trim().slice(0, 120);
  if (typeof body.description === "string") data.description = body.description.slice(0, 400);
  if (body.columns !== undefined) {
    const cols = sanitizeColumns(body.columns);
    if (!cols) return NextResponse.json({ error: "Invalid columns." }, { status: 400 });
    data.columns = cols as unknown as Prisma.InputJsonValue;
  }
  if (Object.keys(data).length === 0) return NextResponse.json({ error: "No changes." }, { status: 400 });

  const list = await prisma.outreachList.update({ where: { id }, data }).catch(() => null);
  if (!list) return NextResponse.json({ error: "Not found." }, { status: 404 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const session = await requireRole("admin").catch(() => null);
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await ctx.params;
  await prisma.outreachList.delete({ where: { id } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
