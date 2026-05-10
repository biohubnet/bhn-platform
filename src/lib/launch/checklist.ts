/**
 * Canonical Launch Readiness checklist.
 *
 * Why a code constant rather than a database table?
 *   • The structure is stable — admins can't break it by accident.
 *   • Auto-detected items pair with a probe (in probes.ts) that
 *     the schema has no concept of, so storing the canonical list
 *     in code keeps probe + item definition next to each other.
 *   • Mutable state (manual override, owner, target date, notes)
 *     lives in LaunchChecklistState, keyed by `itemKey` here.
 *
 * Audience: the rendered dashboard targets a non-technical executive.
 * Every `bossLabel` should be readable without jargon — that's what
 * the page surfaces. `title` is the engineer-facing canonical label.
 */

export type ChecklistPhase =
  | "foundation"
  | "config"
  | "content"
  | "migration"
  | "softlaunch"
  | "ga";

export type ChecklistCategory =
  | "infrastructure"
  | "content"
  | "migration"
  | "testing"
  | "ops"
  | "legal";

export type ChecklistKind = "auto" | "manual";

export interface ChecklistItem {
  /** Stable key — DO NOT rename once shipped, used as DB foreign key. */
  key: string;
  phase: ChecklistPhase;
  category: ChecklistCategory;
  /** Engineer-facing canonical title. */
  title: string;
  /** Boss-friendly label — no jargon. Surfaced in the executive view. */
  bossLabel: string;
  /** One-line plain-English explanation for the boss tooltip. */
  bossExplain: string;
  /** "auto" → status comes from probes.ts. "manual" → admin marks. */
  kind: ChecklistKind;
  /** Higher = renders earlier within its phase. */
  order: number;
  /** "low" | "medium" | "high" | "critical" — drives the risk panel. */
  severity: "low" | "medium" | "high" | "critical";
  /** Probe identifier — only for auto items. Resolved in probes.ts. */
  probe?: string;
}

/**
 * The canonical phases — ordered. Each shows up in the phase ladder.
 * Boss-readable labels keep the engineer-named phase keys readable
 * to a non-tech audience.
 */
export const PHASES: { key: ChecklistPhase; label: string; bossLabel: string; description: string }[] = [
  { key: "foundation",  label: "Foundation",        bossLabel: "Foundations",            description: "Auth, security, legal pages — the safety net before anyone touches the system." },
  { key: "config",      label: "Configuration",     bossLabel: "Set-up",                 description: "Plugging in real services — domain, email, monitoring, identity providers." },
  { key: "content",     label: "Content",           bossLabel: "Stocking the catalog",   description: "Real courses, real partners, real postings. The system isn't useful empty." },
  { key: "migration",   label: "Migration",         bossLabel: "Moving the existing users over", description: "Bringing users, courses, jobs from the legacy system safely." },
  { key: "softlaunch",  label: "Soft launch",       bossLabel: "Pilot run",              description: "First real cohort. Find the bugs that only show up under real use." },
  { key: "ga",          label: "General availability", bossLabel: "Public launch",       description: "Open to everyone, marketing announcement, legacy system retired." },
];

export const CATEGORY_LABELS: Record<ChecklistCategory, string> = {
  infrastructure: "Infrastructure",
  content:        "Content",
  migration:      "Migration",
  testing:        "Testing",
  ops:            "Operations",
  legal:          "Legal & compliance",
};

/**
 * The actual checklist. ~30 items spanning every phase. Auto-items
 * carry a probe identifier; manual items rely on admin checkmarks.
 */
