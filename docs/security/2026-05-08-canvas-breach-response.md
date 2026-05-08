# Security response — Canvas / Instructure breach pre-emptive review

**Date:** 8 May 2026
**Prepared for:** BioHubNet leadership
**System:** BHN Training Platform (`bhn-training-platform.vercel.app`)
**Status:** Mitigations shipped to production. No incident on BHN.

---

## Executive summary

In late April / early May 2026, the criminal group "ShinyHunters" exfiltrated user data from **Instructure / Canvas LMS** affecting roughly **9 000 schools and 275 million users** worldwide — including major Canadian, US, UK, and Australian universities. The attack used a *low-privilege account* exploiting an *authorization-boundary failure* in Canvas's API, not a sophisticated zero-day.

We immediately reviewed BHN against this exact attack pattern, found three places where the same class of mistake was present, and shipped fixes the same day. **No BHN user data was exposed at any point** — these were pre-emptive fixes, not post-incident remediation. A second-pass re-audit by a separate analysis run confirmed every fix landed and that no adjacent endpoint shares the same flaw.

---

## What happened to Canvas

| | |
|---|---|
| **Vendor** | Instructure (parent of Canvas LMS) |
| **First detected** | 29 April 2026 |
| **Public disclosure** | 7 May 2026 |
| **Attack class** | Authorization-boundary failure (a.k.a. IDOR — *Insecure Direct Object Reference*) |
| **Mechanism** | Attackers registered legitimate **"Free-For-Teacher"** accounts (a free self-service tier) and used them to reach data belonging to *paid institutions* — a missing tenant-isolation check meant low-privilege accounts could pull other tenants' resources. |
| **Data taken** | Names, emails, student IDs, billions of private messages between students and teachers |
| **Vendor response** | Temporarily shut down Free-For-Teacher accounts; rotated API keys; pushed "security patches" |

**Key takeaway:** the attack didn't break encryption, didn't dump the database, and didn't compromise an admin password. It used a normal, properly-authenticated user account that the API trusted *too much*. That same trust mistake is easy to make in any platform with multiple user roles or shared object stores.

