# UX decision log (ADRs)

Architecture Decision Records, scoped to UX choices that traded off between charter outcomes — or set a precedent worth recording.

## Why this exists

Solo + AI builds tend to accumulate decisions silently. Six months later "why does the platform do X?" is unanswerable without git-archeology. ADRs are the audit trail for UX (the way the audit log is the audit trail for admin actions).

## Format

One file per decision: `NNNN-short-title.md`. Numbered sequentially. Each follows the template at `_template.md`.

## Current ADRs

| # | Decision | Status |
|---|---|---|
| 0001 | Workshop bookings decoupled from symposium Registration | Accepted |
| 0002 | Pending-approval gate on all symposium tour bookings | Accepted |
| 0003 | Double-tap `x` keyboard shortcut for HR view-as | Accepted |
| 0004 | User-voting on themes instead of staff-curated theme list | Accepted |
| 0005 | EXPERIENCE program guide with idle motion | Accepted |

## When to write an ADR

Write one whenever a UX decision:

1. **Trades off between charter outcomes** (e.g. "we made the approval flow slower in service of admin queue clarity")
2. **Sets a precedent that other features will inherit** (e.g. "all destructive actions get an `admin-glow` ring")
3. **Closes the door on an alternative that would otherwise come back** (e.g. "we considered modal-first registration; we chose page-first because…")
4. **Is contentious** — at least one reviewer disagreed, or you would expect a new joiner to ask "why this and not the other?"

Don't write ADRs for routine refactors, copy changes, or pure bug fixes. The bar is "future-me, or a future contributor, will want to know the reasoning."
