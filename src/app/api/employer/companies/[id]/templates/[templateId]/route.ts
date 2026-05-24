/**
 * Single email template management.
 *
 *   PATCH  /api/employer/companies/[id]/templates/[templateId]
 *     Updates name, kind, subject, body.
 *     Starter templates CAN have their body/subject updated but cannot be deleted.
 *     Auth: manager+
 *
 *   DELETE /api/employer/companies/[id]/templates/[templateId]
 *     Deletes the template. Returns 409 if isStarter.
 *     Auth: manager+
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { requireCompanyRole } from "@/lib/employer/company";

export const runtime = "nodejs";

const VALID_KINDS = ["rejection", "interview_invite", "offer", "follow_up", "general"] as const;
type TemplateKind = (typeof VALID_KINDS)[number];

function isValidKind(k: unknown): k is TemplateKind {
  return typeof k === "string" && (VALID_KINDS as readonly string[]).includes(k);
}

// ── Shared auth + ownership check ────────────────────────────────

async function resolveTemplate(
  companyId: string,
  templateId: string,
  userId: string,
) {
  try {
    await requireCompanyRole(companyId, userId, "manager");
  } catch {
    return { ok: false as const, status: 403, error: "Access denied — manager+ required" };
  }

  const template = await prisma.emailTemplate.findUnique({
    where: { id: templateId },
  });

  if (!template) {
    return { ok: false as const, status: 404, error: "Template not found" };
  }
  if (template.companyId !== companyId) {
    return { ok: false as const, status: 403, error: "Template does not belong to this company" };
  }

  return { ok: true as const, template };
}

// ── PATCH — update template ───────────────────────────────────────

interface PatchBody {
  name?: string;
  kind?: string;
  subject?: string;
  body?: string;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; templateId: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;
  const { id: companyId, templateId } = await params;

  const gate = await resolveTemplate(companyId, templateId, userId);
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });

  let body: PatchBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const data: Record<string, unknown> = {};

  if (body.name !== undefined) {
    const name = body.name.trim();
    if (name.length === 0) return NextResponse.json({ error: "name cannot be empty" }, { status: 400 });
    data.name = name;
  }
  if (body.kind !== undefined) {
    if (!isValidKind(body.kind)) {
      return NextResponse.json(
        { error: `kind must be one of: ${VALID_KINDS.join(", ")}` },
        { status: 400 },
      );
    }
    data.kind = body.kind;
  }
  if (body.subject !== undefined) {
    const subject = body.subject.trim();
    if (subject.length === 0) return NextResponse.json({ error: "subject cannot be empty" }, { status: 400 });
    data.subject = subject;
  }
  if (body.body !== undefined) {
    data.body = body.body;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const updated = await prisma.emailTemplate.update({
    where: { id: templateId },
    data,
  });

  return NextResponse.json({ ok: true, template: updated });
}

// ── DELETE — delete template ──────────────────────────────────────

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; templateId: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;
  const { id: companyId, templateId } = await params;

  const gate = await resolveTemplate(companyId, templateId, userId);
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });

  if (gate.template.isStarter) {
    return NextResponse.json(
      { error: "Starter templates cannot be deleted." },
      { status: 409 },
    );
  }

  await prisma.emailTemplate.delete({ where: { id: templateId } });
  return NextResponse.json({ ok: true });
}
