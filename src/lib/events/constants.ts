/**
 * Business-rule constants for the Events module.
 *
 * Kept in a tiny file so the rule can be referenced from every layer
 * (UI badges, service-layer booking check, admin tooling, tests)
 * without re-declaration drift.
 */

/**
 * Hard cap on the number of non-cancelled WorkshopBooking rows a
 * single user may hold across the entire Training Week of one event.
 *
 * Phase 0 ships this as a constant only — enforcement lives at the
 * booking-service layer in Phase 1. The DB has no constraint
 * expressing "count(*) <= 2"; the service runs a count query against
 * the `(userId, status)` index on WorkshopBooking and rejects the
 * booking if confirmed + waitlist already total this value.
 */
export const MAX_WORKSHOPS_PER_USER = 2;
