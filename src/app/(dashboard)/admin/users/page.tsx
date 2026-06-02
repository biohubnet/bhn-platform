import Link from "next/link";
import { Sparkles, Users, Ghost } from "lucide-react";
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

const VALID_KINDS = ["real", "demo", "phantom"] as const;
type Kind = (typeof VALID_KINDS)[number];

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string }>;
}) {
  const session = await requireRole("admin").catch(() => null);
  if (!session) redirect("/dashboard");

  const sp = await searchParams;
  const kind: Kind = (VALID_KINDS as readonly string[]).includes(sp.kind ?? "")
    ? (sp.kind as Kind)
    : "real";

  const [users, groups, kindCounts] = await Promise.all([
    prisma.user.findMany({
      where: { accountKind: kind },
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
    Promise.all([
      prisma.user.count({ where: { accountKind: "real" } }),
      prisma.user.count({ where: { accountKind: "demo" } }),
      prisma.user.count({ where: { accountKind: "phantom", demoExpiresAt: { gt: new Date() } } }),
    ]),
  ]);
  const [realCount, demoCount, phantomCount] = kindCounts;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-fg">Users</h1>
          <p className="text-muted text-sm mt-1">
            {users.length} {kind} · select rows for batch actions
          </p>
        </div>
        <UserActionsBar />
      </div>

      {/* Account-kind tabs */}
      <div className="flex items-center gap-1 border-b border-line">
        <Tab href="/admin/users?kind=real"     active={kind === "real"}     icon={Users}    label="Real"     count={realCount} />
        <Tab href="/admin/users?kind=demo"     active={kind === "demo"}     icon={Sparkles} label="Demo"     count={demoCount}    tone="violet" />
        <Tab href="/admin/users?kind=phantom"  active={kind === "phantom"}  icon={Ghost}    label="Phantom"  count={phantomCount} tone="amber" />
      </div>

      {kind === "demo" && (
        <div className="bg-violet-50 border border-violet-200 text-violet-900 rounded-lg px-3 py-2 text-xs">
          These are time-limited demo workspace accounts. Manage them from <Link href="/admin/demo-workspaces" className="font-semibold underline">/admin/demo-workspaces</Link>.
        </div>
      )}
      {kind === "phantom" && (
        <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-lg px-3 py-2 text-xs">
          These are ephemeral test accounts that auto-delete after their TTL. Spawn + manage them from <Link href="/admin/phantom-users" className="font-semibold underline">/admin/phantom-users</Link>.
        </div>
      )}

      <UsersTableClient users={users} groups={groups} kind={kind} />
    </div>
  );
}

function Tab({
  href, active, icon: Icon, label, count, tone,
}: {
  href: string;
  active: boolean;
  icon: React.ElementType;
  label: string;
  count: number;
  tone?: "cyan" | "violet" | "amber";
}) {
  const activeBorder =
    tone === "cyan"   ? "border-cyan-600 text-cyan-700"
  : tone === "violet" ? "border-violet-600 text-violet-700"
  : tone === "amber"  ? "border-amber-600 text-amber-700"
                      : "border-brand-600 text-brand-700";
  return (
    <Link
      href={href}
      className={
        "inline-flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors " +
        (active ? activeBorder : "text-muted border-transparent hover:text-fg")
      }
    >
      <Icon size={13} />
      {label}
      <span className="text-xs tabular-nums opacity-80">{count}</span>
    </Link>
  );
}
