"use client";
import { useRef, useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSignOut } from "@/lib/auth/authProvider";
import { cn } from "@/lib/utils";
import { ThemePicker } from "@/components/ui/ThemePicker";
import { useT } from "@/lib/i18n/I18nProvider";
import {
  LayoutDashboard,
  BookOpen,
  Award,
  Users,
  LogOut,
  ChevronDown,
  Coins,
  Layers,
  Briefcase,
  Activity,
  HelpCircle,
  Menu,
  X,
  Network,
} from "lucide-react";
import { NotificationBell } from "@/components/ui/NotificationInbox";

/** A learner-menu entry. `href: null` = no destination yet: it renders as
 *  a "Soon" row instead of a link. Give it an href to make it a link. */
type LearnerItem = Omit<NavItem, "href"> & { href: string | null; labelKey: string };

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  minRole?: "instructor" | "admin" | "superadmin";
  exact?: boolean;
  /** Stable id that maps this item to a row in the preferences
   *  switchboard (src/lib/preferences/registry.ts). When set, the
   *  Sidebar filters the item out if the viewing user has it hidden
   *  in their featurePrefs. Items without a featureId aren't
   *  user-hideable (e.g. the dashboard always shows). */
  featureId?: string;
  /** One-or-two-sentence "what does this do" surfaced as a hover/focus
   *  popover next to the link. Kept English-only for now; if we localize
   *  later, swap for descriptionKey + dictionary entry. */
  description?: string;
  /** Optional queue-badge key. When the parent passes a queueCounts
   *  map (admin sidebar only), the matching count is rendered as a
   *  small chip to the right of the label. Absent / 0 → no badge.
   *  Keep in sync with the QueueBadgeKey union in
   *  src/lib/admin/queue-counts.ts. */
  badgeKey?: string;
}

// Always-visible top item. Dashboard intentionally has no featureId
// because hiding it leaves a user with nowhere to land — keep it
// unhideable; the switchboard registry references "learn-dashboard"
// but the toggle is informational only.
const dashboardItem: NavItem & { labelKey: string } = {
  label: "Dashboard", labelKey: "nav.dashboard", href: "/dashboard", icon: LayoutDashboard, exact: true,
  featureId: "learn-dashboard",
  description: "Home base. What's in progress, your credit balance, and quick links into the catalog and pathways.",
};

// ENGAGE, in staging's order (decided at the 3 Nov 2026 meeting): Learning
// Pathways first, then Program Details, with My Credits right under it.
const engageItems: (NavItem & { labelKey: string })[] = [
  { label: "Learning Pathways",  labelKey: "nav.pathways",    href: "/pathways", icon: Layers,
    featureId: "learn-pathways",
    description: "Multi-course learning journeys with a single certificate at the end. Some are open; gated ones need admin approval." },
  { label: "Program Details & FAQ", labelKey: "nav.engageGuide", href: "/engage", icon: HelpCircle,
    featureId: "engage-faq",
    description: "How training, credits and enrolment work: access, on-demand courses, pathways, the credit-expiry policy, applying for more credits, and leaving the programme." },
  { label: "My Credits",         labelKey: "nav.credits",     href: "/credits", icon: Coins,
    featureId: "learn-credits",
    description: "Balance plus a log of every grant and spend. Apply for additional credits here." },
  { label: "On-Demand Courses",  labelKey: "nav.catalog",     href: "/courses", icon: BookOpen,
    featureId: "learn-courses",
    description: "Every published course, grouped by topic. Natural-language search ranks results by what each course actually covers, not just keyword matches." },
  { label: "My Courses",         labelKey: "nav.myCourses",       href: "/progress", icon: Activity,
    featureId: "learn-progress",
    description: "Every course you're enrolled in — resume where you left off — the pathways you're on, what you've completed, and the courses you saved. Completed courses export as a PDF." },
  { label: "Certificates",       labelKey: "nav.certificates",href: "/certificates", icon: Award,
    featureId: "learn-certificates",
    description: "Every credential you've earned. Each has a public verify link to share with employers." },
];



// MY PROFILE section retired from the sidebar — it carried a single
// link to /profile that duplicated the avatar at the bottom-left of
// the sidebar (which already opens the same page). One affordance
// per surface keeps the nav scannable. The /profile route is
// unaffected; reach it via the avatar.

