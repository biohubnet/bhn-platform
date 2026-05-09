# 21 CFR Part 11 alignment plan

**Date:** 9 May 2026
**Audience:** GxP-regulated biotech / pharma customers; their quality auditors; BHN engineering
**Status:** engineering primitives in place; per-customer V&V documentation triggered on contract

## Executive summary

21 CFR Part 11 ("Electronic Records; Electronic Signatures") is the FDA rule that governs how electronic records and signatures must work in regulated industries. Health Canada has equivalent expectations, EU has Annex 11. For BHN — a training platform that GxP biotech / pharma customers may use as evidence of staff training — the relevant questions are: do learner training records meet "predicate rule" requirements (proven completed, traceable, attributable, signed)? Yes, with the controls below in place.

This document walks every clause of §11.10 (controls for closed systems) and §11.50 / §11.70 (electronic signatures), maps each to a BHN technical control, and notes where customer-side validation is required.

---

## §11.10 — Controls for closed systems

| Clause | Requirement | BHN control | Status |
|---|---|---|---|
| (a) | Validation of systems to ensure accuracy, reliability, consistent intended performance | This document + per-customer V&V (IQ/OQ/PQ template under [21-cfr-part-11-vv-template.md](./21-cfr-part-11-vv-template.md)) | Template ready; full V&V on first regulated customer |
| (b) | Generate accurate + complete copies of records in human-readable + electronic form | `/api/profile/export` exports learner data as JSON; per-course training certificate render available; learner audit log accessible at `/admin/audit` | ✅ Partial — JSON export complete; PDF training-record export is on follow-up list |
| (c) | Protection of records to enable accurate + ready retrieval throughout the records retention period | Postgres on Neon with PITR (7-day window), nightly backup retention, 7-year audit retention policy enforced | ✅ |
| (d) | Limiting system access to authorised individuals | Role-based access (trainee / evaluating / employer / instructor / admin / superadmin); per-resource ownership checks (`requireCourseOwner`); admin actions audit-logged | ✅ |
| (e) | Use of secure, computer-generated, time-stamped audit trails | `AuditLog` table; server-side writes only (no client-controlled timestamps); covers MFA enable/disable, password change, role change, course publish, e-sig creation | ✅ |
| (f) | Use of operational system checks to enforce permitted sequencing | Workflow guards in code (e.g., can't submit assessment without enrolment; can't issue certificate without passing) | ✅ |
| (g) | Use of authority checks | `requireRole`, `requireCourseOwner`, role-derived UI gates | ✅ |
| (h) | Use of device checks (where appropriate) | Not applicable — BHN runs in any modern browser; no specific device dependency. Documented as N/A. | ✅ |
| (i) | Persons developing, maintaining, or using electronic record / signature systems have the education, training, and experience to perform their assigned tasks | Engineering team competency documented in offer letters / role descriptions; new-hire training procedure (when team grows) | ⚠️ Minimal today (1-person team); formalises when team grows |
| (j) | Establishment of, and adherence to, written policies that hold individuals accountable for actions initiated under their electronic signatures | [Acceptable Use Policy](./acceptable-use-policy.md); user attests at signing per §11.50; termination procedures cover credential revocation | ✅ |
| (k1) | Documentation control: appropriate controls over systems documentation | All policy docs in `docs/security/`, version-controlled in git; dated; change log per file | ✅ |
| (k2) | Documentation control: revision and change control procedures | git history, PR review process, audit log on policy changes (when an admin updates a doc surfaced at `/admin/security`) | ✅ |

## §11.30 — Open systems

Not applicable — BHN is a closed system (controlled access, all interactions through authenticated session).

## §11.50 — Signature manifestations

| Clause | Requirement | BHN control |
|---|---|---|
| (a)(1) | Signed records contain printed name of the signer | `ElectronicSignature.signerId` joins to `User.name` at render time |
| (a)(2) | Signed records contain date and time when signature was executed | `performedAt` column, server timestamp, immutable |
| (a)(3) | Signed records contain meaning (review / approval / responsibility) | `meaning` column, captured verbatim from the attestation text the user saw |
| (b) | Items in (a)(1)-(3) shall be subject to the same controls as for electronic records and shall be included as part of any human-readable form of the electronic record | Signature record + signed record stored in same Postgres database; export combines both |

## §11.70 — Signature/record linking

| Clause | Requirement | BHN control |
|---|---|---|
| §11.70 | Electronic signatures shall be linked to their respective electronic records to ensure that signatures cannot be excised, copied, or otherwise transferred to falsify an electronic record | `ElectronicSignature.subjectType` + `subjectId` columns explicitly bind the signature to its record; signature is immutable once written; integrity preserved by the database constraint that no row can be altered post-write (enforced by application + DB triggers if needed in regulated mode) |

## §11.100 — General requirements for electronic signatures

