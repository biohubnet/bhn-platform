# ADR-0003 — Double-tap `x` keyboard shortcut for HR view-as

**Status:** Accepted
**Date:** Earlier in May 2026 (pre-ER&D maturity work, backfilled)
**Author:** Platform Lead
**Outcomes affected:** 2 (admin queue ops). Specifically the admin's ability to verify what HR sees without leaving the keyboard.

## Context

Superadmins regularly need to verify what trainees see vs. what HR (employer) users see. Two-role swap was already available via the `x` shortcut → trainee. Verifying HR required mouse navigation to the role-switcher dropdown. Time-and-motion: ~6 seconds per swap × dozens of swaps per day during platform tuning.

## Decision

`x` (single tap) toggles trainee view (existing behaviour). `xx` (double tap within 320 ms) toggles employer/HR view. Third tap (or any `x` while already in a view-as state) clears the act-as cookie back to admin/superadmin.

Implementation: `src/components/system/KeyboardShortcuts.tsx` — `setTimeout` queues the trainee toggle; second press cancels and fires the HR toggle.

## Alternatives considered

- **Alt A — `Shift+X` for HR.** Rejected: superadmins were already trained on `x`; "double-tap to escalate" is a more familiar pattern (think Vim's `gg`).
- **Alt B — `x` for trainee, `y` for HR.** Rejected: no semantic anchor for `y`; risk of collisions with future shortcuts.
- **Alt C — dropdown menu (no shortcut).** Rejected: defeats the purpose; admin queue speed is the charter outcome.

## Consequences

### Positive

- Cuts swap latency from ~6 s to < 1 s. Compounds.
- Reinforces the platform's keyboard-first ethos for admins.

### Negative

- New users must discover the shortcut. The onboarding tour now includes a step (`keyboard-shortcuts`).
- 320 ms double-tap window is the standard but feels too long on fast typers and too short on slow ones. Median user is fine.
- Click-detection has a small race: if a user types `x` and then quickly clicks elsewhere, the queued toggle may fire after the click. Acceptable for an admin-only shortcut.

## Validation

- Anecdotal: admin onboarding feedback. After 30 days of use, no support tickets reference confusion.
- Could instrument: count `xx` activations per admin per day. Not yet wired.

## References

- Commit (in main, pre-ER&D maturity work)
- `src/components/system/KeyboardShortcuts.tsx`
- `src/app/api/admin/act-as/route.ts`
- Onboarding step `keyboard-shortcuts` in `src/lib/onboarding/tours.ts`
