# Research repository entry — template

**For:** any research artefact worth keeping — usability test write-up, customer interview transcript, diary-study extract, support-ticket pattern.

Copy this file to `docs/ux/research/<YYYY-MM-DD>-<topic>.md`. Keep one entry per study or per significant insight.

---

## Title

Short noun phrase, e.g. "Trainees confuse 'pending approval' with 'rejected'."

## Date

YYYY-MM-DD. Use the date the study completed, not when this file was written.

## Method

| Field | Value |
|---|---|
| Method | Moderated usability test / unmoderated diary / interview / survey / support-ticket pattern / audit-log pattern |
| N | <number of participants or data points> |
| Recruit | <how participants were sourced — paid panel, internal, organic from the platform> |
| Duration | <e.g. 45 min × 5 sessions, or 2-week diary> |

## Question

What were we trying to answer? Should be a single sentence ending in a question mark.

## Summary (≤ 5 bullets)

The 30-second version. Anyone reading just this should understand the outcome.

- Bullet 1
- Bullet 2
- Bullet 3

## Findings (ranked by severity)

### Finding A — <short title>
**Severity:** 1–4 (see usability test template for the scale)
**Evidence:** Quote, count, screenshot, or audit-log pattern.
**Recommendation:** Specific change. Name the file or route.
**Owner:** Who will action this?
**Status:** Open / In progress / Shipped / Won't fix (with reason).

### Finding B — …

[repeat]

## What this contradicts (or confirms)

Honest list. If prior research or a hypothesis was contradicted, name it. If this is the first study on the question, say so.

## Open follow-ups

Things we noticed but didn't have data to call yet. These become backlog items for the next study.

## Verbatim quotes (anonymised)

Keep 3–5 short quotes that best represent the data. Anonymise: "P3 — biomanufacturing PM, ~5 yrs experience" rather than names.

> "I clicked it twice because I wasn't sure if it submitted." — P3

## References

- Linked journey doc(s) in `docs/ux/journeys/`
- Linked decision in `docs/ux/decisions/`
- Source recording / transcript (private — not committed to the repo)
- The `ResearchInsight` row this fed into (`/admin/insights`, period YYYY-MM)
