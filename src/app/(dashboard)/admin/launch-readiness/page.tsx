import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { loadReadinessSnapshot } from "@/lib/launch/load";
import { LaunchReadinessDashboard } from "@/components/admin/LaunchReadinessDashboard";

/**
 * /admin/launch-readiness — executive launch dashboard.
 *
 * Audience: leadership (non-technical) + engineering team.
 *
 * The page serves two readers at once:
 *   • An exec scrolling the top fold gets timeline, % ready, phase
 *     ladder, decisions needed, and a 3-item "next actions" list —
 *     all in plain English with no jargon.
 *   • An engineer scrolling further gets the detailed per-item
 *     checklist with auto-detected status, evidence strings, and
 *     manual-override controls.
 *
 * Auto-detected items re-evaluate on every page load — no staleness.
 * Manual items persist their state in LaunchChecklistState.
 */
export default async function LaunchReadinessPage() {
  const session = await requireRole("admin").catch(() => null);
  if (!session) redirect("/dashboard");

  const snapshot = await loadReadinessSnapshot();

  return <LaunchReadinessDashboard snapshot={snapshot} />;
}
