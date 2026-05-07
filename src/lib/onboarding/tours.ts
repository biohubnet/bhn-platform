/**
 * Onboarding tour content. Steps are filtered per role and per page; each
 * has a stable id stored on the user so progress survives across tours.
 *
 * When the changelog ships a noteworthy feature, append a step with the
 * same `since` version as the changelog entry. Returning users will get
 * a "What's new" mini-tour for steps with `since > user.lastSeenVersion`.
 */
export type StepRole = "trainee" | "evaluating" | "instructor" | "admin" | "superadmin";

export interface TourStep {
  id: string;
  title: string;
  body: string;
  /** When user is on this path the step is shown next to the selector;
   *  otherwise we offer a button to navigate there. Skip the step if path
   *  is omitted and we have no selector — purely centered modal. */
  path?: string;
  /** CSS selector to anchor the tooltip to. */
  selector?: string;
  /** Tooltip placement relative to the anchor. */
  placement?: "top" | "right" | "bottom" | "left" | "center";
  /** Roles allowed to see this step. Default: all roles. */
  roles?: StepRole[];
  /** Optional CTA shown on the step (label + href). */
  cta?: { label: string; href: string };
  /** Version this step appeared in. Bump when adding new ones. */
  since: string;
}

/** Bump this whenever a new step is added below — used to re-trigger
 *  the tour for returning users with a friendlier "what's new" hint. */
export const TOUR_VERSION = "2026.05.07b";

