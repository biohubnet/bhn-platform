# Journey 02 — Admin, pending-queue triage to all-clear

**Persona:** Daniel, BHN platform admin (the operator + ops lead, single role). Opens the platform mid-morning to clear overnight queues.
**Trigger:** Email or Slack reminder that an access request, credit application, or symposium registration is pending; or scheduled queue-clearing ritual.
**Outcome the journey serves:** Charter outcome 2 (admin can act on every pending item in < 60 sec per item).

---

## Steps

### Step 1 — Lands on `/admin/inbox`

**Action:** Opens `/admin/inbox` from the sidebar.
**Sees:** Aggregated queue showing pending counts across categories — credit applications, role requests, employer invites, access requests, event approvals, plus their oldest pending timestamp.
**Thinks:** *"Three credit apps, four role requests, two event registrations. Easy."*
**Signal:** `page_view` on `/admin/inbox`.
**What could go wrong:**
- Queue counts feel arbitrary — no urgency cue, all categories look the same.
- He doesn't know which one needs attention first (oldest? highest-stakes?).

### Step 2 — Jumps into the deepest queue

**Action:** Clicks "Credit applications (3)" → lands on `/admin/credit-applications`.
**Sees:** Table of pending applications with applicant name, amount requested, justification snippet, age of the request, per-row Approve / Reject buttons.
**Thinks:** *"Two are obviously valid (training-related expense, clear justification). One is fuzzy — let me read it."*
**Signal:** `page_view` on the table; eventual `credit-application.approve` audit entries.
**What could go wrong:**
- Justification snippet too short → forces a click into the detail page → adds 30 sec per item.
- Approve button doesn't have admin-glow → he scans past it.

### Step 3 — Approves the two clear ones inline

**Action:** Clicks Approve on each of the two clear cases. Optimistic UI flips them to confirmed.
**Sees:** Toast confirmation; row fades out (or moves to "Recently approved" if grouping enabled).
**Thinks:** *"Done. Next."*
**Signal:** `AuditLog` rows tagged with the approval; `CreditTransaction` rows created if approval mints credits.
**What could go wrong:**
- Toast disappears too fast → he doesn't notice if it succeeded.
- Optimistic UI shows success but API failed → quiet corruption.

### Step 4 — Drills into the fuzzy one

**Action:** Clicks the applicant name → lands on the detail page.
**Sees:** Full application + applicant's prior history (enrollments, credit balance, previous credits granted).
**Thinks:** *"OK, prior history is light, but reasonable. Approve with a smaller amount."*
**Signal:** `page_view` on detail; eventual approve audit.

### Step 5 — Moves to the next queue

**Action:** Clicks back to inbox, then "Role requests (4)" → repeats the pattern.
**Signal:** Continues through inbox sections.

### Step 6 — Reaches "Inbox empty"

**Action:** Last queue cleared.
**Sees:** Empty-state on `/admin/inbox`: "All caught up." Empty-state on each queue page.
**Thinks:** *"Done in 8 minutes."*
**Signal:** Queue depth across categories = 0 in `/admin/inbox`.
**This is the success state for Outcome 2.**

---

## Failure modes (observed + suspected)

| # | Failure mode | Severity | Evidence | Mitigation |
|---|---|---|---|---|
| F1 | Optimistic UI flashes success but API fails | High | Not measured | Need a follow-up confirmation pattern + audit trail visibility (already partially exists) |
| F2 | "Should I approve this?" decision uncertainty | Medium | Anecdotal; admin asks team for second opinion | Internal-note pattern on each model (already exists on `Registration.adminNote`) |
| F3 | Inbox doesn't show pending workshop bookings | Medium | Discovered during ER&D maturity work | Add workshop-booking pending to `/admin/inbox` aggregation |
| F4 | No per-day queue health metric | Medium | Not built | `/admin/experience-metrics` — sparkline of queue-depth-over-time per category |
| F5 | Cancel / Reject feels heavier than Approve | Low | Cancel button is rose, smaller — by design — but rejection requires a confirm + a reason | OK as-is; rejections SHOULD be slower than approvals |

---

## Open research questions

1. **What's the actual P75 time per item?** Need to instrument click-on-queue-card → click-on-approve event timing. Not currently measured.
2. **Are admin-glow rings actually visible enough?** No formal test. Eye-tracking or a heuristic walk-through would answer.
3. **Which queue does Daniel always check first?** Could inform default sort on `/admin/inbox`. Hypothesis: oldest age.
4. **Is the "inbox empty" state motivating or invisible?** No data. A celebratory micro-interaction might reinforce the "queue zero" habit.

---

## Mapped routes

- `/admin/inbox` — aggregated queue
- `/admin/access-requests`, `/admin/credit-applications`, `/admin/role-requests`, `/admin/employer-invites` — per-queue pages
- `/admin/events/[slug]/registrations` — event approval queue
- `/admin/events/.../registrations/[rid]` — drill-in approval page
- `/admin/audit` — proof of the day's actions

---

*Last updated 2026-05-13.*
