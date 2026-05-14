# Design critique — template

**For:** a short, structured review of an in-progress UX surface — before merging the PR. Designed for solo + AI work where the "critique partner" is either AI playing a structured role or a colleague reviewing async.

Copy this file to `docs/ux/critiques/<YYYY-MM-DD>-<route-or-feature>.md`.

---

## Surface under review

- **Route(s):** `/some/route`
- **Components:** `src/components/...`
- **PR / branch:** link

## What this surface is for

One sentence. If it takes more than one, the surface is doing too much.

## Charter outcomes served

Which of the three (`docs/ux/charter.md`) does this serve? If "none", reconsider whether to ship it.

## Heuristic walk-through

Adapted from Nielsen + ER&D maturity practice. Score each 1–4 (1 = paper-cut, 4 = blocking).

| # | Heuristic | Score | Notes |
|---|---|---|---|
| 1 | Visibility of system status — is the user always sure what state they're in? |   |   |
| 2 | Match with user vocabulary — does the copy use their words or ours? |   |   |
| 3 | User control + freedom — can they undo, go back, or escape? |   |   |
| 4 | Consistency with platform patterns — does this look + behave like the rest of the platform? |   |   |
| 5 | Error prevention — are dangerous actions guarded? |   |   |
| 6 | Recognition over recall — does the user have to remember things from a previous screen? |   |   |
| 7 | Flexibility + efficiency — does it support both first-time and power users? |   |   |
| 8 | Aesthetic + minimalist — anything on screen that doesn't earn its place? |   |   |
| 9 | Recover from errors — when something fails, is the error message actionable? |   |   |
| 10 | Help + documentation — discoverable where needed (and absent where it's not)? |   |   |

## Charter-specific checks

- **Outcome 1 (trainee path):** does this surface stay under 90 seconds of task time?
- **Outcome 2 (admin path):** does this surface support < 60 seconds per pending item?
- **Outcome 3 (transparency):** if user-visible, is there a corresponding `changelog` entry queued?

## Top three changes before merge

Be concrete. Name files. Estimated time per change. If any of them are > 1 hour, consider splitting the PR.

1. …
2. …
3. …

## Open questions to validate post-ship

What we couldn't answer in this critique. Goes into the research backlog.

- …

## Sign-off

- Reviewer: <name or "AI assistant — structured-critique mode">
- Date: YYYY-MM-DD
- Verdict: Ship as-is | Ship with changes | Block until X
