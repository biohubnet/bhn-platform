import { requireRole } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ArrowRight, Inbox } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/Badge";

interface AppRow {
  id: string;
  status: string;
  fullName: string;
  organization: string | null;
  submittedAt: Date;
  reviewedAt: Date | null;
  approvedAmount: number | null;
  user: { id: string; name: string | null; email: string };
  reviewer: { id: string; name: string | null } | null;
}

export default async function AdminCreditApplicationsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const session = await requireRole("admin").catch(() => null);
  if (!session) redirect("/dashboard");
  const sp = await searchParams;
  const filter = ["pending", "approved", "rejected"].includes(sp.status ?? "") ? sp.status! : "all";

  const apps = await prisma.creditApplication.findMany({
    where: filter === "all" ? {} : { status: filter },
    include: {
      user: { select: { id: true, name: true, email: true } },
      reviewer: { select: { id: true, name: true } },
    },
    orderBy: [{ status: "asc" }, { submittedAt: "desc" }],
    take: 200,
  }) as unknown as AppRow[];

  const counts = {
    all: apps.length,
    pending: apps.filter((a) => a.status === "pending").length,
    approved: apps.filter((a) => a.status === "approved").length,
    rejected: apps.filter((a) => a.status === "rejected").length,
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Credit applications"
        description="Trainee applications for additional starter credits. Approving here grants credits and writes a transaction to their history."
      />

      {/* Filter pills */}
      <div className="flex items-center gap-2 flex-wrap">
        {(["all", "pending", "approved", "rejected"] as const).map((f) => (
          <Link
            key={f}
            href={`/admin/credit-applications${f === "all" ? "" : `?status=${f}`}`}
            className={
              "px-3 py-1.5 text-xs font-medium rounded-full border transition-colors " +
              (filter === f
                ? "bg-brand-600 text-white border-brand-600"
                : "bg-card text-muted border-line hover:border-line-strong")
            }
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
            <span className="ml-1.5 opacity-60">{counts[f]}</span>
          </Link>
        ))}
      </div>

      {apps.length === 0 ? (
        <div className="bg-card rounded-2xl border border-line p-16 text-center">
          <div className="w-12 h-12 mx-auto rounded-xl bg-elevated text-muted flex items-center justify-center mb-3">
            <Inbox size={20} />
          </div>
          <p className="font-medium text-fg">No applications</p>
          <p className="text-sm text-muted mt-1">
            {filter === "pending" ? "Nothing waiting for review." : "Nothing in this state yet."}
          </p>
        </div>
      ) : (
        <div className="bg-card rounded-2xl border border-line overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs text-muted uppercase tracking-wide">
                <th className="px-5 py-3">Applicant</th>
                <th className="px-5 py-3">Organization</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Submitted</th>
                <th className="px-5 py-3">Reviewed by</th>
                <th className="px-5 py-3 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {apps.map((a) => (
                <tr key={a.id} className="hover:bg-elevated/50">
                  <td className="px-5 py-3">
                    <p className="font-medium text-fg">{a.fullName}</p>
                    <p className="text-xs text-subtle">{a.user.email}</p>
                  </td>
                  <td className="px-5 py-3 text-muted">{a.organization ?? "—"}</td>
                  <td className="px-5 py-3">
                    {a.status === "pending"  && <Badge tone="amber">Pending</Badge>}
                    {a.status === "approved" && <Badge tone="success">Approved · +{(a.approvedAmount ?? 0).toLocaleString()}</Badge>}
                    {a.status === "rejected" && <Badge tone="danger">Rejected</Badge>}
                  </td>
                  <td className="px-5 py-3 text-subtle text-xs">
                    {new Date(a.submittedAt).toLocaleDateString()}
                  </td>
                  <td className="px-5 py-3 text-muted text-xs">
                    {a.reviewer?.name ?? "—"}
                  </td>
                  <td className="px-5 py-3">
                    <Link
                      href={`/admin/credit-applications/${a.id}`}
                      className="inline-flex items-center gap-1 text-brand-600 hover:text-brand-700 text-xs font-medium"
                    >
                      Review <ArrowRight size={12} />
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
