# Cognitive walk-through — Trainee first registration (Journey 01)

**Date:** 2026-05-13
**Method:** AI **cognitive walk-through** (Polson, Lewis et al., 1992). NOT a substitute for participant research. See "Epistemic status" below.
**Reviewer:** Claude Opus 4.7 in structured-critique mode
**Journey:** `docs/ux/journeys/01-trainee-first-registration.md`
**Persona:** Riya, 27, mid-PhD in cell biology. First time on BHN.

## Method

A cognitive walk-through evaluates a surface by stepping through a task **as if** I were a representative user, asking four questions at each step:

1. **Will the user know what to do at this step?** (the right action is visible)
2. **Will they connect the action to their goal?** (mental-model match)
3. **Will they perceive that the action has been done?** (feedback is legible)
4. **Will they recover if they make a mistake?** (error path is forgiving)

A "no" on any of the four flags a usability concern. Score per step: 1 (passes all four) to 4 (fails all four).

This walk-through covers the steps in Journey 01, in order. Each step is rated based on what I can observe from the platform's code + UI patterns. A real trainee may have a different mental model than mine — that's the gap participant research closes.

## Walk-through

### Step 1 — Read the landing pitch on `/for-trainees`

| Q | Answer | Notes |
|---|---|---|
| Know what to do? | ✅ Yes | Hero + access-request form at the fold; submit button is the primary CTA. |
| Connect to goal? | ✅ Yes | Page positions itself as "training platform" up top; access-request form is named correctly. |
| Perceive done? | ✅ Yes | Form submission triggers a confirmation banner. |
| Recover from mistake? | ⚠ Partial | If the user submits with a typo'd email, there's no "we sent you a confirmation, didn't get it? resubmit here" path I can see in the code. Forced re-submit through the same form (which may error on duplicate). |

**Step score: 2** (one partial concern, three passes)

### Step 2 — Submit the access request

| Q | Answer | Notes |
|---|---|---|
| Know what to do? | ✅ Yes | One form, clearly labeled, submit button. |
| Connect to goal? | ✅ Yes | "Request access" maps to the goal of getting in. |
| Perceive done? | ⚠ Partial | UI confirmation exists. **Email confirmation** depends on `mailConfigured()` — on dev / preview without SMTP, the user gets only the on-screen confirmation. That's a quiet drop. |
| Recover from mistake? | ❌ No | If the confirmation email never arrives (spam folder, SMTP misconfig), the user has no recourse short of re-submitting (which the schema may reject as duplicate). |

**Step score: 3** (two concerns — perceive + recover)

### Step 3 — Receive invite email (~1 day later)

| Q | Answer | Notes |
|---|---|---|
| Know what to do? | ✅ Yes (if the email arrives) | Email has one CTA: "Activate your account." |
| Connect to goal? | ⚠ Partial | A day has passed. User has likely forgotten what "BHN" stood for. Email subject + body should re-establish context — the current copy (referenced in `src/lib/mail` send paths) does, but I'm assessing this from code, not from a real inbox preview. |
| Perceive done? | N/A | Email itself isn't an action surface. |
| Recover from mistake? | ⚠ Partial | Invite-link expiry behavior visible in `EmployerInvite.expiresAt`; trainee equivalent is implied. No "resend my invite" self-service. |

**Step score: 2.5**

### Step 4 — Activate the account

| Q | Answer | Notes |
|---|---|---|
| Know what to do? | ✅ Yes | Signup form lives at `/signup/trainee/[token]`; standard pattern. |
| Connect to goal? | ✅ Yes | "Set a password to finish creating your account." |
| Perceive done? | ✅ Yes | Welcome-to-BHN redirect to `/dashboard`. |
| Recover from mistake? | ✅ Yes | NextAuth's standard recovery (forgot password). |

**Step score: 1** (clean pass)

### Step 5 — Land on dashboard

| Q | Answer | Notes |
|---|---|---|
| Know what to do? | ⚠ Partial | The Primary Next Card surfaces either "Continue learning" or "Find a pathway" — clear for return visits, less clear on the empty state. The onboarding tour helps; whether it auto-fires for first-timers is the key question. |
| Connect to goal? | ✅ Yes | Dashboard contains pathway-related elements; trainee can scan. |
| Perceive done? | ✅ Yes | Authenticated, role chip visible in sidebar footer. |
| Recover from mistake? | ✅ Yes | Sidebar offers other paths if the primary card doesn't fit. |

**Step score: 1.5**

### Step 6 — Browse pathways

| Q | Answer | Notes |
|---|---|---|
| Know what to do? | ✅ Yes | Sidebar has clear "Pathways" item. |
| Connect to goal? | ⚠ Partial | If the trainee has a specific skill goal ("cell culture"), the pathway list isn't yet filterable by skill from this page. Discovery is by scan rather than search. |
| Perceive done? | ✅ Yes | Pathway-detail page loads on click. |
| Recover from mistake? | ✅ Yes | Back button + breadcrumb. |

**Step score: 2**

### Step 7 — Enroll

