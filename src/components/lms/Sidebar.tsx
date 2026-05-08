"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import { LogoMark } from "@/components/ui/Logo";
import { ThemePicker } from "@/components/ui/ThemePicker";
import { RoleSwitcher } from "@/components/admin/RoleSwitcher";
import { useT } from "@/lib/i18n/I18nProvider";
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
  Sparkles,
  LineChart,
  Coins as CoinsIcon,
  UserCog,
  HeartHandshake,
  Briefcase,
  Users2,
  FilePlus,
  Building2,
  ListChecks,
  Activity,
  Mail,
  Inbox,
  Calendar,
  GitBranch,
} from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  minRole?: "instructor" | "admin" | "superadmin";
  exact?: boolean;
}

// Always-visible top item.
const dashboardItem: NavItem & { labelKey: string } = {
  label: "Dashboard", labelKey: "nav.dashboard", href: "/dashboard", icon: LayoutDashboard, exact: true,
};

// ENGAGE — the learning loop: catalog → pathway → progress → credits.
const engageItems: (NavItem & { labelKey: string })[] = [
  { label: "Course Catalog",     labelKey: "nav.catalog",     href: "/courses", icon: BookOpen },
  { label: "Learning Pathways",  labelKey: "nav.pathways",    href: "/pathways", icon: Layers },
  { label: "My Courses",         labelKey: "nav.myCourses",   href: "/my-courses", icon: GraduationCap },
  { label: "Gradebook",          labelKey: "nav.gradebook",   href: "/gradebook", icon: BarChart3 },
  { label: "Certificates",       labelKey: "nav.certificates",href: "/certificates", icon: Award },
  { label: "My Credits",         labelKey: "nav.credits",     href: "/credits", icon: Coins },
];

// EXPERIENCE — applications and connections to industry placements.
const experienceItems: (NavItem & { labelKey: string })[] = [
  { label: "Talent Application",        labelKey: "nav.talent",      href: "/forms/talent-application", icon: Briefcase },
  { label: "Internship Opportunities",  labelKey: "nav.internships", href: "/internships",              icon: Briefcase },
  { label: "My Skills",                 labelKey: "nav.skills",      href: "/profile/skills",           icon: Sparkles },
  { label: "Interviews",                labelKey: "nav.interviews",  href: "/interviews",               icon: Calendar },
];

// Other top-level items rendered after the groups.
const miscItems: (NavItem & { labelKey: string })[] = [
  { label: "Learning buddies",   labelKey: "nav.buddy",       href: "/buddy", icon: HeartHandshake },
  // labelKey is overridden per-role at render time ("What's new" for trainees).
  { label: "Change log",         labelKey: "nav.changelog",   href: "/changelog", icon: Sparkles },
];

// EMPLOYER PORTAL — visible only when role === "employer".
const employerItems: (NavItem & { labelKey: string })[] = [
  { label: "Overview",          labelKey: "nav.employerHome",       href: "/employer",            icon: Building2, exact: true },
  { label: "Company profile",   labelKey: "nav.employerProfile",    href: "/employer/profile",    icon: Building2 },
  { label: "My Postings",       labelKey: "nav.employerPostings",   href: "/employer/postings",   icon: FilePlus },
  { label: "Applicants",        labelKey: "nav.employerApplicants", href: "/employer/applicants", icon: Users2 },
];

const adminItems: NavItem[] = [
  { label: "Overview", href: "/admin", icon: LayoutDashboard, exact: true, minRole: "admin" },
  { label: "Users", href: "/admin/users", icon: Users, minRole: "admin" },
  { label: "Enrollments", href: "/admin/enrollments", icon: ClipboardList, minRole: "admin" },
  { label: "Groups", href: "/admin/groups", icon: UsersRound, minRole: "admin" },
  { label: "Credit applications", href: "/admin/credit-applications", icon: CoinsIcon, minRole: "admin" },
  { label: "Role requests", href: "/admin/role-requests", icon: UserCog, minRole: "admin" },
  { label: "Pathway enrollments", href: "/admin/pathway-enrollments", icon: Layers, minRole: "admin" },
  { label: "Course filters",      href: "/admin/course-filters",      icon: ListChecks, minRole: "admin" },
  { label: "Employer invites",    href: "/admin/employer-invites",    icon: Building2,  minRole: "admin" },
  { label: "Newsletter exports",  href: "/admin/newsletter",          icon: Mail,       minRole: "admin" },
  { label: "Certificates", href: "/admin/certificates", icon: Award, minRole: "admin" },
  { label: "Announcements", href: "/admin/announcements", icon: Megaphone, minRole: "admin" },
  { label: "Analytics", href: "/admin/analytics", icon: LineChart, minRole: "admin" },
  { label: "Reports", href: "/admin/reports", icon: FileText, minRole: "admin" },
  { label: "Audit Log", href: "/admin/audit", icon: ShieldCheck, minRole: "admin" },
  { label: "Skill ontology",      href: "/admin/skills",          icon: GitBranch,  minRole: "admin" },
  { label: "Access requests",     href: "/admin/access-requests", icon: Inbox,      minRole: "admin" },
  { label: "Demo workspaces",     href: "/admin/demo-workspaces", icon: Sparkles,   minRole: "admin" },
  { label: "LTI Config", href: "/admin/lti", icon: Link2, minRole: "superadmin" },
  { label: "System status", href: "/admin/system-status", icon: Activity, minRole: "superadmin" },
  { label: "Settings", href: "/admin/settings", icon: Settings, minRole: "superadmin" },
];

