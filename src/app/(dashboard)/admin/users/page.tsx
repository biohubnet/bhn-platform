import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { cn } from "@/lib/utils";
import { UserActionsBar } from "@/components/admin/UserActionsBar";
import { UserRowClient } from "@/components/admin/UserRowClient";

interface UserRow {
  id: string;
  name: string | null;
  email: string;
  role: string;
  isActive: boolean;
  credits: number;
  createdAt: Date;
  lastLoginAt: Date | null;
  _count: { enrollments: number; certificates: number };
}

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
          <h1 className="text-2xl font-bold text-fg">Users</h1>
          <p className="text-muted text-sm mt-1">{users.length} total users</p>
        </div>
        <UserActionsBar />
      </div>

      <div className="bg-card rounded-xl border border-line overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs text-muted uppercase tracking-wide">
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
            <tbody className="divide-y divide-line">
              {(users as UserRow[]).map((user: UserRow) => (
                <tr key={user.id} className={cn("hover:bg-elevated", !user.isActive && "opacity-50")}>
                  <td className="px-5 py-3">
                    <p className="font-medium text-fg">{user.name ?? "—"}</p>
                    <p className="text-xs text-subtle">{user.email}</p>
                  </td>
                  <td className="px-5 py-3">
                    <span className={cn(
                      "text-xs px-2 py-0.5 rounded-full font-medium",
                      user.role === "superadmin" ? "bg-rose-100 text-rose-700" :
                      user.role === "admin" ? "bg-brand-100 text-brand-700" :
                      user.role === "instructor" ? "bg-violet-100 text-violet-700" :
                      user.role === "evaluating" ? "bg-amber-100 text-amber-700" :
                      "bg-raised text-muted"
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
                  <td className="px-5 py-3 text-muted font-mono text-xs">
                    {user.credits.toLocaleString()}
                  </td>
                  <td className="px-5 py-3 text-muted">{user._count.enrollments}</td>
                  <td className="px-5 py-3 text-muted">{user._count.certificates}</td>
                  <td className="px-5 py-3 text-subtle text-xs">
                    {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-5 py-3 text-subtle text-xs">
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
