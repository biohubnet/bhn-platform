# ADR-0002 — Pending-approval gate on all symposium tour bookings

**Status:** Accepted
**Date:** 2026-05-13
**Author:** Platform Lead
**Outcomes affected:** 1 (trainee → enrollment), 2 (admin queue ops). Trades latency on (1) for control on (2).

## Context

Until this commit, every workshop / tour booking on the symposium was auto-confirmed if there was a seat. The BHN events team raised that this gave away seats faster than they could curate (some tours need partner approval, some attendees need vetting). The team wanted a review step before the seat was held.

## Decision

Every `Workshop` carries a `requiresApproval` boolean (default `true`). When `true`, new `WorkshopBooking` rows land in status `pending` — no seat decrement, no waitlist position. An admin moves it to `confirmed` (if seats left) or `waitlist` (if capacity full at approval time) via the per-row Approve action. Mirrored at the event level via `BhnEvent.requiresApproval` for the symposium-day `Registration` itself.

The public-facing registration form surfaces the policy: a prominent amber "your spot is not guaranteed until admin approval" banner above the form; button copy flips from "Confirm registration" → "Submit for approval".

## Alternatives considered

- **Alt A — keep auto-confirm; let admins cancel after the fact.** Rejected: cancellation post-confirm is high-friction, and the visible "you have a seat" → "actually you don't" reversal is worse than asking the user to wait 1–2 days.
- **Alt B — require approval only for tour-kind workshops, not workshop-kind.** Rejected: complicates the rule for a marginal benefit. Single-flag-per-workshop wins on legibility.
- **Alt C — pending bookings count toward capacity.** Rejected: would mean pending requests block fresh ones from being submitted (the seat is "ghost-held"), creating bad queue dynamics if admins are slow.

## Consequences

### Positive

- Operations team controls who attends — closes a real BHN policy gap.
- The "your spot is not guaranteed" message is honest. Better than overpromising.
- Admin queue clarity: `/admin/events/[slug]/registrations` gets a Pending tile + a per-row Approve button. The pattern reuses across `Registration` and `WorkshopBooking`.

### Negative

- Adds 1–2 business days of latency to the trainee's "I'm registered" feeling — directly affects charter outcome 1 (the P75 < 5 min target now needs to be re-scoped as "submitted in under 5 min", with confirmation latency tracked separately).
- New `pending` status to handle in every UI + service-layer call site. We caught most; the audit will resurface any we missed.
- Backfill required: existing confirmed rows need `approvedAt = createdAt` stamps so they don't pollute the pending queue. Done in the migration.

## Validation

- 14-day post-ship: median latency from `Registration.createdAt → approvedAt` should be < 24 hours. If it drifts toward 48 hours, the queue is under-resourced.
- Drop-off rate: count submitters who go on to NOT visit `/events/[slug]/me` once approved. Hypothesis: lower than 10%; if higher, the approval-email copy isn't compelling enough to bring people back.
- Falsifiability: if both signals look bad, we should revisit Alt A (auto-confirm + cancel later).

## References

- Commit `e5f52e5`
- Journey `docs/ux/journeys/03-trainee-symposium-registration.md`
- `src/lib/events/bookings.ts` — full lifecycle handling
- `src/components/events/RegistrationForm.tsx` — banner UI