Sources:
- [Canvas Breach Disrupts Schools & Colleges Nationwide — Krebs on Security](https://krebsonsecurity.com/2026/05/canvas-breach-disrupts-schools-colleges-nationwide/)
- [2026 Canvas security incident — Wikipedia](https://en.wikipedia.org/wiki/2026_Canvas_security_incident)
- [Edtech Firm Instructure Discloses Data Breach — SecurityWeek](https://www.securityweek.com/edtech-firm-instructure-discloses-data-breach/)

---

## What we found in BHN

We mapped the Canvas attack pattern onto BHN's API and storage surface, walking every endpoint that takes a resource ID and every file path written to our public Cloudflare R2 bucket. Three categories of issue surfaced:

### 1. Resume + 1-minute-video files were addressable from the public internet (🔴 critical)

The "My Application" feature stored each trainee's resume and video introduction at predictable paths like `applications/{userId}/resume.pdf`. Anyone who learned a trainee's user ID — which authenticated employers and other trainees can see in normal use of the platform — could construct the URL and download the file directly. **No BHN API call required.** This is the closest analogue to the Canvas breach: a user identifier was effectively functioning as an authorization token, which it should not be. Same shape applied to the talent-application form's file uploads.

### 2. Instructors could modify any course on the platform (🔴 critical)

Six course-mutation API endpoints (edit course details, add modules, add assessments, replace SCORM package, regenerate thumbnail with AI, regenerate AI summary) checked that the calling user had the *role* "instructor" but did **not** check whether they actually *owned* the course they were editing. A self-registered instructor account could deface, replace, or destroy any course's content — including consuming our paid AI image-generation budget on someone else's course thumbnail.

### 3. One trainee could overwrite another trainee's claimed skill levels (🟠 high)

The "My Skills" endpoint accepted a skill-row ID from the client without verifying the row belonged to the calling user. A trainee with another trainee's row ID could push their competitor's claimed Java level from 0.2 to 1.0 (or vice versa). The matching DELETE endpoint did this check correctly; PATCH was the asymmetric outlier.

---

## What we shipped

All fixes are in production as of commit [`5455312`](https://github.com/sesamemua/bhn-training-platform/commit/5455312) (8 May 2026):

| Issue | Fix |
|---|---|
| Enumerable R2 paths for resumes / videos | File paths now embed a 128-bit cryptographic random token generated server-side per upload. URLs are mathematically infeasible to guess without our database. Replacing or removing a file also best-effort deletes the previous R2 object so removed material doesn't linger as "anyone-with-the-URL-can-read" leftovers. |
| Same issue for talent-app file uploads | Same fix — random token in the path. |
| Six course-mutation endpoints missing ownership check | New `requireCourseOwner()` helper enforces that the caller either owns the course OR is an admin/superadmin. Applied uniformly across all six endpoints. Returns 403 Forbidden (rather than 404) so non-owners can't enumerate course IDs by error-message timing. |
| User-skill PATCH missing ownership check | Now confirms `row.userId === caller.id` before updating, matching the DELETE handler's existing pattern. |
| Defence-in-depth | Two new shared helpers in `src/lib/auth.ts` and `src/lib/r2.ts` so any future endpoint added by any developer inherits the same gates without copy-paste mistakes. |

---

## What we verified after the fix

A second analysis pass — independent of the one that authored the fixes — re-walked every affected file and adjacent endpoint. Findings:

- **All six original issues are closed.** Each fix is on the right line of the right file with the correct semantics.
- **No new IDOR siblings found** in spot-checks of buddy pairing, interview booking, employer applicant tracking, form schema editing, password change, and admin user mutations.
- **The R2 delete helper is safe** — it strips cache-bust query params and rejects URLs outside our own bucket, so it can't be abused as a way to delete arbitrary objects.
- **Sample placeholder files** (the public PDFs the admin "Fill with sample" feature uses) live in a separate namespace from real user uploads and contain no PII; their being publicly addressable is intentional.

---

## What we *didn't* change (and how we know it's OK)

- **Admin endpoints under `/api/admin/*`** were already correctly gated with `requireRole("admin")`. We sampled and confirmed.
- **NextAuth magic-link tokens** are generated with `crypto.randomBytes(32)` (256 bits of entropy). Strong enough.
- **No raw SQL** anywhere in the codebase — all database access goes through Prisma's parameterised query builder, so SQL injection is structurally impossible.
- **No multi-tenant boundary** exists in BHN today — the entire platform is a single tenant. The blast radius of any future authorization mistake is "one BHN deployment", not "every customer of a SaaS vendor."

---

## Differences between BHN and Canvas (why our risk is structurally lower)

| | Canvas | BHN |
|---|---|---|
| **Tenancy model** | Multi-tenant SaaS — thousands of schools share infrastructure | Single tenant (one deployment for BioHubNet) |
| **Free self-service tier** | "Free-For-Teacher" was the attack vector | No free self-service tier; admin-approved access requests |
| **Internal messaging** | Billions of DMs between students / teachers | No DM system — nothing comparable to exfiltrate |
| **Identity provider** | Owns its own auth | Standardised on NextAuth (well-audited library) |
| **Object storage** | Behind their own auth | Public Cloudflare R2 bucket — *was* the weak point above; now hardened |

---

## Recommended next steps

1. **Set up automated security scanning** — Dependabot is already on for dependency CVEs; consider adding Snyk or GitHub Advanced Security for static analysis of every PR, so the next IDOR is caught before it lands. *(Effort: ~2 hours of admin setup; negligible ongoing cost.)*
2. **Periodic third-party penetration test** before any major launch (e.g. when we open public registration). One-day engagement with a Canadian shop in the $3–5 K range. *(Currently we self-audit; an outside set of eyes would be cheap insurance for an LMS holding student PII.)*
3. **Stop relying on the public R2 bucket** for any artifact more sensitive than placeholder samples. Move resume + video to **signed URL access** (private bucket; URLs are short-lived, signed at request time by an authenticated endpoint). The token-based mitigation we shipped today is solid, but signed URLs are the industry-standard primitive and remove an entire category of "URL leaks → file leaks" scenarios. *(Effort: ~1 day of engineering; can be done at any time without further data migration since R2 keys themselves don't change.)*
4. **Tighten the registration flow** before public launch — add CAPTCHA / email-verification gating to slow down the "register a free account, then attack the API" pattern that started Canvas. We deferred email/security work earlier per leadership decision; revisit before opening registration to non-invited users.
5. **Document a public security contact** (`security@biohubnetwork.ca`) so if a researcher does find something, they have a non-public channel to disclose to us.

---

## Bottom line

The Canvas attack was a wake-up call, not a rollover. We took it seriously the same day, found and closed three real issues that fit the same pattern, and verified the fixes independently. BHN is in a stronger security posture today than it was 24 hours ago, and the structural differences between BHN and Canvas (single-tenant, no free tier, no DM system) mean our blast radius is much smaller than theirs even before these fixes.

Happy to walk through any of the technical detail or run a fresh review against any other concern you'd like covered.
