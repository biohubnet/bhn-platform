/**
 * /admin/committees/hqp/rounds/[id] — per-round aggregate view
 * for the program team.
 *
 * Renders one section per topic with every member's response
 * stacked side-by-side. Replaces the manual "open each docx,
 * copy-paste responses into a shared doc" workflow.
 */
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { ArrowLeft, MessageSquare, Users2 } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { parseTopics } from "@/lib/hqp/rounds";

export const dynamic = "force-dynamic";

export default async function HqpRoundAggregatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireRole("admin").catch(() => null);
  if (!session) redirect("/dashboard");
  const { id } = await params;

  const round = await prisma.hqpFeedbackRound.findUnique({
    where: { id },
    include: {
      responses: {
        where: { status: "submitted" },
        include: { user: { select: { id: true, name: true, email: true, organization: true } } },
        orderBy: { submittedAt: "asc" },
      },
      _count: { select: { responses: true } },
    },
  });
  if (!round) notFound();

  const topics = parseTopics(round.topics);
  const submitted = round.responses;
  const totalActiveMembers = await prisma.committeeMembership.count({
    where: { committee: "hqp", active: true },
  });

  return (
    <div className="space-y-5">
      <Link href="/admin/committees/hqp/rounds" className="text-xs text-muted hover:text-fg inline-flex items-center gap-1">
        <ArrowLeft size={12} /> All rounds
      </Link>

      <PageHeader
        title={<span className="inline-flex items-center gap-2"><MessageSquare size={22} className="text-violet-600" /> {round.title}</span>}
        description={round.description ?? "Aggregate responses grouped by topic. Each member's answer sits next to the question they answered."}
      />

      <section className="rounded-2xl border border-line bg-card p-4 surface-shadow flex flex-wrap items-center gap-4">
        <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-subtle">Response rate</p>
        <p className="text-sm font-bold text-fg inline-flex items-center gap-2">
          <Users2 size={14} className="text-violet-600" />
          {submitted.length} / {totalActiveMembers} active members submitted
        </p>
        {round.status === "open" ? <Badge tone="success">Round open</Badge> : <Badge tone="danger">Round closed</Badge>}
      </section>

      {topics.length === 0 && (
        <p className="text-sm text-subtle italic">No topics — admin authoring bug.</p>
      )}

      {topics.map((t) => (
        <section key={t.id} className="rounded-2xl border border-line bg-card p-5 surface-shadow space-y-3">
          <header>
            <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-violet-700">{t.label}</p>
            <p className="text-sm text-fg leading-snug">{t.question}</p>
          </header>
          {submitted.length === 0 ? (
            <p className="text-xs text-subtle italic">No submissions yet for this round.</p>
          ) : (
            <ul className="space-y-2">
              {submitted.map((r) => {
                const answer = ((r.answers as Record<string, string>) ?? {})[t.id];
                return (
                  <li key={r.id} className="rounded-xl bg-elevated/40 border border-line p-3">
                    <p className="text-[11px] font-bold text-fg">
                      {r.user.name ?? "—"}
                      {r.user.organization && <span className="text-muted font-normal"> · {r.user.organization}</span>}
                    </p>
                    <p className="text-sm text-fg whitespace-pre-wrap mt-1">
                      {answer?.trim() || <span className="text-subtle italic">No response.</span>}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      ))}
    </div>
  );
}
