# Journey 04 — Employer / HR, invite to first posting

**Status:** 🚧 Outline. The end-to-end flow exists (commits cb304f5 + 20fdd17 added the one-click magic-link sign-in for demo invites); the qualitative study is pending.

**Persona:** Marisol, hiring manager at a Mississauga biomanufacturer (~80-person company). Was emailed a BHN demo-mode invite link by the BHN partnerships lead.
**Trigger:** Clicks the magic-link in her email.
**Outcome the journey serves:** Charter outcome 1 (rapid arrival → first useful action — for employers, that's a posting).

## Outline of steps to validate

1. Clicks the magic link → lands signed-in as a demo-mode employer.
2. Sees the employer-portal sidebar (only EMPLOYER PORTAL is visible — no platform-content bleed).
3. Reads the demo banner — does she understand the read-only-ish demo affordances?
4. Browses `/employer/postings` → reads existing demo postings.
5. Clicks "Create posting" — does the form copy match her mental model of a job-board posting?
6. Saves a draft.
7. (Demo path) Sees what trainees would see in `/internships`.
8. (Real path, post-claim) Publishes the posting; first applicants land in `/employer/applicants`.

## Open research questions

- **What's the time-to-first-saved-draft for new employers?** Not yet instrumented.
- **Does the demo-mode banner cause hesitation or confidence?** Hypothesis: confidence — they can try without committing.
- **How does Marisol decide which skills to tag?** The skill-ontology dropdown is the gate. If it doesn't match her vocabulary, she abandons.
- **Are HR users one-click happy on the apply flow?** The trainee-side ApplyDialog has three modes; do employers understand what each posting type means for them?

## Mapped routes

- The magic-link path → `/employer/...`
- `/employer/profile`
- `/employer/postings`
- `/employer/postings/new`
- `/employer/postings/[id]`
- `/employer/applicants`

## What lands when this journey is fully written

A walkthrough with at least 2 employer-side interview transcripts, ranked failure modes, and explicit criteria for "this is the moment Marisol sees value."

---

*Outline last updated 2026-05-13.*