const ROLE_RANK: Record<string, number> = {
  user: 0,
  trainee: 0,
  evaluating: 0,
  instructor: 1,
  admin: 2,
  superadmin: 3,
};

interface SidebarProps {
  role: string;
  realRole?: string;
  actingAs?: string | null;
  user: { name?: string | null; email?: string | null; image?: string | null };
  credits?: number;
  /** Employer-only flag — when false (default), employers see only their portal. */
  allowPlatformContent?: boolean;
}

/**
 * Bordered nav group with the title sitting at the top opening — the
 * fieldset/legend pattern. The title's background-color matches the
 * solid card so it visually "cuts" the border on whatever theme is
 * active.
 */
interface ProgramHint {
  title: string;
  body?: string;
}

function SectionGroup({
  title, description, programs, children,
}: {
  title: string;
  description?: string;
  programs?: ProgramHint[];
  children: React.ReactNode;
}) {
  const hasTooltip = !!description || (programs && programs.length > 0);
  return (
    <div className="relative mt-5 mb-2 rounded-xl border border-line p-1.5 pt-2.5 space-y-0.5">
      {/* Title chip — wrapped in a tiny hover-group that opens a tooltip
          to the right when there's content to show. The transparent pl-2
          padding bridges the gap so the cursor can travel into the
          tooltip without losing hover. */}
      <div className="group/section absolute -top-[9px] left-3 z-20">
        <span
          tabIndex={hasTooltip ? 0 : -1}
          className={cn(
            "px-2 py-0 text-[10px] font-bold uppercase tracking-[0.22em] text-subtle bg-card-solid rounded inline-block",
            hasTooltip && "cursor-help focus:outline-none focus:text-fg group-hover/section:text-fg transition-colors"
          )}
          aria-describedby={hasTooltip ? `${title}-tooltip` : undefined}
        >
          {title}
        </span>
        {hasTooltip && (
          <div
            id={`${title}-tooltip`}
            role="tooltip"
            className="absolute left-full top-0 pl-3 w-72 invisible opacity-0 group-hover/section:visible group-hover/section:opacity-100 focus-within:visible focus-within:opacity-100 transition-opacity pointer-events-none group-hover/section:pointer-events-auto"
          >
            <div className="popover p-3 normal-case tracking-normal text-left">
              <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-subtle">{title}</p>
              {description && (
                <p className="text-sm text-fg leading-snug mt-1.5">{description}</p>
              )}
              {programs && programs.length > 0 && (
                <ul className="mt-3 space-y-2 border-t border-line pt-2.5">
                  {programs.map((p) => (
                    <li key={p.title}>
                      <p className="text-xs font-semibold text-fg leading-tight">{p.title}</p>
                      {p.body && <p className="text-xs text-muted leading-snug mt-0.5">{p.body}</p>}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </div>
      {children}
    </div>
  );
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

export function Sidebar({
  role, realRole, actingAs, user, credits, allowPlatformContent = false,
}: SidebarProps) {
  const pathname = usePathname();
  const t = useT();
  const userRank = ROLE_RANK[role] ?? 0;
  const isAdmin = userRank >= ROLE_RANK["admin"];
  const isStaff = userRank >= ROLE_RANK["instructor"];
  const isEmployer = role === "employer";
  // Employer accounts only see ENGAGE / EXPERIENCE / Buddies if an
  // admin has flipped allowPlatformContent on for them.
  const showLearnerNav = !isEmployer || allowPlatformContent;

  const visibleAdmin = adminItems.filter((item) => {
    const required = ROLE_RANK[item.minRole ?? "admin"] ?? ROLE_RANK.admin;
    return userRank >= required;
  });

  return (
    <aside className="w-64 glass border-r border-line flex flex-col relative z-10">
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
        <NavLink item={{ ...dashboardItem, label: t(dashboardItem.labelKey) }} pathname={pathname} />

        {isEmployer && (
          <SectionGroup title="EMPLOYER PORTAL">
            {employerItems.map((item) => (
              <NavLink key={item.href} item={item} pathname={pathname} />
            ))}
          </SectionGroup>
        )}

        {showLearnerNav && (
          <SectionGroup
            title="ENGAGE"
            description="Industry-led training, workshops, and mentorship."
            programs={[
              {
                title: "Medical Affairs Learning Pathway",
                body: "MSL Accelerator with Agilis Health — 2-day intensive in Toronto. Cohort runs in spring; next group in Fall.",
              },
              {
                title: "Entrepreneurship Learning Pathway",
                body: "Programme for life-sciences founders and aspiring founders.",
              },
            ]}
          >
            {engageItems.map((item) => {
              const labeled = { ...item, label: t(item.labelKey) };
              return <NavLink key={item.href} item={labeled} pathname={pathname} />;
            })}
          </SectionGroup>
        )}

        {showLearnerNav && experienceItems.length > 0 && (
          <SectionGroup
            title="EXPERIENCE"
            description="Bridging theory and practice through experiential learning."
            programs={[
              {
                title: "Knowledge Exchange — Round 4",
                body: "Industry placements running 1, 4, or 6 months. Application deadline 29 May 2026.",
              },
              {
                title: "Talent Application",
                body: "Submit your bio, supervisor letter, transcript, resume, and STAR video — we share with vetted partners.",
              },
              {
                title: "Internship Opportunities",
                body: "Live job board of internship and co-op postings from BHN industry partners.",
              },
            ]}
          >
            {experienceItems.map((item) => {
              const labeled = { ...item, label: t(item.labelKey) };
              return <NavLink key={item.href} item={labeled} pathname={pathname} />;
            })}
          </SectionGroup>
        )}

        {showLearnerNav && (
          <>
            <div className="pt-2" />
            {miscItems.map((item) => {
              // Trainees see the changelog as "What's new"; staff as "Change log".
              const key = item.href === "/changelog" && !isStaff ? "nav.changelogTrainee" : item.labelKey;
              const labeled = { ...item, label: t(key) };
              return <NavLink key={item.href} item={labeled} pathname={pathname} />;
            })}
          </>
        )}

        {isAdmin && (
          <SectionGroup title={t("nav.administration").toUpperCase()}>
            {visibleAdmin.map((item) => (
              <NavLink key={item.href} item={item} pathname={pathname} />
            ))}
          </SectionGroup>
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

      {/* Superadmin-only role switcher */}
      {realRole === "superadmin" && (
        <div className="px-3 py-2 border-t border-line">
          <RoleSwitcher actingAs={actingAs ?? null} />
        </div>
      )}

      {/* Theme picker */}
      <div className="px-3 py-2 border-t border-line">
        <ThemePicker />
      </div>

      {/* Build SHA — above the user block so it sits well clear of the
          bottom edge where the browser draws link-hover tooltips. */}
      {isStaff && process.env.NEXT_PUBLIC_COMMIT_SHA && (
        <div className="px-4 py-2 border-t border-line flex items-center justify-between text-[11px]">
          <span className="text-subtle">Build</span>
          <code className="font-mono text-muted bg-elevated px-1.5 py-0.5 rounded select-all">
            {process.env.NEXT_PUBLIC_COMMIT_SHA}
          </code>
        </div>
      )}

      {/* User */}
      <div className="px-3 py-4 border-t border-line">
        <Link href="/profile" className="flex items-center gap-3 px-3 py-2 mb-1 rounded-lg hover:bg-elevated transition-colors group">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-white flex items-center justify-center text-sm font-bold shadow-sm">
            {user.name?.[0]?.toUpperCase() ?? user.email?.[0]?.toUpperCase() ?? "?"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-fg truncate">
              {user.name ?? "User"}
            </p>
            <p className="text-xs text-subtle truncate group-hover:text-muted">{user.email}</p>
          </div>
        </Link>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center gap-3 px-3 py-2 w-full rounded-lg text-sm text-muted hover:bg-elevated hover:text-fg transition-colors"
        >
          <LogOut size={16} />
          {t("nav.signOut")}
        </button>
      </div>
    </aside>
  );
}
