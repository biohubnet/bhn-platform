/**
 * /career-paths — guided career-journey explorer.
 *
 * Six career tracks (Bioprocess, Quality, Cell & Gene Therapy,
 * Clinical, Business, Project Leadership) with a five-station
 * journey each (Junior → Mid → Senior → Lead → VP). Per station we
 * surface typical roles, the focus + muscles you build there, the 2–4
 * platform courses that fit, and any common cross-track branch points.
 *
 * The page is intentionally non-prescriptive — it's a map, not a
 * curriculum. Trainees pick the journey that resonates and the chips
 * link out to the catalog (/courses?q=…) for the details.
 *
 * Auth: any signed-in user (same as /courses, /simulator). No role
 * gate at the route level — the data is broad-audience guidance.
 */
import { redirect } from "next/navigation";
import { Compass } from "lucide-react";
import { getSession } from "@/lib/auth";
import { PageHero } from "@/components/ui/PageHero";
import { CareerPathsExplorer } from "@/components/career-paths/CareerPathsExplorer";

export const dynamic = "force-dynamic";

export default async function CareerPathsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <div className="space-y-8 pb-16">
      <PageHero
        eyebrow={
          <>
            <Compass size={11} /> Career paths
          </>
        }
        title="From Junior to VP — pick a journey."
        description="Six tracks across biomanufacturing, quality, cell & gene therapy, clinical trials, biotech business, and project leadership. Each track maps the five career stations you'll move through, the roles you'll hold at each, the courses on this platform that fit — plus the common branch points where careers cross tracks. Not a curriculum, a map."
      />
      <CareerPathsExplorer />
    </div>
  );
}