// EXPERIENCE — applications and connections to industry placements.
// Renamed (8 May 2026) from "My Application" / "My Applications" to
// "Application Builder" / "Application Tracker" — the s/no-s
// distinction next to each other was demonstrably confusing. Routes
// kept the same so deep links stay alive.
// 1:1 MENTORSHIP — a sustained pairing, distinct from the fifteen-minute
// advisor booking that lives on /pathways. Mirrors the group the current
// platform carries beside ENGAGE.
const mentorshipItems: LearnerItem[] = [
  { label: "Program Details & FAQ", labelKey: "nav.mentorshipFaq", href: "/mentorship", icon: Users,
    featureId: "mentorship-faq",
    description: "How mentor pairing works, what to expect, and how it differs from booking an advisor." },
  // No destination yet — set href to link it.
  { label: "Networking", labelKey: "nav.networking", href: null, icon: Network },
];

const experienceItems: LearnerItem[] = [
  // No destination yet — set href to link it.
  { label: "Industry Internship", labelKey: "nav.industryInternship", href: null, icon: Briefcase },
];

/** Nav badgeKeys that should flip to the urgent rose chip the moment
 *  there's ≥1 pending — used for trainee-facing "someone's waiting on
 *  you" items where even one item shouldn't sit quietly in a brand-
 *  tone informational chip. */
const URGENT_FROM_ONE = new Set<string>([
  "interview-requests",
  "offer-requests",
  "buddy-invites",
  "employer-intake-new",
]);

interface SidebarProps {
  user: { name?: string | null; email?: string | null; image?: string | null };
  credits?: number;
  /** Per-queue pending counts. Admin-side nav items with a matching
   *  `badgeKey` render a small count chip. Absent / 0 → no badge.
   *  See src/lib/admin/queue-counts.ts for the canonical key set. */
  queueCounts?: Record<string, number>;
  /** Set of featureIds the viewing user has hidden via the
   *  /profile/preferences switchboard. Items in this set are filtered
   *  out of the sidebar before render. */
  hiddenFeatures?: Set<string>;
  /** Unread notification count — rendered as a badge on the bell icon
   *  in the logo header. Only meaningful for signed-in users with
   *  employer/hiring-team activity. */
  initialUnreadCount?: number;
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
type SectionTone = "neutral" | "engage" | "experience" | "equip" | "electric" | "hr-preview";

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
    hover:     "focus:text-fg hover:text-fg",
  },
  engage: {
    // Sage / jade — Engage = learn / practise / earn credits.
    container: "border-emerald-200/70 bg-emerald-50/25",
    chip:      "text-emerald-800 bg-emerald-100 ring-1 ring-inset ring-emerald-200/70 shadow-sm",
    hover:     "focus:bg-emerald-200 hover:bg-emerald-200 transition-colors",
  },
  experience: {
    // Muted gold — Experience = real-world / employer-facing surfaces.
    container: "border-amber-200/70 bg-amber-50/25",
    chip:      "text-amber-800 bg-amber-100 ring-1 ring-inset ring-amber-200/70 shadow-sm",
    hover:     "focus:bg-amber-200 hover:bg-amber-200 transition-colors",
  },
  equip: {
    // Rose / berry — Equip = commercialization funding. Sits as the
    // third pillar alongside Engage (emerald) and Experience (amber),
    // with a warmer, slightly aspirational hue that reads "funding
    // for what comes next" without competing for attention.
    container: "border-rose-200/70 bg-rose-50/25",
    chip:      "text-rose-800 bg-rose-100 ring-1 ring-inset ring-rose-200/70 shadow-sm",
    hover:     "focus:bg-rose-200 hover:bg-rose-200 transition-colors",
  },
  electric: {
    // Soft sky — Administration. Tinted just-enough-stronger than the
    // ENGAGE / EXPERIENCE sections so the privileged territory reads
    // more obviously as "you're now in admin land" without losing the
    // clean palette.
    container: "border-sky-300 bg-sky-100/60 ring-1 ring-inset ring-sky-200/60",
    chip:      "text-sky-900 bg-sky-200 ring-1 ring-inset ring-sky-300 shadow-sm",
    hover:     "focus:bg-sky-300 hover:bg-sky-300 transition-colors",
  },
  "hr-preview": {
    // Violet — superadmin "preview the HR seat" peek. Distinctively
    // brighter than the surrounding sections so the operator can spot
    // it instantly even when scanning a packed sidebar. Pairs with
    // the violet-tinted explainer + eye glyph the preview row uses.
    // eslint-disable-next-line no-restricted-syntax -- violet-specific halo for the role-preview ENGAGE container; designed to stay violet across all themes.
    container: "border-violet-300 bg-violet-100/55 ring-1 ring-inset ring-violet-200/70 shadow-[0_2px_12px_-6px_rgba(124,58,237,0.35)]",
    chip:      "text-violet-900 bg-violet-200 ring-1 ring-inset ring-violet-400 shadow-sm",
    hover:     "focus:bg-violet-300 hover:bg-violet-300 transition-colors",
  },
};

