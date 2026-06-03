/**
 * Public, no-login PLAYABLE share of a Simulation.
 *
 * The token model carries the auth — possession of the URL grants
 * access. There is no session check: an anonymous visitor runs the sim
 * entirely client-side (the play engine is pure and the whole payload
 * ships to the browser), with progress saved to localStorage rather
 * than a server attempt. Below the player, anyone can leave a comment
 * with their name.
 *
 * Expired tokens render a soft "expired" state; revoked (deleted)
 * tokens 404.
 */
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { initialState } from "@/lib/simulator/engine";
import { SimulatorPlayer } from "@/components/simulator/SimulatorPlayer";
import { SimShareComments } from "@/components/simulator/SimShareComments";
import type { SimulationPayload } from "@/lib/simulator/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Play this job simulation",
  robots: { index: false, follow: false },
};

type Ctx = { params: Promise<{ token: string }> };

export default async function SharedSimPage({ params }: Ctx) {
  const { token } = await params;

  const share = await prisma.simulationShareToken.findUnique({
    where: { token },
    include: {
      simulation: {
        select: {
          id: true,
          payload: true,
          jobTitle: true,
          companyName: true,
          location: true,
        },
      },
    },
  });
  if (!share) notFound();

  if (share.expiresAt && share.expiresAt.getTime() < Date.now()) {
    return (
      <main className="min-h-screen bg-page px-6 py-16">
        <div className="mx-auto max-w-xl text-center">
          <h1 className="text-2xl font-bold text-fg">This link has expired.</h1>
          <p className="mt-2 text-fg-muted">
            Ask whoever shared it to send you a fresh link.
          </p>
        </div>
      </main>
    );
  }

  const payload = share.simulation.payload as unknown as SimulationPayload;

  const commentRows = await prisma.simulationComment.findMany({
    where: { simulationId: share.simulation.id, hidden: false },
    orderBy: { createdAt: "asc" },
    select: { id: true, authorName: true, body: true, createdAt: true },
  });
  const comments = commentRows.map((c) => ({
    id: c.id,
    authorName: c.authorName,
    body: c.body,
    createdAt: c.createdAt.toISOString(),
  }));

  return (
    <main className="min-h-screen bg-page has-grain">
      <div className="mx-auto max-w-7xl px-4 py-7 sm:px-6 sm:py-9">
        {/* The player's role header owns the top of the page. */}
        <SimulatorPlayer
          payload={payload}
          initialState={initialState(payload)}
          guest={{ token }}
        />

        <div className="mx-auto mt-8 max-w-2xl rounded-xl border border-line/70 bg-card-solid px-4 py-3 text-center">
          <p className="text-[12.5px] leading-relaxed text-fg-muted">
            You&apos;re playing a{" "}
            <span className="font-medium text-fg">shared preview</span> — no
            account needed, and your progress saves in this browser only.{" "}
            <a
              href="/"
              className="font-medium text-brand-700 hover:underline"
            >
              Explore the BHN Training Platform →
            </a>
          </p>
        </div>

        <SimShareComments token={token} initialComments={comments} />
      </div>
    </main>
  );
}
