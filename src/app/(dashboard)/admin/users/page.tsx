import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { cn } from "@/lib/utils";
import { UserActionsBar } from "@/components/admin/UserActionsBar";
import { UserRowClient } from "@/components/admin/UserRowClient";

export default async function AdminUsersPage() {
  const session = await requireRole("admin").catch(() => null);
  if (!session) redirect("/dashboard");

  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      credits: true,
      createdAt: true,
      lastLoginAt: true,
      _count: { select: { enrollments: true, certificates: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Users</h1>
          <p className="text-gray-500 text-sm mt-1">{users.length} total users</p>
        </div>
        <UserActionsBar />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs text-gray-500 uppercase tracking-wide">
                <th className="px-5 py-3">User</th>
                <th className="px-5 py-3">Role</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Credits</th>
                <th className="px-5 py-3">Enrollments</th>
                <th className="px-5 py-3">Certs</th>
                <th className="px-5 py-3">Last Login</th>
                <th className="px-5 py-3">Joined</th>
                <th className="px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {users.map((user) => (
                <tr key={user.id} className={cn("hover:bg-gray-50", !user.isActive && "opacity-50")}>
                  <td className="px-5 py-3">
                    <p className="font-medium text-gray-900">{user.name ?? "—"}</p>
                    <p className="text-xs text-gray-400">{user.email}</p>
                  </td>
                  <td className="px-5 py-3">
                    <span className={cn(
                      "text-xs px-2 py-0.5 rounded-full font-medium",
                      user.role === "superadmin" ? "bg-red-100 text-red-700" :
                      user.role === "admin" ? "bg-blue-100 text-blue-700" :
                      user.role === "evaluating" ? "bg-amber-100 text-amber-700" :
                      "bg-gray-100 text-gray-600"
                    )}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <span className={cn(
                      "text-xs px-2 py-0.5 rounded-full",
                      user.isActive ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"
                    )}>
                      {user.isActive ? "active" : "inactive"}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-gray-600 font-mono text-xs">
                    {user.credits.toLocaleString()}
                  </td>
                  <td className="px-5 py-3 text-gray-500">{user._count.enrollments}</td>
                  <td className="px-5 py-3 text-gray-500">{user._count.certificates}</td>
                  <td className="px-5 py-3 text-gray-400 text-xs">
                    {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-5 py-3 text-gray-400 text-xs">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-5 py-3">
                    <UserRowClient user={user} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
