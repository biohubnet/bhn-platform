/**
 * Admin endpoints for triaging /for-employers and /for-trainees inbox.
 *
 *   GET   /api/admin/access-requests
 *   PATCH /api/admin/access-requests   { id, status }   — approve | reject
 */
import { NextRequest, NextResponse } from "next/server";
import { requireRole, getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  await requireRole("admin");
  const rows = await prisma.accessRequest.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 200,
  });
  return NextResponse.json({ requests: rows });
}

export async function PATCH(req: NextRequest) {
  await requireRole("admin");
  const session = await getSession();
  const me = (session?.user as { id?: string } | undefined)?.id ?? null;
  const body = (await req.json().catch(() => ({}))) as { id?: string; status?: string };
  if (!body.id || !["approved", "rejected", "pending"].includes(body.status ?? "")) {
    return NextResponse.json({ error: "id and valid status required" }, { status: 400 });
  }
  const updated = await prisma.accessRequest.update({
    where: { id: body.id },
    data: {
      status: body.status!,
      handledAt: new Date(),
      handledById: me,
    },
  });
  return NextResponse.json({ ok: true, request: updated });
}
