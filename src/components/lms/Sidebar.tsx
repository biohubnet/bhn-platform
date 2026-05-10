"use client";
import { useRef, useState, useEffect } from "react";
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
  Beaker,
  Bell,
  Lightbulb,
  FlaskConical,
  Menu,
  X,
  Compass,
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
// Renamed (8 May 2026) from "My Application" / "My Applications" to
// "Application Builder" / "Application Tracker" — the s/no-s
// distinction next to each other was demonstrably confusing. Routes
// kept the same so deep links stay alive.
const experienceItems: (NavItem & { labelKey: string })[] = [
  { label: "Application Builder",       labelKey: "nav.application", href: "/profile/application",      icon: FileText },
  { label: "Talent Application",        labelKey: "nav.talent",      href: "/forms/talent-application", icon: Briefcase },
  { label: "Internship Opportunities",  labelKey: "nav.internships", href: "/internships",              icon: Briefcase },
  { label: "Application Tracker",       labelKey: "nav.applications", href: "/profile/applications",    icon: ClipboardList },
  { label: "My Skills",                 labelKey: "nav.skills",      href: "/profile/skills",           icon: Lightbulb },
  { label: "Interviews",                labelKey: "nav.interviews",  href: "/interviews",               icon: Calendar },
];

// Other top-level items rendered after the groups.
const miscItems: (NavItem & { labelKey: string })[] = [
  { label: "Learning buddies",   labelKey: "nav.buddy",       href: "/buddy", icon: HeartHandshake },
  // labelKey is overridden per-role at render time ("What's new" for trainees).
  { label: "Change log",         labelKey: "nav.changelog",   href: "/changelog", icon: Bell },
];

// EMPLOYER PORTAL — visible only when role === "employer".
const employerItems: (NavItem & { labelKey: string })[] = [
  { label: "Overview",          labelKey: "nav.employerHome",       href: "/employer",            icon: Building2, exact: true },
  { label: "Company profile",   labelKey: "nav.employerProfile",    href: "/employer/profile",    icon: Building2 },
  { label: "My Postings",       labelKey: "nav.employerPostings",   href: "/employer/postings",   icon: FilePlus },
  { label: "Applicants",        labelKey: "nav.employerApplicants", href: "/employer/applicants", icon: Users2 },
];

// Admin menu, mirrored after the user-facing ENGAGE / EXPERIENCE
// vocabulary so the mental model stays consistent across roles.
//   Overview     — single link at the top of the section.
//   Engage       — learning-content + people management.
//   Experience   — employer side: invites, applicant flows, demos.
//   Platform     — analytics, audit, system, superadmin settings.
const adminOverview: NavItem = {
  label: "Overview", href: "/admin", icon: LayoutDashboard, exact: true, minRole: "admin",
};

// ENGAGE — running the learning loop: enrolments, groups, course
// content, certificates, credits. Labels prefixed with "Manage" so
// admins can tell them apart from the equivalent trainee-facing
// items at a glance — both in the sidebar and in nav-history.
const adminEngageItems: NavItem[] = [
  { label: "Manage enrollments",        href: "/admin/enrollments",         icon: ClipboardList, minRole: "admin" },
  { label: "Groups",                    href: "/admin/groups",              icon: UsersRound,   minRole: "admin" },
  { label: "Credit applications",       href: "/admin/credit-applications", icon: CoinsIcon,    minRole: "admin" },
  { label: "Manage pathway enrollments", href: "/admin/pathway-enrollments", icon: Layers,       minRole: "admin" },
  { label: "Course filters",            href: "/admin/course-filters",      icon: ListChecks,   minRole: "admin" },
  { label: "Manage certificates",       href: "/admin/certificates",        icon: Award,        minRole: "admin" },
];

// EXPERIENCE — the matching marketplace: skill ontology that wires
// trainees to employers, plus everything employer-facing.
const adminExperienceItems: NavItem[] = [
  { label: "Skill ontology",      href: "/admin/skills",              icon: GitBranch,    minRole: "admin" },
  { label: "Employer invites",    href: "/admin/employer-invites",    icon: Building2,    minRole: "admin" },
  { label: "Sandbox accounts",    href: "/admin/sandboxes",           icon: Beaker,       minRole: "admin" },
  { label: "Demo workspaces",     href: "/admin/demo-workspaces",     icon: FlaskConical, minRole: "admin" },
];

