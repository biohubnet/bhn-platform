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
        eyebrow={<><Library size={11} /> Profile · Master resume</>}
        title="Your bullet library"
        description="One place to keep every accomplishment you've ever written. Tailored resumes pull from here. AI uses it to tailor for postings. Edit anywhere — promote good edits back."
      />

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
