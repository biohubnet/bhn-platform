/**
 * /admin/simulator-requests/[id] — admin detail + action surface for
 * a single SimulationRequest. Shows the full JD, the requester, and a
 * state-dependent action bar (Generate / Hand-author / Reject / Reopen).
 */
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Theater } from "lucide-react";
import { getSession, ROLE_RANK } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHero } from "@/components/ui/PageHero";
import { SimRequestActions } from "@/components/admin/SimRequestActions";

export const dynamic = "force-dynamic";

export default async function SimRequestDetailPage({
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
  const request = await prisma.simulationRequest.findUnique({
    where: { id },
    select: {
      id: true,
      sourceUrl: true,
      jdBody: true,
      sourceHash: true,
      status: true,
      adminNotes: true,
      createdAt: true,
      processedAt: true,
      simulationId: true,
      user: { select: { id: true, name: true, email: true } },
      processedBy: { select: { id: true, name: true } },
      simulation: {
        select: { id: true, jobTitle: true, companyName: true, modelUsed: true },
      },
    },
  });
  if (!request) notFound();

  // If a Simulation with the same hash already exists (e.g. from the
  // pre-seeded MSL row, or from a parallel request another admin
  // already fulfilled), surface a "Link existing" affordance.
  const existingSim =
    request.status !== "ready"
      ? await prisma.simulation.findUnique({
          where: { sourceHash: request.sourceHash },
          select: { id: true, jobTitle: true, modelUsed: true },
        })
      : null;

  return (
    <div className="space-y-6">
      <PageHero
        eyebrow={
          <>
            <Theater size={11} /> Admin · Simulator
          </>
        }
        title="Simulation request"
        description={`Submitted by ${request.user.name ?? request.user.email} on ${new Date(request.createdAt).toLocaleString()}.`}
      />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-5">
        <Link
          href="/admin/simulator-requests"
          className="inline-flex items-center gap-1 text-[12px] font-semibold text-muted hover:text-fg"
        >
          <ArrowLeft className="h-3 w-3" /> Back to queue
        </Link>

        {/* Metadata strip */}
        <dl className="grid grid-cols-1 gap-4 rounded-2xl border border-line bg-card p-5 sm:grid-cols-3 text-[12.5px]">
          <div>
            <dt className="text-[10px] uppercase tracking-[0.18em] font-bold text-subtle">
              Status
            </dt>
            <dd className="mt-1 font-semibold text-fg capitalize">{request.status}</dd>
          </div>
          <div>
            <dt className="text-[10px] uppercase tracking-[0.18em] font-bold text-subtle">
              Source
            </dt>
            <dd className="mt-1 text-fg-muted">
              {request.sourceUrl ? (
                <a
                  href={request.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand-700 hover:underline truncate inline-block max-w-full"
                >
                  {request.sourceUrl}
                </a>
              ) : (
                <span className="italic">Pasted JD text</span>
              )}
            </dd>
          </div>
          <div>
            <dt className="text-[10px] uppercase tracking-[0.18em] font-bold text-subtle">
              Source hash
            </dt>
            <dd className="mt-1 font-mono text-[11px] text-fg-muted break-all">
              {request.sourceHash.slice(0, 16)}…
            </dd>
          </div>
        </dl>

        {/* Existing-sim hint */}
        {existingSim && (
          <div className="rounded-xl bg-sky-50 ring-1 ring-inset ring-sky-200 px-4 py-3 text-[12.5px] text-sky-900">
            <p className="font-semibold">
              A Simulation with this hash already exists.
            </p>
            <p className="mt-0.5">
              <strong>{existingSim.jobTitle}</strong> · model{" "}
              <span className="font-mono text-[11px]">{existingSim.modelUsed}</span>.
              Click <em>Link existing</em> below to attach this request to it
              instead of regenerating.
            </p>
          </div>
        )}

        {/* Already-fulfilled summary */}
        {request.status === "ready" && request.simulation && (
          <div className="rounded-xl bg-emerald-50 ring-1 ring-inset ring-emerald-200 px-4 py-3 text-[12.5px] text-emerald-900">
            <p className="font-semibold">
              Fulfilled. Requester has been notified.
            </p>
            <p className="mt-0.5">
              <strong>{request.simulation.jobTitle}</strong>
              {request.simulation.companyName && ` · ${request.simulation.companyName}`}
              {" · "}
              model <span className="font-mono text-[11px]">{request.simulation.modelUsed}</span>
              {request.processedBy?.name && ` · processed by ${request.processedBy.name}`}
            </p>
          </div>
        )}

        {/* JD body */}
        <section>
          <h2 className="text-[10px] uppercase tracking-[0.22em] font-bold text-subtle mb-2">
            Job description
          </h2>
          <pre className="rounded-2xl border border-line bg-card p-5 text-[12.5px] leading-relaxed text-fg whitespace-pre-wrap font-sans max-h-[480px] overflow-y-auto">
            {request.jdBody}
          </pre>
        </section>

        {/* Admin note from previous action */}
        {request.adminNotes && (
          <section>
            <h2 className="text-[10px] uppercase tracking-[0.22em] font-bold text-subtle mb-2">
              Admin notes
            </h2>
            <p className="rounded-xl bg-amber-50 ring-1 ring-inset ring-amber-200 px-4 py-3 text-[12.5px] text-amber-900 leading-relaxed whitespace-pre-wrap">
              {request.adminNotes}
            </p>
          </section>
        )}

        {/* Action bar */}
        <SimRequestActions
          requestId={request.id}
          status={request.status}
          existingSimulationId={existingSim?.id ?? null}
        />
      </div>
    </div>
  );
}
