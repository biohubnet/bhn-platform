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

      <ShowcaseAdminClient initialSubmissions={serialised} adminName={adminName} />
    </div>
  );
}
