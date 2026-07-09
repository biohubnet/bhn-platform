/**
 * /admin/showcase — list of public graduate showcase submissions.
 *
 * Server component: pulls all rows from ShowcaseSubmission, hands
 * them to a client component (ShowcaseAdminClient) that renders the
 * grid + drives the per-row actions (download, mark-downloaded,
 * delete).
 */
import { redirect } from "next/navigation";
import { GraduationCap } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/PageHeader";
import { ShowcaseAdminClient } from "@/components/admin/ShowcaseAdminClient";
import { ShowcasePathwaysManager } from "@/components/admin/ShowcasePathwaysManager";

export const dynamic = "force-dynamic";

type Pill = { kind: "workshop" | "pathway" | "cohort"; label: string; sub?: string };

export default async function AdminShowcasePage() {
  const session = await requireRole("admin").catch(() => null);
  if (!session) redirect("/dashboard");

  const submissions = await prisma.showcaseSubmission.findMany({
    orderBy: { createdAt: "desc" },
  });

  // Serialise Dates for the client boundary.
  const serialised = submissions.map((s) => ({
    ...s,
    createdAt: s.createdAt.toISOString(),
    lastDownloadedAt: s.lastDownloadedAt?.toISOString() ?? null,
    pills: (Array.isArray(s.pills) ? s.pills : []) as Pill[],
  }));

  // Showcase pathways (each with its cohorts) + legacy standalone groups,
  // with per-group membership counts (ShowcaseMembership is the single
  // source of truth for who belongs to which group/cohort).
  const [pathwayRows, standaloneRows, membershipCounts, realPathwayRows, workshopRows] = await Promise.all([
    prisma.showcasePathway.findMany({
      orderBy: { createdAt: "desc" },
      include: { cohorts: { orderBy: { cohortNumber: "asc" } } },
    }),
    prisma.showcaseGroup.findMany({
      where: { pathwayId: null },
      orderBy: { createdAt: "desc" },
    }),
    prisma.showcaseMembership.groupBy({
      by: ["groupId"],
      _count: { _all: true },
    }),
    // Real learning pathways (registration source of truth) + their
    // cohorts, to bind a showcase cohort to its registration cohort.
    prisma.pathway.findMany({
      where: { status: "published" },
      orderBy: { title: "asc" },
      select: {
        id: true,
        title: true,
        cohorts: {
          orderBy: { displayOrder: "asc" },
          select: { id: true, name: true, slug: true },
        },
      },
    }),
    // Real workshops / tours / bootcamps — titles feed the pill
    // autocomplete on each submission card.
    prisma.workshop.findMany({
      orderBy: { startDateTime: "asc" },
      select: { title: true },
    }),
  ]);
  const countByGroupId = new Map(
    membershipCounts.map((c) => [c.groupId, c._count._all]),
  );
  const pathways = pathwayRows.map((p) => ({
    id: p.id,
    slug: p.slug,
    name: p.name,
    eyebrow: p.eyebrow,
    intro: p.intro,
    linkedPathwayId: p.linkedPathwayId,
    cohorts: p.cohorts.map((c) => ({
      id: c.id,
      slug: c.slug,
      name: c.name,
      cohortNumber: c.cohortNumber,
      active: c.active,
      submissionCount: countByGroupId.get(c.id) ?? 0,
      linkedCohortId: c.linkedCohortId,
      gateOnAttendance: c.gateOnAttendance,
    })),
  }));
  const standalone = standaloneRows.map((g) => ({
    id: g.id,
    slug: g.slug,
    name: g.name,
    active: g.active,
    submissionCount: countByGroupId.get(g.id) ?? 0,
  }));

  // Autocomplete suggestions for the per-card membership pills.
  const workshopOptions = Array.from(
    new Set(workshopRows.map((w) => w.title).filter(Boolean)),
  ).sort((a, b) => a.localeCompare(b));
  const pathwayOptions = Array.from(
    new Set(realPathwayRows.map((p) => p.title).filter(Boolean)),
  ).sort((a, b) => a.localeCompare(b));

  const adminName =
    (session.user as { name?: string }).name ??
    (session.user as { email?: string }).email ??
    "admin";

  return (
    <div className="space-y-5">
      <section
        className="rounded-2xl border border-line/70 overflow-hidden"
        style={{
          background:
            "linear-gradient(180deg, color-mix(in srgb, var(--brand-50) 60%, var(--card)) 0%, var(--card) 70%)",
        }}
      >
        <div className="px-5 sm:px-7 py-5 sm:py-6">
          <PageHeader
            title={
              <span className="inline-flex items-center gap-2">
                <GraduationCap size={22} className="text-brand-600" />
                Graduate showcase submissions
              </span>
            }
            description="Public graduates' name + LinkedIn + headshot entries. Submissions arrive via /showcase/<program> (no login required for the public side). Download a row's photo + info, mark it once you've processed it, or delete spam."
          />
        </div>
        <div className="h-px bg-gradient-to-r from-transparent via-brand-200/70 to-transparent" />
      </section>

      <ShowcasePathwaysManager
        initialPathways={pathways}
        initialStandalone={standalone}
        realPathways={realPathwayRows}
      />

      <ShowcaseAdminClient
        initialSubmissions={serialised}
        adminName={adminName}
        workshopOptions={workshopOptions}
        pathwayOptions={pathwayOptions}
      />
    </div>
  );
}
