/**
 * /admin/pages — CMS page list. Admins manage announcements +
 * lightweight standalone pages here. Each row links to an edit
 * view; status / audience badges flag publication state at a
 * glance.
 */
import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, FileText, ArrowRight, Eye, Pencil } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/PageHeader";
import { PAGE_AUDIENCE_LABEL, type PageAudience } from "@/lib/cms/audience";

export const dynamic = "force-dynamic";

export default async function AdminPagesIndex() {
  const session = await requireRole("admin").catch(() => null);
  if (!session) redirect("/dashboard");

  const pages = await prisma.page.findMany({
    orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
    include: {
      updatedBy: { select: { name: true, email: true } },
      createdBy: { select: { name: true, email: true } },
    },
  });

  return (
    <div className="space-y-5">
      <PageHeader
        title="Pages"
        description="Lightweight CMS — colleagues can publish announcements, policy pages, and standalone content at /p/[slug] without a code deploy. Drafts stay private; published pages render to the configured audience."
        actions={
          <Link
            href="/admin/pages/new"
            className="inline-flex items-center gap-1.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold px-4 py-2 rounded-lg shadow-sm transition-colors"
          >
            <Plus size={14} /> New page
          </Link>
        }
      />

      {pages.length === 0 ? (
        <div className="border border-line bg-card p-10 text-center">
          <FileText size={32} className="text-fg-subtle mx-auto mb-3" />
          <p className="text-sm text-fg-muted">
            No pages yet. <Link href="/admin/pages/new" className="text-brand-700 font-bold hover:underline">Create the first one</Link>.
          </p>
        </div>
      ) : (
        <div className="border border-line bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="text-[10px] uppercase tracking-[0.18em] font-bold text-fg-subtle border-b border-line">
              <tr>
                <th className="text-left px-4 py-3">Title</th>
                <th className="text-left px-4 py-3 hidden sm:table-cell">Slug</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3 hidden md:table-cell">Audience</th>
                <th className="text-left px-4 py-3 hidden lg:table-cell">Updated</th>
                <th className="text-right px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {pages.map((p) => (
                <tr key={p.id} className="hover:bg-elevated/60 transition-colors">
                  <td className="px-4 py-3 font-semibold text-fg">{p.title}</td>
                  <td className="px-4 py-3 font-mono text-xs text-fg-muted hidden sm:table-cell">/p/{p.slug}</td>
                  <td className="px-4 py-3">
                    <StatusChip status={p.status} />
                  </td>
                  <td className="px-4 py-3 text-xs text-fg-muted hidden md:table-cell">
                    {PAGE_AUDIENCE_LABEL[p.audience as PageAudience] ?? p.audience}
                  </td>
                  <td className="px-4 py-3 text-xs text-fg-muted hidden lg:table-cell">
                    {new Date(p.updatedAt).toLocaleDateString()}
                    {p.updatedBy?.name && <span className="block text-fg-subtle">{p.updatedBy.name}</span>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex items-center gap-3">
                      {p.status === "published" && (
                        <Link
                          href={`/p/${p.slug}`}
                          className="inline-flex items-center gap-1 text-xs text-fg-muted hover:text-fg"
                          title="View live page"
                        >
                          <Eye size={12} /> View
                        </Link>
                      )}
                      <Link
                        href={`/admin/pages/${p.id}/edit`}
                        className="inline-flex items-center gap-1 text-xs font-bold text-brand-700 hover:text-brand-900"
                      >
                        <Pencil size={12} /> Edit <ArrowRight size={10} />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StatusChip({ status }: { status: string }) {
  const styles =
    status === "published"
      ? "bg-emerald-50 text-emerald-800 ring-emerald-200"
      : "bg-amber-50 text-amber-800 ring-amber-200";
  return (
    <span
      className={`inline-flex items-center text-[10px] font-black uppercase tracking-[0.18em] px-2 py-0.5 rounded-full ring-1 ring-inset ${styles}`}
    >
      {status}
    </span>
  );
}
