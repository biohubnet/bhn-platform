/**
 * /admin/committees/hqp/windows — schedule HQP open-call windows.
 */
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, CalendarClock } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { listWindows } from "@/lib/hqp/windows";
import { PageHeader } from "@/components/ui/PageHeader";
import { HqpWindowsManager } from "@/components/admin/HqpWindowsManager";

export const dynamic = "force-dynamic";

export default async function HqpWindowsPage() {
  const session = await requireRole("admin").catch(() => null);
  if (!session) redirect("/dashboard");

  const rows = await listWindows();
  const initial = rows.map((r) => ({
    id: r.id,
    year: r.year,
    title: r.title,
    description: r.description,
    opensAt: r.opensAt.toISOString(),
    closesAt: r.closesAt.toISOString(),
    status: r.status,
    createdAt: r.createdAt.toISOString(),
  }));

  return (
    <div className="space-y-5">
      <Link href="/admin/committees" className="text-xs text-muted hover:text-fg inline-flex items-center gap-1">
        <ArrowLeft size={12} /> Committees
      </Link>
      <PageHeader
        title={<span className="inline-flex items-center gap-2"><CalendarClock size={22} className="text-violet-600" /> HQP open-call windows</span>}
        description="Schedule the annual open call for the HQP Advisory Committee. Outside these windows the public /committee/hqp/apply page shows 'No open call right now'. Closing a window freezes new submissions; existing drafts remain visible to their owners."
      />
      <HqpWindowsManager initial={initial} />
    </div>
  );
}
