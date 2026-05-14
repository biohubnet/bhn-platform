# ADR-0005 — Application-prep coach: AI as scaffolding, trainee as writer

**Status:** Accepted
**Date:** 2026-05-14
**Author:** Platform Lead (with AI assistance)
**Outcomes affected:** 1 (trainee → first useful action), 2 (admin queue ops — indirectly: better-prepared applicants = lower noise)

## Context

The matching layer (ADR-0004) tells a trainee *which* postings to apply to. It doesn't help them *prepare* for the application. The natural next surface is a coaching flow that takes a trainee from "I want to apply" to "I have a tailored resume bullet, a draft interview answer, and a STAR story ready" — the practical deliverables that turn a maybe-fit into a strong application.

The product opportunity is genuine but the failure modes are severe: a too-eager AI that writes resumes for the candidate produces homogenised, dishonest applications and breeds learned helplessness. Employers can spot AI-generated bullets in seconds; trainees who lean on automation here don't develop the muscle they actually need at the interview.

## Decision

Build a four-step coach at `/internships/[id]/prepare` that uses **AI as scaffolding, not as writer**. The trainee writes everything that matters; AI is invisible most of the time, surfacing only to:

1. **Extract keywords** from the JD and compare to the trainee's resume (Step 1 — Compare).
2. **Suggest** concrete bullets to write for each gap (Step 2 — Close gaps), with the trainee doing the writing.
3. **Decode** common interview questions ("what they're really asking") and provide **fill-in-the-blank scaffolding** the trainee adapts to their own specifics (Step 3 — Interview).
4. **Validate** STAR-story structure heuristically (word counts, first-person check, quantified-result detection) — and only on-demand offer an AI revision the trainee can accept or reject (Step 4 — STAR).

Persisted via two new models:

- `PrepSession` — one row per (user × posting), holds step + state blob
- `StarStory` — reusable STAR-format story authored by the trainee, joinable to skills, visible at `/profile/stories` (the Story Bank)

## Alternatives considered

- **Alt A — Auto-generate a tailored resume in one click.** Rejected: high failure mode (hallucinated experiences, homogenised voice), brittle to JD quality, undermines the trainee's interview prep. The platform isn't a resume mill.
- **Alt B — Conversational LLM coach (chat-style).** Rejected for v1: harder to make idempotent + persistable, harder to budget AI cost. Structured-step flow gives the same coaching value with deterministic state. May revisit when the team can support conversational telemetry.
- **Alt C — One-page checklist instead of multi-step.** Rejected: the four steps are conceptually distinct workflows (compare, close gaps, interview, story-build). Collapsing them onto one page loses the progress affordance that brings trainees back.
- **Alt D — STAR stories live inside PrepSession only.** Rejected: stories are valuable beyond one posting. A trainee who writes "the time I troubleshot a stalled bioreactor run" should reuse that story for every posting that needs the corresponding skill. The Story Bank is a first-class user surface.

## Consequences

### Positive

- **Trainee retains agency.** Every bullet, every interview answer, every STAR field is written by the trainee. AI surfaces structure, not content.
- **Honest failure modes.** When the LLM polish endpoint errors or AI isn't configured, the trainee keeps their draft and sees a 503 with a plain explanation — never silent loss.
- **Reusable Story Bank.** STAR stories become user assets that compound over time, not throwaway forms tied to a posting.
- **Coaching layer is deterministic.** STAR structure validation runs entirely client-side (word counts, regex for numbers/percentages, first-person check). No AI dependency for the always-on coaching strip.
- **Sets the pattern for future AI features.** "AI as scaffolding, human as writer" is the operating principle the platform should keep — and now has a worked example.

### Negative

- **Coaching takes longer than auto-generation.** A trainee who wanted "do my resume for me" will be disappointed. We bet the people who'd benefit most are exactly the ones who shouldn't lean on automation.
- **AI cost scales with usage.** Each session may run 1–3 chat calls (keyword extraction + 1–2 STAR polishes). At Phase-1 volumes (sub-100 active trainees) cost is negligible; at scale we revisit.
- **More surface to maintain.** Two new models, four new routes, three new pages. Each tracks schema drift.
- **STAR validation is heuristic, not authoritative.** A genuinely great story might get a "needs work" chip because it lacks a number in the Result section. The UI says "tip" not "verdict" — but it's worth re-validating with a real trainee study.

## Validation

- **30-day signal:** count `PrepSession` rows created vs. completed (`currentStep === 4`). If most trainees stall at Step 1, the keyword analysis isn't carrying its weight.
- **Story Bank growth:** count `StarStory` rows added per active trainee per month. Target: ≥ 1 per active trainee per month after the first quarter.
- **Application quality proxy:** before/after comparison of applications where the trainee opened the prep flow at least once vs. those who skipped it. Measured by `ApplicationStatus` progress through interview/offer stages — a noisy signal but the only one we have without surveying.
- **Falsifiability:** if Story Bank entries are written once and never reused across postings, the "reusable across postings" thesis is wrong and we should fold stories back into the per-session state.

## Privacy + consent

- **Stories are user-private.** No employer or admin can see a trainee's Story Bank body text. Metadata (count, skills tagged) may surface in `/admin/audit` for moderation purposes only.
- **AI interactions are logged** to the existing `AiInteractionLog` table via `chat()`'s telemetry hook, tagged with feature names `prep.analyze-resume-jd` and `prep.star-polish`. The trainee's resume text is sent to the AI provider; that's the same trade-off as any AI-assisted resume tool, and we name it in onboarding.

## Deferred for v1.1+

- **Course recommendations from Step 2 gaps** — the skill ontology supports this directly. Cheap win.
- **Pull existing Story Bank entries into Step 4** — when a trainee starts Step 4 for a skill they already have a story for, surface it as a starting point.
- **Saved interview answers as named drafts** — currently lives only in the `PrepSession.state`. Could promote to its own model if usage warrants.
- **Story polish accept/reject history** — `aiHistory` column exists on StarStory but isn't surfaced in the UI yet.
- **Admin observability** — `/admin/matching` extension to show prep-session funnel + Story Bank growth.

## References

- `prisma/migrations/20260602000000_application_prep/` — schema
- `src/lib/prep/types.ts` — `PrepSessionState` shape
- `src/lib/prep/analyze.ts` — JD ↔ resume comparison
- `src/lib/prep/star.ts` — structural validator + AI polish
- `src/lib/prep/library.ts` — curated interview-question library
- `src/app/(dashboard)/internships/[id]/prepare/page.tsx` — coach entry point
- `src/components/prep/PrepCoach.tsx` — 4-step UI
- `src/app/(dashboard)/profile/stories/page.tsx` — Story Bank
- ADR-0004 — companion matching system
