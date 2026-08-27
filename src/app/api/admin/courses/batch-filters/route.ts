import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
export const runtime = "nodejs";

interface Body {
  ids?: string[];
  /** Each property: undefined → don't change; null → clear; string → set. */
  topic?: string | null;
  delivery?: string | null;
  provider?: string | null;
  isSpecial?: boolean;
}

/**
 * Apply one or more filter values to a list of course IDs in a single
 * UPDATE. Used by the catalog's bulk toolbar.
 */
export async function PATCH(req: NextRequest) {
  try {
    await requireRole("admin");
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = (await req.json().catch(() => ({}))) as Body;
  if (!Array.isArray(body.ids) || body.ids.length === 0) {
    return NextResponse.json({ error: "ids[] required" }, { status: 400 });
  }

  const data: Record<string, unknown> = {};
  if (body.topic !== undefined)    data.topic    = body.topic    ?? null;
  if (body.delivery !== undefined) data.delivery = body.delivery ?? null;
  if (body.provider !== undefined) data.provider = body.provider ?? null;
  if (typeof body.isSpecial === "boolean") data.isSpecial = body.isSpecial;

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const result = await prisma.course.updateMany({
    where: { id: { in: body.ids } },
    data,
  });
  return NextResponse.json({ ok: true, count: result.count });
}