| Q | Answer | Notes |
|---|---|---|
| Know what to do? | ✅ Yes | Enroll button is the primary action on the pathway detail page. |
| Connect to goal? | ✅ Yes | "Enroll" → "I'm in." |
| Perceive done? | ✅ Yes | Confirmation + first module opens (per Journey 01's described state). |
| Recover from mistake? | ⚠ Partial | The "leave pathway" affordance is admin-glow'd for admins but the self-serve trainee path is less prominent. |

**Step score: 1.5**

## Findings (ranked by severity)

### Finding A — Submission confirmation degrades silently when SMTP isn't configured

**Steps affected:** 2, 3
**Severity:** 3 (task abandoned)
**Evidence:** `src/app/api/access-requests/route.ts` (and the pattern referenced in the registration email path) uses `mailConfigured()` as a guard. Preview deploys + dev typically don't have SMTP set, so trainees signing up via a non-production URL get no email. There's no fallback "your access request was received, expect a reply within 2 business days, contact support@ if you don't hear back" inline copy.
**Recommendation:** Strengthen the on-screen confirmation to include the support email + the "2 business days" expectation, regardless of mail-configured state. Also: log mail send failures to `AuditLog` with an explicit "user notification dropped" entry so admins can see drop patterns.
**Owner:** Open
**Status:** Open

### Finding B — No self-service "resend my invite" path

**Steps affected:** 3
**Severity:** 2 (workaround required)
**Evidence:** I can see `EmployerInvite.openCount` (tracks opens) but no self-service trigger to re-issue. Trainee-side likely the same. A trainee whose invite lands in spam has to email support.
**Recommendation:** Add a small "didn't get an invite? enter your email" affordance on `/login` that, if there's a pending `AccessRequest` for that email, re-mints + re-sends the invite. Gate to 1 resend per 24h to prevent abuse.
**Owner:** Open
**Status:** Open

### Finding C — Pathway discovery is scan-only

**Steps affected:** 6
**Severity:** 2 (workaround required)
**Evidence:** Pathway-list page renders all pathways at the same hierarchy. For a trainee who knows what they want, this is fine; for one exploring, it's "show me everything" rather than "show me what matches my goals". No skill-based filter or recommendation surfacing.
**Recommendation:** Add a small filter strip ("by skill: [chip] [chip] [chip]") above the pathway list. Easy win because the skill ontology + per-pathway skill tags already exist.
**Owner:** Open
**Status:** Open

### Finding D — Onboarding-tour auto-fire for first-time trainees is unverified

**Steps affected:** 5
**Severity:** 2
**Evidence:** Tour version + step list exist in `src/lib/onboarding/tours.ts`; I cannot verify from code alone whether the tour auto-fires for a brand-new trainee. If it doesn't, the "what do I do now" gap at step 5 widens.
**Recommendation:** Trace the tour fire logic; if it requires explicit click, consider auto-firing on first dashboard visit for new accounts (skippable, persistable).
**Owner:** Open
**Status:** Needs verification

## Quotes (none — no real participants)

This is the section a real usability test would populate. I deliberately leave it empty rather than fabricate quotes — putting words in a hypothetical user's mouth is exactly what cognitive walk-throughs are NOT for.

## Open follow-ups

1. **Run this same walk-through with at least 3 real trainees** using `docs/ux/templates/usability-test-script.md`. The findings above are best-effort predictions; participants will surface things I cannot. Especially: emotional + motivational state at each step (cognitive walk-throughs are weak on affect).
2. **Time-and-motion data.** Add per-step funnel events (`page_view → access-request-submitted → invite-email-clicked → password-set → first-pathway-viewed`) so the charter's < 5 min target is measurable rather than aspirational.
3. **Email deliverability check.** Manually send a test invite through the production SMTP path; verify Gmail / Outlook / iCloud all land in inbox (not spam).

## Epistemic status

This is an **expert review by a single AI reviewer using structured method**. Cognitive walk-throughs catch perhaps 50–60% of usability issues that real participant studies surface — they're complementary, not substitutes. The findings above are a useful first-pass; they should NOT be treated as definitive.

What this artifact IS:
- A reproducible, defensible analysis using a recognized HCI method (Polson, Lewis, Rieman, Wharton 1992; reaffirmed in modern UX practice as one of three "discount usability" techniques).
- A backlog of testable hypotheses for the next participant study.
- An audit trail showing that the platform's UX practice ran a structured review, even before staffing allows real participant work.

What this artifact is NOT:
- Validated by real users.
- Sensitive to emotion / motivation / cultural context.
- Sufficient on its own for any decision with stakes higher than "add a small CTA".

The level-4 ER&D maturity tier requires *both* expert reviews AND participant studies. This artifact lights up the expert-review half; participant studies remain on the backlog until headcount or contractor budget makes them feasible.

---

*Method reference: Polson, P. G., Lewis, C., Rieman, J., & Wharton, C. (1992). Cognitive walkthroughs: A method for theory-based evaluation of user interfaces. International Journal of Man-Machine Studies, 36(5), 741-773.*
