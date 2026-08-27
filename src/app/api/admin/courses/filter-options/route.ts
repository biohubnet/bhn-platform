import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
export const runtime = "nodejs";

const ALLOWED_TYPES = new Set(["topic", "delivery", "provider"]);

export async function GET() {
  try {
    await requireRole("admin");
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const rows = await prisma.courseFilterOption.findMany({
    orderBy: [{ type: "asc" }, { sortOrder: "asc" }, { value: "asc" }],
  });
  return NextResponse.json({ options: rows });
}

export async function POST(req: NextRequest) {
  try {
    await requireRole("admin");
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = (await req.json().catch(() => ({}))) as {
    type?: string; value?: string; sortOrder?: number;
  };
  const type = body.type?.trim() ?? "";
  const value = body.value?.trim() ?? "";
  if (!ALLOWED_TYPES.has(type)) {
    return NextResponse.json({ error: "type must be topic / delivery / provider" }, { status: 400 });
  }
  if (!value) {
    return NextResponse.json({ error: "value is required" }, { status: 400 });
  }
  // Default sortOrder = current max + 1 so new options sit at the end.
  const max = await prisma.courseFilterOption.aggregate({
    where: { type },
    _max: { sortOrder: true },
  });
  const option = await prisma.courseFilterOption
    .create({
      data: {
        type,
        value,
        sortOrder: body.sortOrder ?? (max._max.sortOrder ?? -1) + 1,
      },
    })
    .catch(() => null);
  if (!option) {
    return NextResponse.json({ error: "An option with that name already exists." }, { status: 409 });
  }
  return NextResponse.json({ ok: true, option });
}
