/**
 * Render an EQUIP email template from UNSAVED fields (admin-only).
 *   POST /api/admin/equip/email-templates/preview { id, stream, fields }
 *   → { subject, html } using the stream's sample context.
 * Lets the editor show a faithful preview before committing — the exact
 * renderer used for live sends, so what you see is what applicants get.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import {
  isEquipTemplateId,
  sanitizeEditableFields,
  renderEquipEmail,
  sampleEquipCtx,
  TEMPLATE_DEFAULTS,
} from "@/lib/equip/emails";
import type { EquipStream } from "@/lib/equip/types";

export const runtime = "nodejs";

const isStream = (v: unknown): v is EquipStream => v === "venture_connect" || v === "venture_lift";

export async function POST(req: NextRequest) {
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

  const built = renderEquipEmail(body.id, sampleEquipCtx(body.stream), fields);
  return NextResponse.json({ ok: true, subject: built.subject, html: built.html });
}
