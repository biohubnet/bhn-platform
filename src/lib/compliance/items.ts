/**
 * Compliance registry — single source of truth for the management
 * overview at /compliance.
 *
 * Each item is plain-English and management-readable:
 *   • Why we follow it (the regulator / standard, in one sentence)
 *   • What we actually do (concrete measures already on the
 *     platform — not aspirational marketing copy)
 *   • Current status (met / partial / in-progress / not applicable)
 *   • Evidence link when the implementation lives somewhere on
 *     the platform an auditor can click through to
 *
 * Editing rules:
 *   • Keep statuses honest. "Partial" is more useful than "Met" if a
 *     real auditor would push back. Management trust depends on the
 *     page being a fair representation of where the platform stands.
 *   • Append-only is preferred — once an item appears here it
 *     should keep an entry even after we hit "met", so historical
 *     posture is visible.
 *   • The page's editable copy hooks (via /admin/copy) let admins
 *     adjust the per-item `notes` field without touching code. The
 *     code default here is the baseline that ships with the
 *     platform.
 */

export type ComplianceStatus = "met" | "partial" | "in_progress" | "not_applicable";

export interface ComplianceItem {
  /** Stable id — used as the editable-copy key (`compliance.<id>.notes`). */
  id: string;
  /** Group bucket — drives section ordering on the page. */
  group: "Privacy" | "Accessibility" | "Communications" | "Security" | "Operational";
  /** Headline name of the framework or rule. */
  title: string;
  /** Authority / jurisdiction (e.g. "Canada, federal" or "Ontario, AODA"). */
  authority: string;
  /** Plain-English "why we follow this". One short paragraph. */
  why: string;
  /** Specific platform measures that address the requirement. */
  measures: string[];
  /** Current status. */
  status: ComplianceStatus;
  /** Optional internal-link evidence (e.g. /admin/audit, /admin/security). */
  evidenceHref?: string;
  /** Optional in-platform link label. */
  evidenceLabel?: string;
  /** Free-text status notes — overridable via editable copy. */
  notes?: string;
}

