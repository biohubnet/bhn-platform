/**
 * Curated help-card registry.
 *
 * Every hint surfaced to a user is selected from THIS LIST — the
 * LLM picks a `key`, never writes prose. That keeps the help text
 * factual, on-brand, and easy to QA: the worst the model can do is
 * pick the wrong card; it can't hallucinate copy.
 *
 * Authoring rules
 *   • Title ≤ 50 chars. Reads as a sentence start, not a heading.
 *   • Body ≤ 200 chars. Single sentence. Action-oriented.
 *   • CTA is one click. If there's no clear next click, omit cta.
 *   • Surfaces is the allow-list — surface this card only when the
 *     user is on one of those routes. Empty = any surface.
 *   • Roles is the audience. Empty = everyone.
 *
 * Adding a new card
 *   1. Pick a stable `key` (kebab-case, scope-prefixed).
 *   2. Add the entry below.
 *   3. The rule engine (rules.ts) or AI prompt (infer.ts) can now
 *      reference it. No DB migration needed.
 */

import type { Role } from "@/lib/auth";

export interface HelpCard {
  key: string;
  title: string;
  body: string;
  ctaLabel?: string;
  ctaHref?: string;
  /** Surface allow-list. Empty = any. */
  surfaces?: string[];
  /** Role allow-list. Empty = any. */
  roles?: Role[];
  /** Default trigger source — used when a card is fired by a rule
   *  rather than the AI selector. Pretty-prints in the admin
   *  dashboard. */
  defaultTrigger?: string;
}

