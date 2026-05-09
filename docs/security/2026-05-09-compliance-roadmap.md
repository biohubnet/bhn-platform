# Compliance roadmap — 2026

**Date:** 9 May 2026
**Audience:** BioHubNet leadership; budget owners; legal counsel
**Owner:** Engineering
**Status:** active

---

## Executive summary

BHN today has **strong technical security primitives** for its size (CodeQL, Dependabot, R2 token paths, course-ownership authorisation, audit logging, public disclosure policy) but **zero formal certifications**. The gap is procurement / process, not engineering. This document lays out which standards matter for BHN's likely customer base, what's already done, what we're shipping in code this week (no budget needed), and what requires leadership sign-off on spend.

**Three standards matter today:**

| Standard | Purpose | When BHN needs it | Estimated annual cost |
|---|---|---|---|
| **SOC 2 Type II** | Generic enterprise-trust audit | First North American enterprise sale | $30–50K CAD year 1; $20–30K thereafter |
| **GDPR + PIPEDA + Canadian provincial** | Privacy law compliance | Already required (any EU or CA user) | $2–3K CAD legal / year |
| **21 CFR Part 11** | FDA electronic-records rule for biomanufacturing | First GxP biotech customer | $5–15K CAD one-time V&V; bundled into engineering thereafter |

Other frameworks (ISO 27001, FERPA, HIPAA, FedRAMP) are deliberately **deferred** — see Out of Scope below.

---

## What's already done (engineering, no spend)

- **Authentication**: bcrypt-hashed passwords (12 rounds); JWT sessions; magic-link tokens from `crypto.randomBytes(32)` (256 bits).
- **MFA / TOTP**: Opt-in second factor via `otplib`, RFC 6238 compatible (Google Authenticator, 1Password, Authy). Enabled per user from `/profile/security`. _Shipped 9 May 2026._
- **Brute-force lockout**: 5 fails → 30-minute account lock. Resets on successful sign-in. _Shipped 9 May 2026._
- **Password policy**: minimum 10 characters, top-200 breached-password rejection, identity-substring rejection. _Shipped 9 May 2026._
- **Email verification flow** with 7-day token expiry (env-gated for sign-in enforcement).
- **Cloudflare Turnstile** CAPTCHA on registration (env-gated).
- **Authorisation**: role-based (trainee / evaluating / employer / instructor / admin / superadmin) plus per-resource ownership (`requireCourseOwner`) closed in Canvas-breach response May 8.
- **Storage**: 128-bit cryptographic random tokens in R2 paths so URLs are unguessable; signed-URL primitive ready to flip the bucket private; cleanup of orphaned objects on replace.
- **Database**: Prisma parameterised queries throughout; zero raw SQL.
- **Transport**: HTTPS forced via Vercel; HSTS auto-enabled.
- **CI security**: CodeQL `security-extended` on every push + PR + weekly cron; npm audit + TruffleHog secret scanning per PR; Dependabot weekly version + immediate security updates.
- **Audit log**: Privileged actions written to `AuditLog` table; visible at `/admin/audit`. _Extended 9 May 2026 to cover MFA enable/disable, password change, login-locked events, e-signatures._
- **Electronic signatures (21 CFR Part 11 §11.50 / §11.70)**: `ElectronicSignature` table + `/api/signatures` capture endpoint. Optional re-auth-on-sign mode via `BHN_PART11_REQUIRE_PASSWORD=true` for regulated deployments. _Shipped 9 May 2026._
- **Public security disclosure**: `/security` page + `/.well-known/security.txt` (RFC 9116) + 72-hour acknowledgement SLA + safe-harbour clause.
- **Internal report library**: `/admin/security` renders Markdown reports under `docs/security/` for admins. This document lives there.

## What's documented this week (no spend)

Each lives under `docs/security/` and surfaces at `/admin/security`:

- Compliance roadmap (this file)
- Information security policy
- Acceptable use policy
- Records of Processing Activities (GDPR Art. 30)
- Sub-processor list with each vendor's compliance posture
- Data retention & deletion policy
- Incident response runbook + breach-notification templates (GDPR + Canadian OPC + state breach laws)
- Cross-border data transfer declaration
- Encryption-posture statement
- Pentest procurement playbook (already shipped)
- Canvas-breach pre-emptive review (already shipped)
- 21 CFR Part 11 alignment plan + V&V template

These are the documents an auditor / customer security questionnaire / privacy lawyer will ask for. Now they exist in version control rather than living in someone's head.

---

## Decision items — leadership must approve $$ spend