export const COMPLIANCE_ITEMS: ComplianceItem[] = [
  // ─── Privacy & data protection ──────────────────────────────────
  {
    id: "pipeda",
    group: "Privacy",
    title: "PIPEDA — federal privacy law",
    authority: "Canada · Office of the Privacy Commissioner",
    why: "PIPEDA governs how Canadian organisations collect, use, and disclose personal information in the course of commercial activities. Every trainee record, employer contact, and login event we store falls under it.",
    measures: [
      "Collection is purpose-bound. Profile fields exist only when a feature needs them (resume URL for applications, supervisor letter for ENGAGE eligibility, etc.).",
      "Consent is captured at sign-up via the platform terms; newsletter is opt-in (off by default).",
      "Trainees can edit or remove their data on /profile; the leave-pool flow walks approved candidates through deletion of their talent-application submission.",
      "Access requests + erasure requests are routed through support@biohubnet.com with a 30-day SLA.",
    ],
    status: "partial",
    evidenceHref: "/profile",
    evidenceLabel: "Profile · self-serve edit",
    notes: "Self-serve deletion of the user account itself is admin-mediated today. A trainee-side 'delete my account' button is queued for the next privacy pass.",
  },
  {
    id: "data-residency",
    group: "Privacy",
    title: "Canadian data residency",
    authority: "Best practice for federally-funded HQP programs",
    why: "BHN serves ENGAGE-eligible trainees at 14 Ontario partner institutions. Several institutional partners require personal information to be stored and processed within Canada.",
    measures: [
      "Database hosted in a Canadian region (review against current host's region settings before each renewal).",
      "Cloudflare R2 file storage configured to a Canadian-residency jurisdiction for trainee uploads (resume PDFs, video introductions).",
      "AI inference routes through Cloudflare Workers AI on the same residency. No customer data is sent to third-party AI providers.",
    ],
    status: "met",
  },
  {
    id: "retention",
    group: "Privacy",
    title: "Data retention & expiry",
    authority: "PIPEDA Principle 5 + program guidelines",
    why: "Personal information must be retained only as long as necessary for the stated purpose. Stale records carry privacy risk without operational value.",
    measures: [
      "Credit grants expire 365 days from issue (CREDIT_GRANT_TTL_DAYS). Trainees are notified at 90, 30, and 7 days.",
      "Phantom test accounts auto-delete after their TTL (default 24 h, hourly sweep).",
      "Demo workspaces expire on a per-workspace timer set when spawned.",
      "Audit logs retained 12 months by default; configurable via /admin/settings.",
      "Backups inherit the retention of the underlying managed-Postgres provider.",
    ],
    status: "met",
    evidenceHref: "/admin/settings",
    evidenceLabel: "Admin · Settings",
  },

  // ─── Accessibility ──────────────────────────────────────────────
  {
    id: "aoda-wcag",
    group: "Accessibility",
    title: "AODA + WCAG 2.1 AA",
    authority: "Ontario · AODA Integrated Accessibility Standards",
    why: "AODA's Integrated Accessibility Standards Regulation (IASR) requires public-facing web content from Ontario organisations to meet WCAG 2.0 AA at minimum. BHN aims at the 2.1 AA target since it's the practical industry baseline.",
    measures: [
      "Semantic HTML + ARIA on every interactive element (nav links, dialogs, form fields).",
      "Keyboard-navigable across the platform — every action has a tab-reachable control. Custom shortcuts at /profile/shortcuts.",
      "Focus rings deliberately styled brand-tinted and offset; never `outline: none` without a replacement.",
      "Modals trap focus, restore focus on close, and respect Esc.",
      "Page translator supports 8 languages (EN, FR, ES, ZH, HI, KO, PA, AR) for the right-to-left + non-Latin scripts AODA's plain-language goal implicates.",
      "prefers-reduced-motion respected — admin-glow + drifting hero blobs both honour the OS setting.",
    ],
    status: "partial",
    evidenceHref: "/profile/shortcuts",
    evidenceLabel: "Profile · Keyboard shortcuts",
    notes: "Full WCAG 2.1 AA conformance audit is scheduled. Known gaps: color-contrast on a couple of low-priority warning chips at AA-large, and some image alt text on legacy uploads is auto-generated.",
  },

  // ─── Communications ─────────────────────────────────────────────
  {
    id: "casl",
    group: "Communications",
    title: "CASL — Canadian Anti-Spam Legislation",
    authority: "Canada · CRTC + Competition Bureau",
    why: "CASL governs commercial electronic messages sent to Canadian recipients — including newsletters, event invites, and partner announcements. Penalties for non-compliance are substantial; we apply CASL globally to keep the policy simple.",
    measures: [
      "Newsletter subscription is opt-in (newsletterSubscribed defaults false). No marketing without express consent.",
      "Every commercial email carries an unsubscribe link and a 10-business-day max processing window — we honour it within 24 hours.",
      "Sender identification (BHN name + a reachable physical address + reply-to) is appended automatically by the mail layer.",
      "Transactional mail (verify email, credit-grant notifications, application updates) is exempt from CASL but still carries the same sender identification block.",
    ],
    status: "met",
  },

  // ─── Security ───────────────────────────────────────────────────
  {
    id: "encryption",
    group: "Security",
    title: "Encryption in transit + at rest",
    authority: "PIPEDA Principle 7 (safeguards) + industry baseline",
    why: "Encryption is the single most important technical control for personal information. Public networks are inherently untrusted; storage media inherit the trustworthiness of whoever can read the disk.",
    measures: [
      "TLS 1.2+ enforced on every public surface. HSTS header on the production domain (max-age 1 year).",
      "Database hosted on a managed Postgres provider with at-rest AES-256 encryption.",
      "File uploads to R2 are encrypted at rest by the provider.",
      "Session cookies use httpOnly + sameSite=lax + secure in production.",
      "Passwords hashed with bcrypt (cost factor 10). Plaintext passwords never logged.",
    ],
    status: "met",
  },
  {
    id: "auth",
    group: "Security",
    title: "Authentication & MFA",
    authority: "Industry baseline + ISO 27001 control A.9",
    why: "Stolen passwords are the dominant breach vector. MFA cuts account-takeover risk by an order of magnitude; lockout protects against credential-stuffing campaigns.",
    measures: [
      "TOTP-based MFA available to every user (Settings → Security). Required for admin / superadmin seats — staff cannot opt out.",
      "Account lockout after 5 failed attempts (15-minute cooldown).",
      "Magic-link sign-in available for demo + showcase accounts only — never real accounts (the route refuses real-account tokens defence-in-depth).",
      "Sandbox account spawning has been retired; admins use /admin/split-view to preview roles without leaving their seat.",
    ],
    status: "met",
    evidenceHref: "/admin/security",
    evidenceLabel: "Admin · Security",
  },
  {
    id: "audit",
    group: "Security",
    title: "Audit logging",
    authority: "PIPEDA Principle 7 + ISO 27001 A.12.4",
    why: "Without audit trails we cannot answer 'who did what when' after an incident, and we cannot satisfy regulatory information requests.",
    measures: [
      "Every privileged action (role changes, act-as, credit grants, manual enrollments, theme proposals, etc.) writes a row to AuditLog with actor, target, IP, and a JSON detail blob.",
      "Audit log is admin-readable at /admin/audit with full-text search + role filter.",
      "12-month default retention; archive export is a manual admin task today.",
    ],
    status: "met",
    evidenceHref: "/admin/audit",
    evidenceLabel: "Admin · Audit log",
  },
  {
    id: "rbac",
    group: "Security",
    title: "Role-based access control",
    authority: "ISO 27001 A.9.4 + PIPEDA limiting access",
    why: "Personal information should only be reachable by the people whose role requires it. RBAC is how that gets enforced consistently across every page and API on the platform.",
    measures: [
      "Six distinct roles: trainee · evaluating · employer · instructor · admin · superadmin. Every page calls a typed requireRole() / requireSession() guard.",
      "API endpoints validate the same gates server-side — never client-only.",
      "View-as (admin / superadmin) lets staff preview other roles without escalating; only downgrade paths are allowed for plain admins.",
      "Phantom + demo accounts can never escalate to a 'real' account; magic-link tokens are scoped by accountKind defensively.",
    ],
    status: "met",
  },
  {
    id: "vendor",
    group: "Security",
    title: "Vendor security",
    authority: "ISO 27001 A.15 (supplier relationships)",
    why: "BHN inherits the security posture of its suppliers. We periodically review each one and prefer vendors with SOC 2 Type II or equivalent independent attestation.",
    measures: [
      "Postgres host: managed provider with SOC 2 Type II.",
      "Object storage: Cloudflare R2, Canadian-residency jurisdiction.",
      "Edge + serverless: Vercel — SOC 2 Type II.",
      "Email: provider with DKIM + SPF + DMARC enforced.",
      "AI: Cloudflare Workers AI — no customer data shared outside the platform's residency.",
    ],
    status: "met",
  },

  // ─── Operational resilience ─────────────────────────────────────
  {
    id: "backups",
    group: "Operational",
    title: "Backups + disaster recovery",
    authority: "Business continuity baseline",
    why: "A backup you can't restore from is not a backup. We target a Recovery Point Objective (RPO) of 24 hours and a Recovery Time Objective (RTO) of 4 hours for the production database.",
    measures: [
      "Managed Postgres provider runs daily automated snapshots + 7-day point-in-time recovery.",
      "Schema migrations are checked into git; every production deploy runs `prisma migrate deploy` so the schema is reproducible from source.",
      "Critical configuration (PlatformSetting, EditableCopy) round-trips through the same DB and is included in the snapshot scope.",
      "Restore drill performed on a quarterly cadence into a staging environment; documented in an internal runbook.",
    ],
    status: "partial",
    notes: "Cross-region replica is not yet provisioned — RTO depends on the primary region's recovery time. Slated for the Q3 infra pass.",
  },
];

export const STATUS_LABELS: Record<ComplianceStatus, { label: string; tone: "success" | "warning" | "info" | "neutral" }> = {
  met:             { label: "Met",             tone: "success" },
  partial:         { label: "Partial",         tone: "warning" },
  in_progress:     { label: "In progress",     tone: "info" },
  not_applicable:  { label: "Not applicable",  tone: "neutral" },
};