export const HELP_CARDS: HelpCard[] = [
  // ── Onboarding / discovery ─────────────────────────────────
  {
    key: "trainee.welcome.tour",
    title: "First time here?",
    body: "There's a 90-second tour that maps the sidebar — open it from the welcome card on your dashboard.",
    ctaLabel: "Open the tour",
    ctaHref: "/dashboard",
    surfaces: ["/dashboard"],
    roles: ["trainee", "evaluating"],
  },
  {
    key: "trainee.catalog.search",
    title: "Search the catalog by meaning",
    body: "Type natural language — 'cleanroom gowning', 'prep for fill-finish role'. The catalog ranks by what courses actually cover.",
    ctaLabel: "Try a search",
    ctaHref: "/courses",
    surfaces: ["/courses"],
    roles: ["trainee", "evaluating"],
  },
  // ── Employer / HR ──────────────────────────────────────────
  {
    key: "employer.profile.set-up",
    title: "Set up your company profile",
    body: "Drop your URL into Edit Profile and the AI fills industry, HQ, size, founding year, logo, and a short description in one go.",
    ctaLabel: "Edit profile",
    ctaHref: "/employer",
    surfaces: ["/employer", "/employer/postings"],
    roles: ["employer", "admin", "superadmin"],
    defaultTrigger: "rule:empty-profile",
  },
  {
    key: "employer.autofill.not-configured",
    title: "Auto-fill needs setup",
    body: "The AI key for profile auto-fill isn't configured on this deployment. Set AI_PROVIDER + API key in the platform settings to enable it.",
    ctaLabel: "Open settings",
    ctaHref: "/admin/settings",
    surfaces: ["/employer", "/employer/postings"],
    roles: ["employer", "admin", "superadmin"],
    defaultTrigger: "rule:autofill-error",
  },
  {
    key: "employer.demo.seed",
    title: "Want to play with sample data?",
    body: "The top of My Postings has a Seed demo data button — spawns three postings with applicants at different stages. Clear any time.",
    ctaLabel: "Open postings",
    ctaHref: "/employer/postings",
    surfaces: ["/employer", "/employer/postings"],
    roles: ["employer", "admin", "superadmin"],
    defaultTrigger: "rule:empty-postings",
  },
  {
    key: "employer.applicants.where",
    title: "Applicants live inside postings",
    body: "Each posting in My Postings expands to show its applicant pipeline inline — no separate page to hunt down.",
    ctaLabel: "Open postings",
    ctaHref: "/employer/postings",
    roles: ["employer", "admin", "superadmin"],
  },
  // ── Admin ──────────────────────────────────────────────────
  {
    key: "admin.queue.review",
    title: "Approvals waiting on you",
    body: "Credit applications, role-change requests, and pathway enrolments are blocked until you triage. Open the queue.",
    ctaLabel: "Review queue",
    ctaHref: "/admin/credit-applications",
    surfaces: ["/admin"],
    roles: ["admin", "superadmin"],
    defaultTrigger: "rule:pending-approvals",
  },
  {
    key: "admin.users.bulk-actions",
    title: "Bulk actions live in the toolbar",
    body: "Select multiple rows on /admin/users to deactivate, change role, or invite. The toolbar appears at the top of the list.",
    ctaLabel: "Open users",
    ctaHref: "/admin/users",
    surfaces: ["/admin/users"],
    roles: ["admin", "superadmin"],
  },
  {
    key: "admin.cover-art.default-overlay",
    title: "Save an overlay as default",
    body: "Tick \"Apply to future thumbnails\" before you Apply — every regenerated thumbnail picks up the overlay automatically.",
    ctaLabel: "Open cover art",
    ctaHref: "/admin/cover-art",
    surfaces: ["/admin/cover-art"],
    roles: ["admin", "superadmin"],
  },
  // ── Universal stuck-states ─────────────────────────────────
  {
    key: "stuck.rage-click",
    title: "Something not responding?",
    body: "The button you tapped a few times either disabled itself or fired silently. Refreshing the page usually unblocks the next step.",
    defaultTrigger: "rule:rage-click",
  },
  {
    key: "stuck.form-abandon",
    title: "Need a hand finishing that form?",
    body: "You started filling something out — let us know if there's a confusing field and we'll smooth the rough edge.",
    ctaLabel: "Send feedback",
    ctaHref: "/feedback",
    defaultTrigger: "rule:form-abandon",
  },
  {
    key: "stuck.error-loop",
    title: "Hit the same error twice in a row",
    body: "We logged it. If it keeps happening, refresh or paste the URL into the feedback form so we can chase it.",
    ctaLabel: "Send feedback",
    ctaHref: "/feedback",
    defaultTrigger: "rule:error-loop",
  },
  {
    key: "stuck.long-dwell",
    title: "Stuck deciding?",
    body: "You've been on this surface a while. The help guide on the right of every dashboard surface has shortcuts to common tasks.",
    defaultTrigger: "rule:long-dwell",
  },
  // ── Returning user ─────────────────────────────────────────
  {
    key: "returning.continue-where-you-left",
    title: "Welcome back",
    body: "Last visit you were partway through something. Pick up where you left off from your dashboard.",
    ctaLabel: "Open dashboard",
    ctaHref: "/dashboard",
    defaultTrigger: "rule:returning-user",
  },
  // ── Privacy / settings ─────────────────────────────────────
  {
    key: "assist.audit-history",
    title: "Want to see what AutoPipette has noted about you?",
    body: "Your full behaviour summary, every hint shown, and a delete button live at /profile/assist-history.",
    ctaLabel: "Open audit",
    ctaHref: "/profile/assist-history",
  },

  // ── EQUIP — funding pillar (#3 after ENGAGE / EXPERIENCE) ──
  {
    key: "equip.start",
    title: "Funding for your innovation?",
    body: "EQUIP backs trainee-entrepreneurs with up to $5K (events) or $25K (commercialization). 3-question wizard picks your stream.",
    ctaLabel: "Start an application",
    ctaHref: "/equip",
    surfaces: ["/dashboard", "/courses", "/profile"],
    roles: ["trainee", "evaluating"],
  },
  {
    key: "equip.draft-resume",
    title: "You have a saved EQUIP draft",
    body: "Pick up exactly where you left off — every field auto-saved as you typed.",
    ctaLabel: "Open my draft",
    ctaHref: "/equip/my-applications",
    surfaces: ["/dashboard", "/equip"],
    roles: ["trainee", "evaluating"],
  },
  {
    key: "equip.under-review",
    title: "Your EQUIP application is under review",
    body: "Track status, see reviewer notes, and respond to any clarification asks at /equip/my-applications.",
    ctaLabel: "Open tracker",
    ctaHref: "/equip/my-applications",
    roles: ["trainee", "evaluating"],
  },
  {
    key: "equip.admin.triage",
    title: "EQUIP applications waiting on you",
    body: "Submitted apps queue for review. Click in, claim it, leave a note, and decide.",
    ctaLabel: "Open review queue",
    ctaHref: "/admin/equip",
    surfaces: ["/admin"],
    roles: ["admin", "superadmin"],
    defaultTrigger: "rule:pending-approvals",
  },
];

const KEY_MAP: Map<string, HelpCard> = new Map(HELP_CARDS.map((c) => [c.key, c]));

/** Look a card up by key. Returns null if the key doesn't exist (so
 *  the AI selecting a fake key just drops the hint silently). */
export function findHelpCard(key: string): HelpCard | null {
  return KEY_MAP.get(key) ?? null;
}

/** Returns the subset of cards available for a given (surface, role)
 *  pair. The LLM is given this filtered list — its job is just to
 *  pick the most relevant entry from a curated, pre-scoped menu. */
export function availableHelpCards(opts: {
  surface: string | null;
  role: Role;
}): HelpCard[] {
  return HELP_CARDS.filter((c) => {
    if (c.surfaces && c.surfaces.length > 0 && !c.surfaces.some((s) => opts.surface?.startsWith(s))) {
      return false;
    }
    if (c.roles && c.roles.length > 0 && !c.roles.includes(opts.role)) {
      return false;
    }
    return true;
  });
}
