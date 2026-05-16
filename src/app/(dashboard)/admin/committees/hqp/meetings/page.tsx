/**
 * /admin/committees/hqp/meetings — list + schedule HQP meetings.
 */
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, CalendarClock } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/PageHeader";
import { HqpMeetingsManager } from "@/components/admin/HqpMeetingsManager";

export const dynamic = "force-dynamic";

export default async function HqpAdminMeetingsPage() {
  const session = await requireRole("admin").catch(() => null);
  if (!session) redirect("/dashboard");

  const rows = await prisma.hqpMeeting.findMany({
    orderBy: { scheduledAt: "desc" },
    include: { _count: { select: { attendance: true, actionItems: true } } },
  });
  const initial = rows.map((r) => ({
    id: r.id,
    title: r.title,
    scheduledAt: r.scheduledAt.toISOString(),
    durationMin: r.durationMin,
    status: r.status,
    attendanceCount: r._count.attendance,
    actionItemCount: r._count.actionItems,
  }));

  return (
    <div className="space-y-5">
      <Link href="/admin/committees" className="text-xs text-muted hover:text-fg inline-flex items-center gap-1">
        <ArrowLeft size={12} /> Committees
      </Link>
      <PageHeader
        title={<span className="inline-flex items-center gap-2"><CalendarClock size={22} className="text-violet-600" /> HQP meetings</span>}
        description="Schedule the monthly HQP committee meeting. Every active member is auto-invited on creation; they RSVP from the member-side view. Notes + action items are captured per meeting."
      />
      <HqpMeetingsManager initial={initial} />
    </div>
  );
}
