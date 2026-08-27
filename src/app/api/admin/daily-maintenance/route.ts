/**
 * Consolidated daily maintenance — runs every cleanup the platform
 * needs in a single Vercel cron call. Replaces the prior pair of
 * hourly+daily crons that exceeded Vercel Hobby's 1-cron-per-day
 * cap; both jobs collapse into this 06:00 UTC sweep.
 *
 *   POST /api/admin/daily-maintenance
 *   GET  /api/admin/daily-maintenance   (Vercel cron sends GET)
 *
 * Composes
 *   • sweepExpiredPhantoms()  — deletes any phantom user past TTL
 *   • runDailyMaintenance()   — expires credit grants past their
 *                                365-day TTL + sends 90/30/7-day
 *                                notification emails
 *
 * Both sub-sweepers are idempotent — second run inside the same
 * window does nothing. The individual endpoints
 *   /api/admin/phantom-users/sweep
 *   /api/admin/credits/sweep
 * stay live so admins can still trigger either one manually from
 * the dashboard "Run sweep now" buttons.
 *
 * Trade-off vs the previous hourly phantom sweep: phantoms can now
 * live up to ~24h past their TTL before cleanup arrives. Functional
 * impact is minimal — phantoms are already test fixtures, and the
 * accountKind="phantom" filter keeps them out of every "real" stat
 * the admin UI surfaces. If hourly cadence becomes important, the
 * fix is a Vercel Pro upgrade.
 *
 * Auth: Vercel cron bearer secret OR admin session.
 */
import { NextRequest, NextResponse } from "next/server";
import { reconcileDeadlineStatuses } from "@/lib/equip/sync-deadlines";
import { requireRole } from "@/lib/auth";
import { sweepExpiredPhantoms } from "@/lib/phantom";
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

  // Run the two sweeps independently. If one throws, we still want
  // the other to attempt its work — partial maintenance is better
  // than none. Results are echoed back to the cron log for ops
  // visibility.
  const startedAt = new Date().toISOString();
  const results: {
    phantoms: { deleted?: number; failed?: number; error?: string };
    credits:  {
      sweep?: { grantsExpired: number; creditsDeducted: number; usersAffected: number };
      notifications?: { notificationsSent: number; notificationsSkipped: number };
      error?: string;
    };
    equipDeadlines: { opened?: number; scheduled?: number; closed?: number; error?: string };
  } = { phantoms: {}, credits: {}, equipDeadlines: {} };

  try {
    const r = await sweepExpiredPhantoms();
    results.phantoms = { deleted: r.deleted, failed: r.failed };
  } catch (err) {
    results.phantoms = { error: (err as Error).message };
  }

  try {
    const r = await runDailyMaintenance();
    results.credits = { sweep: r.sweep, notifications: r.notifications };
  } catch (err) {
    results.credits = { error: (err as Error).message };
  }

  // EQUIP funding windows open and close on a clock. Until now the only
  // thing that moved their status was an admin happening to load
  // /admin/equip/deadlines — so a round could close on schedule and its
  // successor sit "scheduled" indefinitely, answering every applicant
  // with "there's no open funding window". Reconciling here means the
  // handover happens whether or not anyone is looking.
  try {
    results.equipDeadlines = await reconcileDeadlineStatuses();
  } catch (err) {
    results.equipDeadlines = { error: (err as Error).message };
  }

  return NextResponse.json({
    ok: true,
    startedAt,
    finishedAt: new Date().toISOString(),
    ...results,
  });
}

export const POST = handle;
export const GET  = handle;
