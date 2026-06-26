/**
 * /profile/master — the master resume's deep page.
 *
 * Lists every bullet in the user's library, grouped by section and
 * anchor. The client component owns mutations (add, edit, archive,
 * reorder, snapshot). The server shell just auth-gates + fetches
 * the initial state.
 *
 * See docs/plans/master-resume.md for the full design.
 */
import { redirect } from "next/navigation";
import { Library } from "lucide-react";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHero } from "@/components/ui/PageHero";
import { getOrCreateMaster } from "@/lib/resume/master";
import { MasterResumeClient } from "@/components/profile/MasterResumeClient";
import type { ResumeContent } from "@/lib/resume/types";

export const dynamic = "force-dynamic";

export default async function MasterResumePage() {
  const session = await getSession();
  if (!session) redirect("/login?callbackUrl=/profile/master");
  const userId = (session.user as { id?: string }).id;
  if (!userId) redirect("/login");

  const master = await getOrCreateMaster(prisma, userId);
  const [activeBullets, archivedCount, snapshots] = await Promise.all([
    prisma.masterBullet.findMany({
      where: { masterId: master.id, isArchived: false },
      orderBy: [{ sectionKind: "asc" }, { position: "asc" }, { createdAt: "asc" }],
      select: {
        id: true, sectionKind: true,
        anchorTitle: true, anchorSubtitle: true, anchorDateRange: true,
        anchorCompany: true, anchorLocation: true, anchorStart: true, anchorEnd: true, anchorCurrent: true,
        body: true, tags: true, position: true,
        sourceResumeId: true,
        updatedAt: true,
        _count: { select: { revisions: true } },
      },
    }),
    prisma.masterBullet.count({ where: { masterId: master.id, isArchived: true } }),
    prisma.masterSnapshot.findMany({
      where: { masterId: master.id },
      orderBy: { versionNumber: "desc" },
      select: { id: true, versionNumber: true, name: true, createdAt: true },
    }),
  ]);

  return (
    <div className="space-y-6">
      <PageHero
        eyebrow={<><Library size={11} /> Profile · Bullet Bank</>}
        title="Your Bullet Bank"
        description="One place to keep every accomplishment bullet you've ever written. Tailored resumes pull from here, and the AI Job Tailor fits them to any posting — so every application starts from proven material, not a blank page."
      />

      {/* Why it exists + how it helps — kept light (no card), aligned to
          the content column. */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="border-l-2 border-brand-300 pl-4 sm:pl-5 py-0.5">
          <h2 className="text-[15px] font-semibold tracking-tight text-fg">Write your wins once — reuse them everywhere</h2>
          <p className="mt-1.5 text-[13.5px] leading-relaxed text-fg-muted max-w-3xl">
            Rewriting your resume from scratch for every application is slow, and your strongest lines get scattered across a dozen old files. The Bullet Bank is the single place you collect every accomplishment bullet you&apos;ve ever written — your source of truth. Build each application from material you&apos;ve already proven instead of a blank page.
          </p>
          <dl className="mt-4 grid gap-x-8 gap-y-3 sm:grid-cols-3 text-[12.5px]">
            <div>
              <dt className="font-semibold text-fg">Tailor in seconds</dt>
              <dd className="text-fg-muted leading-snug mt-0.5">Pull the right bullets into any resume instead of retyping them — and let the AI fit them to a specific posting.</dd>
            </div>
            <div>
              <dt className="font-semibold text-fg">Grounded, never invented</dt>
              <dd className="text-fg-muted leading-snug mt-0.5">The Job Tailor drafts only from your real bullets, so it can&apos;t fabricate experience you don&apos;t have.</dd>
            </div>
            <div>
              <dt className="font-semibold text-fg">Never lose a good line</dt>
              <dd className="text-fg-muted leading-snug mt-0.5">Drop in an old PDF or DOCX and it harvests the bullets automatically; snapshot versions to lock in a moment in time.</dd>
            </div>
          </dl>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <MasterResumeClient
          initialMaster={{
            id: master.id,
            header: (master.header as ResumeContent["header"]) ?? null,
            updatedAt: master.updatedAt.toISOString(),
          }}
          initialBullets={activeBullets.map((b) => ({
            id: b.id,
            sectionKind: b.sectionKind,
            anchorTitle: b.anchorTitle,
            anchorSubtitle: b.anchorSubtitle,
            anchorDateRange: b.anchorDateRange,
            anchorCompany: b.anchorCompany,
            anchorLocation: b.anchorLocation,
            anchorStart: b.anchorStart,
            anchorEnd: b.anchorEnd,
            anchorCurrent: b.anchorCurrent,
            body: b.body,
            tags: b.tags,
            position: b.position,
            sourceResumeId: b.sourceResumeId,
            revisionCount: b._count.revisions,
            updatedAt: b.updatedAt.toISOString(),
          }))}
          initialSnapshots={snapshots.map((s) => ({
            id: s.id,
            versionNumber: s.versionNumber,
            name: s.name,
            createdAt: s.createdAt.toISOString(),
          }))}
          initialArchivedCount={archivedCount}
        />
      </div>
    </div>
  );
}