| # | Item | One-time | Annual | Recommendation | Trigger |
|---|---|---|---|---|---|
| 1 | **SOC 2 readiness platform** (Drata or Vanta) | $0 | **$10–15K USD** | **Recommended** — cuts SOC 2 prep from 6 months to 3 | Any time we commit to SOC 2 |
| 2 | **SOC 2 Type II audit** (AICPA-registered firm) | **$15–25K CAD** year 1 | $10–20K CAD | **Recommended before first enterprise sale** | First enterprise prospect that asks (Astra, Roche, Amgen, Apotex …) |
| 3 | **Third-party penetration test** (1-day targeted) | **$3–5K CAD** | repeat annually | **Recommended Q3 2026** | Required for SOC 2; useful pre-launch in any case |
| 4 | **Privacy lawyer** (Canadian) — review of Privacy Policy + DPA template | **$1–2K CAD** | $1K CAD update | **Recommended** | Now — DPAs come up in any enterprise contract |
| 5 | **Cyber liability insurance** | $0 | **$5–15K CAD** | **Recommended after first paid customer** | First contract that requires it (most enterprise contracts do) |
| 6 | **Background checks** (employees with PII access) | $0 | ~$200 / hire | Required for SOC 2 CC1.4 | When team grows beyond solo ops |
| 7 | **GxP / Part 11 consultant** — review V&V plan, IQ/OQ/PQ | **$5–15K CAD** | $0 (annual review optional) | Required if first biotech customer asks for Part 11 | First biotech procurement asks |
| 8 | **ISO 27001 audit** | $20–40K CAD | $15–25K CAD | **Deferred** — pursue only if European enterprise demand emerges | European enterprise prospect, post-SOC 2 |
| 9 | **Dedicated security/compliance hire** | $0 | **$80–150K CAD** | **Defer** until team > 10 or customers > 5 | Headcount trigger |
| 10 | **DPO (GDPR Art. 37)** | $0 | $30–50K CAD if outsourced | **Deferred** — typically not triggered for our data classes | Only if processing special-category data at scale |

**Recommended 2026 minimum spend: ~$50K CAD all-in.**
- Drata / Vanta: $12K USD
- SOC 2 audit (start in Q3): $20K CAD
- Pentest: $5K CAD
- Lawyer: $2K CAD
- Cyber insurance: $10K CAD

**Recommended 2026 expanded spend (if first GxP / European customer lands): ~$70K CAD.**
- Above + Part 11 consultant: $10K CAD
- Above + lawyer extension: $1K CAD

---

## What we're explicitly NOT doing (and why)

- **HIPAA**: BHN training content does not include patient health information. Trigger only if a customer specifically processes PHI in BHN.
- **FedRAMP**: US federal procurement only. Not in BHN's customer pipeline.
- **FERPA**: US student-records law. Triggered only by US higher-ed customers. Higher-ed is not BHN's positioning.
- **PCI-DSS Level 1**: We don't process credit card numbers (BHN credits + invoiced payments). Defer until e-commerce ships.
- **GLBA**: Financial data. Not relevant.
- **Multi-tenant retrofit**: Documented separately. Not strictly compliance — but listed here because some buyers conflate "multi-tenant" with "secure". It's an architecture decision, not a security one.

---

## Timeline

| Phase | Window | Output |
|---|---|---|
| **Phase 1 — Engineering hardening + documentation** | May 2026 (now) | MFA, lockout, password policy, e-sig, all `docs/security/*.md` documents |
| **Phase 2 — Procurement decisions** | June 2026 | Leadership approves the spend plan above |
| **Phase 3 — SOC 2 readiness** | June–August 2026 | Drata/Vanta onboarded, gaps closed, lawyer review of policies, penetration test |
| **Phase 4 — SOC 2 observation period** | August–November 2026 | 3-month evidence-collection period |
| **Phase 5 — SOC 2 audit + report** | November 2026 — January 2027 | Type II report ready for buyers |

GDPR + PIPEDA conformance is **continuous**, not phased — we're aligned today subject to the lawyer review (Phase 3).

21 CFR Part 11 alignment is **on demand** — we have the engineering pieces (e-signatures, audit log, password policy). The V&V documentation gets done when the first biotech buyer requests it; budget is pre-approved as item #7 above.

---

## What changes for the engineering team

- **Code reviews now check**: every new mutation endpoint includes audit-log writes for the relevant action; every new schema field with PII goes into the data-retention policy.
- **No new dependencies without a CycloneDX entry**. Sub-processor list updates on any new third-party SaaS integration.
- **Quarterly tabletop exercise** — walk through the incident response runbook together; document gaps. First one: late June 2026.

---

## Open questions for leadership

1. **Approve Phase 2 spend?** (Drata, SOC 2 audit, pentest, lawyer, insurance — ~$50K CAD this year.)
2. **Single-tenant or multi-tenant architecture?** Affects whether SOC 2 controls per-customer or per-deployment. Not a compliance decision but a structural one that gates a lot of enterprise deals.
3. **First target enterprise buyer?** Knowing the buyer tells us which standards to prioritise.
4. **Liability allocation in contracts?** Requires legal review of our standard MSA before any enterprise sale.
5. **Background-check budget?** Currently $0 because team is one person. Triggers on first employee or contractor with PII access.

Decisions on these unblock Phase 2 and 3.
