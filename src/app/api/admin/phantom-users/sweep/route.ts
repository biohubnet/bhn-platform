/**
 * Sweep expired phantom users.
 *
 *   POST /api/admin/phantom-users/sweep
 *
 * Two valid callers:
 *   1. Vercel Cron — hourly. Auth: Vercel sends
 *      "Authorization: Bearer $CRON_SECRET" automatically when the
 *      env var is set on the deployment. We check that header.
 *   2. Manual admin trigger — auth: a regular admin session.
 *
 * Either one is sufficient. The endpoint is idempotent — running it
 * twice deletes 0 the second time.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { sweepExpiredPhantoms } from "@/lib/phantom";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization") ?? "";
  const cronAuthed = cronSecret && auth === `Bearer ${cronSecret}`;

  if (!cronAuthed) {
    // Fall back to admin-session auth so a human can trigger the
    // sweep from the admin page or curl with a valid session cookie.
    const session = await requireRole("admin").catch(() => null);
    if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const r = await sweepExpiredPhantoms();
  return NextResponse.json({ ok: true, ...r });
}

// Vercel Cron defaults to GET on cron triggers. Mirror the POST
// behaviour for that case so the same path works either way.
export const GET = POST;
