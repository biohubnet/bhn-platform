/**
 * POST /api/admin/internships/sheet-sync — copy postings from the
 * host-company Google Sheet now, rather than waiting for the daily
 * maintenance cron. See lib/internships/sheet-sync.
 */
import { NextResponse } from "next/server";
import { guardRole } from "@/lib/api/guard";
import { prisma } from "@/lib/prisma";
import { syncPostingsFromSheet } from "@/lib/internships/sheet-sync";

export const runtime = "nodejs";

export async function POST() {
  const session = await guardRole("admin");
  if (session instanceof NextResponse) return session;
  const result = await syncPostingsFromSheet().catch((e: Error) => ({ error: e.message }));
  await prisma.auditLog.create({
    data: { actorId: (session.user as { id?: string }).id!, action: "internship.sheet_sync", detail: JSON.stringify(result) },
  });
  return NextResponse.json(result, { status: "error" in result ? 502 : 200 });
}