export const TOUR_STEPS: TourStep[] = [
  // ─── Welcome ─────────────────────────────────────────────────────
  {
    id: "welcome",
    title: "Welcome to BHN Training",
    body: "Quick 90-second tour of what's on offer. You can pause anytime — we'll save your spot. Press Esc to minimize.",
    placement: "center",
    since: "2025.04",
  },

  // ─── Trainee path ────────────────────────────────────────────────
  {
    id: "trainee.dashboard",
    title: "Your home base",
    body: "The dashboard shows what's in progress, your credit balance, and quick links into the catalog and pathways.",
    path: "/dashboard",
    placement: "center",
    roles: ["trainee", "evaluating"],
    since: "2025.04",
  },
  {
    id: "trainee.catalog",
    title: "Find courses by meaning",
    body: "Type natural language — 'cleanroom gowning' or 'prep for fill-finish role' — and the catalog ranks results by what they actually cover.",
    path: "/courses",
    selector: "input[placeholder*='Search courses']",
    placement: "bottom",
    cta: { label: "Open the catalog", href: "/courses" },
    since: "2025.05",
  },
  {
    id: "trainee.pathways",
    title: "Training pathways",
    body: "Pathways group several courses into one learning journey with a single certificate at the end. Some are open to everyone, others require admin approval.",
    path: "/pathways",
    placement: "center",
    cta: { label: "Browse pathways", href: "/pathways" },
    roles: ["trainee", "evaluating"],
    since: "2025.04",
  },
  {
    id: "trainee.credits",
    title: "Your BHN credits",
    body: "You start with 200 credits. Apply for an additional 4,800 by submitting a quick form — an admin reviews each application personally.",
    path: "/credits",
    placement: "center",
    cta: { label: "View credits", href: "/credits" },
    roles: ["trainee", "evaluating"],
    since: "2025.04",
  },
  {
    id: "trainee.buddy",
    title: "Find a learning buddy",
    body: "Pair up with someone for accountability — pick a course or pathway to share, see each other's progress, and leave async notes.",
    path: "/buddy",
    placement: "center",
    cta: { label: "Open buddies", href: "/buddy" },
    since: "2025.05",
  },
  {
    id: "trainee.profile",
    title: "Your profile",
    body: "Update your name, password, or request a role change from your profile. Click your name in the bottom-left of the sidebar anytime.",
    path: "/profile",
    placement: "center",
    cta: { label: "Open profile", href: "/profile" },
    since: "2025.04",
  },

  // ─── Instructor path ─────────────────────────────────────────────
  {
    id: "instructor.catalog",
    title: "Author courses",
    body: "As an instructor you can create courses, upload SCORM packages, edit course info, and add modules and assessments — right from the catalog.",
    path: "/courses",
    placement: "center",
    cta: { label: "Open catalog", href: "/courses" },
    roles: ["instructor"],
    since: "2025.04",
  },
  {
    id: "instructor.summary",
    title: "AI summaries help learners",
    body: "On every course detail page, click 'Generate summary' to create a learner-facing 3-paragraph summary grounded in the course's modules and assessments.",
    placement: "center",
    roles: ["instructor", "admin", "superadmin"],
    since: "2025.05",
  },

  // ─── Admin path ──────────────────────────────────────────────────
  {
    id: "admin.overview",
    title: "Admin dashboard",
    body: "Top-level operational view: users, enrollments, pathways, certificates. Most management lives in the Administration section in the sidebar.",
    path: "/admin",
    placement: "center",
    cta: { label: "Open admin", href: "/admin" },
    roles: ["admin", "superadmin"],
    since: "2025.04",
  },
  {
    id: "admin.users",
    title: "Bulk user actions",
    body: "Tick multiple rows on the Users page and a sticky action bar appears for batch activate, role change, credit adjust, or group assignment.",
    path: "/admin/users",
    placement: "center",
    cta: { label: "Open users", href: "/admin/users" },
    roles: ["admin", "superadmin"],
    since: "2025.04",
  },
  {
    id: "admin.creditApps",
    title: "Credit applications",
    body: "Trainees apply for additional credits — review each request with their documents and approve or reject from a single page.",
    path: "/admin/credit-applications",
    placement: "center",
    cta: { label: "Open queue", href: "/admin/credit-applications" },
    roles: ["admin", "superadmin"],
    since: "2025.05",
  },
  {
    id: "admin.pathwayEnrolls",
    title: "Pathway enrollment workflow",
    body: "Approve or reject pathway requests, manage waitlists, set capacity and close dates. New 'Pathway enrollments' tab in the sidebar.",
    path: "/admin/pathway-enrollments",
    placement: "center",
    cta: { label: "Open enrollments", href: "/admin/pathway-enrollments" },
    roles: ["admin", "superadmin"],
    since: "2025.05",
  },
  {
    id: "admin.analytics",
    title: "Analytics dashboard",
    body: "User growth, daily activity, the conversion funnel from sign-up to course completion, top events, role and theme distribution. Switch to All-time and export a one-page PDF report.",
    path: "/admin/analytics",
    placement: "center",
    cta: { label: "Open analytics", href: "/admin/analytics" },
    roles: ["admin", "superadmin"],
    since: "2025.05",
  },

  // ─── Superadmin only ─────────────────────────────────────────────
  {
    id: "superadmin.actAs",
    title: "View as another role",
    body: "Above the theme picker in the sidebar, switch to Trainee / Instructor / Admin to see the platform exactly as they do — admin permissions are paused while in this mode.",
    placement: "center",
    roles: ["superadmin"],
    since: "2025.05",
  },

  // ─── Universal closers ───────────────────────────────────────────
  {
    id: "themes",
    title: "Pick your theme",
    body: "Ten elegant themes, light and dark. Find the picker at the bottom of the sidebar — your choice persists across sessions.",
    placement: "center",
    since: "2025.05",
  },
  {
    id: "changelog",
    title: "What's new",
    body: "Every release lands in the change log on the sidebar — trainees see 'What's new', staff see the full Change log with per-entry visibility.",
    placement: "center",
    since: "2025.05",
  },
  {
    id: "event-forms",
    title: "Event registrations live on Pathways",
    body: "Programmes and bootcamps that need a sign-up form now appear as teal cards on the Pathways page. Click one to fill it out — your last response is kept on file. Admins can edit fields in place and export every submission as a CSV.",
    path: "/pathways",
    placement: "center",
    since: "2026.05",
    cta: { label: "Open Pathways", href: "/pathways" },
  },
  {
    id: "bold-hero",
    title: "A bolder welcome",
    body: "The dashboard, pathways, and catalog now open with a full-bleed hero — mesh gradient, drifting organic blobs, your name in gradient type, and stat tiles with asymmetric corners. Less of a default form, more of a place that recognises you.",
    path: "/dashboard",
    placement: "center",
    since: "2026.05.07b",
  },
  {
    id: "auto-thumbnails",
    title: "Course catalog now has AI cover art",
    body: "We've filled in the catalog with one-word AI thumbnails. Each card's cover image is generated from the strongest word in the course title (or its category if set), rendered as a clean editorial illustration. If a course is missing one, run scripts/auto-thumbnail-courses.ts.",
    path: "/courses",
    placement: "center",
    since: "2026.05.07a",
    roles: ["instructor", "admin", "superadmin"],
    cta: { label: "Open the catalog", href: "/courses" },
  },
  {
    id: "more-themes",
    title: "Themes now reshape the whole design",
    body: "Open the Theme picker at the bottom of the sidebar — there are now nine looks. Each one comes with its own typography (Charter serif for Scientific, JetBrains Mono for Hi-Tech, Quicksand for Pink and Lab Mouse), surface treatment (hard borders for Modern, neon glow for Hi-Tech, soft pink halos for the playful ones), and corner radii. Try a few — switching themes changes how the platform feels, not just what colour it is.",
    selector: "[aria-label=\"Change theme\"]",
    placement: "right",
    since: "2026.05.07",
  },
  {
    id: "complete",
    title: "You're all set",
    body: "Reopen this tour anytime from the (?) icon at the bottom of the sidebar. New features will surface here as they ship.",
    placement: "center",
    since: "2025.04",
  },
];
