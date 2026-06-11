/**
 * Edit EQUIP email templates (admin-only — reviewers can view the gallery
 * but only admins change the copy sent to applicants).
 *   PATCH  /api/admin/equip/email-templates  { id, stream, fields } → save
 *   DELETE /api/admin/equip/email-templates?id=…&stream=…          → reset
 * Both return the re-rendered preview (sample ctx) so the UI updates in place.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import {
  isEquipTemplateId,
  sanitizeEditableFields,
  saveEquipTemplateOverride,
  resetEquipTemplateOverride,
  getEquipTemplateOverrides,
  resolveTemplateFields,
  renderEquipEmail,
  sampleEquipCtx,
  TEMPLATE_DEFAULTS,
} from "@/lib/equip/emails";
import type { EquipStream } from "@/lib/equip/types";

export const runtime = "nodejs";

const isStream = (v: unknown): v is EquipStream => v === "venture_connect" || v === "venture_lift";

export async function PATCH(req: NextRequest) {
  const session = await requireRole("admin").catch(() => null);
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = (await req.json().catch(() => ({}))) as { id?: unknown; stream?: unknown; fields?: unknown };
  if (!isEquipTemplateId(body.id) || !isStream(body.stream) || !TEMPLATE_DEFAULTS[body.id][body.stream]) {
    return NextResponse.json({ error: "Unknown template." }, { status: 400 });
  }
  const fields = sanitizeEditableFields(body.fields);
  if (!fields) {
    return NextResponse.json(
      { error: "Invalid fields — subject, heading, and at least one paragraph are required." },
      { status: 400 },
    );
  }

  await saveEquipTemplateOverride(body.id, body.stream, fields);
  const built = renderEquipEmail(body.id, sampleEquipCtx(body.stream), fields);
  return NextResponse.json({ ok: true, fields, subject: built.subject, html: built.html, isCustomized: true });
}

export async function DELETE(req: NextRequest) {
  const session = await requireRole("admin").catch(() => null);
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  const stream = url.searchParams.get("stream");
  if (!isEquipTemplateId(id) || !isStream(stream) || !TEMPLATE_DEFAULTS[id][stream]) {
    return NextResponse.json({ error: "Unknown template." }, { status: 400 });
  }

  await resetEquipTemplateOverride(id, stream);
  const { fields } = resolveTemplateFields(id, stream, await getEquipTemplateOverrides());
  const built = renderEquipEmail(id, sampleEquipCtx(stream), fields);
  return NextResponse.json({ ok: true, fields, subject: built.subject, html: built.html, isCustomized: false });
}
