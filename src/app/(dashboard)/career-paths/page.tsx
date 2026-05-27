/**
 * /career-paths — chooser landing.
 *
 * Two ways to read the career-paths content:
 *
 *   • /career-paths/tracks   — organised by JOB FUNCTION (six tracks:
 *                              Bioprocess, Quality & Regulatory, Cell
 *                              & Gene Therapy, Clinical, Business,
 *                              Project Leadership). The classic view —
 *                              shaped like how postings + JDs read.
 *
 *   • /career-paths/pathways — organised by BHN LEARNING PATHWAY (the
 *                              seven announced on biohubnet.ca:
 *                              Aseptic Cell Culture, CAR-T, Biologics,
 *                              QA/QC Micro, QA/QC Analytics,
 *                              Regulatory Affairs, Medical Affairs).
 *                              Built so a trainee who's just picked a
 *                              pathway can see "where does this take
 *                              me, year by year".
 *
 * Same five-station spine on both (Junior → Mid → Senior → Lead → VP);
 * same chart treatment + branch animations; different rows. Build new
 * content by editing src/lib/career-paths/data.ts (tracks) or
 * pathway-data.ts (pathways).
 *
 * Auth: any signed-in user.
 */
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Compass, GraduationCap, ArrowRight, FlaskConical, Shield, Dna,
  Stethoscope, Briefcase, Network,
} from "lucide-react";
import { getSession } from "@/lib/auth";
import { PageHero } from "@/components/ui/PageHero";
import { CAREER_TRACKS } from "@/lib/career-paths/data";
import { BHN_PATHWAYS } from "@/lib/career-paths/pathway-data";

export const dynamic = "force-dynamic";

export default async function CareerPathsLandingPage() {
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
        title="Pick your lens."
        description="Two ways to read the same career-journey content. Either view shows you the five career stations from Junior to VP — the difference is whether the rows are organised the way HR thinks (job functions) or the way our training organises (BHN learning pathways). Use whichever lens fits how you got here."
      />

      <div className="grid gap-5 md:grid-cols-2">
        <ChooserCard
          href="/career-paths/tracks"
          icon={<Compass size={20} />}
          accent="#2c4f5a"
          eyebrow="By job function"
          title="Six career tracks"
          description="Bioprocess Manufacturing · Quality & Regulatory · Cell & Gene Therapy · Clinical & Trials · Biotech Business & Entrepreneurship · Project Leadership."
          tagline="Shaped like how postings read. Best if you already know the role you want."
          rowCount={CAREER_TRACKS.length}
          chips={[
            { label: CAREER_TRACKS[0]?.title ?? "Bioprocess", Icon: FlaskConical },
            { label: CAREER_TRACKS[1]?.title ?? "Quality", Icon: Shield },
            { label: CAREER_TRACKS[2]?.title ?? "Cell & Gene", Icon: Dna },
            { label: CAREER_TRACKS[3]?.title ?? "Clinical", Icon: Stethoscope },
            { label: CAREER_TRACKS[4]?.title ?? "Business", Icon: Briefcase },
            { label: CAREER_TRACKS[5]?.title ?? "Project Leadership", Icon: Network },
          ]}
        />

        <ChooserCard
          href="/career-paths/pathways"
          icon={<GraduationCap size={20} />}
          accent="#7c3aed"
          eyebrow="By learning pathway"
          title="Seven BHN pathways"
          description="Aseptic Cell Culture Basics · CAR-T Cell Manufacturing · Biologics Manufacturing · QA/QC Microbiology · QA/QC Analytics · Regulatory Affairs · Medical Affairs."
          tagline="Shaped like the training BHN runs. Best if you've picked your pathway and want to know what's downstream."
          rowCount={BHN_PATHWAYS.length}
          chips={BHN_PATHWAYS.slice(0, 7).map((p) => ({
            label: p.title.replace(/ for Advanced Therapies/, "").replace(/ for Biologics/, "").replace(/ Basics/, "").replace(/ Cell Manufacturing/, ""),
            Icon: GraduationCap,
          }))}
        />
      </div>

      <p className="text-[11.5px] text-fg-subtle italic max-w-3xl">
        Both views share the same five-station spine — Junior, Mid, Senior, Lead, VP — and the same branch-out animation showing where careers cross. They&apos;re different ways of slicing the same career-journey data, not different content.
      </p>
    </div>
  );
}

interface ChooserCardChip {
  label: string;
  Icon: React.ComponentType<{ size?: number; className?: string }>;
}

function ChooserCard({
  href, icon, accent, eyebrow, title, description, tagline, rowCount, chips,
}: {
  href: string;
  icon: React.ReactNode;
  accent: string;
  eyebrow: string;
  title: string;
  description: string;
  tagline: string;
  rowCount: number;
  chips: ChooserCardChip[];
}) {
  return (
    <Link
      href={href}
      className="group relative block rounded-3xl border border-line/70 bg-card-solid p-6 sm:p-7 hover:border-line transition-all hover:-translate-y-0.5 shadow-card-rest hover:shadow-elevated overflow-hidden"
    >
      {/* Accent wash */}
      <div
        aria-hidden
        className="absolute -top-24 -right-20 w-72 h-72 rounded-full blur-3xl opacity-30 pointer-events-none"
        style={{ background: `radial-gradient(closest-side, ${accent}, transparent 70%)` }}
      />

      <div className="relative">
        <div className="flex items-center gap-2.5 mb-3">
          <span
            className="inline-flex items-center justify-center w-10 h-10 rounded-xl text-white"
            style={{ backgroundColor: accent }}
          >
            {icon}
          </span>
          <p className="text-[10.5px] uppercase tracking-[0.22em] font-bold text-fg-subtle">
            {eyebrow}
          </p>
        </div>

        <h2 className="text-[22px] sm:text-[24px] font-bold tracking-tight text-fg leading-tight">
          {title}
        </h2>
        <p className="mt-2 text-[13px] text-fg-muted leading-relaxed">
          {description}
        </p>
        <p className="mt-3 text-[12px] italic text-fg-subtle leading-snug">
          {tagline}
        </p>

        <div className="mt-4 flex flex-wrap gap-1.5">
          {chips.map((chip) => {
            const Icon = chip.Icon;
            return (
              <span
                key={chip.label}
                className="inline-flex items-center gap-1 text-[10.5px] font-semibold px-2 py-1 rounded-md bg-elevated text-fg-muted"
              >
                <Icon size={9} className="opacity-70" /> {chip.label}
              </span>
            );
          })}
        </div>

        <div className="mt-6 flex items-center justify-between border-t border-line/60 pt-4">
          <span className="text-[11px] text-fg-subtle">
            {rowCount} rows × 5 levels = {rowCount * 5} stations
          </span>
          <span className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-brand-700 group-hover:underline">
            Open <ArrowRight size={12} />
          </span>
        </div>
      </div>
    </Link>
  );
}
