import Link from "next/link";
import { ArrowLeft, FilePlus, Plus } from "lucide-react";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/Badge";

/** Employer's own internship postings. Filters by createdById so each
 *  employer only sees their own; admins see everything. */
export default async function EmployerPostings() {
  const session = await getSession();
  const role = (session!.user as { role?: string }).role ?? "trainee";
  const userId = (session!.user as { id?: string }).id ?? null;
  if (role !== "employer" && !["admin", "superadmin"].includes(role)) {
    return (
      <div className="bg-card border border-line rounded-2xl p-12 text-center">
        <p className="font-medium text-muted">This portal is for employer accounts.</p>
      </div>
    );
  }

  const isAdminLike = role === "admin" || role === "superadmin";
  const postings = await prisma.internshipPosting.findMany({
    where: isAdminLike ? {} : { createdById: userId ?? "_" },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-6">
        <div>
          <Link
            href="/employer"
            className="text-xs text-muted hover:text-fg inline-flex items-center gap-1 mb-2"
          >
            <ArrowLeft size={12} /> Employer overview
          </Link>
          <h1 className="text-2xl font-bold text-fg">My internship postings</h1>
          <p className="text-sm text-muted mt-0.5">
            {postings.length} {postings.length === 1 ? "posting" : "postings"}
          </p>
        </div>
        <Link
          href="/admin/internships/new"
          className="text-sm px-4 py-2 rounded-lg bg-brand-600 text-white hover:bg-brand-700 inline-flex items-center gap-2 font-medium shadow-sm shadow-brand-600/25"
        >
          <Plus size={14} /> New posting
        </Link>
      </div>

      {postings.length === 0 ? (
        <div className="bg-card border border-line rounded-2xl p-12 text-center">
          <div className="w-12 h-12 mx-auto rounded-xl bg-elevated text-muted flex items-center justify-center mb-3">
            <FilePlus size={20} />
          </div>
          <p className="font-medium text-muted">No postings yet</p>
          <p className="text-sm text-muted mt-1">Click "New posting" — paste the job description and the AI will fill in the fields for you.</p>
        </div>
      ) : (
        <div className="bg-card border border-line rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-elevated/60 border-b border-line">
              <tr>
                <th className="text-left text-[10px] font-semibold text-muted uppercase tracking-wider px-4 py-3">Title</th>
                <th className="text-left text-[10px] font-semibold text-muted uppercase tracking-wider px-4 py-3">Location</th>
                <th className="text-left text-[10px] font-semibold text-muted uppercase tracking-wider px-4 py-3">Status</th>
                <th className="text-left text-[10px] font-semibold text-muted uppercase tracking-wider px-4 py-3">Posted</th>
                <th></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {postings.map((p) => (
                <tr key={p.id} className="hover:bg-elevated/40">
                  <td className="px-4 py-3 font-medium text-fg">{p.title}</td>
                  <td className="px-4 py-3 text-muted">{p.location ?? "—"}</td>
                  <td className="px-4 py-3">
                    {p.status === "active" ? <Badge tone="success">Active</Badge>
                      : p.status === "draft" ? <Badge tone="warning">Draft</Badge>
                      : <Badge tone="neutral">Closed</Badge>}
                  </td>
                  <td className="px-4 py-3 text-xs text-subtle">{p.createdAt.toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/internships/${p.id}/edit`}
                      className="text-xs text-brand-700 hover:underline"
                    >
                      Edit
                    </Link>
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
