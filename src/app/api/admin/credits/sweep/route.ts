/**
 * Run the daily credit-expiry maintenance:
 *   • expire-and-deduct grants past their TTL
 *   • send 90/30/7-day-before-expiry warning emails
 *
 *   POST /api/admin/credits/sweep
 *   GET  /api/admin/credits/sweep   (Vercel Cron sends GET)
 *
 * Auth: Vercel Cron bearer secret OR admin session.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { runDailyMaintenance } from "@/lib/credits/expiry";

export const runtime = "nodejs";

async function handle(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization") ?? "";
  const cronAuthed = cronSecret && auth === `Bearer ${cronSecret}`;
  if (!cronAuthed) {
    const session = await requireRole("admin").catch(() => null);
    if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const r = await runDailyMaintenance();
  return NextResponse.json({ ok: true, ...r });
}

export const POST = handle;
export const GET = handle;
