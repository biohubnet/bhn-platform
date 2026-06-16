/**
 * Outreach campaigns (admin-only).
 *   POST /api/workspace/outreach/campaigns
 *     { name, templateId, listId?, vars? }
 *       → create a draft campaign. listId omitted/null = target everyone in
 *         the directory. Attribution stamped from the signed-in admin.
 */
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { findTemplate } from "@/lib/outreach/templates";

export const runtime = "nodejs";

function sanitizeVars(input: unknown): Record<string, string> {
  if (typeof input !== "object" || input === null) return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
    if (typeof k === "string" && k.length <= 40 && typeof v === "string") out[k] = v.slice(0, 2000);
  }
  return out;
}

export async function POST(req: NextRequest) {
  const session = await requireRole("admin").catch(() => null);
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const uid = (session.user as { id?: string }).id ?? null;
  const byName = (session.user as { name?: string }).name ?? "Admin";

  const body = (await req.json().catch(() => ({}))) as {
    name?: unknown; templateId?: unknown; listId?: unknown; vars?: unknown;
  };

  const name = typeof body.name === "string" ? body.name.trim().slice(0, 120) : "";
  if (!name) return NextResponse.json({ error: "Name is required." }, { status: 400 });

  const templateId = typeof body.templateId === "string" ? body.templateId : "";
  if (!findTemplate(templateId)) return NextResponse.json({ error: "Unknown template." }, { status: 400 });

  let listId: string | null = null;
  if (typeof body.listId === "string" && body.listId) {
    const list = await prisma.outreachList.findUnique({ where: { id: body.listId }, select: { id: true } });
    if (!list) return NextResponse.json({ error: "List not found." }, { status: 404 });
    listId = list.id;
  }

  const campaign = await prisma.outreachCampaign.create({
    data: {
      name,
      templateId,
      listId,
      vars: sanitizeVars(body.vars) as unknown as Prisma.InputJsonValue,
      sentPersonIds: [] as unknown as Prisma.InputJsonValue,
      status: "draft",
      createdById: uid,
      createdByName: byName,
    },
    select: { id: true },
  });
  return NextResponse.json({ ok: true, campaign }, { status: 201 });
}
