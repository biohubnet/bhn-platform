import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { UserActionsBar } from "@/components/admin/UserActionsBar";
import { UsersTableClient } from "@/components/admin/UsersTableClient";

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

  const [users, groups] = await Promise.all([
    prisma.user.findMany({
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
    }) as Promise<UserRow[]>,
    prisma.group.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-fg">Users</h1>
          <p className="text-muted text-sm mt-1">{users.length} total · select rows for batch actions</p>
        </div>
        <UserActionsBar />
      </div>

      <UsersTableClient users={users} groups={groups} />
    </div>
  );
}
