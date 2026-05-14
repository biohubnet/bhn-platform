# Journey 03 — Trainee, symposium registration + tour pick

**Status:** 🚧 Outline. Strategy ready; full journey write-up pending a 3-trainee usability rehearsal.

**Persona:** Same as Journey 01 — Riya, ~5 weeks into her BHN enrollment, sees the symposium announcement in `/changelog` or the dashboard event banner.
**Trigger:** Clicks the event banner on `/dashboard` or finds `/events` via the sidebar.
**Outcome the journey serves:** Charter outcome 1 (engagement with the platform's flagship event).

## Outline of steps to validate

1. Lands on `/events` — does she find the symposium card quickly?
2. Reads `/events/2025-annual-symposium` — does the agenda + venue + workshops register?
3. Clicks **Register** → `/events/[slug]/register`.
4. Reads the **pending-approval banner** — does the message land or feel demotivating?
5. Picks 0–2 workshops in the same flow — does the per-workshop capacity meter help her decide?
6. Submits.
7. Lands on `/register/success` — sees the "pending approval" pendant + the cross-prompt for workshops if she didn't pick any.
8. (Asynchronous) Receives admin-approval email; returns to `/register/success` → sees confirmed state.
9. Optionally visits `/events/[slug]/me` for breakouts + QR check-in pass.

## Open research questions

- **Does the pending-approval banner reduce or maintain registration intent?** Hypothesis: keeps it (people accept curation); falsifiable with a 5-trainee diary study.
- **Do workshop capacity meters drive earlier picks?** Hypothesis: yes (loss-aversion). Measure with `Registration.createdAt` distribution before/after capacity visibility shipped.
- **What % of trainees register for symposium but skip workshops (or vice versa)?** Post-decoupling, this is now measurable; baseline is being captured in `/admin/experience-metrics`.

## Mapped routes

- `/events`
- `/events/2025-annual-symposium`
- `/events/[slug]/register`
- `/api/events/[slug]/register`
- `/events/[slug]/register/success`
- `/events/[slug]/me`
- `/events/[slug]/me/workshops`

## What lands when this journey is fully written

A 5-step text journey map with quotes from at least 3 trainee usability rehearsals, failure modes ranked by observed frequency, and explicit pass criteria tied to charter outcome 1.

---

*Outline last updated 2026-05-13.*