export const CHECKLIST: ChecklistItem[] = [
  // ─── FOUNDATION ─────────────────────────────────────────────────
  {
    key: "foundation.auth",
    phase: "foundation", category: "infrastructure", kind: "auto", probe: "auth_configured",
    order: 100, severity: "critical",
    title: "Auth — credentials + magic link + MFA",
    bossLabel: "Sign-in works",
    bossExplain: "Users can create accounts, sign in with a password, and turn on two-factor security if they want.",
  },
  {
    key: "foundation.audit",
    phase: "foundation", category: "ops", kind: "auto", probe: "audit_log_active",
    order: 95, severity: "high",
    title: "Audit log writes are flowing",
    bossLabel: "We track every important admin action",
    bossExplain: "Required for compliance. Every admin change is recorded for later review.",
  },
  {
    key: "foundation.privacy",
    phase: "foundation", category: "legal", kind: "auto", probe: "privacy_terms_pages",
    order: 90, severity: "high",
    title: "Privacy + Terms pages exist",
    bossLabel: "Privacy & Terms pages are live",
    bossExplain: "Required to take signups in most jurisdictions.",
  },
  {
    key: "foundation.consent",
    phase: "foundation", category: "legal", kind: "auto", probe: "cookie_banner",
    order: 85, severity: "high",
    title: "Cookie / consent banner",
    bossLabel: "Cookie consent banner is showing",
    bossExplain: "Required by GDPR and Quebec's Law 25.",
  },
  {
    key: "foundation.privacy.review",
    phase: "foundation", category: "legal", kind: "manual",
    order: 80, severity: "high",
    title: "Privacy & Terms reviewed by counsel",
    bossLabel: "Lawyers have signed off on Privacy & Terms",
    bossExplain: "An hour of legal review is cheap insurance.",
  },

  // ─── CONFIGURATION ──────────────────────────────────────────────
  {
    key: "config.domain",
    phase: "config", category: "infrastructure", kind: "auto", probe: "production_domain",
    order: 100, severity: "critical",
    title: "Production domain on Vercel",
    bossLabel: "Custom domain is live",
    bossExplain: "Users see app.biohubnet.ca — not the developer URL.",
  },
  {
    key: "config.smtp",
    phase: "config", category: "infrastructure", kind: "auto", probe: "smtp_configured",
    order: 95, severity: "critical",
    title: "Email sending provider connected",
    bossLabel: "Outgoing email works",
    bossExplain: "Sign-up codes, password reset, magic links — none of that lands without this.",
  },
  {
    key: "config.smtp.dns",
    phase: "config", category: "infrastructure", kind: "manual",
    order: 92, severity: "critical",
    title: "Email-domain DNS — SPF / DKIM / DMARC",
    bossLabel: "Our emails reach inboxes (not spam)",
    bossExplain: "Without these settings on our domain registrar, emails from our system land in spam folders.",
  },
  {
    key: "config.r2",
    phase: "config", category: "infrastructure", kind: "auto", probe: "r2_public_url",
    order: 90, severity: "high",
    title: "File storage public URL configured",
    bossLabel: "Course files and photos load",
    bossExplain: "Where SCORM packages, certificates, and uploads live. Without this, courses don't open.",
  },
  {
    key: "config.email.verify",
    phase: "config", category: "infrastructure", kind: "auto", probe: "email_verify_required",
    order: 85, severity: "medium",
    title: "Email verification enforced on sign-in",
    bossLabel: "Email verification is required to sign in",
    bossExplain: "Stops fake accounts from signing up with addresses they don't own.",
  },
  {
    key: "config.turnstile",
    phase: "config", category: "infrastructure", kind: "auto", probe: "turnstile_configured",
    order: 80, severity: "medium",
    title: "CAPTCHA on register",
    bossLabel: "Bots can't sign up automatically",
    bossExplain: "A small puzzle stops automated scripts from registering thousands of fake accounts.",
  },
  {
    key: "config.google.oauth",
    phase: "config", category: "infrastructure", kind: "auto", probe: "google_oauth",
    order: 75, severity: "high",
    title: "Google OAuth provider",
    bossLabel: "Sign in with Google works",
    bossExplain: "Critical for the migration — legacy users sign in with their existing Google account, no password reset.",
  },
  {
    key: "config.monitoring",
    phase: "config", category: "ops", kind: "auto", probe: "error_monitoring",
    order: 70, severity: "high",
    title: "Error monitoring (Sentry / equivalent)",
    bossLabel: "We get alerted when something breaks",
    bossExplain: "Without this, the team only finds out about bugs when a user complains.",
  },
  {
    key: "config.mfa.staff",
    phase: "config", category: "ops", kind: "manual",
    order: 65, severity: "high",
    title: "Two-factor required for admin / superadmin",
    bossLabel: "Admin accounts use two-factor security",
    bossExplain: "Stops one stolen admin password from compromising the whole platform.",
  },

  // ─── CONTENT ────────────────────────────────────────────────────
  {
    key: "content.courses",
    phase: "content", category: "content", kind: "auto", probe: "real_published_courses",
    order: 100, severity: "critical",
    title: "Real courses uploaded and published",
    bossLabel: "We have real courses in the catalog",
    bossExplain: "Goal: at least 10 published courses. Cannot launch with an empty catalog.",
  },
  {
    key: "content.thumbnails",
    phase: "content", category: "content", kind: "auto", probe: "course_thumbnails",
    order: 95, severity: "medium",
    title: "AI thumbnails on every course",
    bossLabel: "Every course has cover art",
    bossExplain: "Catalog looks professional, not unfinished. Auto-generated by the AI tool.",
  },
  {
    key: "content.skills",
    phase: "content", category: "content", kind: "auto", probe: "skill_ontology",
    order: 90, severity: "high",
    title: "Skill ontology populated",
    bossLabel: "Skills database is filled in",
    bossExplain: "Powers the matching of trainees to job postings. Empty = matching doesn't work.",
  },
  {
    key: "content.pathways",
    phase: "content", category: "content", kind: "auto", probe: "pathways_published",
    order: 85, severity: "medium",
    title: "Learning pathways published",
    bossLabel: "Multi-course pathways are available",
    bossExplain: "Bundles like the Medical Affairs Learning Pathway. Optional but valuable for credibility.",
  },
  {
    key: "content.employers",
    phase: "content", category: "content", kind: "auto", probe: "real_employers",
    order: 80, severity: "high",
    title: "First employer partners onboarded",
    bossLabel: "We have at least 2 real employer partners",
    bossExplain: "An empty job board feels broken. Floor: 2 partners with 3+ postings each.",
  },
  {
    key: "content.postings",
    phase: "content", category: "content", kind: "auto", probe: "active_postings",
    order: 75, severity: "high",
    title: "Active job postings",
    bossLabel: "There are real internship postings to apply to",
    bossExplain: "Goal: at least 5 active postings before pilot.",
  },
  {
    key: "content.help",
    phase: "content", category: "content", kind: "manual",
    order: 70, severity: "medium",
    title: "Help docs / knowledge base published",
    bossLabel: "Self-serve help articles are written",
    bossExplain: "Cuts support load. Trainees and employers can find answers without emailing us.",
  },

  // ─── MIGRATION ──────────────────────────────────────────────────
  {
    key: "migration.audit",
    phase: "migration", category: "migration", kind: "manual",
    order: 100, severity: "critical",
    title: "Legacy data audit complete",
    bossLabel: "We've inventoried everything on the old system",
    bossExplain: "Every spreadsheet tab, column, and external integration documented before migration writes any code.",
  },
  {
    key: "migration.scripts.users",
    phase: "migration", category: "migration", kind: "manual",
    order: 95, severity: "critical",
    title: "User migration script — written and dry-run tested",
    bossLabel: "Migration code for users tested",
    bossExplain: "Pulls users from legacy spreadsheet, recreates accounts on new system, matches by email.",
  },
  {
    key: "migration.scripts.courses",
    phase: "migration", category: "migration", kind: "manual",
    order: 90, severity: "critical",
    title: "Course migration script — written and dry-run tested",
    bossLabel: "Migration code for courses tested",
    bossExplain: "Pulls courses + uploads SCORM files from old storage to new storage.",
  },
  {
    key: "migration.staging",
    phase: "migration", category: "migration", kind: "manual",
    order: 85, severity: "critical",
    title: "Full migration dry-run on staging successful",
    bossLabel: "Practice migration ran successfully",
    bossExplain: "Run the whole migration against a copy first. Spot-check 20 random users to confirm everything carried over.",
  },
  {
    key: "migration.cutover.signoff",
    phase: "migration", category: "migration", kind: "manual",
    order: 80, severity: "high",
    title: "Cutover plan signed off",
    bossLabel: "Migration day plan approved",
    bossExplain: "Date, comms wave timing, who's on call, rollback trigger. Boss signs off here.",
  },
  {
    key: "migration.comms",
    phase: "migration", category: "migration", kind: "manual",
    order: 75, severity: "high",
    title: "User communications drafted (T-2w / T-1w / T-day)",
    bossLabel: "Email announcements ready for users",
    bossExplain: "Three messages — heads-up, instructions, day-of pointer. Drafted now, queued for send during cutover.",
  },

  // ─── SOFT LAUNCH ────────────────────────────────────────────────
  {
    key: "softlaunch.cohort.trainees",
    phase: "softlaunch", category: "testing", kind: "auto", probe: "active_real_trainees",
    order: 100, severity: "high",
    title: "Pilot trainee cohort active (≥5)",
    bossLabel: "At least 5 real trainees are using the system",
    bossExplain: "Real users find the bugs that test accounts miss. Goal: 5–10 in the first cohort.",
  },
  {
    key: "softlaunch.cohort.employers",
    phase: "softlaunch", category: "testing", kind: "auto", probe: "active_real_employers",
    order: 95, severity: "high",
    title: "Pilot employer cohort active (≥1)",
    bossLabel: "At least 1 real employer with active postings",
    bossExplain: "We need a real-world hiring loop end-to-end before opening more broadly.",
  },
  {
    key: "softlaunch.e2e",
    phase: "softlaunch", category: "testing", kind: "manual",
    order: 90, severity: "critical",
    title: "End-to-end real-user flow completed (apply → interview → outcome)",
    bossLabel: "A real trainee got matched, interviewed, and finished the loop",
    bossExplain: "Single most important confidence signal before going public.",
  },
  {
    key: "softlaunch.notifications",
    phase: "softlaunch", category: "ops", kind: "manual",
    order: 85, severity: "medium",
    title: "Notification emails verified end-to-end",
    bossLabel: "Confirmation emails are landing reliably",
    bossExplain: "Enrollment, certificate-issued, application-received, interview-scheduled, reward-unlocked.",
  },
  {
    key: "softlaunch.feedback",
    phase: "softlaunch", category: "testing", kind: "manual",
    order: 80, severity: "medium",
    title: "Pilot retrospective held",
    bossLabel: "Pilot users were asked what worked & didn't",
    bossExplain: "30-minute review meeting. List of bugs + UX gaps to fix before opening up.",
  },

  // ─── GA ─────────────────────────────────────────────────────────
  {
    key: "ga.launch.announcement",
    phase: "ga", category: "ops", kind: "manual",
    order: 100, severity: "high",
    title: "Public launch announcement scheduled",
    bossLabel: "Launch announcement scheduled",
    bossExplain: "Email blast + LinkedIn post + newsletter. Coordinated with marketing.",
  },
  {
    key: "ga.legacy.readonly",
    phase: "ga", category: "migration", kind: "manual",
    order: 95, severity: "high",
    title: "Legacy system flipped to read-only",
    bossLabel: "Old system locked — read-only fallback only",
    bossExplain: "Legacy stays available for 90 days as a safety net but no new data goes there.",
  },
  {
    key: "ga.legacy.decommission",
    phase: "ga", category: "migration", kind: "manual",
    order: 90, severity: "low",
    title: "Legacy system fully decommissioned",
    bossLabel: "Old system shut down for good",
    bossExplain: "After 90 days of read-only safety period. Saves AWS hosting cost going forward.",
  },
];

/**
 * RAG (red / amber / green) bucket from a status. Surfaced as the
 * traffic-light pip on every card.
 */
export function statusToRag(status: ResolvedStatus): "green" | "amber" | "red" | "grey" {
  switch (status) {
    case "done":             return "green";
    case "in_progress":      return "amber";
    case "blocked":          return "red";
    case "not_applicable":   return "grey";
    case "not_started":      return "grey";
  }
}

export type ResolvedStatus =
  | "not_started"
  | "in_progress"
  | "done"
  | "blocked"
  | "not_applicable";
