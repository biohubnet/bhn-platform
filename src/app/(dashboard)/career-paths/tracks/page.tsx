/**
 * /career-paths/tracks — career-journey explorer organised by JOB
 * FUNCTION (the original career-paths view).
 *
 * Six tracks (Bioprocess, Quality & Regulatory, Cell & Gene Therapy,
 * Clinical, Business, Project Leadership) with a five-station journey
 * each (Junior → Mid → Senior → Lead → VP). This was the original
 * /career-paths content — it's now one of two views, sharing a chooser
 * page at /career-paths with the BHN-pathway view at
 * /career-paths/pathways.
 *
 * Auth: any signed-in user. Data source: src/lib/career-paths/data.ts.
 */
import { redirect } from "next/navigation";
import Link from "next/link";
import { Compass, ArrowLeft } from "lucide-react";
import { getSession } from "@/lib/auth";
import { PageHero } from "@/components/ui/PageHero";
import { CareerPathsExplorer } from "@/components/career-paths/CareerPathsExplorer";

export const dynamic = "force-dynamic";

export default async function CareerPathsTracksPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <div className="space-y-8 pb-16">
      <PageHero
        eyebrow={
          <>
            <Compass size={11} /> Career paths · By job function
          </>
        }
        title="From Junior to VP — pick a journey."
        description="Six tracks across biomanufacturing, quality, cell & gene therapy, clinical trials, biotech business, and project leadership. Each track maps the five career stations you'll move through, the roles you'll hold at each, and the common branch points where careers cross tracks. Not a curriculum, a map."
      />
      <div className="flex justify-end">
        <Link
          href="/career-paths"
          className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-fg-muted hover:text-fg"
        >
          <ArrowLeft size={11} /> Back to chooser
        </Link>
      </div>
      <CareerPathsExplorer />
    </div>
  );
}
