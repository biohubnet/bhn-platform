import { requireRole } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { RoleRequestRow } from "@/components/admin/RoleRequestRow";

interface RoleReq {
  id: string;
  fromRole: string;
  toRole: string;
  reason: string | null;
  status: string;
  reviewerNote: string | null;
  reviewedAt: Date | null;
  createdAt: Date;
  user: { id: string; name: string | null; email: string; role: string; organization: string | null; jobTitle: string | null };
  reviewer: { id: string; name: string | null } | null;
}

export default async function AdminRoleRequestsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const session = await requireRole("admin").catch(() => null);
  if (!session) redirect("/dashboard");
  const sp = await searchParams;
  const filter = ["pending", "approved", "rejected"].includes(sp.status ?? "") ? sp.status! : "all";

  const requests = await prisma.roleChangeRequest.findMany({
    where: filter === "all" ? {} : { status: filter },
    include: {
      user: { select: { id: true, name: true, email: true, role: true, organization: true, jobTitle: true } },
      reviewer: { select: { id: true, name: true } },
    },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 200,
  }) as unknown as RoleReq[];

  const counts = {
    all: requests.length,
    pending:  requests.filter((r) => r.status === "pending").length,
    approved: requests.filter((r) => r.status === "approved").length,
    rejected: requests.filter((r) => r.status === "rejected").length,
  };

  const realRole = (session.user as { realRole?: string }).realRole
    ?? (session.user as { role?: string }).role;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Role-change requests"
        description="Trainees and instructors can ask to change their role here. Admin-tier promotions require superadmin approval."
      />

      <div className="flex items-center gap-2 flex-wrap">
        {(["all", "pending", "approved", "rejected"] as const).map((f) => (
          <a
            key={f}
            href={`/admin/role-requests${f === "all" ? "" : `?status=${f}`}`}
            className={
              "px-3 py-1.5 text-xs font-medium rounded-full border transition-colors " +
              (filter === f
                ? "bg-brand-600 text-white border-brand-600"
                : "bg-card text-muted border-line hover:border-line-strong")
            }
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
            <span className="ml-1.5 opacity-60">{counts[f]}</span>
          </a>
        ))}
      </div>

      {requests.length === 0 ? (
        <div className="bg-card rounded-2xl border border-line p-16 text-center">
          <p className="font-medium text-fg">Nothing here</p>
          <p className="text-sm text-muted mt-1">No role-change requests in this state.</p>
        </div>
      ) : (
        <div className="bg-card rounded-2xl border border-line overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs text-muted uppercase tracking-wide">
                <th className="px-5 py-3">Requester</th>
                <th className="px-5 py-3">Change</th>
                <th className="px-5 py-3">Reason</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Submitted</th>
                <th className="px-5 py-3 w-px">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {requests.map((r) => (
                <tr key={r.id} className="align-top hover:bg-elevated/50">
                  <td className="px-5 py-3">
                    <p className="font-medium text-fg">{r.user.name ?? "—"}</p>
                    <p className="text-xs text-subtle">{r.user.email}</p>
                    {(r.user.organization || r.user.jobTitle) && (
                      <p className="text-xs text-subtle mt-0.5">
                        {[r.user.jobTitle, r.user.organization].filter(Boolean).join(" · ")}
                      </p>
                    )}
                  </td>
                  <td className="px-5 py-3 text-muted whitespace-nowrap">
                    {r.fromRole} <span className="text-subtle">→</span> <span className="text-fg font-medium">{r.toRole}</span>
                  </td>
                  <td className="px-5 py-3 text-muted text-xs max-w-xs">
                    <p className="line-clamp-3">{r.reason ?? "—"}</p>
                    {r.reviewerNote && (
                      <p className="text-subtle mt-1 text-[11px]">Reviewer: {r.reviewerNote}</p>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    {r.status === "pending"  && <Badge tone="amber">Pending</Badge>}
                    {r.status === "approved" && <Badge tone="success">Approved</Badge>}
                    {r.status === "rejected" && <Badge tone="danger">Rejected</Badge>}
                  </td>
                  <td className="px-5 py-3 text-subtle text-xs whitespace-nowrap">
                    {new Date(r.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-5 py-3">
                    <RoleRequestRow
                      id={r.id}
                      status={r.status}
                      toRole={r.toRole}
                      reviewerRole={realRole ?? "admin"}
                    />
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
