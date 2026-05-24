/**
 * Email template management for a company.
 *
 *   GET  /api/employer/companies/[id]/templates
 *     Returns all EmailTemplate rows for the company.
 *     Auth: viewer+
 *     Returns: { templates: [...] }
 *
 *   POST /api/employer/companies/[id]/templates
 *     Creates a new EmailTemplate.
 *     Body: { name: string, kind: string, subject: string, body: string }
 *     Auth: manager+
 *     Returns: { ok: true, template: {...} }
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

// ── GET — list templates ──────────────────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;
  const { id: companyId } = await params;

  try {
    await requireCompanyRole(companyId, userId, "viewer");
  } catch {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  const templates = await prisma.emailTemplate.findMany({
    where: { companyId },
    orderBy: [{ isStarter: "desc" }, { createdAt: "asc" }],
  });

  return NextResponse.json({ templates });
}

// ── POST — create template ────────────────────────────────────────

interface CreateBody {
  name?: string;
  kind?: string;
  subject?: string;
  body?: string;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;
  const { id: companyId } = await params;

  try {
    await requireCompanyRole(companyId, userId, "manager");
  } catch {
    return NextResponse.json({ error: "Access denied — manager+ required" }, { status: 403 });
  }

  let body: CreateBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const name = body.name?.trim();
  const subject = body.subject?.trim();
  const templateBody = body.body?.trim();

  if (!name || name.length === 0) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }
  if (!isValidKind(body.kind)) {
    return NextResponse.json(
      { error: `kind must be one of: ${VALID_KINDS.join(", ")}` },
      { status: 400 },
    );
  }
  if (!subject || subject.length === 0) {
    return NextResponse.json({ error: "subject is required" }, { status: 400 });
  }
  if (templateBody === undefined || templateBody === null) {
    return NextResponse.json({ error: "body is required" }, { status: 400 });
  }

  const template = await prisma.emailTemplate.create({
    data: {
      companyId,
      name,
      kind: body.kind,
      subject,
      body: templateBody,
      isStarter: false,
      createdById: userId,
    },
  });

  return NextResponse.json({ ok: true, template }, { status: 201 });
}
