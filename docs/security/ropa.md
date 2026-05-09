# Records of Processing Activities (ROPA)

**Date:** 9 May 2026
**Required by:** GDPR Art. 30 (data controllers must maintain a record of processing activities); PIPEDA Schedule 1 (accountability); useful for SOC 2 CC1.4 (organisational structure / responsibility).

## Executive summary

This document lists every distinct processing activity BHN performs on personal data: what's processed, why, what legal basis applies, who it's shared with, and how long we keep it.

Data subject categories: **trainees**, **instructors**, **employers (HR contacts)**, **administrators**.

---

## Activity 1 — Account creation & sign-in

| | |
|---|---|
| **Purpose** | Allow trainees, instructors, employers to access training, post jobs, manage learners |
| **Legal basis (GDPR)** | Contract performance (Art. 6(1)(b)) |
| **Legal basis (PIPEDA)** | Consent (Schedule 1 Principle 4.3) — implicit at account creation |
| **Data categories** | Email, hashed password, name, role, locale, optional jobTitle/country/phone |
| **Data subjects** | All registered users |
| **Recipients** | Internal staff (admin/superadmin); never sold or shared externally |
| **Sub-processors** | Vercel (request handling), Neon (storage), SMTP provider (verification email) |
| **Cross-border transfer** | Yes — to Vercel (US), Cloudflare global edge; mitigated via SCCs in DPAs |
| **Retention** | While account active; 30 days post-deletion (see [data-retention.md](./data-retention.md)) |
| **Security measures** | bcrypt-12 password hash, TOTP MFA opt-in, brute-force lockout, HTTPS-only, audit-logged |

## Activity 2 — Course delivery + assessment

| | |
|---|---|
| **Purpose** | Deliver training content; record completion, assessment scores, time spent |
| **Legal basis (GDPR)** | Contract performance |
| **Legal basis (PIPEDA)** | Consent |
| **Data categories** | Enrolment, module progress, assessment attempts (answers + scores), credentials earned |
| **Data subjects** | Trainees |
| **Recipients** | Trainee themselves; their instructor (if assigned); admins; their employer (if explicitly enrolled via employer portal) |
| **Sub-processors** | Vercel, Neon, Cloudflare R2 (for video module assets, SCORM packages) |
| **Cross-border transfer** | Yes — see Activity 1 |
| **Retention** | While account active; 30 days post-deletion; certificates retain anonymised verification record indefinitely |
| **Security measures** | Authorisation per course (`requireCourseOwner`), tokenised R2 paths, audit log of any admin overrides |

## Activity 3 — Talent application & job matching

| | |
|---|---|
| **Purpose** | Allow trainees to share resume / video / pitch with employers; allow employers to track applicants |
| **Legal basis (GDPR)** | Contract performance with the trainee; legitimate interest with the employer (recruitment) |
| **Legal basis (PIPEDA)** | Consent (explicit in application submission UI) |
| **Data categories** | Resume PDF, video introduction file, elevator pitch text, application form responses, skill claims, application status |
| **Data subjects** | Trainees applying; employers reviewing |
| **Recipients** | The specific employer the trainee applied to; admins for moderation |
| **Sub-processors** | Cloudflare R2 (resume + video files), Vercel, Neon |
| **Cross-border transfer** | Yes — see Activity 1 |
| **Retention** | While account active; 30 days post-deletion **except** if an employer has an active hiring decision in flight (max 12 months) |
| **Security measures** | 128-bit cryptographic random tokens in R2 paths so URLs aren't enumerable; signed-URL primitive available |

## Activity 4 — AI features

| | |
|---|---|
| **Purpose** | Generate course summaries; generate thumbnails; (when shipped) provide scaffolded hints |
| **Legal basis (GDPR)** | Contract performance / legitimate interest in service quality |
| **Legal basis (PIPEDA)** | Consent at registration covers service-improvement processing |
| **Data categories** | Course title + description (no PII); when AI tutor ships: question text + learner free-text input (PII stripped before sending to model) |
| **Data subjects** | Trainees (when AI tutor ships); content authors (course summaries) |
| **Recipients** | Cloudflare Workers AI (no retention for training, per Cloudflare policy) |
| **Sub-processors** | Cloudflare Workers AI |
| **Cross-border transfer** | Yes — Cloudflare global edge |
| **Retention** | Course summaries / thumbnails: while course exists. Hint interactions (when shipped): 90 days |
| **Security measures** | PII stripping pre-LLM call (when AI tutor ships), rate-limited, no model-training contribution |

