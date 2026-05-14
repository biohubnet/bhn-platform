# Journey 05 — Trainee, leaving the talent pool (exit)

**Status:** 🚧 Outline. The data path is fully wired (PoolExitFeedback model + `/admin/feedback` aggregate); the qualitative arc is documented at outline-level.

**Persona:** Riya, ~6 months post-enrollment. Got a job offer; doesn't need BHN's talent-pool visibility any more. Wants out — but cleanly.
**Trigger:** Clicks "Leave talent pool" from her profile.
**Outcome the journey serves:** Charter outcome 3 (transparency culture — exit feedback is part of the disclosure loop).

## Outline of steps to validate

1. Profile → "Leave talent pool" → confirms intent.
2. Sees the exit-survey screen — NPS-style 0–10 + per-dimension ratings + free-text "anything we should know?"
3. Submits.
4. Sees a "thanks, here's what happens next" panel — her talent-pool visibility goes away within X minutes; her training records persist.
5. Confirmation email lands (if SMTP configured) with the same content.
6. Admin sees the exit-survey row in `/admin/feedback` at the next aggregation refresh.
7. Synthesised into the next `ResearchInsight` for the period.

## Why this journey matters disproportionately

Exit feedback is the most honest signal the platform receives. The trainee has nothing to lose by saying what didn't work — so the survey response rate + content quality is a leading indicator of platform health.

Two governance rules baked into the journey:

1. **The exit is one-click reversible.** Riya can re-join the talent pool from `/profile` if she changes her mind within 90 days. This lowers the stakes of the survey.
2. **The survey is short.** 4 questions + 1 free-text. Anything longer suppresses response rate.

## Open research questions

- **What's the survey response rate?** Need to measure (submissions ÷ exits attempted).
- **What's the NPS distribution?** Need a per-quarter chart on `/admin/feedback`.
- **Do exiters return?** Re-join rate is computable from `User.talentPoolStatus` history.
- **How well does the synthesis loop close?** Each `ResearchInsight` should reference at least 2 exit-survey rows it synthesised.

## Mapped routes

- `/profile` — exit entry point
- `/api/talent-pool/exit` — POST submits survey + flips status
- `/admin/feedback` — aggregate
- `/admin/insights` — per-period synthesis

## What lands when this journey is fully written

A walkthrough including 3 anonymised exit-survey transcripts (with names + identifying details removed), pattern analysis of the top 5 reasons for exit, and a feedback-loop trace showing how at least one exit insight changed the product.

---

*Outline last updated 2026-05-13.*
