# Data retention & deletion policy

**Date:** 9 May 2026
**Audience:** customers (DPA backing), audit, internal engineering reference
**Owner:** Engineering + legal

## Executive summary

User data is **kept for as long as the user has an active account**, with category-specific retention windows for derived data. On deletion request the active account record is purged within 30 days; an audit / regulatory subset is retained per the schedule below. We never sell personal data; we never use customer data to train AI models.

---

## Retention by data category

| Category | Where it lives | Retention while active | After deletion |
|---|---|---|---|
| **Account profile** (name, email, hashed password, role, locale, jobTitle, country, phone, bio) | Postgres `User` row | Indefinite while active | Purged within 30 days |
| **Authentication artifacts** (TOTP secret, magic-link token, email-verify token, login attempt counters) | Postgres `User` row | Until rotated or expired | Purged within 30 days |
| **Course progress** (`Enrollment`, `ModuleProgress`, `AssessmentAttempt`) | Postgres | Indefinite while active | Purged within 30 days |
| **Certificates** | Postgres `Certificate`, public verification URL | Indefinite while active | Anonymised (signer name → "Removed user") within 30 days; **certificate ID kept indefinitely** for verification integrity |
| **My Application artifacts** (resume, video intro, elevator pitch) | R2 + Postgres URL fields | Indefinite while active | R2 objects + DB pointers purged within 30 days |
| **Form submissions** (talent application, employer applicants) | Postgres `EventFormSubmission` + R2 file uploads | Indefinite while active | Purged within 30 days **except** rows where the trainee submitted to an employer who has an active hiring decision in flight — those rows are retained until the employer marks the decision closed (max 12 months) |
| **Application status** (kanban stage on internships) | Postgres `ApplicationStatus` | Indefinite while active | Purged within 30 days |
| **Bookmarks, saved postings, review cards** | Postgres | Indefinite while active | Purged within 30 days |
| **Hint interactions** (when AI tutor ships) | Postgres `HintInteraction` | 90 days | Purged within 30 days of deletion request |
| **Skill claims** (`UserSkill`, skill ontology mappings) | Postgres + pgvector | Indefinite while active | Purged within 30 days |
| **Mastery state, BKT data** (when shipped) | Postgres | Indefinite while active | Purged within 30 days |
| **Audit log entries** | Postgres `AuditLog` | **7 years** (regulatory minimum for GxP / Part 11; SOC 2 minimum is 1 year) | Actor name → "Removed user"; **action records retained for 7 years** |
| **Electronic signatures** (`ElectronicSignature`) | Postgres | **7 years** (Part 11 §11.10(c) — controls for protecting records to ensure their accuracy throughout the records retention period) | Signer name → "Removed user"; **signature records retained for 7 years** |
| **Cookie consent records** | localStorage (client-side) + Postgres if logged | Until user changes consent | Cleared on browser data clear / account deletion |
| **Analytics events** (when analytics consent = on) | Postgres `analytics_event` | 90 days rolling | Purged within 30 days of deletion request |

## What happens on deletion request

User flow:
1. User initiates from `/profile` → "Delete my account" (existing flow at `/api/profile/delete`)
2. We immediately **deactivate** the account (sign-in disabled, sessions invalidated)
3. Within 30 days, we run the purge process:
   - Hard-delete: profile, course data, files, bookmarks, application drafts (per table above)
   - Anonymise: audit log entries (`actorId` retained, name + email replaced with "Removed user"), certificates (verification ID retained, learner name replaced), electronic signatures (signerId retained, name replaced)
   - Backups: deletion is propagated to Neon point-in-time recovery (PITR) within 7 days; the 7-day recovery window means a deleted account may briefly exist in PITR snapshots before rotation
4. Within 60 days, audit log entry confirms purge completion: `auditLog.action = "user.purge_complete"` (no PII in detail field)
5. Admin can revoke the deletion **only within the 30-day window** — beyond that the data is gone

## Why some data is kept beyond deletion

- **Certificate verification integrity**: a removed-user's certificate ID stays valid as a public-trust artifact. We anonymise the name but keep the ID + course + completion date.
- **Audit log + electronic signatures**: these are *the* artifact that proves who-did-what for SOC 2 + Part 11 audit. Deletion would defeat the audit purpose. We anonymise so the personal data is gone but the regulatory record stands.
- **Form submissions tied to active hiring**: deleting mid-process would lose the employer's view of an applicant they're actively considering. We hold for max 12 months, capped by the kanban "decision made" state.

## How retention windows are enforced

- **30-day deletion**: triggered by the `/api/profile/delete` request handler; runs as a single transaction with cascade deletes on the relevant Prisma relations
- **7-year audit retention**: enforced by an annual cleanup job (when implemented) that removes audit log rows older than 7 years from the deletion-request date
- **90-day analytics rolling**: enforced by `analytics-cleanup` cron (Vercel `vercel.json` daily)
- **PITR rotation**: managed by Neon (default 7-day window in production)

## Customer-controlled retention

Enterprise customers can negotiate shorter retention via DPA addendum:
- Faster deletion (e.g., 7 days instead of 30) — possible
- Shorter audit retention (e.g., 1 year) — possible only for non-regulated workloads; impossible for Part 11 customers because §11.10(c) overrides

Longer retention is **not** offered — we don't carry customer data we no longer need.

## What we don't do

- **No model training on customer data.** Cloudflare Workers AI does not retain prompts; we don't pipe data to any third-party LLM training process.
- **No sale or sharing of personal data** for any purpose. Period.
- **No retention beyond the schedule above** for marketing or analytics. The 90-day analytics window is an upper bound, not a target.

## Change log

| Date | Change |
|---|---|
| 2026-05-09 | Initial draft |