/** Per-section collapsed state, persisted in localStorage so the
 *  user's choice survives navigation + reloads. Keyed by section
 *  title — titles are stable for the lifetime of the section. */
const COLLAPSE_STORAGE_KEY = "bhn.sidebar.collapsed.v1";

function readCollapsed(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(COLLAPSE_STORAGE_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) return new Set();
    return new Set(arr.filter((s): s is string => typeof s === "string"));
  } catch { return new Set(); }
}
function writeCollapsed(s: Set<string>) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(COLLAPSE_STORAGE_KEY, JSON.stringify([...s]));
    // Notify other SectionGroup instances on the same page so a
    // click in one collapses just that one without forcing the
    // others to re-read. Minor — they each own their own state.
  } catch { /* quota / private-mode — silent, the collapse still works in-memory */ }
}

function SectionGroup({
  title, description, programs, children, tone = "neutral",
}: {
  title: string;
  description?: string;
  programs?: ProgramHint[];
  children: React.ReactNode;
  /** Visual emphasis for the section. Each tone uses a fixed Tailwind
   * palette (NOT theme-driven brand vars) so the sections stay
   * visually distinct across every theme — trainees navigating between
   * themes shouldn't lose their muscle memory of which color block
   * means which group of features.
   *   • engage     — emerald (learn / practise / earn)
   *   • experience — amber  (real-world / employer-facing)
   *   • electric   — sky    (administration / privileged territory)
   *   • hr-preview — violet (superadmin peek into the HR seat)
   *   • neutral    — line color, no tint (default fallback)
   */
  tone?: SectionTone;
}) {
  const hasTooltip = !!description || (programs && programs.length > 0);
  const toneStyles = TONE_STYLES[tone];

  // Collapse state — persisted in localStorage keyed by title.
  // Initialise via lazy initial to avoid hydration mismatch (SSR
  // can't read localStorage; the first client render syncs).
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    setCollapsed(readCollapsed().has(title));
  }, [title]);
  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      const all = readCollapsed();
      if (next) all.add(title); else all.delete(title);
      writeCollapsed(all);
      return next;
    });
  }

  // Tooltip is positioned `fixed` (not `absolute`) so it escapes the
  // sidebar <nav>'s overflow-y-auto box, which would otherwise clip
  // anything that extends past the sidebar's right edge. We compute
  // the chip's screen-space coordinates on hover/focus and apply
  // `top` / `left` inline. Default position is off-screen so the
  // tooltip is never visible until a real position is computed.
  const chipRef = useRef<HTMLButtonElement>(null);
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
      // data-section-tone on the container too — paired with the
      // matching attribute on the chip, this lets dark themes
      // (Hi-tech, Nightfall) dim or re-tint the section wash
      // without touching Tailwind class lookups. See
      // [data-theme="hitech"] [data-section-tone="X"] rules in
      // globals.css.
      data-section-tone={tone}
      className={cn(
        "relative rounded-sm transition-[padding,border-color,background-color] duration-300 ease-out",
        // Two-mode layout:
        //   • EXPANDED — full bordered/painted container with the chip
        //     absolutely positioned to overlap the top border on the
        //     seam (the editorial "tab on a box" look). Tight margins.
        //   • COLLAPSED — chip renders IN FLOW inside the container
        //     (the absolute -top-[10px] overlap trick has nothing to
        //     overlap when there's no border, and made consecutive
        //     collapsed chips overlap each other by ~4 px because
        //     the chip extends 10 px above its container and the
        //     20-px margin-collapse between sections wasn't enough
        //     clearance for the chip's ~24-px height). Wider vertical
        //     margins (mt-3/mb-3) give the floating chips clear breathing
        //     room as the section is just a chip.
        collapsed
          ? "mt-3 mb-3 p-0 border border-transparent bg-transparent"
          : cn("mt-5 mb-2 border p-1.5 pt-3 space-y-0.5", toneStyles.container),
      )}
    >
      {/* Title chip — wrapped in a tiny hover-group that opens a tooltip
          to the right when there's content to show. The transparent pl-2
          padding bridges the gap so the cursor can travel into the
          tooltip without losing hover.

          Positioning differs by state:
            • EXPANDED → `absolute -top-[10px] left-5` so the chip
              overlaps the container's top border (the "tab on a box"
              editorial look). The chip's own opaque fill covers the
              border behind it.
            • COLLAPSED → `relative ml-5` so the chip flows normally
              inside the container, with proper vertical spacing
              against neighbouring collapsed sections. Without this
              flow positioning, the chip extends 10 px above its
              container and consecutive collapsed chips overlap. */}
      <div
        className={cn(
          "group/section z-20 px-1.5",
          collapsed
            ? "relative flex pl-5"
            : "absolute -top-[10px] left-5",
        )}
        onMouseEnter={hasTooltip ? placeTooltip : undefined}
        onFocus={hasTooltip ? placeTooltip : undefined}
      >
        {/* Unified chip + collapse toggle — one element does both.
            Clicking collapses/expands the section; the ChevronDown on
            the RIGHT gives the standard expand/collapse affordance
            without a separate floating button to the left. Tooltip
            still fires via the group/section wrapper above. */}
        <button
          ref={chipRef}
          type="button"
          onClick={toggleCollapsed}
          aria-label={collapsed ? `Expand ${title}` : `Collapse ${title}`}
          aria-expanded={!collapsed}
          // data-section-tone exposes the tone to CSS so dark themes
          // (Hi-tech, Nightfall) can override chip bg/text/ring without
          // rewriting the Tailwind classes. See globals.css.
          data-section-tone={tone}
          className={cn(
            "px-2.5 py-1 text-xs font-medium uppercase tracking-[0.18em] rounded-md inline-flex items-center gap-1.5",
            toneStyles.chip,
            "cursor-pointer focus:outline-none",
            toneStyles.hover,
          )}
          aria-describedby={hasTooltip ? `${title}-tooltip` : undefined}
        >
          {title}
          <ChevronDown
            size={10}
            aria-hidden
            className={cn(
              "transition-transform duration-300 ease-out opacity-50",
              collapsed && "-rotate-90",
            )}
          />
        </button>
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
      {/* Collapse animation — the grid-rows trick.
       *
       *   • Wrapper is a 1-row grid. Its row size animates from
       *     `1fr` (expanded — sized to content) to `0fr` (collapsed
       *     — zero height) over the same duration as the chevron's
       *     rotation. Browsers interpolate grid-template-rows
       *     smoothly, so the children shrink in lockstep with the
       *     rotating glyph.
       *
       *   • The inner child has `overflow: hidden` + `min-h-0` so
       *     content gets clipped during the animation. Without
       *     min-h-0, a grid item can refuse to shrink below its
       *     content height and the animation skips.
       *
       *   • Opacity fades alongside so the last 60ms isn't an
       *     awkward "blink-out at 0 height". The combined feel is a
       *     soft accordion close that matches the rest of the
       *     platform's transitions (300ms, ease-out).
       *
       *   • `inert` + `aria-hidden` when collapsed so screen readers
       *     skip the hidden links and keyboard tab order doesn't
       *     land inside an invisible region. */}
      <div
        className={cn(
          "grid transition-[grid-template-rows,opacity] duration-300 ease-out",
          collapsed ? "grid-rows-[0fr] opacity-0" : "grid-rows-[1fr] opacity-100",
        )}
        aria-hidden={collapsed}
        {...(collapsed ? { inert: "" as unknown as boolean } : {})}
      >
        <div className="overflow-hidden min-h-0">{children}</div>
      </div>
    </div>
  );
}

