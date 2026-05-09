# Sub-processor list

**Date:** 9 May 2026
**Purpose:** disclose every third-party data processor BHN relies on, with each vendor's compliance posture and data-residency claims. Required by GDPR Art. 28 (sub-processor disclosure) and standard in any enterprise DPA.

## Executive summary

BHN's processing relies on five infrastructure sub-processors and one optional sub-processor (SMTP). All five core providers are SOC 2 Type II certified at minimum; four are also ISO 27001 certified. Default data residency for production workloads is Canada (Vercel `cdg1` / `iad1` regions, Neon Postgres in `ca-central-1`). Custom EU residency available on request — see [data-retention.md](./data-retention.md).

---

## Active sub-processors

### Vercel
- **Role:** application hosting, edge cache, build pipeline
- **Data processed:** every HTTP request to `bhn-training-platform.vercel.app` (request bodies, response bodies, IP addresses, user-agent strings)
- **Region:** primary `iad1` (US-East) by default; configurable per deployment
- **Compliance:** SOC 2 Type II ✓, ISO 27001 ✓, ISO 27017 ✓, ISO 27018 ✓, GDPR-compliant DPA available
- **DPA:** [vercel.com/legal/dpa](https://vercel.com/legal/dpa)

### Neon (Postgres)
- **Role:** primary application database
- **Data processed:** all user records, course content, assessment data, audit logs, `electronicSignature` records
- **Region:** `ca-central-1` (Montreal)
- **Compliance:** SOC 2 Type II ✓, GDPR-compliant DPA available, encryption at rest (AES-256), point-in-time recovery
- **DPA:** [neon.tech/dpa](https://neon.tech/dpa)

### Cloudflare
- **Role:** R2 object storage (resumes, video introductions, SCORM packages, course thumbnails); Workers AI (LLM inference, embeddings, image generation); Turnstile (CAPTCHA when env-gated)
- **Data processed:**
  - R2: file uploads (resumes, videos, SCORM zip extracted contents)
  - Workers AI: prompt + completion text for course summaries, AI tutor hints (when shipped), thumbnail prompts
  - Turnstile: client IP + browser fingerprint at registration
- **Region:** R2 — `WNAM` (Western North America) by default; Workers AI — distributed edge
- **Compliance:** SOC 2 Type II ✓, ISO 27001 ✓, ISO 27018 ✓, GDPR-compliant DPA, encryption at rest, FedRAMP Moderate (US gov)
- **DPA:** [cloudflare.com/cloudflare-customer-dpa/](https://www.cloudflare.com/cloudflare-customer-dpa/)

### NextAuth.js (self-hosted)
- **Role:** authentication library; runs in BHN's Vercel functions; data stays in BHN's Postgres
- **Sub-processor status:** **not** a sub-processor — runs entirely on BHN-controlled infrastructure
- **Compliance:** code-level audit (open source); no data leaves the BHN environment

### SMTP provider (optional)
- **Role:** transactional email — verification links, password resets, change-of-email confirmations
- **Provider:** configurable via `SMTP_HOST` / `SMTP_USER` env vars; not yet committed to a specific vendor
- **Data processed:** recipient email address, email subject, body (containing verification token, no PII beyond email)
- **Recommended providers (in order of compliance posture):** AWS SES (SOC 2 Type II, GDPR DPA), SendGrid (SOC 2 Type II, ISO 27001, GDPR DPA), Postmark (SOC 2 Type II, GDPR DPA)
- **Status:** SMTP env not yet configured in production; email-verification flow operates in advisory mode without it

---

## Optional sub-processors (env-gated, not active by default)

### Cloudflare Turnstile (CAPTCHA)
- Activated only when `NEXT_PUBLIC_TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY` are set
- Already covered above under Cloudflare entry

### Mailchimp / similar ESP (newsletter)
- Not currently a sub-processor — newsletter intent is captured but export to ESP is manual via `/admin/newsletter`
- Once an ESP is integrated, this section grows

### Stripe / payment processor
- Not currently active — BHN uses internal credits, no card processing
- Will be added when e-commerce ships

---

## What about LLM providers?

- **Cloudflare Workers AI** is the only LLM provider currently in use. Models (Llama 3.3, BGE, SDXL Lightning) run on Cloudflare's edge. No data is sent to OpenAI, Anthropic, Google, or Cohere.
- Workers AI does **not** retain prompts for model training (per Cloudflare's published policy).
- Per-org token budgets are documented in the AI tutor design but enforced when that feature ships.

---

## Data residency — at a glance

| Data category | Default region | Configurable? |
|---|---|---|
| User records (Postgres) | `ca-central-1` (Montreal) | Yes — Neon multi-region |
| Files (R2) | `WNAM` | Yes — per-bucket region pinning |
| Application hosting (Vercel) | `iad1` (US-East) | Yes — multi-region edge |
| LLM inference | Cloudflare global edge | No — Cloudflare model |
| Email (when configured) | Provider-dependent | Per provider |

**EU residency option:** available on request; involves switching to Neon `eu-central-1` and Vercel `cdg1` + R2 `WEUR`. Requires a per-deployment configuration; no data migration tooling today.

---

## How to update this document

Any new third-party SaaS that touches user data is added to this list **before** it's deployed. The PR that adds it must update this file. Open issues with the label `compliance:subprocessor` if you spot a gap.

**Last reviewed:** 9 May 2026
**Next review:** 9 November 2026 or on any sub-processor change, whichever first