## Activity 5 — Authentication & security

| | |
|---|---|
| **Purpose** | Verify identity at sign-in; detect and respond to suspicious activity |
| **Legal basis (GDPR)** | Legitimate interest (security) — Art. 6(1)(f); Recital 49 explicitly supports this |
| **Legal basis (PIPEDA)** | Implied consent for security purposes |
| **Data categories** | IP address, user-agent, login attempt timestamps, failed login counts, MFA enrolment events |
| **Data subjects** | All users |
| **Recipients** | Internal admin only (`/admin/audit`); never shared externally |
| **Sub-processors** | Vercel, Neon |
| **Cross-border transfer** | Yes — see Activity 1 |
| **Retention** | Audit log: 7 years (regulatory). Failed login counters: clear on next success or 90 days |
| **Security measures** | All audit log writes are server-side; tamper detection via `createdAt` order |

## Activity 6 — Newsletter & marketing communications

| | |
|---|---|
| **Purpose** | Send platform updates, BHN newsletter, training programme announcements (only with explicit opt-in) |
| **Legal basis (GDPR)** | Consent (Art. 6(1)(a)) — explicit opt-in at registration |
| **Legal basis (PIPEDA)** | Consent + CASL compliance |
| **Data categories** | Email, name, locale, opt-in timestamp |
| **Data subjects** | Trainees + employers who opted in |
| **Recipients** | Manual export to ESP today; future ESP integration documented in [sub-processors.md](./sub-processors.md) when activated |
| **Sub-processors** | TBD — to be added when an ESP is integrated |
| **Cross-border transfer** | Depends on ESP choice |
| **Retention** | Until user opts out; opt-out requests honoured within 24 hours |
| **Security measures** | Double opt-in on registration; one-click unsubscribe in every email |

## Activity 7 — Audit & regulatory record-keeping

| | |
|---|---|
| **Purpose** | Maintain audit trail required by SOC 2 CC8 (change management), 21 CFR Part 11 §11.10(e) (computer-generated audit trails), accountability for admin actions |
| **Legal basis (GDPR)** | Legal obligation (Art. 6(1)(c)) — Part 11 / SOC 2 contractual + statutory; also legitimate interest |
| **Legal basis (PIPEDA)** | Legal compliance |
| **Data categories** | Actor user ID, action name, target type + ID, IP address, optional JSON detail, timestamp |
| **Data subjects** | Anyone whose action is logged (trainees and admins both) |
| **Recipients** | Admin internal only; auditors during compliance audits |
| **Sub-processors** | Vercel, Neon |
| **Cross-border transfer** | Yes — see Activity 1 |
| **Retention** | 7 years (Part 11 minimum; SOC 2 ≥1 year) |
| **Security measures** | Server-side write only; never modifiable from client; immutable creation timestamp |

## Activity 8 — Electronic signatures (when in regulated mode)

| | |
|---|---|
| **Purpose** | Capture 21 CFR Part 11 §11.50 / §11.70 electronic signatures on regulated training events |
| **Legal basis (GDPR)** | Legal obligation (compliance with FDA / EU pharma regulation) |
| **Legal basis (PIPEDA)** | Legal compliance |
| **Data categories** | Signer ID, action ("training.complete"), subject reference, attestation text, timestamp, IP, user-agent, method ("password" or "session") |
| **Data subjects** | Any user signing — trainees completing GxP training |
| **Recipients** | Internal admins, auditors, regulatory bodies on lawful demand |
| **Sub-processors** | Vercel, Neon |
| **Cross-border transfer** | Yes — see Activity 1 |
| **Retention** | 7 years per Part 11 §11.10(c) |
| **Security measures** | Re-auth-on-sign optional via `BHN_PART11_REQUIRE_PASSWORD=true`; ip + user-agent captured; immutable record |

---

## How to update this document

Any new processing activity (new feature, new data category, new sub-processor) gets a new section here in the same PR that ships it. Open issues with the label `compliance:ropa` if you spot a gap.

**Last reviewed:** 9 May 2026
**Next review:** quarterly or on any new feature that processes personal data
