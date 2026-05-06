"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import { LogoMark } from "@/components/ui/Logo";
import { ThemePicker } from "@/components/ui/ThemePicker";
import {
  LayoutDashboard,
  BookOpen,
  GraduationCap,
  Award,
  BarChart3,
  Users,
  Settings,
  LogOut,
  ChevronRight,
  Coins,
  FileText,
  Megaphone,
  ShieldCheck,
  ClipboardList,
  UsersRound,
  Link2,
  Layers,
} from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  minRole?: "instructor" | "admin" | "superadmin";
  exact?: boolean;
}

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, exact: true },
  { label: "Course Catalog", href: "/courses", icon: BookOpen },
  { label: "Pathways", href: "/pathways", icon: Layers },
  { label: "My Courses", href: "/my-courses", icon: GraduationCap },
  { label: "Gradebook", href: "/gradebook", icon: BarChart3 },
  { label: "Certificates", href: "/certificates", icon: Award },
  { label: "My Credits", href: "/credits", icon: Coins },
];

const adminItems: NavItem[] = [
  { label: "Overview", href: "/admin", icon: LayoutDashboard, exact: true, minRole: "admin" },
  { label: "Users", href: "/admin/users", icon: Users, minRole: "admin" },
  { label: "Enrollments", href: "/admin/enrollments", icon: ClipboardList, minRole: "admin" },
  { label: "Groups", href: "/admin/groups", icon: UsersRound, minRole: "admin" },
  { label: "Certificates", href: "/admin/certificates", icon: Award, minRole: "admin" },
  { label: "Announcements", href: "/admin/announcements", icon: Megaphone, minRole: "admin" },
  { label: "Reports", href: "/admin/reports", icon: FileText, minRole: "admin" },
  { label: "Audit Log", href: "/admin/audit", icon: ShieldCheck, minRole: "admin" },
  { label: "LTI Config", href: "/admin/lti", icon: Link2, minRole: "superadmin" },
  { label: "Settings", href: "/admin/settings", icon: Settings, minRole: "superadmin" },
];

const ROLE_RANK: Record<string, number> = {
  user: 0,
  evaluating: 0,
  instructor: 1,
  admin: 2,
  superadmin: 3,
};

interface SidebarProps {
  role: string;
  user: { name?: string | null; email?: string | null; image?: string | null };
  credits?: number;
}

function NavLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const active = item.exact
    ? pathname === item.href
    : pathname === item.href || pathname.startsWith(item.href + "/");
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className={cn(
        "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
        active
          ? "bg-brand-50 text-brand-700"
          : "text-muted hover:bg-raised hover:text-fg"
      )}
    >
      <Icon size={16} />
      <span className="flex-1">{item.label}</span>
      {active && <ChevronRight size={14} className="text-brand-400" />}
    </Link>
  );
}

export function Sidebar({ role, user, credits }: SidebarProps) {
  const pathname = usePathname();
  const userRank = ROLE_RANK[role] ?? 0;
  const isAdmin = userRank >= ROLE_RANK["admin"];
  const isStaff = userRank >= ROLE_RANK["instructor"];

  const visibleAdmin = adminItems.filter((item) => {
    const required = ROLE_RANK[item.minRole ?? "admin"] ?? ROLE_RANK.admin;
    return userRank >= required;
  });

  return (
    <aside className="w-64 bg-card border-r border-line flex flex-col">
      {/* Logo */}
      <Link href="/dashboard" className="px-6 py-5 border-b border-line block hover:bg-elevated/50 transition-colors">
        <div className="flex items-center gap-3">
          <LogoMark size={36} className="drop-shadow-sm" />
          <div className="leading-tight">
            <p className="font-bold text-fg text-sm">BHN <span className="text-brand-600 font-semibold">Training</span></p>
            <p className="text-[10px] uppercase tracking-[0.18em] text-subtle mt-0.5">{role}</p>
          </div>
        </div>
      </Link>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink key={item.href} item={item} pathname={pathname} />
        ))}

        {isAdmin && (
          <>
            <div className="pt-4 pb-1 px-3">
              <p className="text-xs font-semibold text-subtle uppercase tracking-wider">
                Administration
              </p>
            </div>
            {visibleAdmin.map((item) => (
              <NavLink key={item.href} item={item} pathname={pathname} />
            ))}
          </>
        )}
      </nav>

      {/* Credits badge for non-staff */}
      {!isStaff && credits !== undefined && (
        <div className="px-4 py-3 border-t border-line">
          <div className="flex items-center gap-2 bg-amber-50 rounded-lg px-3 py-2">
            <Coins size={14} className="text-amber-500 shrink-0" />
            <div>
              <p className="text-xs text-amber-700 font-semibold">
                {credits.toLocaleString()} BHN Credits
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Theme picker */}
      <div className="px-3 py-2 border-t border-line">
        <ThemePicker />
      </div>

      {/* User */}
      <div className="px-3 py-4 border-t border-line">
        <div className="flex items-center gap-3 px-3 py-2 mb-1">
          <div className="w-8 h-8 rounded-full bg-raised flex items-center justify-center text-sm font-medium text-muted">
            {user.name?.[0]?.toUpperCase() ?? user.email?.[0]?.toUpperCase() ?? "?"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-fg truncate">
              {user.name ?? "User"}
            </p>
            <p className="text-xs text-subtle truncate">{user.email}</p>
          </div>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center gap-3 px-3 py-2 w-full rounded-lg text-sm text-muted hover:bg-elevated hover:text-fg transition-colors"
        >
          <LogOut size={16} />
          Sign out
        </button>
      </div>
    </aside>
  );
}
