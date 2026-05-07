import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import type { FormField } from "@/lib/forms/types";

export const runtime = "nodejs";

/** Admin-only: replace the form's field schema. We do shape validation
 *  here (every entry has id/type/label) but trust admins beyond that. */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    await requireRole("admin");
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { slug } = await params;
  const body = (await req.json().catch(() => ({}))) as {
    fields?: FormField[];
    title?: string;
    description?: string | null;
    active?: boolean;
  };

  const update: Prisma.EventFormUpdateInput = {};

  if (body.fields !== undefined) {
    if (!Array.isArray(body.fields)) {
      return NextResponse.json({ error: "fields must be an array" }, { status: 400 });
    }
    for (const f of body.fields) {
      if (!f || typeof f !== "object" || !("id" in f) || !("type" in f) || !("label" in f)) {
        return NextResponse.json(
          { error: "Each field must have id, type, label." },
          { status: 400 }
        );
      }
    }
    update.fields = body.fields as unknown as Prisma.InputJsonValue;
  }
  if (typeof body.title === "string") update.title = body.title.trim();
  if (body.description !== undefined) update.description = body.description;
  if (typeof body.active === "boolean") update.active = body.active;

  const form = await prisma.eventForm.update({ where: { slug }, data: update });
  return NextResponse.json({ ok: true, form });
}
