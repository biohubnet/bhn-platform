# Usability test — script template

**For:** 45-minute moderated session, recorded with consent.
**Participants:** 5–6 (one screener of the intended persona).

Copy this file to `docs/ux/research/<YYYY-MM-DD>-<topic>.md` and fill in.

---

## Pre-flight (5 min)

- Confirm recording consent (PIPEDA — give the participant the option to skip the recording).
- Confirm participant has not seen the platform in the last 7 days.
- Set the prototype URL or `/dashboard` starting point.

## Warm-up questions (5 min)

1. Tell me about your current role at <organisation>.
2. Walk me through the last time you signed up for a professional training program online.
3. What were you hoping to find when you visited BHN?

> Don't lead the answer. Pause; let them fill silence.

## Task 1 — <task name> (10 min)

**Goal:** <what we want the participant to accomplish>
**Starting state:** <route they begin on>
**Pass criteria:** <observable success state>

**Script:**

> "I'm going to ask you to <task description>. As you work, please think aloud — tell me what you're looking at, what you're trying to do, what's confusing. There are no wrong answers; we're testing the design, not you."

**Probes (only if they get stuck for > 30 seconds):**

- "What are you looking for right now?"
- "What would you expect to happen if you clicked that?"
- "How does this compare to what you imagined before you started?"

**Observations to capture:**

- Time to completion (start → pass criteria met)
- Number of dead-end clicks
- Verbal sentiment (frustration, confidence, surprise)
- Specific quotes worth keeping

## Task 2 — <task name> (10 min)

[Same structure as Task 1]

## Task 3 — <task name> (10 min)

[Same structure as Task 1]

## Wrap-up (5 min)

1. On a 1–10 scale, how confident are you using <feature> after this session?
2. What's one thing you'd change?
3. Anything we didn't ask that we should have?

## Synthesis (post-session, do within 24 hours)

For each task:

- **Quote (verbatim, ≤ 1 sentence)** that best captures the participant's experience.
- **Severity (1–4):** 1 = paper-cut, 2 = workaround required, 3 = task abandoned, 4 = data loss / trust loss.
- **Recommendation** — concrete change with the file/route.

Synthesis lands in `docs/ux/research/<YYYY-MM-DD>-<topic>.md` and is referenced from the next `ResearchInsight` row on `/admin/insights`.

---

## After 3–5 sessions: pattern-spotting

You're looking for:

1. **Same dead-end across ≥ 2 participants** → high-priority fix.
2. **Same verbal phrase used by ≥ 2 participants** → likely a copy / mental-model mismatch.
3. **Same time-to-completion outlier** → underlying flow has unaccounted-for complexity.

One pattern = one row in the period's `ResearchInsight`.
