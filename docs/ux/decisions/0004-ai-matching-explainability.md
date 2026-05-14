# ADR-0004 — AI trainee-to-posting matching with explainable subscores

**Status:** Accepted
**Date:** 2026-05-14
**Author:** Platform Lead (with AI assistance)
**Outcomes affected:** 1 (trainee → enrolment / first useful action), 3 (transparency culture)

## Context

The platform has carried two ingredients for AI matching since the skill-ontology shipped: a 384-d BGE embedding on every `Skill`, `Pathway`, and `Course`, and a per-posting set of `PostingSkill` rows tagged via the AI extractor at `/admin/skills`. Up to now those ingredients were used by `scoreMatch()` (weighted skill overlap, no embeddings) to render a single match chip on the internship list and the posting detail page.

That's a level-1 implementation: a number with no receipts. Trainees see "63% match" and have no way to know what it means, whether to trust it, or what would lift it. Employers don't see fit at all. Admins have no observability into match quality.

The product opportunity is to make matching a first-class surface — ranked recommendations, explained scores, gap remediation paths — while staying honest about what AI can and can't tell you.

## Decision

Build an explainable fit-scoring pipeline with **three subscores**, **one confidence dimension**, and **first-class caveats**. Surface it in three places to start:

1. **`/profile/matches`** — new trainee-facing page showing the top 20 ranked postings, each row with the FitExplain panel underneath.
2. **`/internships/[id]`** — posting detail page swaps its old basic `scoreMatch` chip for the same FitExplain panel, always-expanded.
3. **`GET /api/matching/me`** — programmatic access for the page + future dashboard widgets.

**Subscore weights (sum to 100):**

| Subscore | Weight | What it measures |
|---|---|---|
| Direct skill overlap | 50 | Trainee skills ∩ PostingSkill rows, weighted by PostingSkill weight + 0.5 bump for required. |
| Semantic similarity | 30 | For posting skills the trainee doesn't hold directly, average pgvector cosine similarity to the trainee's nearest held skill. Catches semantic adjacency. |
| Pathway alignment | 20 | Completed pathways whose embedding is cosine-close to the posting's skill centroid. Flat +10/pathway, capped at 20. |

**Confidence dimension (0..1):** capped at 0.5 when trainee profile has < 5 skills; capped at 0.6 when posting has < 3 PostingSkill rows. The UI renders confidence as a labeled band ("High / Medium / Low / Very low — see caveats") next to the score.

**Caveats are first-class:** every FitResult carries a `caveats: string[]` array. The UI renders them in an amber panel below the subscores, never buried in a tooltip. Examples:
- "This posting hasn't been tagged with skills yet."
- "Your profile has 2 skills on file — add 3 more for higher confidence."
- "You haven't completed any pathways yet — pathway alignment contributes up to 20% of the score."

## Alternatives considered

- **Alt A — Single black-box score (LLM judge).** Send the trainee profile + posting description to an LLM and ask for a 0–100 score. Rejected on three grounds: (1) cost at scale, (2) inconsistency across runs, (3) impossible to debug or explain. The decomposed-subscore approach is auditable.
- **Alt B — Keep scoreMatch + add a UI explanation layer separately.** Rejected: the scoring rules and the explanation are the same product surface; splitting them across modules invites drift between "what we computed" and "what we said we computed".
- **Alt C — Skip semantic similarity, use only direct overlap.** Rejected: the embedding-aware bridge ("you have 'cell culture' which is close to 'mammalian cell culture'") is exactly the value an ML-augmented matcher provides over a tag-overlap one. The embeddings already exist; not using them would be malpractice.
- **Alt D — Cache scores in a Match table.** Rejected for v1. Phase-1 volumes (sub-200 postings × handful of trainees) recompute fast enough at request time. Adding a cache before measuring need is premature. The architecture leaves the door open — `scoreFitForTrainee` is the function we'd cache.

## Consequences

### Positive

- **Trainees see receipts.** Every score breaks down into 3 subscores + matched skills + semantic bridges + pathway boosts + gaps + caveats. No black box.
- **Honest about limits.** Thin profiles get low confidence chips. Untagged postings get explicit "we can't score this" caveats. No misleading 0% scores on under-tagged data.
- **Closes the loop to action.** Gap section ("Required skills you're missing") links to `/profile/skills` so the user can either claim the skill or find a course that teaches it.
- **Sets the pattern for AI features going forward.** The "score + subscores + confidence + caveats + receipts" shape becomes the platform's contract for any AI-mediated surface (skill extraction, course recommendations, future résumé screening).

### Negative

- **Per-request compute cost.** `scoreFitForTrainee` runs two pgvector queries (semantic + pathway) per (user, posting) pair. Ranking 200 postings × 50 trainees on the same page would hurt. We're protected by Phase-1 volume; caching becomes a real conversation at ~500 active trainees or per-employer fit lookups.
- **New surface area to maintain.** One new page, one new component, one new API route, one new service module. Each needs to track schema drift.
- **Confidence is hard to communicate.** Most users won't read the caveats panel carefully on first contact. We're betting that the *visible* band ("Strong fit / Possible fit / Weak fit") is the primary signal and the receipts are for users who care; this hypothesis needs validation with a real usability test.

## Validation

- **30-day post-ship:** measure click-through from `/profile/matches` rows → `/internships/[id]` → application submission. If trainees who land on a high-band match apply at materially higher rate than those on a low-band match, the score is informative.
- **Survey question** to add to the talent-pool exit survey: "How useful were the matches at /profile/matches?" (5-point Likert + free text).
- **A/B falsifiability:** if median application submissions per trainee don't increase after this ships, the matcher isn't paying for itself and we should reconsider.

## Privacy + consent

- **Trainee side:** the only data fed to the matcher is the trainee's own profile + their own pathway history. Nothing is shared externally.
- **Employer side (deferred):** when we surface "fit-ranked applicants" to employers (planned next quarter), the consent surface is *the application itself* — applying to a posting IS the consent signal for the employer to see your fit score. We will NOT surface trainees who haven't applied.
- **Audit trail:** every match computation is request-scoped; nothing is logged per-user yet. If we cache, we'll add an `AuditLog` row when a third party (employer / admin) views a trainee's fit score.

## Deferred for v1.1+

These were considered for v1 and explicitly pushed:

- **Employer-side ranked applicants** (`/employer/postings/[id]/applicants`). Touches HR UI; deserves its own usability rehearsal first.
- **Admin observability** (`/admin/matching` showing match-quality distribution, top skill-graph gaps).
- **Per-trainee opt-out preference** ("don't surface me to employers via matching"). Needs a settings surface + a `User.optOutOfMatching` column.
- **Course recommendations from gaps** — taking a missing required skill and pointing the trainee at courses that teach it. Easy add once the gap surface is live + measured.
- **Result caching.** Premature; revisit at ~500 active trainees or first sign of perf regression.

## References

- `src/lib/matching/fit.ts` — service layer + subscore math
- `src/components/matching/FitExplain.tsx` — receipts-panel UI
- `src/app/(dashboard)/profile/matches/page.tsx` — trainee surface
- `src/app/(dashboard)/internships/[id]/page.tsx` — detail-page surface (swap from `scoreMatch` to `scoreFitForTrainee`)
- `src/app/api/matching/me/route.ts` — programmatic endpoint
- ADR-0003 — keyboard shortcuts (precedent for "make AI features keyboard-first when relevant")
