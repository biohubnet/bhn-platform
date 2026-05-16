/**
 * /admin/committees/hqp/rounds — feedback-round scheduling +
 * list. Click any row's Aggregate link to drill into the
 * per-topic response view.
 */
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, MessageSquare } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/PageHeader";
import { HqpRoundsManager } from "@/components/admin/HqpRoundsManager";

export const dynamic = "force-dynamic";

export default async function HqpRoundsPage() {
  const session = await requireRole("admin").catch(() => null);
  if (!session) redirect("/dashboard");

  const rows = await prisma.hqpFeedbackRound.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { responses: true } },
    },
  });

  const initial = rows.map((r) => ({
    id: r.id,
    title: r.title,
    description: r.description,
    status: r.status,
    opensAt: r.opensAt.toISOString(),
    closesAt: r.closesAt.toISOString(),
    responseCount: r._count.responses,
  }));

  return (
    <div className="space-y-5">
      <Link href="/admin/committees" className="text-xs text-muted hover:text-fg inline-flex items-center gap-1">
        <ArrowLeft size={12} /> Committees
      </Link>
      <PageHeader
        title={<span className="inline-flex items-center gap-2"><MessageSquare size={22} className="text-violet-600" /> HQP feedback rounds</span>}
        description="Replace the email-the-docx workflow. Each round publishes N topic-questions to every active HQP member; their responses aggregate by topic for the program team. Sample topic set is pre-filled from the BHN feedback template — edit per round as the focus changes."
      />
      <HqpRoundsManager initial={initial} />
    </div>
  );
}
