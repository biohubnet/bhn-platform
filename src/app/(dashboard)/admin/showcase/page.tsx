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
  }));

  // Showcase pathways (each with its cohorts) + legacy standalone groups,
  // with per-slug submission counts (submissions couple loosely by
  // programSlug == slug).
  const [pathwayRows, standaloneRows, subCounts, realPathwayRows, workshopRows] = await Promise.all([
    prisma.showcasePathway.findMany({
      orderBy: { createdAt: "desc" },
      include: { cohorts: { orderBy: { cohortNumber: "asc" } } },
    }),
    prisma.showcaseGroup.findMany({
      where: { pathwayId: null },
      orderBy: { createdAt: "desc" },
    }),
    prisma.showcaseSubmission.groupBy({
      by: ["programSlug"],
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
    // Real workshops / tours / bootcamps — attendees can be added to a
    // showcase the same way pathway cohorts are (via an on-demand group).
    prisma.workshop.findMany({
      orderBy: { startDateTime: "asc" },
      select: { id: true, slug: true, title: true, kind: true, partnerOrganization: true },
    }),
  ]);
  const countBySlug = new Map(
    subCounts.map((c) => [c.programSlug, c._count._all]),
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
      submissionCount: countBySlug.get(c.slug) ?? 0,
      linkedCohortId: c.linkedCohortId,
      gateOnAttendance: c.gateOnAttendance,
    })),
  }));
  const standalone = standaloneRows.map((g) => ({
    id: g.id,
    slug: g.slug,
    name: g.name,
    active: g.active,
    submissionCount: countBySlug.get(g.slug) ?? 0,
  }));

  // Workshops + any existing showcase group bound to them (slug wsh-<slug>).
  const wshGroupRows = await prisma.showcaseGroup.findMany({
    where: { slug: { in: workshopRows.map((w) => `wsh-${w.slug}`) } },
    select: { id: true, slug: true, name: true, active: true },
  });
  const wshGroupBySlug = new Map(wshGroupRows.map((g) => [g.slug, g]));
  const workshops = workshopRows.map((w) => {
    const g = wshGroupBySlug.get(`wsh-${w.slug}`);
    return {
      id: w.id,
      title: w.title,
      kind: w.kind,
      partner: w.partnerOrganization,
      group: g
        ? { id: g.id, slug: g.slug, name: g.name, active: g.active, submissionCount: countBySlug.get(g.slug) ?? 0 }
        : null,
    };
  });

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
        initialWorkshops={workshops}
      />

      <ShowcaseAdminClient initialSubmissions={serialised} adminName={adminName} />
    </div>
  );
}
