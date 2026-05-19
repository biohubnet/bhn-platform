/**
 * Play / review page for one trainee's simulation attempt.
 *
 * Server-loads the attempt + payload, hands the heavy lifting to the
 * SimulatorPlayer client component. If the attempt is finished, that
 * component swaps to a review screen.
 */
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SimulatorPlayer } from "@/components/simulator/SimulatorPlayer";
import type {
  AttemptState,
  AttemptStats,
  LogEntry,
  SimulationPayload,
} from "@/lib/simulator/types";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ attemptId: string }> };

export default async function SimulationAttemptPage({ params }: Ctx) {
  const session = await getSession();
  if (!session) redirect("/auth/signin");
  const userId = (session.user as { id?: string }).id!;
  const { attemptId } = await params;

  const attempt = await prisma.simulationAttempt.findUnique({
    where: { id: attemptId },
    include: { simulation: true },
  });
  if (!attempt) notFound();
  if (attempt.userId !== userId) redirect("/simulator");

  const payload = attempt.simulation.payload as unknown as SimulationPayload;
  const state: AttemptState = {
    week: attempt.week,
    scenarioIndex: attempt.scenarioIndex,
    stats: attempt.stats as unknown as AttemptStats,
    log: attempt.log as unknown as LogEntry[],
    finished: attempt.finished,
  };

  return (
    <div className="space-y-4">
      <Link
        href="/simulator"
        className="inline-flex items-center gap-1 text-xs text-muted hover:text-fg"
      >
        <ArrowLeft className="h-3 w-3" /> Back to my simulations
      </Link>
      <SimulatorPlayer
        attemptId={attempt.id}
        payload={payload}
        initialState={state}
      />
    </div>
  );
}