/** A menu entry with no destination yet: shaped like a nav row but plain
 *  text with a "Coming soon" caption, so it can never be clicked into a
 *  404. The caption sits under the label, not beside it: beside it, a
 *  tag left "Industry Internship" 104px of the sidebar's width and cut
 *  it to "Industry Interns…". */
function PendingNavItem({ label, soon, icon: Icon }: { label: string; soon: string; icon: React.ElementType }) {
  return (
    <div data-nav-pending className="flex items-center gap-3 px-3 py-2 rounded text-sm font-medium text-muted cursor-default">
      <Icon size={16} className="shrink-0" />
      <span className="flex-1 min-w-0">
        <span className="block truncate">{label}</span>
        <span className="block text-[11px] font-normal leading-tight">{soon}</span>
      </span>
    </div>
  );
}

function NavLink({ item, pathname, onNavigate, queueCounts }: {
  item: NavItem;
  pathname: string;
  /** Optional callback fired on click — used by the mobile off-canvas
   *  variant to close the sheet after the user navigates. */
  onNavigate?: () => void;
  /** Per-queue pending counts. When `item.badgeKey` matches a key in
   *  this map and the count is > 0, a small chip renders to the right
   *  of the label. New "queue badge" design-system pattern (May 2026)
   *  — see docs/design-system.md and src/lib/admin/queue-counts.ts. */
  queueCounts?: Record<string, number>;
}) {
  const active = item.exact
    ? pathname === item.href
    : pathname === item.href || pathname.startsWith(item.href + "/");
  const Icon = item.icon;
  const hasTooltip = !!item.description;
  const badgeCount = item.badgeKey && queueCounts ? (queueCounts[item.badgeKey] ?? 0) : 0;
  const badgeText = badgeCount === 0 ? null : badgeCount > 99 ? "99+" : String(badgeCount);

  // Hover/focus tooltip plumbing. We use position: fixed so the
  // popover escapes the sidebar <nav>'s overflow-y-auto box (which
  // would otherwise clip anything past the right edge), and we
  // recompute the link's screen-space rect on scroll/resize while
  // the tooltip is visible. Hover has a 1.2 s warm-up — long enough
  // that the tooltip doesn't fire when the cursor merely passes
  // through, but short enough to feel responsive when someone
  // actually stops on a row. Keyboard focus is still instant
  // (assistive-tech users actively chose to land here).
  const linkRef = useRef<HTMLAnchorElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const showTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function place() {
    if (!linkRef.current) return;
    const r = linkRef.current.getBoundingClientRect();
    setPos({ top: r.top, left: r.right });
  }
  function showSoon() {
    if (!hasTooltip) return;
    if (showTimer.current) clearTimeout(showTimer.current);
    showTimer.current = setTimeout(place, 1200);
  }
  function showNow() {
    if (!hasTooltip) return;
    if (showTimer.current) clearTimeout(showTimer.current);
    place();
  }
  function hide() {
    if (showTimer.current) clearTimeout(showTimer.current);
    showTimer.current = null;
    setPos(null);
  }
  // Cleanup pending timer on unmount.
  useEffect(() => () => { if (showTimer.current) clearTimeout(showTimer.current); }, []);
  // Reposition while visible — sidebar may scroll independently of the page.
  useEffect(() => {
    if (!pos) return;
    const onMove = () => place();
    window.addEventListener("scroll", onMove, true);
    window.addEventListener("resize", onMove);
    return () => {
      window.removeEventListener("scroll", onMove, true);
      window.removeEventListener("resize", onMove);
    };
  }, [pos !== null]);

  // Route-change cleanup. Without this, the classic "stuck tooltip"
  // bug fires: click a link → Next.js client-navigates with no
  // movement of the cursor → new page renders under the stationary
  // pointer → browser never emits a mouseleave because no movement
  // occurred → state stays set → tooltip lingers. Forcing hide() on
  // every pathname change makes it impossible for a tooltip to
  // survive a navigation.
  useEffect(() => {
    hide();
    // hide() is stable enough for this — the next render uses the
    // closed-over instance and we don't want a re-attach loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // External-highlight listener — guide pages dispatch
  // `bhn:nav-highlight` events with an href payload when the reader
  // hovers a nav mention. The matching nav row lights up so the
  // reader can find the corresponding control in the menu without
  // hunting. Empty href clears the highlight.
  const [externalHighlight, setExternalHighlight] = useState(false);
  useEffect(() => {
    function onHl(e: Event) {
      const detail = (e as CustomEvent<{ href: string | null }>).detail;
      setExternalHighlight(detail?.href === item.href);
    }
    window.addEventListener("bhn:nav-highlight", onHl as EventListener);
    return () => window.removeEventListener("bhn:nav-highlight", onHl as EventListener);
  }, [item.href]);

  const tooltipId = `navtip-${item.href.replace(/[^a-z0-9]/gi, "_")}`;
  // Stable data-attribute selector for the NavHighlightOverlay so a
  // guide-page pill can locate "the sidebar copy of this href" even
  // when the same href appears elsewhere on the page (e.g. inside a
  // <NavHighlight> pill that the user is hovering).
  const navDataAttr = item.href;

  return (
    <>
      <Link
        ref={linkRef}
        href={item.href}
        data-sidebar-nav-href={navDataAttr}
        onClick={() => { hide(); onNavigate?.(); }}
        onMouseEnter={showSoon}
        onMouseLeave={hide}
        // pointerleave is the modern pointer-events equivalent; some
        // hybrid (mouse-plus-touch) browsers fire one but not the
        // other, so we listen for both as a belt-and-suspenders.
        onPointerLeave={hide}
        onFocus={showNow}
        onBlur={hide}
        aria-current={active ? "page" : undefined}
        aria-describedby={hasTooltip ? tooltipId : undefined}
        className={cn(
          "relative flex items-center gap-3 px-3 py-2 rounded text-sm font-medium transition-colors",
          // focus-visible adds an explicit ring for keyboard users; the
          // ring is brand-tinted and offset so it floats just outside
          // the rounded link box, looking deliberate rather than tacked-on.
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/60 focus-visible:ring-offset-1 focus-visible:ring-offset-card",
          active
            ? "bg-brand-50 text-brand-700"
            : "text-muted hover:bg-raised hover:text-fg",
          // External highlight — when a guide-page NavHighlight pill
          // is hovered, the matching nav row lights up with a brand
          // ring + amber-ish flash so the reader can locate the
          // mentioned control at a glance.
          externalHighlight && "ring-2 ring-amber-400 bg-amber-50 text-amber-900 shadow-amber-pulse animate-pulse",
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
        <span className="flex-1 truncate">{item.label}</span>
        {/* Queue badge — only renders when the nav item has a
            badgeKey AND its count is > 0. We never render "0" because
            the absence of a chip already means "nothing pending".
            Tone scales with severity:
              • urgent-from-one keys (interview / offer / buddy
                invites — trainee-side, time-sensitive) → rose chip
                with a soft pulse on every count ≥ 1.
              • everything else → brand fill ≤ 5, rose ≥ 6
                (the original admin-queue threshold).
            Capped at 99+ for visual stability. */}
        {badgeText && (() => {
          const urgentFromOne = item.badgeKey ? URGENT_FROM_ONE.has(item.badgeKey) : false;
          const isUrgent = urgentFromOne || badgeCount >= 6;
          return (
            <span
              className={cn(
                "shrink-0 inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full text-[10px] font-bold tabular-nums",
                isUrgent
                  ? "bg-rose-600 text-white animate-nav-badge-pulse"
                  : "bg-brand-100 text-brand-800 ring-1 ring-inset ring-brand-200",
              )}
              aria-label={`${badgeCount} pending`}
            >
              {badgeText}
            </span>
          );
        })()}
        {/* No trailing chevron on the active item. It was the fourth
            signal for "you are here" — after the brand fill, the brand
            text colour and the brand bar down the left edge — and the
            only one that cost layout: chevron plus gap took 26px off
            the label, which is what truncated "On-Demand Courses" to
            "On-Demand Cour…" whenever you were actually on that page.
            Every label now gets the full width in every state. */}
      </Link>

      {/* Hover/focus tooltip. Hidden under md — on mobile the drawer
          is too narrow for a sidebar-anchored popover and users tap to
          navigate anyway. `pointer-events-none` ensures the tooltip
          doesn't itself swallow hover state when it overlaps the link. */}
      {hasTooltip && pos && (
        <div
          id={tooltipId}
          role="tooltip"
          className="hidden md:block fixed z-[60] w-72 popover p-3 pointer-events-none animate-fade-in"
          style={{ top: pos.top, left: pos.left, marginLeft: 8 }}
        >
          <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-subtle">
            {item.label}
          </p>
          <p className="text-xs text-fg leading-snug mt-1">{item.description}</p>
        </div>
      )}
    </>
  );
}

export function Sidebar({
  user, credits,
  queueCounts,
  hiddenFeatures,
  initialUnreadCount = 0,
}: SidebarProps) {
  // Provider-agnostic sign-out — see lib/auth/authProvider.
  const signOut = useSignOut();
  // Helper used wherever the sidebar iterates an item list — drops
  // items the user has hidden via /profile/preferences. When the
  // prop is absent (legacy renders, tests, etc.) nothing is filtered.
  const visibleByPrefs = <T extends { featureId?: string }>(items: T[]): T[] =>
    hiddenFeatures && hiddenFeatures.size > 0
      ? items.filter((i) => !i.featureId || !hiddenFeatures.has(i.featureId))
      : items;
  const pathname = usePathname();
  const t = useT();
  // Everyone is signed in as a trainee (see getSession in lib/auth.ts), so
  // this is the trainee menu only, matching staging (17 Nov 2026): Dashboard,
  // ENGAGE, EXPERIENCE, 1:1 MENTORSHIP. No role switcher, no staff or admin
  // sections.

  // Mobile off-canvas drawer. The shell renders on every viewport;
  // <md the desktop shell collapses behind a hamburger. State lives
  // here rather than in the parent layout so the rest of the page
  // doesn't need to know about the toggle.
  const [mobileOpen, setMobileOpen] = useState(false);

  const learnerRow = (item: LearnerItem) => {
    const label = t(item.labelKey);
    return item.href
      ? <NavLink key={item.href} item={{ ...item, href: item.href, label }} pathname={pathname} onNavigate={() => setMobileOpen(false)} queueCounts={queueCounts} />
      : <PendingNavItem key={item.labelKey} label={label} soon={t("nav.soon")} icon={item.icon} />;
  };
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

      <nav
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
        <div className="px-4 py-4 border-b border-line flex items-center gap-2">
          <Link href="/dashboard" className="flex flex-1 min-w-0 hover:bg-elevated/50 rounded-lg px-2 py-1.5 transition-colors">
            {/* The official BioHubNet lockup, used as-is, straight on the
                sidebar surface (the transparent PNG is made for that). */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/biohubnet-logo.png"
              alt="BioHubNet — Transformative Talent Development"
              width={2357}
              height={619}
              className="w-full max-w-[168px] h-auto"
            />
          </Link>
          <NotificationBell initialUnreadCount={initialUnreadCount} />
        </div>

      <nav data-sidebar-nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <NavLink item={{ ...dashboardItem, label: t(dashboardItem.labelKey) }} pathname={pathname} onNavigate={() => setMobileOpen(false)} queueCounts={queueCounts} />

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
          {visibleByPrefs(engageItems).map((item) => {
            const labeled = { ...item, label: t(item.labelKey) };
            return <NavLink key={item.href} item={labeled} pathname={pathname} onNavigate={() => setMobileOpen(false)} queueCounts={queueCounts} />;
          })}
        </SectionGroup>

        {/* Experience above 1:1 Mentorship, as on staging. */}
        <SectionGroup
          title="EXPERIENCE"
          tone="experience"
          description="Bridging theory and practice through experiential learning."
        >
          {experienceItems.map(learnerRow)}
        </SectionGroup>

        <SectionGroup
          title="1:1 MENTORSHIP"
          tone="electric"
          description="A sustained pairing with someone already working in the part of the sector you're moving toward."
        >
          {mentorshipItems.map(learnerRow)}
        </SectionGroup>
      </nav>

      {/* Compact footer: credits chip, theme picker, then the user pill
          with sign-out as an icon button. */}

      {/* Credits chip */}
      {credits !== undefined && (
        <div className="px-3 py-1.5 border-t border-line">
          <div className="flex items-center gap-1.5 bg-amber-50 rounded-md px-2 py-1">
            <Coins size={11} className="text-amber-500 shrink-0" />
            <p className="text-[11px] text-amber-700 font-semibold leading-none">
              {credits.toLocaleString()} Training Credits
            </p>
          </div>
        </div>
      )}

      <div className="px-2 py-1 border-t border-line flex items-center gap-1">
        <ThemePicker compact />
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
          onClick={() => void signOut("/login")}
          className="p-1.5 rounded-lg text-muted hover:bg-elevated hover:text-fg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/60"
          title={t("nav.signOut")}
          aria-label={t("nav.signOut")}
        >
          <LogOut size={14} />
        </button>
      </div>
    </nav>
    </>
  );
}
