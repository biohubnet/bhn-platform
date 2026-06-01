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
      "Access requests + erasure requests are routed through support@biohubnet.ca with a 30-day SLA.",
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
    evidenceHref: "/admin/security/policies/sub-processors",
    evidenceLabel: "Policy · Sub-processors",
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
    evidenceHref: "/admin/security/policies/data-retention",
    evidenceLabel: "Policy · Data retention",
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
    evidenceHref: "/admin/security/policies/acceptable-use-policy",
    evidenceLabel: "Policy · Acceptable Use",
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
    evidenceHref: "/admin/security/policies/encryption-posture",
    evidenceLabel: "Policy · Encryption posture",
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
      "Sandbox account spawning has been retired; admins use the sidebar View-as role-switcher to preview a different role from their own seat.",
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
    evidenceHref: "/admin/security/policies/sub-processors",
    evidenceLabel: "Policy · Sub-processors",
  },

  {
    id: "owasp-top10",
    group: "Security",
    title: "OWASP Top 10 (2021) alignment",
    authority: "OWASP Foundation — industry baseline",
    why: "The OWASP Top 10 is the most widely-cited checklist of critical web-application security risks. Mapping against it gives leadership a consistent vocabulary for risk discussion and ensures the most common attack classes are formally reviewed on a recurring basis.",
    measures: [
      "A03 Injection: all DB writes use Prisma ORM parameterised queries — no string-concatenated SQL.",
      "A07 Auth failures: bcrypt passwords, TOTP MFA, account lockout, single-use e-mail codes.",
      "A01 Broken access control: per-route requireRole() guards, IDOR guard on course ownership.",
      "A10 SSRF: no user-supplied URLs are fetched server-side.",
      "Internal pen-test review completed May 2026; findings tracked in docs/security/2026-05-25-owasp-phipa-pentest-review.md.",
    ],
    status: "partial",
    evidenceHref: "/admin/security",
    evidenceLabel: "Security dashboard",
    notes: "Pen test identified 1 critical (LTI JWT verification), 3 high, and 5 medium findings. HTTP security headers (A05) and a catch-all middleware layer (defence-in-depth for A01) are on the Q3 backlog. Detailed remediation roadmap in the May 2026 security report.",
  },
  {
    id: "lti-security",
    group: "Security",
    title: "LTI 1.3 JWT signature verification",
    authority: "IMS Global LTI 1.3 specification (security model)",
    why: "LTI 1.3 uses signed JWTs to authenticate learners from institutional learning management systems. Without signature verification, a forged JWT can auto-provision accounts and enrol them in arbitrary courses — the platform's identity assurance for LTI-sourced users depends entirely on this check.",
    measures: [
      "LtiConfig model stores keysetUrl, clientId, and deploymentId per integration.",
      "LTI launch endpoint exists and decodes JWT claims correctly.",
    ],
    status: "in_progress",
    evidenceHref: "/admin/security",
    evidenceLabel: "Security dashboard",
    notes: "CRITICAL: The JWT signature is not yet verified against the platform's JWKS endpoint. The route is live but must not be connected to a real LMS until verification is implemented. Targeted for the next sprint.",
  },
  {
    id: "input-validation",
    group: "Security",
    title: "Structured input validation",
    authority: "OWASP A04 (Insecure Design) + A03 (Injection) — industry baseline",
    why: "Server-side input validation ensures that malformed, oversized, or unexpected values are rejected before they reach business logic or the database layer — independent of whether the ORM parameterises them correctly.",
    measures: [
      "File uploads: MIME type checks, extension allowlists, and max-size limits enforced on logo, video, SCORM, and document routes.",
      "Invite-claim token: single-use check + expiry enforced before the token value is trusted.",
      "Password: policy library (min-10-chars, breach-list, identity-substring) enforced on every write.",
      "Role assignment: allowlist enforced on batch and role-requests routes.",
    ],
    status: "partial",
    evidenceHref: "/admin/security",
    evidenceLabel: "Security dashboard",
    notes: "No centralised schema-validation library (Zod, Yup) is used — each route validates manually. This is sufficient where it exists but inconsistent: the admin collection PATCH route (May 2026 pen test, PT-02) had no role allowlist. Recommend Zod middleware on all PATCH/POST routes as a Q3 hardening pass.",
  },
  {
    id: "rate-limiting",
    group: "Security",
    title: "Rate limiting + bot protection",
    authority: "OWASP A07 (credential stuffing) + CASL (spam prevention)",
    why: "Without rate limiting, registration, login, and public-facing form endpoints are vulnerable to credential-stuffing, account-enumeration, and spam campaigns that can exhaust database capacity or bypass soft controls.",
    measures: [
      "Login lockout: 5 failed attempts → 30-minute lock per account.",
      "Passwordless codes: 5-attempt cap, 10-min TTL, 30-s re-send cooldown.",
      "Access-request form: 3 submissions per email per 24h.",
      "Turnstile (Cloudflare CAPTCHA) on registration, gated by TURNSTILE_ENABLED env.",
      "Phantom account deletion: hourly sweep removes expired test accounts.",
    ],
    status: "partial",
    evidenceHref: "/admin/security",
    evidenceLabel: "Security dashboard",
    notes: "No API-level rate limiting middleware. The analytics track endpoint (PT-09) and access-request form (PT-08) lack CAPTCHA/rate-limiting and are targets for the next hardening pass. Edge-level rate limiting via Vercel WAF or a middleware file is the recommended approach.",
  },
  {
    id: "phipa",
    group: "Privacy",
    title: "PHIPA — Ontario Personal Health Information Protection Act",
    authority: "Ontario · Information and Privacy Commissioner",
    why: "PHIPA governs the collection, use, and disclosure of personal health information (PHI) by 'health information custodians' in Ontario. BHN's user community includes researchers and HQP trainees at PHIPA-regulated institutions.",
    measures: [
      "No PHI (patient identifiers, clinical records, diagnostic data) is collected or processed by the platform. BHN is not a health information custodian under PHIPA s. 3(1).",
      "EQUIP grant applications describe health research projects but do not identify patients or research participants.",
      "PHIPA-aligned practices maintained voluntarily: minimum-necessary access (RBAC), data minimisation (no health fields in schema), individual access rights (profile self-edit + admin-mediated deletion).",
    ],
    status: "not_applicable",
    notes: "PHIPA direct obligations do not apply to BHN. Recommend adding a one-paragraph PHIPA scope statement to the public Privacy Policy clarifying non-custodian status. BHN's grantees operating under PHIPA are responsible for their own compliance.",
  },
  // ─── Operational resilience ─────────────────────────────────────
  {
    id: "incident-response",
    group: "Operational",
    title: "Incident response + breach notification",
    authority: "PIPEDA breach-notification + ISO 27001 A.16",
    why: "PIPEDA requires notification to affected individuals + the Office of the Privacy Commissioner where a breach of security safeguards creates a real risk of significant harm. Predictable response procedures + pre-written notification templates cut hours off the response time.",
    measures: [
      "Documented incident-response runbook covering detect / triage / contain / eradicate / recover / lessons-learned.",
      "Pre-written breach notification templates for trainees, partner institutions, and the OPC — drafted offline so we're not writing them under pressure.",
      "Severity scale (SEV 1–4) with decision criteria for invoking notification.",
      "Quarterly tabletop drill documented in the runbook.",
    ],
    status: "partial",
    evidenceHref: "/admin/security/policies/incident-response",
    evidenceLabel: "Policy · Incident response",
    notes: "Runbook is documented; first live tabletop drill is on the calendar for next quarter.",
  },
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
    evidenceHref: "/admin/security/policies",
    evidenceLabel: "Policy hub",
    notes: "Cross-region replica is not yet provisioned — RTO depends on the primary region's recovery time. Slated for the Q3 infra pass.",
  },
];

export const STATUS_LABELS: Record<ComplianceStatus, { label: string; tone: "success" | "warning" | "info" | "neutral" }> = {
  met:             { label: "Met",             tone: "success" },
  partial:         { label: "Partial",         tone: "warning" },
  in_progress:     { label: "In progress",     tone: "info" },
  not_applicable:  { label: "Not applicable",  tone: "neutral" },
};
