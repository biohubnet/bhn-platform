# Journey 01 — Trainee, first registration to first enrollment

**Persona:** Riya, 27, mid-PhD in cell biology, hunting for biomanufacturing training that doesn't conflict with her thesis schedule. Saw BHN mentioned in a Slack channel for her cohort.
**Trigger:** Visits `biohubnet.ca` → clicks "Apply / training" → lands on `/for-trainees`.
**Outcome the journey serves:** Charter outcome 1 (arrival → enrollment in under 5 min).

---

## Steps

### Step 1 — Reads the landing pitch

**Action:** Scans `/for-trainees`. Reads the value prop, scrolls to the access-request form.
**Sees:** Hero + three-pillar explainer + access-request form at the fold.
**Thinks:** *"Two-step process, OK. Let me check this is legit before I give them my email."*
**What could go wrong:**
- Hero is too dense → she bounces.
- Form asks for too much → she abandons mid-fill.
- No social proof / no "what is this" intro → she doesn't trust the surface.

### Step 2 — Submits the access request

**Action:** Fills email + name + (optional) message. Submits.
**Sees:** Confirmation banner + "we'll be in touch within 2 business days."
**Thinks:** *"OK, 2 days. I'll forget."*
**Signal:** `AccessRequest` row created with `kind="trainee"`, `status="pending"`.
**What could go wrong:**
- No confirmation email → she doesn't know if it worked.
- "2 business days" feels too slow → she signs up for a competitor instead.

### Step 3 — Receives invite email

**Action:** ~1 day later (depends on admin queue cadence), gets an email with a magic invite link.
**Sees:** Email body with one CTA: "Activate your BHN account."
**Thinks:** *"Right, that thing. Let me click."*
**Signal:** `AccessRequest.handledAt` stamped; invite link contains a token.
**What could go wrong:**
- Email lands in spam → silent drop.
- Link expires before she clicks → frustrating retry loop.
- Email copy is generic → she doesn't remember what BHN is.

### Step 4 — Activates the account

**Action:** Clicks the link → completes signup form (password + MFA optional).
**Sees:** Welcome to BHN page; redirect to `/dashboard`.
**Thinks:** *"OK that was painless. Now what?"*
**Signal:** `User` row created; `LoginCode` issued; `Session` created.
**What could go wrong:**
- MFA prompt before she expects → she bails.
- Signup form asks too much → she abandons.
- Welcome state is empty → she has no idea what's next.

### Step 5 — Lands on dashboard

**Action:** Scans the dashboard hero + Primary Next Card.
**Sees:** "Continue learning" or "Find a pathway to start" CTA, depending on whether she's enrolled.
**Thinks:** *"Show me what's available."*
**Signal:** `Event` analytics row `name="page_view"`, `path="/dashboard"`.

### Step 6 — Browses pathways

**Action:** Clicks "Find a pathway" → lands on `/pathways` → opens one.
**Sees:** Pathway detail page with module list + estimated time + skills + Enroll button.
**Thinks:** *"This is the cell-culture one. Yep, this matches my goals."*
**Signal:** `page_view` of `/pathways/[id]`.

### Step 7 — Enrolls

**Action:** Clicks "Enroll".
**Sees:** Confirmation + first module opens.
**Thinks:** *"OK we're moving."*
**Signal:** `Enrollment` row created; `Event` analytics `name="enroll"`.
**This is the success state for Outcome 1.**

---

## Failure modes (observed + suspected)

| # | Failure mode | Severity | Evidence | Mitigation |
|---|---|---|---|---|
| F1 | Access-request approval latency > 2 days | High | `AccessRequest.createdAt → handledAt` median | `/admin/inbox` aggregation + per-day admin queue rituals |
| F2 | Welcome confusion — "what do I do now" | Medium | Drop-off between signup completion and first dashboard interaction (not yet measured) | Onboarding tour with welcome modal (already shipped) |
| F3 | Pathway discovery — too many pathways shown | Low–Medium | Suspected. Not yet measured. | Pathway tagging + role-based default sort (open) |
| F4 | Invite email in spam / never opens | Unknown | `EmployerInvite.openCount` (this model has open tracking; trainee invites do not — gap) | Add open-tracking on trainee invites; resend mechanism |

---

## Open research questions

1. **What does Riya actually do in step 6?** No data. She might browse all pathways, search by skill, ask for a recommendation. A 5-trainee diary study would answer this in a week.
2. **Where does the median trainee drop off?** Current funnel signals are aggregate; we don't yet have per-step conversion. Adding a `dropout` event on `Event` analytics with the step name would let us see.
3. **What's the actual P75 time?** Charter target is < 5 min. Today's measurement is approximate; needs a proper funnel definition.

---

## Mapped routes

- `/for-trainees` — landing
- `/api/access-requests` — POST creates the row
- `/admin/access-requests` — admin queue
- `/signup/trainee/[token]` — activation
- `/dashboard` — landing post-signup
- `/pathways` — browse
- `/pathways/[id]` — detail + enroll

---

*Last updated 2026-05-13. Re-validate quarterly or when any of the mapped routes is significantly redesigned.*
