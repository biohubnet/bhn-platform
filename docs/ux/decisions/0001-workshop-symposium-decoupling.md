# ADR-0001 — Workshop bookings decoupled from symposium Registration

**Status:** Accepted
**Date:** 2026-05-13
**Author:** Platform Lead (with AI assistance)
**Outcomes affected:** 1 (trainee → enrollment)

## Context

Pre-decoupling, every workshop booking required a confirmed symposium-day `Registration` row. The service layer enforced it (`bookWorkshopInTx` had a registration gate). Empirically, BHN had two real audiences who were forced through a "register for the symposium first" funnel they didn't want:

1. **Tour-only attendees.** Local biomanufacturing professionals who'd come for a CL3 facility tour but skip the symposium day.
2. **Symposium-only attendees.** Industry guests joining the keynote + panels but not the Training Week.

Forcing one to imply the other created drop-off in both directions.

## Decision

Drop the registration gate on `bookWorkshopInTx`. Workshop bookings are independent of `Registration`. After a successful workshop booking — when no `Registration` exists — surface a cross-prompt linking to `/events/[slug]/register`. After a successful registration with no workshops picked, surface the inverse cross-prompt.

Implementation lives at `src/lib/events/bookings.ts` (service layer) and the two register pages (`/events/[slug]/register/success` + `/events/[slug]/me/workshops`).

## Alternatives considered

- **Alt A — keep the gate, add a "skip registration" checkbox.** Rejected: adds a UI element to optimise for the minority case while keeping the majority case slower. Cross-prompts ladder up to charter outcome 1 better.
- **Alt B — separate routes entirely.** Rejected: doubles the surface area for a marginal gain. The decoupled-but-same-routes approach reuses every component.

## Consequences

### Positive

- Removes a forced funnel; either audience can self-serve.
- Cross-prompts convert the "I came for X, didn't know about Y" moments into capture opportunities.
- Aligns with the platform's general "least-resistance path" stance.

### Negative

- `Registration` row no longer implies anything about workshop bookings. Reports that assumed the conjunction need updating.
- Two new bookkeeping paths to test (booking-without-Registration, Registration-without-bookings). Both covered by Playwright stubs (`workshop-booking-no-registration.trainee.spec.ts`).

## Validation

- 30-day post-ship: count workshop bookings WITHOUT a confirmed `Registration` (the previously-impossible case). Non-zero count proves the decoupling is being used.
- Cross-prompt clickthrough: from `/events/.../me/workshops` → `/register`, measured via `Event` analytics.

## References

- Commit `e5f52e5` (the schema + service-layer change)
- Journey `docs/ux/journeys/03-trainee-symposium-registration.md`
- Charter outcome 1
