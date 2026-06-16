/**
 * Admin → AI review queue. AI answers flagged for a human: thumbs-down from a
 * user, or low confidence (poorly grounded in the source). The triage agent
 * also lands its proposals here. Resolve once handled, or escalate.
 */
import { redirect } from "next/navigation";
import { ShieldQuestion } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHero } from "@/components/ui/PageHero";
import { AiReviewQueue, type ReviewRow } from "@/components/admin/AiReviewQueue";

export const dynamic = "force-dynamic";

export default async function AiReviewPage() {
  const session = await requireRole("admin").catch(() => null);
  if (!session) redirect("/dashboard");

  const rows = await prisma.aIInteraction.findMany({
    where: { flaggedForReview: true },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true, kind: true, answerExcerpt: true, userRating: true, confidence: true,
      reviewStatus: true, reviewNote: true, createdAt: true,
    },
  });
  const queue: ReviewRow[] = rows.map((r) => ({
    id: r.id,
    kind: r.kind,
    answerExcerpt: r.answerExcerpt,
    userRating: r.userRating,
    confidence: r.confidence,
    reviewStatus: r.reviewStatus ?? "open",
    reviewNote: r.reviewNote,
    createdAt: r.createdAt.toISOString(),
  }));

  return (
    <div className="space-y-6">
      <PageHero
        eyebrow={<><ShieldQuestion size={11} /> Admin · AI quality</>}
        title="AI review queue"
        description="AI answers flagged for a human to look at — a thumbs-down from a learner, or low confidence (poorly grounded in the source). Resolve once handled, or escalate. The triage agent lands its proposals here too."
      />
      <AiReviewQueue initial={queue} />
    </div>
  );
}