// PLATFORM — operating the platform itself: who has access, what
// they're told, what reports admins read, the Inbox/letter-box that
// gathers every pending request, plus superadmin-only ops.
const adminPlatformItems: NavItem[] = [
  { label: "Inbox",               href: "/admin/inbox",               icon: Inbox,       minRole: "admin" },
  { label: "Users",               href: "/admin/users",               icon: Users,       minRole: "admin" },
  { label: "Role requests",       href: "/admin/role-requests",       icon: UserCog,     minRole: "admin" },
  { label: "Announcements",       href: "/admin/announcements",       icon: Megaphone,   minRole: "admin" },
  { label: "Newsletter exports",  href: "/admin/newsletter",          icon: Mail,        minRole: "admin" },
  { label: "Analytics",           href: "/admin/analytics",           icon: LineChart,   minRole: "admin" },
  { label: "Reports",             href: "/admin/reports",             icon: FileText,    minRole: "admin" },
  { label: "Audit Log",           href: "/admin/audit",               icon: ShieldCheck, minRole: "admin" },
  { label: "Security",            href: "/admin/security",            icon: ShieldCheck, minRole: "admin" },
  { label: "LTI Config",          href: "/admin/lti",                 icon: Link2,       minRole: "superadmin" },
  { label: "System status",       href: "/admin/system-status",       icon: Activity,    minRole: "superadmin" },
  { label: "Settings",            href: "/admin/settings",            icon: Settings,    minRole: "superadmin" },
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

/** Section colour tokens — see SectionGroup's `tone` prop. Each tone
 *  uses a fixed Tailwind palette (NOT theme-driven brand vars) so the
 *  ENGAGE / EXPERIENCE / ADMINISTRATION blocks read with the same
 *  identity colour on every theme. */
type SectionTone = "neutral" | "engage" | "experience" | "electric";

interface ToneStyles {
  /** Outer container: border colour + faint wash + soft outer ring. */
  container: string;
  /** Title chip: bg + text + border + glow. */
  chip: string;
  /** Hover/focus colour bump for the chip. */
  hover: string;
}

// Section tone palettes — soft, same-family fills with darker text in
// the same family instead of saturated white-on-colour. Reads more
// like Notion / Linear / Stripe than a neon badge: less shouty, more
// refined ("柔和 + 高级感"), while still keeping ≥7:1 text contrast on
// the chip (AAA). Container border is the muted -200 of the same
// family so the section reads as one tonal block rather than three
// separate accents fighting each other.
const TONE_STYLES: Record<SectionTone, ToneStyles> = {
  neutral: {
    container: "border-line",
    chip:      "text-subtle bg-card-solid ring-1 ring-inset ring-line",
    hover:     "focus:text-fg group-hover/section:text-fg",
  },
  engage: {
    // Sage / jade — Engage = learn / practise / earn credits.
    container: "border-emerald-200/70 bg-emerald-50/25",
    chip:      "text-emerald-800 bg-emerald-100 ring-1 ring-inset ring-emerald-200/70 shadow-sm",
    hover:     "focus:bg-emerald-200 group-hover/section:bg-emerald-200 transition-colors",
  },
  experience: {
    // Muted gold — Experience = real-world / employer-facing surfaces.
    container: "border-amber-200/70 bg-amber-50/25",
    chip:      "text-amber-800 bg-amber-100 ring-1 ring-inset ring-amber-200/70 shadow-sm",
    hover:     "focus:bg-amber-200 group-hover/section:bg-amber-200 transition-colors",
  },
  electric: {
    // Soft sky — Administration. Still its own colour family so admin
    // reads as different from learner sections, but no longer shouts.
    container: "border-sky-200/70 bg-sky-50/25",
    chip:      "text-sky-800 bg-sky-100 ring-1 ring-inset ring-sky-200/70 shadow-sm",
    hover:     "focus:bg-sky-200 group-hover/section:bg-sky-200 transition-colors",
  },
};

function SectionGroup({
  title, description, programs, children, tone = "neutral",
}: {
  title: string;
  description?: string;
  programs?: ProgramHint[];
  children: React.ReactNode;
  /** Visual emphasis for the section. Each tone uses a fixed Tailwind
   * palette (NOT theme-driven brand vars) so the three sections stay
   * visually distinct across every theme — trainees navigating between
   * themes shouldn't lose their muscle memory of which color block
   * means which group of features.
   *   • engage     — emerald (learn / practise / earn)
   *   • experience — amber  (real-world / employer-facing)
   *   • electric   — sky    (administration / privileged territory)
   *   • neutral    — line color, no tint (default fallback)
   */
  tone?: "neutral" | "engage" | "experience" | "electric";
}) {
  const hasTooltip = !!description || (programs && programs.length > 0);
  const toneStyles = TONE_STYLES[tone];

  // Tooltip is positioned `fixed` (not `absolute`) so it escapes the
  // sidebar <nav>'s overflow-y-auto box, which would otherwise clip
  // anything that extends past the sidebar's right edge. We compute
  // the chip's screen-space coordinates on hover/focus and apply
  // `top` / `left` inline. Default position is off-screen so the
  // tooltip is never visible until a real position is computed.
  const chipRef = useRef<HTMLSpanElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  function placeTooltip() {
    if (!hasTooltip || !chipRef.current) return;
    const r = chipRef.current.getBoundingClientRect();
    setPos({ top: r.top, left: r.right });
  }

  // Keep the tooltip aligned if the user scrolls the sidebar (or page)
  // while it's visible. Listen on window with `capture` so we catch the
  // <nav>'s own scroll, then recompute against the chip's new rect.
  useEffect(() => {
    if (!pos) return;
    const onMove = () => placeTooltip();
    window.addEventListener("scroll", onMove, true);
    window.addEventListener("resize", onMove);
    return () => {
      window.removeEventListener("scroll", onMove, true);
      window.removeEventListener("resize", onMove);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pos !== null]);

  return (
    <div
      className={cn(
        "relative mt-5 mb-2 rounded-xl border p-1.5 pt-3 space-y-0.5",
        toneStyles.container,
      )}
    >
      {/* Title chip — wrapped in a tiny hover-group that opens a tooltip
          to the right when there's content to show. The transparent pl-2
          padding bridges the gap so the cursor can travel into the
          tooltip without losing hover.

          Border notch: the wrapping <div> intentionally has the page
          background colour so it visually breaks the container's 1px
          border line where the chip sits. `rounded-md` matches the
          chip's own corner radius so the page-colour halo around the
          chip doesn't show square corners (which used to read as a
          flat box behind the chip on themes with a gradient mesh
          background). The chip's opaque fill covers any subpixel
          bleed-through. */}
      <div
        className="group/section absolute -top-[11px] left-3 z-20 px-1.5 bg-page rounded-md"
        onMouseEnter={hasTooltip ? placeTooltip : undefined}
        onFocus={hasTooltip ? placeTooltip : undefined}
      >
        <span
          ref={chipRef}
          tabIndex={hasTooltip ? 0 : -1}
          className={cn(
            // text-xs (12px) reads more confidently than the prior
            // text-[10px] without dominating the sidebar — admins
            // asked for slightly bigger title font. font-semibold
            // (not bold) + tracking-[0.18em] dial down the assertive
            // shoutiness, which paired with the soft-fill palettes
            // gives a more "高级感" / Notion-Linear feel.
            "px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.18em] rounded-md inline-block",
            toneStyles.chip,
            hasTooltip && cn(
              "cursor-help focus:outline-none",
              toneStyles.hover,
            ),
          )}
          aria-describedby={hasTooltip ? `${title}-tooltip` : undefined}
        >
          {title}
        </span>
        {hasTooltip && (
          <div
            id={`${title}-tooltip`}
            role="tooltip"
            // position: fixed escapes the sidebar <nav>'s overflow box,
            // which previously clipped the tooltip past the sidebar's
            // right edge. Coordinates set inline via the chip's
            // getBoundingClientRect; default off-screen pre-hover.
            style={{
              position: "fixed",
              top: pos?.top ?? -9999,
              left: pos?.left ?? -9999,
            }}
            className="pl-3 w-72 z-50 invisible opacity-0 group-hover/section:visible group-hover/section:opacity-100 focus-within:visible focus-within:opacity-100 transition-opacity pointer-events-none group-hover/section:pointer-events-auto"
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

/**
 * Tiny subheading inside the Administration group. Same vocabulary
 * as the user-facing ENGAGE / EXPERIENCE pattern so admins map their
 * mental model to what learners see.
 */
function AdminSubheading({ label }: { label: string }) {
  return (
    <p className="px-3 pt-3 pb-1 text-[10px] uppercase tracking-[0.22em] font-semibold text-subtle select-none">
      {label}
    </p>
  );
}

function NavLink({ item, pathname, onNavigate }: {
  item: NavItem;
  pathname: string;
  /** Optional callback fired on click — used by the mobile off-canvas
   *  variant to close the sheet after the user navigates. */
  onNavigate?: () => void;
}) {
  const active = item.exact
    ? pathname === item.href
    : pathname === item.href || pathname.startsWith(item.href + "/");
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
        // focus-visible adds an explicit ring for keyboard users; the
        // ring is brand-tinted and offset so it floats just outside
        // the rounded link box, looking deliberate rather than tacked-on.
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/60 focus-visible:ring-offset-1 focus-visible:ring-offset-card",
        active
          ? "bg-brand-50 text-brand-700"
          : "text-muted hover:bg-raised hover:text-fg",
      )}
    >
      {/* Theme-independent active accent — a 2px left edge in brand-600.
          Gives the active state a strong visual anchor even when the
          theme's brand-50 fill blends with the page background (Mist,
          Sakura) or shouts louder than expected (Hi-Tech). */}
      {active && (
        <span
          aria-hidden
          className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full bg-brand-600"
        />
      )}
      <Icon size={16} className="shrink-0" />
      <span className="flex-1">{item.label}</span>
      {active && <ChevronRight size={14} className="text-brand-400 shrink-0" />}
    </Link>
  );
}

export function Sidebar({
  role, realRole, actingAs, user, credits, allowPlatformContent = false,
}: SidebarProps) {
  const pathname = usePathname();
  const t = useT();
  // Effective role for visibility gating. When a superadmin is acting
  // as another role via RoleSwitcher (`actingAs`), the sidebar should
  // only show what the acted-as role can see — otherwise "act as
  // trainee" still surfaces all the admin links and the simulation is
  // meaningless. ImpersonationBanner stays visible so the user knows
  // they can switch back.
  const effectiveRole = actingAs ?? role;
  const userRank = ROLE_RANK[effectiveRole] ?? 0;
  const isAdmin = userRank >= ROLE_RANK["admin"];
  const isStaff = userRank >= ROLE_RANK["instructor"];
  const isEmployer = effectiveRole === "employer";
  // Employer accounts only see ENGAGE / EXPERIENCE / Buddies if an
  // admin has flipped allowPlatformContent on for them.
  const showLearnerNav = !isEmployer || allowPlatformContent;

  // Mobile off-canvas drawer. The shell renders on every viewport;
  // <md the desktop shell collapses behind a hamburger. State lives
  // here rather than in the parent layout so the rest of the page
  // doesn't need to know about the toggle.
  const [mobileOpen, setMobileOpen] = useState(false);
  // Close drawer on route change so the next page isn't covered.
  useEffect(() => { setMobileOpen(false); }, [pathname]);
  // Body scroll-lock while the drawer is open.
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);
  // Esc to close.
  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setMobileOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileOpen]);

  // Persisted collapse state for the admin Platform sub-group. Long
  // (12 items), low-frequency: collapsed by default to take pressure
  // off the admin's vertical scroll.
  const [platformOpen, setPlatformOpen] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const v = localStorage.getItem("bhn-sidebar-platform-open");
    if (v != null) setPlatformOpen(v === "1");
  }, []);
  function togglePlatform() {
    setPlatformOpen((cur) => {
      const next = !cur;
      try { localStorage.setItem("bhn-sidebar-platform-open", next ? "1" : "0"); } catch {}
      return next;
    });
  }

  const filterByRole = (item: NavItem) => {
    const required = ROLE_RANK[item.minRole ?? "admin"] ?? ROLE_RANK.admin;
    return userRank >= required;
  };
  const visibleEngageAdmin     = adminEngageItems.filter(filterByRole);
  const visibleExperienceAdmin = adminExperienceItems.filter(filterByRole);
  const visiblePlatformAdmin   = adminPlatformItems.filter(filterByRole);

  return (
    <>
      {/* Mobile hamburger — fixed to the top-left of the viewport when
          the off-canvas drawer is closed. <md only; desktop shell
          (<aside> below) is hidden under md. The button itself sits at
          z-50 so it floats above page content. */}
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        aria-label="Open menu"
        aria-expanded={mobileOpen}
        className="md:hidden fixed top-3 left-3 z-50 inline-flex items-center justify-center w-10 h-10 rounded-xl bg-card border border-line shadow-md text-fg hover:bg-elevated"
      >
        <Menu size={18} />
      </button>

      {/* Backdrop for mobile drawer. Pointer-events disabled when
          closed so it doesn't intercept clicks. */}
      <div
        onClick={() => setMobileOpen(false)}
        aria-hidden
        className={cn(
          "md:hidden fixed inset-0 z-40 bg-backdrop transition-opacity",
          mobileOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
        )}
      />

      <aside
        role="navigation"
        aria-label="Main navigation"
        className={cn(
          // Desktop: static, w-64. Mobile: fixed-position drawer that
          // slides in from the left. The same DOM serves both — no
          // duplicated nav lists to keep in sync.
          "glass border-r border-line flex flex-col z-50",
          "md:relative md:w-64 md:translate-x-0",
          "fixed top-0 bottom-0 left-0 w-72 max-w-[85vw] transition-transform duration-200 ease-out",
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        )}
      >
        {/* Mobile-only close button inside the drawer header. */}
        <button
          type="button"
          onClick={() => setMobileOpen(false)}
          aria-label="Close menu"
          className="md:hidden absolute top-3 right-3 z-10 inline-flex items-center justify-center w-9 h-9 rounded-xl text-muted hover:bg-elevated hover:text-fg"
        >
          <X size={16} />
        </button>

        {/* Logo */}
        <Link href="/dashboard" className="px-6 py-5 border-b border-line block hover:bg-elevated/50 transition-colors">
          <div className="flex items-center gap-3">
            <LogoMark size={36} className="drop-shadow-sm" />
            <div className="leading-tight">
              <p className="font-bold text-fg text-sm">BHN <span className="text-brand-600 font-semibold">Training</span></p>
              <p className="text-[10px] uppercase tracking-[0.18em] text-subtle mt-0.5">{effectiveRole}</p>
            </div>
          </div>
        </Link>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <NavLink item={{ ...dashboardItem, label: t(dashboardItem.labelKey) }} pathname={pathname} onNavigate={() => setMobileOpen(false)} />

        {isEmployer && (
          <SectionGroup
            title="EMPLOYER PORTAL"
            description="Hiring side: company profile, postings you've published, and the candidates who applied."
          >
            {employerItems.map((item) => (
              <NavLink key={item.href} item={{ ...item, label: t(item.labelKey) }} pathname={pathname} onNavigate={() => setMobileOpen(false)} />
            ))}
          </SectionGroup>
        )}

        {showLearnerNav && (
          <SectionGroup
            title="ENGAGE"
            tone="engage"
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
              return <NavLink key={item.href} item={labeled} pathname={pathname} onNavigate={() => setMobileOpen(false)} />;
            })}
          </SectionGroup>
        )}

        {showLearnerNav && experienceItems.length > 0 && (
          <SectionGroup
            title="EXPERIENCE"
            tone="experience"
            description="Bridging theory and practice through experiential learning."
            programs={[
              {
                title: "My Application",
                body: "Resume, 1-minute video, and elevator pitch — built once, reused by every form you submit.",
              },
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
              return <NavLink key={item.href} item={labeled} pathname={pathname} onNavigate={() => setMobileOpen(false)} />;
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
              return <NavLink key={item.href} item={labeled} pathname={pathname} onNavigate={() => setMobileOpen(false)} />;
            })}
          </>
        )}

        {isAdmin && (
          <SectionGroup
            title={t("nav.administration").toUpperCase()}
            tone="electric"
            description="Privileged territory — manage learners, employers, and the platform itself. Sub-grouped into Engage / Experience / Platform so the long list stays scannable."
          >
            {/* Overview sits at the top, ungrouped — single canonical link. */}
            <NavLink item={adminOverview} pathname={pathname} onNavigate={() => setMobileOpen(false)} />

            {visibleEngageAdmin.length > 0 && (
              <>
                <AdminSubheading label="Engage" />
                {visibleEngageAdmin.map((item) => (
                  <NavLink key={item.href} item={item} pathname={pathname} onNavigate={() => setMobileOpen(false)} />
                ))}
              </>
            )}

            {visibleExperienceAdmin.length > 0 && (
              <>
                <AdminSubheading label="Experience" />
                {visibleExperienceAdmin.map((item) => (
                  <NavLink key={item.href} item={item} pathname={pathname} onNavigate={() => setMobileOpen(false)} />
                ))}
              </>
            )}

            {visiblePlatformAdmin.length > 0 && (
              <>
                {/* Platform sub-group is collapsible — it's 12 items
                    deep and dominated by occasional-use admin tools
                    (LTI, Newsletter, etc.). Default closed; open
                    state persisted to localStorage so an admin who
                    expands it once doesn't have to expand every
                    time they reload. */}
                <button
                  type="button"
                  onClick={togglePlatform}
                  aria-expanded={platformOpen}
                  className="w-full flex items-center justify-between px-3 pt-3 pb-1 text-[10px] uppercase tracking-[0.22em] font-semibold text-subtle hover:text-fg transition-colors"
                >
                  <span>Platform</span>
                  <ChevronRight
                    size={11}
                    className={cn("transition-transform", platformOpen && "rotate-90")}
                  />
                </button>
                {platformOpen && visiblePlatformAdmin.map((item) => (
                  <NavLink key={item.href} item={item} pathname={pathname} onNavigate={() => setMobileOpen(false)} />
                ))}
              </>
            )}
          </SectionGroup>
        )}
      </nav>

      {/*
       * Compact footer stack. Each block is a thin row instead of the
       * earlier card-with-padding layout — saves ~140 px of vertical
       * space on a typical sidebar without losing any control.
       *
       *   • Credits chip — single inline pill, no surrounding card.
       *   • Role switcher — same height as a nav link.
       *   • Take the tour + Theme picker share one row to halve the
       *     vertical footprint of "help / personalisation".
       *   • Build SHA folds into the user pill's right edge for staff,
       *     so it doesn't take its own row.
       *   • User block: avatar-sized pill (32 px) + sign-out icon
       *     button on the same row, no double-stacked layout.
       */}

      {/* Credits chip */}
      {!isStaff && credits !== undefined && (
        <div className="px-3 py-1.5 border-t border-line">
          <div className="flex items-center gap-1.5 bg-amber-50 rounded-md px-2 py-1">
            <Coins size={11} className="text-amber-500 shrink-0" />
            <p className="text-[11px] text-amber-700 font-semibold leading-none">
              {credits.toLocaleString()} BHN Credits
            </p>
          </div>
        </div>
      )}

      {/* Superadmin-only role switcher — single thin row */}
      {realRole === "superadmin" && (
        <div className="px-3 py-1.5 border-t border-line">
          <RoleSwitcher actingAs={actingAs ?? null} />
        </div>
      )}

      {/* Take-the-tour + Theme picker + Build SHA share one compact row.
          Tour icon is Compass (orientation / guided exploration) rather
          than the generic ?-help glyph it used to be. Build SHA folds
          in here — staff-only — so the user pill row below stays a
          clean two-line identity card without the chip eating space. */}
      <div className="px-2 py-1 border-t border-line flex items-center gap-1">
        <button
          type="button"
          onClick={() => {
            if (typeof window !== "undefined") {
              window.dispatchEvent(new CustomEvent("bhn:start-tour"));
            }
          }}
          className="flex-1 min-w-0 flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium text-muted hover:bg-raised hover:text-fg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/60"
          title={t("nav.tour")}
        >
          <Compass size={13} className="shrink-0" />
          <span className="truncate">{t("nav.tour")}</span>
        </button>
        <ThemePicker compact />
        {isStaff && process.env.NEXT_PUBLIC_COMMIT_SHA && (
          <code
            className="font-mono text-[11px] font-semibold text-brand-700 bg-brand-50 ring-1 ring-inset ring-brand-200 px-1.5 py-1 rounded select-all leading-none shrink-0"
            title={`Build ${process.env.NEXT_PUBLIC_COMMIT_SHA}`}
          >
            {process.env.NEXT_PUBLIC_COMMIT_SHA}
          </code>
        )}
      </div>

      {/* User pill — single 36 px row with sign-out as an icon button. */}
      <div className="px-2 py-2 border-t border-line flex items-center gap-1">
        <Link
          href="/profile"
          className="flex-1 min-w-0 flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-elevated transition-colors group"
        >
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-white flex items-center justify-center text-xs font-bold shadow-sm shrink-0">
            {user.name?.[0]?.toUpperCase() ?? user.email?.[0]?.toUpperCase() ?? "?"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-fg truncate leading-tight">
              {user.name ?? "User"}
            </p>
            <p className="text-[10px] text-subtle truncate group-hover:text-muted leading-tight">
              {user.email}
            </p>
          </div>
        </Link>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="p-1.5 rounded-lg text-muted hover:bg-elevated hover:text-fg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/60"
          title={t("nav.signOut")}
          aria-label={t("nav.signOut")}
        >
          <LogOut size={14} />
        </button>
      </div>
    </aside>
    </>
  );
}