| Clause | Requirement | BHN control |
|---|---|---|
| (a) | Each electronic signature shall be unique to one individual and shall not be reused | `User.email` is unique; `ElectronicSignature.signerId` is FK to that user; one user = one identity |
| (b) | Before an organisation establishes, assigns, certifies, or otherwise sanctions an individual's electronic signature, the organisation shall verify the identity of the individual | Account creation flow includes email verification; for regulated deployments, customer admin verifies identity before activating the user |
| (c)(1) | Persons using electronic signatures shall, prior to or at the time of such use, certify that the signatures intended to be the legally binding equivalent of traditional handwritten signatures | One-time attestation at first electronic signature; recorded in `AuditLog` as `esignature.first_use_attestation`; future signings reference this on-record attestation |
| (c)(2) | Persons using electronic signatures, upon agency request, shall provide additional certification or testimony that a specific electronic signature is the legally binding equivalent of the signer's handwritten signature | Customer-admin-initiated process; signature record + audit log retained for 7 years per [data-retention.md](./data-retention.md) |

## §11.200 — Electronic signature components and controls

| Clause | Requirement | BHN control |
|---|---|---|
| (a)(1)(i) | Non-biometric signatures shall employ at least two distinct identification components such as an identification code and password | User ID (email) + password; **for regulated mode** (`BHN_PART11_REQUIRE_PASSWORD=true`) the password is re-entered at every signing |
| (a)(1)(ii) | When an individual executes a series of signings during a single, continuous period of controlled system access, the first signing shall be executed using all electronic signature components; subsequent signings shall be executed using at least one electronic signature component that is only executable by, and designed to be used only by, the individual | Customer-configurable: default mode reuses session for subsequent signings; regulated mode requires password every time |
| (a)(1)(iii) | When an individual executes one or more signings not performed during a single, continuous period of controlled system access, each signing shall be executed using all of the electronic signature components | Always — sessions expire; new session = full re-auth; session timeout configurable |
| (a)(2) | Be used only by their genuine owners | MFA opt-in adds a second factor; brute-force lockout prevents share-and-guess attacks |
| (a)(3) | Be administered and executed to ensure that attempted use of an individual's electronic signature by anyone other than its genuine owner requires collaboration of two or more individuals | MFA via personal device + password covers; admin password-reset flow logs the reset action and requires the user to re-enrol MFA |
| (b) | Electronic signatures based upon biometrics shall be designed to ensure that they cannot be used by anyone other than their genuine owners | Not applicable — BHN doesn't use biometric signatures |

## §11.300 — Controls for identification codes / passwords

| Clause | Requirement | BHN control |
|---|---|---|
| (a) | Maintaining the uniqueness of each combined identification code and password, such that no two individuals have the same combination | Email is unique; password is per-user; bcrypt-12 hashed |
| (b) | Ensuring that identification code and password issuances are periodically checked, recalled, or revised | Password policy enforced (see [password-policy.ts](../../src/lib/security/password-policy.ts)); `passwordUpdatedAt` column tracks last change; future enhancement: forced rotation N days for regulated deployments (today: not enforced) |
| (c) | Following loss management procedures to electronically deauthorise lost, stolen, missing, or otherwise potentially compromised tokens, cards, and other devices that bear or generate identification code or password information, and to issue temporary or permanent replacements using suitable, rigorous controls | Account-disable flow (`isActive: false`); session invalidation (NextAuth); password reset is cryptographic-token-based; admin can disable an account in <1 minute |
| (d) | Use of transaction safeguards to prevent unauthorised use of passwords and/or identification codes, and to detect and report in an immediate and urgent manner any attempts at their unauthorised use to the system security unit, and, as appropriate, to organisational management | Brute-force lockout (5 fails → 30-min lock); audit log of `auth.login_locked` events; admin can review at `/admin/audit` |
| (e) | Initial and periodic testing of devices, such as tokens or cards, that bear or generate identification code or password information to ensure that they function properly and have not been altered in an unauthorised manner | TOTP devices: authenticator-app verification at setup (verify-setup endpoint); each subsequent sign-in re-verifies the TOTP code; failed verification → audit log |

---

## What customer-side V&V looks like

For customers in regulated GxP contexts, BHN provides:

1. **A pre-filled IQ template** — Installation Qualification: confirms the deployment matches the documented architecture (which Vercel region, which Neon region, which Cloudflare zone, which environment variables are set).

2. **A pre-filled OQ template** — Operational Qualification: walks through 30+ test cases (login, MFA, course completion, e-signature capture, password change, account lockout, audit log review, deletion request) with expected outputs.

3. **A PQ skeleton** — Performance Qualification: customer fills in for their specific workflows.

These live in [21-cfr-part-11-vv-template.md](./21-cfr-part-11-vv-template.md) (template) and become per-customer signed documents.

## What's still on the to-do for full Part 11 alignment

- **Forced password rotation** for regulated deployments (env-gated) — engineering scope: 2 days
- **PDF training record export** with embedded signatures — engineering scope: 3 days; needs author approval on the layout
- **Full V&V execution + signed report** — done with the customer, on contract; consultant fee budgeted at $5–15K CAD per engagement
- **Annual periodic review** (Part 11 §11.10(a)) — calendar reminder + documented re-validation each year — operational, not engineering

---

## Change log

| Date | Change |
|---|---|
| 2026-05-09 | Initial draft. Engineering primitives shipped: e-signatures, audit log extensions, MFA, password policy, brute-force lockout. |
