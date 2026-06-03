/**
 * /admin/simulations/[id]/edit — full-payload JSON editor.
 *
 * Renders the current SimulationPayload pretty-printed into a
 * textarea. Saving runs the JSON through validatePayload() — the same
 * validator the AI and hand-author paths use — then overwrites the
 * Simulation row's payload and its denormalised columns.
 *
 * Direct-linkable: any Simulation can be edited from this URL, whether
 * it's tied to a SimulationRequest or was hand-seeded.
 */
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Theater } from "lucide-react";
import { getSession, ROLE_RANK } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHero } from "@/components/ui/PageHero";
import { SimPayloadEditor } from "@/components/admin/SimPayloadEditor";
import { DeleteSimulationButton } from "@/components/admin/DeleteSimulationButton";

export const dynamic = "force-dynamic";

export default async function SimulationEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  const role = (session.user as { role?: string }).role ?? "trainee";
  if (ROLE_RANK[role] < ROLE_RANK.admin) {
    redirect("/dashboard");
  }

  const { id } = await params;
  const sim = await prisma.simulation.findUnique({
    where: { id },
    select: {
      id: true,
      jobTitle: true,
      companyName: true,
      location: true,
      sourceHash: true,
      modelUsed: true,
      createdAt: true,
      payload: true,
      _count: { select: { attempts: true } },
    },
  });
  if (!sim) notFound();

  const attemptsInProgress = await prisma.simulationAttempt.count({
    where: { simulationId: id, finished: false },
  });

  // Pretty-print on the server so the editor opens against the canonical
  // shape; the client just round-trips a string.
  const pretty = JSON.stringify(sim.payload, null, 2);

  return (
    <div className="space-y-6">
      <PageHero
        eyebrow={
          <>
            <Theater size={11} /> Admin · Simulation editor
          </>
        }
        title={`Edit · ${sim.jobTitle}`}
        description={`${sim.companyName ?? "Unattributed"}${sim.location ? " · " + sim.location : ""}. Created with ${sim.modelUsed}.`}
      />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 space-y-5">
        <Link
          href="/admin/simulator-requests"
          className="inline-flex items-center gap-1 text-[12px] font-semibold text-muted hover:text-fg"
        >
          <ArrowLeft className="h-3 w-3" /> Back to request queue
        </Link>

        {/* Metadata strip */}
        <dl className="grid grid-cols-2 gap-4 rounded-2xl border border-line bg-card p-5 sm:grid-cols-4 text-[12.5px]">
          <Meta label="Total attempts" value={sim._count.attempts.toLocaleString()} />
          <Meta
            label="In progress"
            value={attemptsInProgress.toLocaleString()}
            tone={attemptsInProgress > 0 ? "warning" : "default"}
          />
          <Meta
            label="Model"
            value={<span className="font-mono text-[11px]">{sim.modelUsed}</span>}
          />
          <Meta
            label="Hash"
            value={
              <span className="font-mono text-[11px]">
                {sim.sourceHash.slice(0, 12)}…
              </span>
            }
          />
        </dl>

        {attemptsInProgress > 0 && (
          <div className="rounded-xl bg-amber-50 ring-1 ring-inset ring-amber-200 px-4 py-3 text-[12.5px] text-amber-900">
            <p className="font-semibold">
              {attemptsInProgress} player
              {attemptsInProgress === 1 ? " is" : "s are"} mid-quarter on this
              simulation right now.
            </p>
            <p className="mt-0.5 leading-relaxed">
              Saving will surface the new payload to them on their next render.
              Adding scenarios is safe. Reordering or deleting scenarios may
              confuse a player whose saved state references an index that no
              longer exists — they&apos;ll see the scenario that now lives at
              the same index.
            </p>
          </div>
        )}

        <SimPayloadEditor simulationId={sim.id} initialJson={pretty} />

        {/* Danger zone — hard-delete (cascades to every attempt). */}
        <DeleteSimulationButton
          simulationId={sim.id}
          jobTitle={sim.jobTitle}
          totalAttempts={sim._count.attempts}
          attemptsInProgress={attemptsInProgress}
        />
      </div>
    </div>
  );
}

function Meta({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: React.ReactNode;
  tone?: "default" | "warning";
}) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-[0.18em] font-bold text-subtle">
        {label}
      </dt>
      <dd
        className={
          tone === "warning"
            ? "mt-1 font-semibold text-amber-800"
            : "mt-1 font-semibold text-fg"
        }
      >
        {value}
      </dd>
    </div>
  );
}
