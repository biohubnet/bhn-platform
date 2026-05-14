# BHN Training Platform — UX Charter

**Version 1.0 · Owner: Platform Lead · Audience: Anyone touching the codebase**

A one-page contract for what "good UX" means on this platform. Anchors every UX decision in three measurable outcomes. Anything in `src/components/`, `src/app/`, or the design system that doesn't ladder up to one of these outcomes should be questioned.

---

## Why this exists

The platform is built solo + AI. Without an explicit charter, "good UX" defaults to whatever feels right to the engineer at edit time — which silently drifts as features pile up. This document is the alignment surface. When a decision feels ambiguous, the outcomes here break the tie.

## The three user outcomes

### 1. A trainee can move from arrival to active enrollment in under 5 minutes.

> "I heard about BHN. Let me see what's on offer. I'm in."

The platform's reason to exist: get a trainee from first contact to actively enrolled in a learning pathway or registered for the next event, without confusion or stalls.

**Sub-flows that ladder up to this outcome:**

- New trainee opens `/for-trainees` → submits access request → receives invite → completes signup → lands on `/dashboard`
- Dashboard → "Continue learning" tile picks up where they left off (or starts fresh if they're new)
- Symposium registration: trainee opens `/events/[slug]/register` → submits form → sees QR or pending banner

**Anti-goals (what we explicitly do NOT optimise for):**

- Conversion-funnel growth-hacks. We aren't an e-commerce store. Hostile dark patterns are off the table.
- Capturing trainees who aren't a fit. The talent-pool exit survey is honest about why people leave.

**Measurable signals** (already captured):

- `Event` analytics rows: `name="register"` → time delta from `name="page_view"` of `/for-trainees` to first authenticated `page_view` of `/dashboard`
- `AccessRequest.createdAt → handledAt` median latency
- First-enrollment latency: `User.createdAt → first Enrollment.createdAt`

**Target:** P75 < 5 minutes for the in-session path (excluding admin approval latency on `AccessRequest`).

---

### 2. An admin can act on every pending item in their queue in under 60 seconds per item.

> "Three credit apps, two role requests, an event approval, an access request. Done in 5 minutes."

Admin operations are not a "back office afterthought" — they are the second user. Every queue should be skimmable, decisive, and have a clear next-action button. Admin productivity is what makes the BHN trainee experience feel responsive (because pending → confirmed is mediated by an admin).

**Sub-flows that ladder up to this outcome:**

- `/admin/inbox` aggregates every pending request
- `/admin/events/[slug]/registrations` shows pending count tile + per-row Approve
- `/admin/credit-applications`, `/admin/role-requests`, `/admin/access-requests` — same pattern
- `admin-glow` cyan ring on every decision-point button so admins find the action even on a long page

**Anti-goals:**

- Reducing the cognitive load on admins by hiding context. Admin pages show MORE detail per item, not less.
- Automating decisions that should be human. Approvals stay human; the platform just makes them fast.

**Measurable signals:**

- `AuditLog` rows tagged with the admin action (e.g. `event.registration.approve`) → median time-since-creation-of-pending-row
- `Inbox` queue depth (size of pending queue at any point in time)
- For symposium specifically: `Registration.approvedAt - Registration.createdAt` median

**Target:** P75 < 60 sec per queue item; queue depth < 20 at any one time during business hours.

---

### 3. Every change the platform ships is legible to users within 24 hours.

> "What's new? Why did it change? When? What do users think?"

Transparency culture is one of the platform's level-3 strengths (see ER&D maturity assessment). This outcome formalises it: every shipped change is documented, surfaced, and reaction-tracked.

**Sub-flows that ladder up to this outcome:**

- Every user-visible change appends an entry to `scripts/seed-changelog.ts` (per repo convention)
- The `/changelog` page is role-filtered and renders unread badges
- `TOUR_VERSION` in `src/lib/onboarding/tours.ts` bumps when new tour steps land
- `/admin/insights` synthesises the period's user signals + publishes a "what users told us" note back to the changelog (closing the loop)

**Anti-goals:**

- "Move fast and break things" without telling anyone. The platform is single-tenant + audited; the changelog is the disclosure surface.
- Hiding partial implementations. The `/compliance` page lists Partial / In progress status honestly.

**Measurable signals:**

- Time delta between `commit author-date` and the corresponding `ChangeLog.publishedAt`
- `/changelog` page-view rate per release (engagement)
- `ResearchInsight.publishedToChangelogAt` cadence — at least one per month

**Target:** every user-visible commit has a changelog row within 24 hours; one `ResearchInsight` published per calendar month.

---

## How this charter is used

1. **Pre-merge sanity check.** Before merging a PR with user-visible changes, the author asks: *which of the three outcomes does this serve?* If the answer is "none", the change is probably the wrong shape.
2. **Quarterly review.** Re-read this doc. If an outcome no longer reflects reality, edit it — but edit explicitly (this isn't a wishlist, it's a contract).
3. **Decision log.** Significant UX choices that trade off between outcomes get an ADR in `docs/ux/decisions/`.
4. **Maturity self-assessment.** Re-score the platform against Forrester ER&D every six months using this charter as the strategy-dimension evidence.

---

## What's NOT in this charter

This charter intentionally does NOT include:

- **Aesthetic style guide.** That's `docs/design-system.md` (tokens, type, motion) + the live `/admin/design-system` page.
- **Brand voice + copy patterns.** Lives in `src/lib/page-copy.ts` and the inline pencils across editable pages.
- **Per-feature acceptance criteria.** Those belong in the PR description for each feature.

Three outcomes is the upper bound. More is a wishlist; fewer means the charter loses its tie-breaking power.

---

*Last revised: 2026-05-13. Re-evaluate quarterly.*
