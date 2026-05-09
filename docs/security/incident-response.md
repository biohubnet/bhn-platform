# Incident response runbook

**Date:** 9 May 2026
**Owner:** Engineering on-call
**Last drilled:** never (target: late June 2026 tabletop exercise)

## Executive summary

If something goes wrong — confirmed breach, suspected breach, severe outage, or material data exposure — this runbook tells the on-call engineer what to do in the first 24 hours. The legal-notification clocks (GDPR 72h, Canadian OPC "as soon as feasible", state breach laws on a sliding scale) start ticking from awareness, so the first priority is **scope and contain**, then **notify**.

---

## Severity definitions

| Severity | Definition | Example |
|---|---|---|
| **SEV-1** | Confirmed breach OR PII exposed externally | ShinyHunters-style scrape of resumes; SQL injection that pulled emails; admin account compromised |
| **SEV-2** | Suspected breach (signal but unconfirmed) OR severe service degradation impacting all users | Anomalous large bulk download; database read-replica leaked to public IP; site down >1 hour |
| **SEV-3** | Limited / contained issue OR moderate service degradation | Single-user account takeover (resolved); slow page load on one route; specific feature broken |
| **SEV-4** | Minor issue, no security impact | Typo in changelog, broken icon, link rot |

This runbook covers SEV-1 and SEV-2. SEV-3 and below are handled through normal bug-triage.

---

## SEV-1 / SEV-2 first hour

### Step 1 — Acknowledge (5 minutes)

If alerted by `security@biohubnetwork.ca`, automated monitoring, or a researcher / user report:
- Acknowledge the report. If it came in via email, reply within 30 minutes confirming receipt.
- Open a private Slack / Signal channel called `#incident-{date}-{shortname}` (ops + on-call engineer + at least one second person).
- Start a running timeline document — every action gets a line: `[HH:MM] who did what`. This is your evidence trail.

### Step 2 — Classify (10 minutes)

Decide SEV-1 vs SEV-2 vs lower. The line:
- **SEV-1**: PII has demonstrably left BHN's control to an unauthorised party (confirmed exfiltration, public dump, attacker still has access).
- **SEV-2**: signals point to possible exfiltration but you can't yet confirm one way or the other.

When in doubt, treat as one severity higher than instinct — easier to step down than to step up after a public commitment.

### Step 3 — Contain (30 minutes)

Choose interventions based on the type of incident:

| Type | First action | Tools |
|---|---|---|
| **Compromised user account** | Force log-out + lock account + reset password + force MFA enrolment on next sign-in | `prisma.user.update({ ... lockedUntil: <far future>, totpSecret: null })`, audit log |
| **Compromised admin account** | All of above + rotate any admin-issued tokens (R2 keys if shared, NextAuth secret if exposed) | Vercel env, Cloudflare R2 dashboard |
| **Compromised infra credential** (R2 key leaked, DB URL leaked, NextAuth secret leaked) | Rotate the credential immediately; redeploy; check `auditLog` for last-N-days actions by that credential | Vercel env, provider dashboards |
| **Application vulnerability being exploited** | Disable the affected route via Vercel project settings or feature-flag; ship a hotfix | `git revert`, Vercel deployment |
| **Database leak / breach** | Engage Neon support; rotate connection string; consider pause-writes if scope unclear | Neon dashboard |

### Step 4 — Preserve evidence (parallel to step 3)

- Snapshot Postgres via Neon PITR (pin the timestamp from before containment actions to capture pre-containment state).
- Export `audit_log` rows from the suspected window: `SELECT * FROM "AuditLog" WHERE "createdAt" > now() - interval '7 days'`.
- Export Vercel function logs for the suspected window (Vercel dashboard).
- Export Cloudflare R2 access logs if relevant.

### Step 5 — Begin scope assessment (60 minutes)

Answer these in writing in the incident document:
1. **What data was potentially exposed?** Categories (resumes, names, emails, hashed passwords, audit logs, …) — be specific.
2. **How many data subjects?** Estimate count + jurisdictions.
3. **What's the technical mechanism?** Attack path, root cause hypothesis.
4. **Was it actually exfiltrated, or just exposed?** Different legal threshold.
5. **Is the attacker still active?** Have we contained access?

---

## Notification clocks

These are **legal minimums**. Faster is better; never silent.

### GDPR (EU users)
- **Supervisory authority**: notify within **72 hours** of awareness
- **Affected data subjects**: notify "without undue delay" if high risk to rights and freedoms
- Template at [breach-notification-template.md](./breach-notification-template.md)

### PIPEDA (Canadian users) — federal
- **OPC (Office of the Privacy Commissioner of Canada)**: notify "as soon as feasible" of breaches that pose "real risk of significant harm"
- **Affected individuals**: same standard
- Maintain breach record indefinitely

### Provincial Canadian law
- **Quebec Law 25**: notify Commission d'accès à l'information; same "real risk of significant harm" trigger; specific French-language requirements for affected-individual notice
- **Ontario PHIPA** (only if health info — typically not BHN): 72-hour-equivalent
- **Alberta PIPA**: notify Alberta Information and Privacy Commissioner

### US state breach laws (if any US users affected)
- **California (CCPA + state breach law)**: "without unreasonable delay"; specific content requirements
- **New York SHIELD Act**: "expeditious"
- **Massachusetts**: as soon as practicable
- Use [breach-notification-template.md](./breach-notification-template.md) US section

### Customer contracts
- Most enterprise contracts (and SCCs in DPAs) require notice to the customer **before** notice to authorities or data subjects. Check the relevant DPA's Schedule 2 or breach-notification clause.

---

## Notification responsibilities

- **Within 4 hours of awareness**: written internal status to leadership
- **Within 24 hours**: customer notification if customer-tenant data is affected
- **Within 72 hours (GDPR clock)**: supervisory authority notification
- **Within 72 hours of containment**: post-incident summary to internal channel
- **Within 14 days**: lessons-learned write-up; permanent record in `docs/security/{date}-{slug}.md`

---

## Post-incident

After containment + notification:

1. **Root-cause analysis** within 7 days — written, blameless.
2. **Remediation tracking** — every action item gets a GitHub issue with label `security:incident:{date}`.
3. **Customer postmortem** if customer-tenant data was affected — share within 14 days.
4. **Public disclosure** if the legal regime requires it (varies by jurisdiction).
5. **Update this runbook** with anything you learned. The runbook gets better through use.

---

## What's NOT in scope here

- **Fraud / phishing reports from end users** — handled by support, escalated only if there's a platform-side issue (e.g., a phishing email impersonating BHN).
- **DDoS / volumetric attacks** — Cloudflare's job; on-call's role is to coordinate with Cloudflare support and communicate to users.
- **Intellectual property issues** (copied course content, trademark) — legal route, not security incident.

---

## Tabletop schedule

- **First tabletop**: late June 2026 — walk through a hypothetical "leaked R2 token in a public commit" scenario with the engineering team
- **Cadence**: quarterly thereafter
- **Output**: gap log added to this runbook + GitHub issues for any process gaps found

## Contacts

- **Internal escalation**: leadership@biohubnetwork.ca (TBD — replace with real address)
- **Researcher contact**: security@biohubnetwork.ca (published RFC 9116)
- **Compliance contact**: compliance@biohubnetwork.ca (TBD)
- **Cloudflare support**: dashboard ticket; SLA varies by plan
- **Neon support**: support@neon.tech
- **Vercel support**: dashboard ticket
- **Outside legal counsel**: TBD — needs to be retained before first major incident

## Change log

| Date | Change |
|---|---|
| 2026-05-09 | Initial draft |
