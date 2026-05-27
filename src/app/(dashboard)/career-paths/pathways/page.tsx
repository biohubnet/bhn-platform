/**
 * /career-paths/pathways — career-journey explorer organised by BHN
 * LEARNING PATHWAY.
 *
 * Mirrors BHN's seven announced pathways
 * (https://biohubnet.ca/learning-pathway-announcement/):
 *   1. Aseptic Cell Culture Basics
 *   2. CAR-T Cell Manufacturing
 *   3. Biologics Manufacturing
 *   4. QA/QC Microbiology for Advanced Therapies
 *   5. QA/QC Analytics for Biologics
 *   6. Regulatory Affairs
 *   7. Medical Affairs
 *
 * Same five-station spine as the tracks view (Junior → Mid → Senior →
 * Lead → VP) — but the rows are training pathways, not job functions.
 * Trainees who arrive here have likely picked a BHN pathway already
 * and want to know what their career looks like five and ten years
 * downstream of that choice.
 *
 * Sister page: /career-paths/tracks (six job-function tracks).
 * Chooser:     /career-paths (landing).
 *
 * Auth: any signed-in user. Data source: src/lib/career-paths/pathway-data.ts.
 */
import { redirect } from "next/navigation";
import Link from "next/link";
import { GraduationCap, ArrowLeft } from "lucide-react";
import { getSession } from "@/lib/auth";
import { PageHero } from "@/components/ui/PageHero";
import { PathwayPathsExplorer } from "@/components/career-paths/PathwayPathsExplorer";

export const dynamic = "force-dynamic";

export default async function CareerPathsPathwaysPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <div className="space-y-8 pb-16">
      <PageHero
        eyebrow={
          <>
            <GraduationCap size={11} /> Career paths · By learning pathway
          </>
        }
        title="Follow your BHN stream, year by year."
        description="The seven BHN learning-pathway streams mapped to careers. Each row is one stream — Biomanufacturing (Aseptic / CAR-T / Biologics), QA/QC (Microbiology / Analytics), Regulatory Affairs, Medical Affairs, Entrepreneurship, plus R&D and Clinical Trials (both in development) — with the five career stations (Junior → VP) that the training feeds into. Cross-links show common pivots between streams at senior levels."
      />
      <div className="flex justify-end">
        <Link
          href="/career-paths"
          className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-fg-muted hover:text-fg"
        >
          <ArrowLeft size={11} /> Back to chooser
        </Link>
      </div>
      <PathwayPathsExplorer />
    </div>
  );
}
