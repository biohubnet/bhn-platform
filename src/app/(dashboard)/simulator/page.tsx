/**
 * Role-play simulator — landing page.
 *
 * Shows the trainee's recent attempts (resume or review) and a CTA
 * to start a new simulation from any job-posting URL.
 */
import Link from "next/link";
import { redirect } from "next/navigation";
import { Briefcase, Sparkles, ArrowRight, RotateCcw } from "lucide-react";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHero } from "@/components/ui/PageHero";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

export const dynamic = "force-dynamic";

export default async function SimulatorLandingPage() {
  const session = await getSession();
  if (!session) redirect("/auth/signin");
  const userId = (session.user as { id?: string }).id!;

  const attempts = await prisma.simulationAttempt.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    take: 20,
    include: {
      simulation: {
        select: { id: true, jobTitle: true, companyName: true, location: true },
      },
    },
  });

  const active = attempts.filter((a) => !a.finished);
  const finished = attempts.filter((a) => a.finished);

  return (
    <div className="space-y-8">
      <PageHero
        eyebrow="New"
        title="Role-play Simulator"
        description="Practice for any job before you apply. Paste a posting URL and you'll lead a fictional team through a 12-week quarter — 1:1s, escalations, hiring, the QBR. Every choice moves five stats. You'll get a performance review from your VP at the end."
        actions={
          <Link
            href="/simulator/new"
            className="inline-flex items-center gap-2 rounded-md bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-700"
          >
            <Sparkles className="h-4 w-4" />
            Start a new simulation
            <ArrowRight className="h-4 w-4" />
          </Link>
        }
      />

      {active.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted">
            In progress
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {active.map((a) => (
              <AttemptCard key={a.id} attempt={a} kind="active" />
            ))}
          </div>
        </section>
      )}

      {finished.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted">
            Completed
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {finished.map((a) => (
              <AttemptCard key={a.id} attempt={a} kind="finished" />
            ))}
          </div>
        </section>
      )}

      {attempts.length === 0 && (
        <Card className="p-8 text-center">
          <Briefcase className="mx-auto mb-3 h-10 w-10 text-muted/40" />
          <p className="text-sm text-muted">
            No simulations yet. Click <strong>Start a new simulation</strong>{" "}
            above and paste a job-posting URL — any role on LinkedIn, Indeed,
            or a company careers page works.
          </p>
        </Card>
      )}
    </div>
  );
}

type AttemptWithSim = {
  id: string;
  week: number;
  finalScore: number | null;
  finalTier: string | null;
  updatedAt: Date;
  simulation: {
    jobTitle: string;
    companyName: string | null;
    location: string | null;
  };
};

function AttemptCard({
  attempt,
  kind,
}: {
  attempt: AttemptWithSim;
  kind: "active" | "finished";
}) {
  return (
    <Link
      href={`/simulator/${attempt.id}`}
      className="block transition hover:-translate-y-0.5"
    >
      <Card hover className="h-full p-5">
        <div className="mb-2 flex items-start justify-between gap-2">
          <h3 className="text-base font-semibold leading-tight">
            {attempt.simulation.jobTitle}
          </h3>
          {kind === "finished" && attempt.finalTier && (
            <Badge>{attempt.finalTier}</Badge>
          )}
        </div>
        {attempt.simulation.companyName && (
          <p className="mb-3 text-xs text-muted">
            {attempt.simulation.companyName}
            {attempt.simulation.location && ` · ${attempt.simulation.location}`}
          </p>
        )}
        <div className="flex items-center justify-between text-xs text-muted">
          <span>
            {kind === "active" ? (
              <>Week {attempt.week} / 12</>
            ) : (
              <>Score: {attempt.finalScore}</>
            )}
          </span>
          <span className="flex items-center gap-1 text-brand-600">
            {kind === "active" ? (
              <>
                Resume <ArrowRight className="h-3 w-3" />
              </>
            ) : (
              <>
                Review <RotateCcw className="h-3 w-3" />
              </>
            )}
          </span>
        </div>
      </Card>
    </Link>
  );
}
