/**
 * Global person-column definitions for the outreach directory (admin-only).
 * These are the SHARED columns (org/name/title/email/…) every list shows.
 *   PATCH /api/workspace/outreach/person-columns { columns }
 */
import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { sanitizeColumns, setPersonColumns } from "@/lib/outreach/directory";

export const runtime = "nodejs";

export async function PATCH(req: NextRequest) {
  const session = await requireRole("admin").catch(() => null);
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = (await req.json().catch(() => ({}))) as { columns?: unknown };
  const cols = sanitizeColumns(body.columns);
  if (!cols) return NextResponse.json({ error: "Invalid columns." }, { status: 400 });
  await setPersonColumns(cols);
  return NextResponse.json({ ok: true });
}
