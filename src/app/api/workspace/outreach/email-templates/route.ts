/**
 * Edit outreach email templates (admin-only).
 *   PATCH  /api/workspace/outreach/email-templates  { id, subject, body } → save
 *   DELETE /api/workspace/outreach/email-templates?id=…                   → reset
 */
import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import {
  isOutreachTemplateId,
  sanitizeTemplateEdit,
  saveOutreachTemplateOverride,
  resetOutreachTemplateOverride,
} from "@/lib/outreach/templates";

export const runtime = "nodejs";

export async function PATCH(req: NextRequest) {
  const session = await requireRole("admin").catch(() => null);
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = (await req.json().catch(() => ({}))) as { id?: unknown; subject?: unknown; body?: unknown };
  if (!isOutreachTemplateId(body.id)) return NextResponse.json({ error: "Unknown template." }, { status: 400 });
  const fields = sanitizeTemplateEdit(body);
  if (!fields) return NextResponse.json({ error: "Subject and body are required." }, { status: 400 });
  await saveOutreachTemplateOverride(body.id, fields);
  return NextResponse.json({ ok: true, ...fields, isCustomized: true });
}

export async function DELETE(req: NextRequest) {
  const session = await requireRole("admin").catch(() => null);
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const id = new URL(req.url).searchParams.get("id");
  if (!isOutreachTemplateId(id)) return NextResponse.json({ error: "Unknown template." }, { status: 400 });
  await resetOutreachTemplateOverride(id);
  return NextResponse.json({ ok: true });
}
