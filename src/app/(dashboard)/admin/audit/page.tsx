import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import type { Prisma } from "@prisma/client";

type AuditLogWithActor = Prisma.AuditLogGetPayload<{
  include: { actor: { select: { name: true; email: true } } };
}>;

export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const session = await requireRole("admin").catch(() => null);
  if (!session) redirect("/dashboard");

  const sp = await searchParams;
  const page = parseInt(sp.page ?? "1");
  const limit = 50;

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      include: { actor: { select: { name: true, email: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.auditLog.count(),
  ]);

  const pages = Math.ceil(total / limit);

  const actionColor: Record<string, string> = {
    "user.create": "bg-green-50 text-green-700",
    "user.deactivate": "bg-red-50 text-red-600",
    "user.reactivate": "bg-green-50 text-green-700",
    "user.update": "bg-blue-50 text-blue-600",
    "user.delete": "bg-red-100 text-red-700",
    "enrollment.create": "bg-indigo-50 text-indigo-600",
    "enrollment.delete": "bg-orange-50 text-orange-600",
    "certificate.issue": "bg-purple-50 text-purple-600",
    "certificate.revoke": "bg-red-50 text-red-600",
    "certificate.reinstate": "bg-green-50 text-green-700",
    "credit.grant": "bg-amber-50 text-amber-700",
    "settings.update": "bg-slate-50 text-slate-600",
    "group.create": "bg-violet-50 text-violet-600",
    "lti.create": "bg-cyan-50 text-cyan-600",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Audit Log</h1>
        <p className="text-gray-500 text-sm mt-1">{total.toLocaleString()} events recorded</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs text-gray-500 uppercase tracking-wide">
                <th className="px-5 py-3">Time</th>
                <th className="px-5 py-3">Actor</th>
                <th className="px-5 py-3">Action</th>
                <th className="px-5 py-3">Target</th>
                <th className="px-5 py-3">Detail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {(logs as AuditLogWithActor[]).map((log) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 text-gray-400 text-xs whitespace-nowrap">
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                  <td className="px-5 py-3">
                    <p className="text-gray-900 font-medium text-xs">{log.actor.name ?? "—"}</p>
                    <p className="text-xs text-gray-400">{log.actor.email}</p>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-mono ${actionColor[log.action] ?? "bg-gray-100 text-gray-600"}`}>
                      {log.action}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-xs text-gray-500">
                    {log.targetType && <span className="font-medium">{log.targetType}</span>}
                    {log.targetId && <span className="text-gray-400 ml-1 font-mono">{log.targetId.slice(0, 8)}…</span>}
                  </td>
                  <td className="px-5 py-3 text-xs text-gray-400 max-w-xs truncate font-mono">
                    {log.detail}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          {page > 1 && (
            <Link
              href={`/admin/audit?page=${page - 1}`}
              className="px-3 py-1.5 border border-gray-200 rounded text-sm hover:bg-gray-50"
            >
              ← Prev
            </Link>
          )}
          <span className="text-sm text-gray-500">Page {page} of {pages}</span>
          {page < pages && (
            <Link
              href={`/admin/audit?page=${page + 1}`}
              className="px-3 py-1.5 border border-gray-200 rounded text-sm hover:bg-gray-50"
            >
              Next →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
