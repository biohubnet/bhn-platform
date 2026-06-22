/**
 * /admin/experience/employer-intake — Employer-intake submissions.
 *
 * Lists every "Hire an intern" lead captured via the public form
 * (biohubnet.ca/hire-an-intern → /api/public/employer-intake) plus any rows
 * imported from the legacy Experience User Database spreadsheet. Read-only
 * table; CSV export reuses the generic /api/forms/[slug]/export.csv route.
 */
import { redirect } from "next/navigation";
import Link from "next/link";
import { Building2, Download, Globe } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getOrSeedForm } from "@/lib/forms/registry";
import { PageHero } from "@/components/ui/PageHero";

export const dynamic = "force-dynamic";

function val(data: unknown, key: string): string {
  if (!data || typeof data !== "object") return "";
  const v = (data as Record<string, unknown>)[key];
  return v == null ? "" : String(v);
}

export default async function EmployerIntakePage() {
  const session = await requireRole("admin").catch(() => null);
  if (!session) redirect("/dashboard");

  // Ensure the form row exists so the page works on a fresh deploy.
  await getOrSeedForm("employer-intake");

  const rows = await prisma.eventFormSubmission.findMany({
    where: { form: { slug: "employer-intake" } },
    orderBy: { createdAt: "desc" },
    take: 500,
    select: { id: true, data: true, email: true, createdAt: true, reviewStatus: true },
  });

  return (
    <div className="space-y-6">
      <PageHero
        eyebrow={<><Building2 size={11} /> Admin · Experience</>}
        title="Employer intake"
        description="Every “Hire an intern” lead — captured from the public form on biohubnet.ca and from the imported Experience registry. Newest first."
        actions={
          <a
            href="/api/forms/employer-intake/export.csv"
            className="inline-flex items-center gap-1.5 rounded-md border border-line bg-card-solid px-3 py-1.5 text-xs font-semibold text-fg hover:bg-elevated"
          >
            <Download size={13} /> Export CSV
          </a>
        }
      />

      <div className="rounded-2xl border border-line bg-card-solid shadow-elevated">
        <div className="flex items-center justify-between px-5 py-3 border-b border-line">
          <p className="text-sm font-semibold text-fg">{rows.length} submission{rows.length === 1 ? "" : "s"}</p>
        </div>
        {rows.length === 0 ? (
          <div className="px-5 py-16 text-center text-sm text-muted">
            No employer-intake submissions yet. New leads from the public form land here automatically.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-[11px] uppercase tracking-wide text-subtle">
                  <th className="px-5 py-2.5 font-medium">Organization</th>
                  <th className="px-3 py-2.5 font-medium">Contact</th>
                  <th className="px-3 py-2.5 font-medium">Email</th>
                  <th className="px-3 py-2.5 font-medium">Timeline</th>
                  <th className="px-3 py-2.5 font-medium">Looking for</th>
                  <th className="px-3 py-2.5 font-medium whitespace-nowrap">Received</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const org = val(r.data, "organization");
                  const site = val(r.data, "website");
                  const name = val(r.data, "name");
                  const title = val(r.data, "title");
                  const needs = val(r.data, "needs");
                  const timeline = val(r.data, "hiring_timeline");
                  return (
                    <tr key={r.id} className="border-b border-line/60 align-top hover:bg-elevated/40">
                      <td className="px-5 py-3">
                        <div className="font-semibold text-fg">{org || "—"}</div>
                        {site && (
                          <Link href={site.startsWith("http") ? site : `https://${site}`} target="_blank" rel="noopener"
                            className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-brand-600 hover:underline">
                            <Globe size={10} /> {site.replace(/^https?:\/\//, "")}
                          </Link>
                        )}
                      </td>
                      <td className="px-3 py-3 text-fg">
                        {name || "—"}
                        {title && <div className="text-[11px] text-muted">{title}</div>}
                      </td>
                      <td className="px-3 py-3">
                        <a href={`mailto:${r.email ?? val(r.data, "email")}`} className="text-brand-600 hover:underline">
                          {(r.email ?? val(r.data, "email")) || "—"}
                        </a>
                      </td>
                      <td className="px-3 py-3 text-muted whitespace-nowrap">{timeline || "—"}</td>
                      <td className="px-3 py-3 text-muted max-w-[22rem]">{needs || "—"}</td>
                      <td className="px-3 py-3 text-muted whitespace-nowrap">
                        {r.createdAt.toLocaleDateString("en-CA")}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
