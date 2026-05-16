/**
 * /committee/hqp/feedback/[id] — member's per-round response page.
 *
 * Gated by HQP committee membership (or admin). Loads the round
 * topics + the user's existing response (if any) and renders the
 * auto-saving form.
 */
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireCommitteeOrAdmin } from "@/lib/committees/membership";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/PageHeader";
import { HqpFeedbackResponseForm } from "@/components/committee/HqpFeedbackResponseForm";
import { parseTopics } from "@/lib/hqp/rounds";

export const dynamic = "force-dynamic";

export default async function HqpFeedbackPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireCommitteeOrAdmin(["hqp"]).catch(() => null);
  if (!session) redirect("/dashboard");
  const userId = (session.user as { id?: string }).id ?? "";
  const { id } = await params;

  const round = await prisma.hqpFeedbackRound.findUnique({ where: { id } });
  if (!round) notFound();

  const myResponse = await prisma.hqpFeedbackResponse.findUnique({
    where: { roundId_userId: { roundId: round.id, userId } },
  });

  const topics = parseTopics(round.topics);
  const initialAnswers = (myResponse?.answers as Record<string, string>) ?? {};

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-5">
      <Link href="/committee/hqp" className="text-xs text-muted hover:text-fg inline-flex items-center gap-1">
        <ArrowLeft size={12} /> HQP committee
      </Link>
      <PageHeader
        title={round.title}
        description={
          <>
            {round.description}
            {" · "}
            Closes {new Date(round.closesAt).toLocaleString("en-US", { timeZone: "America/Toronto", month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true, timeZoneName: "short" })}.
          </>
        }
      />
      <HqpFeedbackResponseForm
        roundId={round.id}
        topics={topics}
        initialAnswers={initialAnswers}
        alreadySubmitted={myResponse?.status === "submitted"}
        closed={round.status === "closed"}
      />
    </div>
  );
}
