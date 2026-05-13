/**
 * Admin: persist / reset editable copy strings.
 *
 *   PATCH /api/admin/copy
 *     body: { key: string, value: string }
 *     → Upserts the EditableCopy row. Empty `value` is allowed — it
 *       overrides the code default to "" rather than reverting. Use
 *       DELETE to revert.
 *
 *   DELETE /api/admin/copy?key=...
 *     → Removes the row so the page reverts to the code default.
 *
 * Only admin / superadmin reach this endpoint. The key must exist in
 * the COPY_REGISTRY catalogue — that prevents typos creating ghost
 * rows the /admin/copy editor can't surface.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCopyEntry } from "@/lib/copy-registry";

export const runtime = "nodejs";

const MAX_VALUE_BYTES = 8000; // ample for a paragraph; cuts off runaway pastes

export async function PATCH(req: NextRequest) {
  const session = await requireRole("admin").catch(() => null);
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = (await req.json().catch(() => ({}))) as { key?: string; value?: string };
  const key = typeof body.key === "string" ? body.key.trim() : "";
  const value = typeof body.value === "string" ? body.value : "";

  if (!key) return NextResponse.json({ error: "Missing key" }, { status: 400 });
  if (!getCopyEntry(key)) {
    return NextResponse.json(
      { error: `Unknown copy key: ${key}. Add it to src/lib/copy-registry.ts first.` },
      { status: 400 },
    );
  }
  if (Buffer.byteLength(value, "utf8") > MAX_VALUE_BYTES) {
    return NextResponse.json(
      { error: `Value too long (max ${MAX_VALUE_BYTES} bytes).` },
      { status: 400 },
    );
  }

  const userId = (session.user as { id?: string }).id ?? null;
  await prisma.editableCopy.upsert({
    where: { key },
    create: { key, value, updatedById: userId },
    update: { value, updatedById: userId },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const session = await requireRole("admin").catch(() => null);
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const key = req.nextUrl.searchParams.get("key");
  if (!key) return NextResponse.json({ error: "Missing key" }, { status: 400 });

  await prisma.editableCopy.deleteMany({ where: { key } });
  return NextResponse.json({ ok: true });
}
