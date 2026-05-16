/**
 * /admin/equip/deadlines — manage funding-window deadlines for
 * VentureConnect (monthly) and VentureLift (quarterly).
 *
 * Two views: list (table) + calendar (month grid). Both are
 * driven by the same data fetch; the toggle lives in the client
 * DeadlineManager component below.
 *
 * Auth: admin OR equip_review committee. Committee members run
 * the reviews — they should be able to schedule the next cycle.
 */
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CalendarClock } from "lucide-react";
import { requireCommitteeOrAdmin } from "@/lib/committees/membership";
import { listDeadlines } from "@/lib/equip/deadlines";
import { PageHeader } from "@/components/ui/PageHeader";
import { DeadlineManager } from "@/components/admin/equip/DeadlineManager";

export const dynamic = "force-dynamic";

export default async function AdminEquipDeadlinesPage() {
  const session = await requireCommitteeOrAdmin(["equip_review"]).catch(() => null);
  if (!session) redirect("/dashboard");

  const deadlines = await listDeadlines();

  // Serialize Dates for the client component (Next.js doesn't
  // serialize Date instances across server/client; ISO strings
  // round-trip cleanly).
  const initial = deadlines.map((d) => ({
    id: d.id,
    stream: d.stream,
    deadlineAt: d.deadlineAt.toISOString(),
    originalDeadlineAt: d.originalDeadlineAt.toISOString(),
    status: d.status,
    cycleLabel: d.cycleLabel,
    note: d.note,
    closedAt: d.closedAt?.toISOString() ?? null,
    extendedAt: d.extendedAt?.toISOString() ?? null,
    createdAt: d.createdAt.toISOString(),
  }));

  return (
    <div className="space-y-5">
      <Link href="/admin/equip" className="text-xs text-muted hover:text-fg inline-flex items-center gap-1">
        <ArrowLeft size={12} /> Review queue
      </Link>

      <PageHeader
        title={<span className="inline-flex items-center gap-2"><CalendarClock size={22} className="text-brand-600" /> Equip deadlines</span>}
        description="Funding windows for VentureConnect (monthly, $5K cap) and VentureLift (quarterly, $25K cap). Default time is 12:00 PM Eastern on the chosen date — adjust the time field if you need an off-hours cut-off. Submissions are blocked automatically once a window closes or its deadline passes; applicants see a clear 'next deadline' card on /equip."
      />

      <DeadlineManager initial={initial} />
    </div>
  );
}
