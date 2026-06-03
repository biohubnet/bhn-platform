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
import { ShowcaseGroupsManager } from "@/components/admin/ShowcaseGroupsManager";

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

  // Showcase groups + per-group submission counts (submissions couple to
  // a group loosely by programSlug == slug).
  const groupRows = await prisma.showcaseGroup.findMany({
    orderBy: { createdAt: "desc" },
  });
  const subCounts = await prisma.showcaseSubmission.groupBy({
    by: ["programSlug"],
    _count: { _all: true },
  });
  const countBySlug = new Map(
    subCounts.map((c) => [c.programSlug, c._count._all]),
  );
  const groups = groupRows.map((g) => ({
    id: g.id,
    slug: g.slug,
    name: g.name,
    eyebrow: g.eyebrow,
    intro: g.intro,
    active: g.active,
    submissionCount: countBySlug.get(g.slug) ?? 0,
  }));

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

      <ShowcaseGroupsManager initialGroups={groups} />

      <ShowcaseAdminClient initialSubmissions={serialised} adminName={adminName} />
    </div>
  );
}
